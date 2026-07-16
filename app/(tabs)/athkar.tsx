import React, { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList, Alert, Modal, Dimensions, TextInput, useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, ZoomIn, FadeIn, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import i18n, { t, isRtlLang, LANG_META, LANG_FLAG } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';
import ATHKAR_CATEGORIES, { AthkarCategory, Thikr } from '@/constants/athkar-data';
import { transliterateToScript } from '@/lib/quran-transliteration';

const FAVS_KEY = 'athkar_favourites';
const FAV_HINT_KEY = 'athkar_fav_hint_seen';
const ATHKAR_FS_KEY = 'athkar_font_size';
const PERSONAL_KEY = 'personal_athkar';
const USER_CAT_KEY_PREFIX = 'user_thikr_category_';
const COPY_HINT_KEY = 'athkar_copy_hint_shown';
const GRID_ORDER_KEY = 'athkar_grid_order';
const GRID_REORDER_HINT_KEY = 'athkar_grid_reorder_hint_shown';
const THIKR_READER_HINT_KEY = 'athkar_thikr_reader_hint_shown';
const THIKR_GROUP_HINT_KEY = 'athkar_thikr_group_hint_shown';
// Per-category tap-progress + reader position: { date, counts, position }.
const PROGRESS_KEY_PREFIX = 'athkar_progress_';

interface PersonalThikrItem {
  id: string;
  text: string;
  name?: string;
  repetitions: number;
}

type UnifiedThikrItem =
  | { kind: 'builtin'; thikr: Thikr; originalIndex: number }
  | { kind: 'user'; item: PersonalThikrItem };
const GOLD = '#C9A84C';
const OUTER_PADDING = 14;
const TILE_GAP = 10;
const COLUMNS = 4;

type AthkarFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const STEP_ORDER: AthkarFontSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const FONT_STEPS: Record<AthkarFontSize, { tile: number; arabic: number; translit: number; translation: number }> = {
  xs: { tile: 10, arabic: 18, translit: 12, translation: 12 },
  sm: { tile: 12, arabic: 20, translit: 13, translation: 13 },
  md: { tile: 14, arabic: 24, translit: 15, translation: 15 },
  lg: { tile: 16, arabic: 28, translit: 17, translation: 17 },
  xl: { tile: 18, arabic: 32, translit: 19, translation: 19 },
};


// Stable, insertion-proof progress key for a built-in thikr. Hashes the immutable
// Arabic text + translationKey rather than the array INDEX, so adding adhkar to a
// category never shifts indices and never misattributes saved counts. (Favourites,
// grid order and personal athkar key on category id and stay insertion-safe — untouched.)
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function thikrKey(catId: string, thikr: Thikr): string {
  return `${catId}_${hashStr(`${thikr.arabic}\u0000${thikr.translationKey}`)}`;
}

/** Local calendar-date key (device midnight boundary) for the daily reset. */
function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Must mirror stripArabicDiacritics in quran-api.ts — same regex for consistent search/highlight.
const ATHKAR_DIACRITIC_RE = /[\u064B-\u065F\u0670\u0610-\u061A]/;

function normalizeForAthkarSearch(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ATHKAR_DIACRITIC_RE.test(ch)) continue;
    out += /[أإآٱ]/.test(ch) ? 'ا' : ch.toLowerCase();
  }
  return out;
}

// ---------------------------------------------------------------------------
// DragSortList — Reanimated 4 + Gesture Handler replacement for
// react-native-draggable-flatlist (which silently breaks on Reanimated 4).
//
// Design:
//  • Each row gets a Pan gesture (.activateAfterLongPress) on its drag handle.
//  • activeIndexSV / overIndexSV / dragOffsetY / itemHeightsSV are shared
//    values so all animation runs on the UI thread.
//  • runOnJS is used only to commit state (reorder) on drag end.
//  • Callers receive a pre-built `dragHandle` ReactNode to position anywhere.
// ---------------------------------------------------------------------------

interface DragSortRowProps<T> {
  item: T;
  index: number;
  activeIndexSV: ReturnType<typeof useSharedValue<number>>;
  overIndexSV: ReturnType<typeof useSharedValue<number>>;
  dragOffsetY: ReturnType<typeof useSharedValue<number>>;
  itemHeightsSV: ReturnType<typeof useSharedValue<number[]>>;
  dragStartContentYSV: ReturnType<typeof useSharedValue<number>>;
  dragTranslationYSV: ReturnType<typeof useSharedValue<number>>;
  onLayout: (height: number) => void;
  isActive: boolean;
  handleColor: string;
  itemGap: number;
  onStartDragRef: React.MutableRefObject<(index: number) => void>;
  onFinishDragRef: React.MutableRefObject<(from: number, to: number) => void>;
  renderContent: (dragHandle: React.ReactNode) => React.ReactNode;
}

function DragSortRow<T>({
  index,
  activeIndexSV, overIndexSV, dragOffsetY, itemHeightsSV,
  dragStartContentYSV, dragTranslationYSV,
  onLayout, handleColor, itemGap,
  onStartDragRef, onFinishDragRef,
  renderContent,
}: DragSortRowProps<T>) {
  const pan = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      const heights = itemHeightsSV.value;
      let off = 0;
      for (let i = 0; i < index; i++) off += (heights[i] ?? 60) + itemGap;
      dragStartContentYSV.value = off + (heights[index] ?? 60) / 2;
      dragOffsetY.value = 0;
      dragTranslationYSV.value = 0;
      activeIndexSV.value = index;
      overIndexSV.value = index;
      runOnJS(onStartDragRef.current)(index);
    })
    .onChange((e) => {
      dragOffsetY.value = e.translationY;
      dragTranslationYSV.value = e.translationY;
      const from = activeIndexSV.value;
      const heights = itemHeightsSV.value;
      // Build cumulative offsets on UI thread
      let offset = 0;
      const offsets: number[] = [];
      for (let i = 0; i < heights.length; i++) {
        offsets[i] = offset;
        offset += (heights[i] ?? 60) + itemGap;
      }
      const myH = heights[from] ?? 60;
      const centerY = (offsets[from] ?? 0) + myH / 2 + e.translationY;
      let newOver = from;
      let bestDist = 9999999;
      for (let i = 0; i < heights.length; i++) {
        const slotCenter = (offsets[i] ?? 0) + (heights[i] ?? 60) / 2;
        const d = Math.abs(centerY - slotCenter);
        if (d < bestDist) { bestDist = d; newOver = i; }
      }
      overIndexSV.value = newOver;
    })
    .onEnd(() => {
      const fromIdx = activeIndexSV.value;
      const toIdx = overIndexSV.value;
      activeIndexSV.value = -1;
      overIndexSV.value = -1;
      dragOffsetY.value = withSpring(0, { damping: 20, stiffness: 250 });
      runOnJS(onFinishDragRef.current)(fromIdx, toIdx);
    })
    .onFinalize(() => {
      // Cancel / interrupted gesture cleanup
      if (activeIndexSV.value >= 0) {
        activeIndexSV.value = -1;
        overIndexSV.value = -1;
        dragOffsetY.value = withSpring(0, { damping: 20, stiffness: 250 });
        runOnJS(onStartDragRef.current)(-1);
      }
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [index]);

  const animStyle = useAnimatedStyle(() => {
    const myIndex = index;
    const isActiveItem = activeIndexSV.value === myIndex;

    if (isActiveItem) {
      return {
        transform: [{ translateY: dragOffsetY.value }, { scale: 1.03 }],
        zIndex: 100,
        opacity: 0.92,
        shadowOpacity: 0.25,
        elevation: 8,
      };
    }

    const from = activeIndexSV.value;
    const over = overIndexSV.value;
    if (from < 0 || over < 0 || from === over) {
      return { transform: [{ translateY: 0 }], zIndex: 1 };
    }

    const heights = itemHeightsSV.value;
    const h = (heights[from] ?? 60) + itemGap;
    let shift = 0;
    if (from < over && myIndex > from && myIndex <= over) shift = -h;
    else if (from > over && myIndex >= over && myIndex < from) shift = h;

    return {
      transform: [{ translateY: withSpring(shift, { damping: 20, stiffness: 250 }) }],
      zIndex: 1,
    };
  });

  const dragHandle = (
    <GestureDetector gesture={pan}>
      <View hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={{ padding: 4 }}>
        <Ionicons name="reorder-three-outline" size={22} color={handleColor} />
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      style={animStyle as any}
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
    >
      {renderContent(dragHandle)}
    </Animated.View>
  );
}

function DragSortList<T>({
  data, keyExtractor, renderItem, onDragEnd,
  contentContainerStyle, ListHeaderComponent,
  showsVerticalScrollIndicator = true,
  itemGap = 8,
  handleColor = '#888',
  autoscrollThreshold = 40,
  autoscrollSpeed = 400,
}: {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (params: { item: T; index: number; isActive: boolean; dragHandle: React.ReactNode }) => React.ReactNode;
  onDragEnd: (data: T[]) => void;
  contentContainerStyle?: any;
  ListHeaderComponent?: React.ReactNode;
  showsVerticalScrollIndicator?: boolean;
  itemGap?: number;
  handleColor?: string;
  autoscrollThreshold?: number;
  autoscrollSpeed?: number;
}) {
  const [items, setItems] = useState<T[]>(data);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemHeightsRef = useRef<number[]>([]);

  const activeIndexSV = useSharedValue(-1);
  const overIndexSV = useSharedValue(-1);
  const dragOffsetY = useSharedValue(0);
  const itemHeightsSV = useSharedValue<number[]>([]);
  const dragStartContentYSV = useSharedValue(0);
  const dragTranslationYSV = useSharedValue(0);

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const listHeightRef = useRef(400);
  const autoscrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeIndex >= 0) {
      autoscrollIntervalRef.current = setInterval(() => {
        const contentCenterY = dragStartContentYSV.value + dragTranslationYSV.value;
        const visibleCenterY = contentCenterY - scrollYRef.current;
        const listH = listHeightRef.current;
        if (visibleCenterY < autoscrollThreshold) {
          const delta = Math.max(1, (autoscrollThreshold - visibleCenterY) * autoscrollSpeed / autoscrollThreshold / 60);
          const newY = Math.max(0, scrollYRef.current - delta);
          scrollRef.current?.scrollTo({ y: newY, animated: false });
          scrollYRef.current = newY;
        } else if (visibleCenterY > listH - autoscrollThreshold) {
          const delta = Math.max(1, (visibleCenterY - (listH - autoscrollThreshold)) * autoscrollSpeed / autoscrollThreshold / 60);
          const newY = scrollYRef.current + delta;
          scrollRef.current?.scrollTo({ y: newY, animated: false });
          scrollYRef.current = newY;
        }
      }, 16);
    } else {
      if (autoscrollIntervalRef.current) {
        clearInterval(autoscrollIntervalRef.current);
        autoscrollIntervalRef.current = null;
      }
    }
    return () => {
      if (autoscrollIntervalRef.current) {
        clearInterval(autoscrollIntervalRef.current);
        autoscrollIntervalRef.current = null;
      }
    };
  }, [activeIndex, autoscrollThreshold, autoscrollSpeed]);

  // Sync when external data changes (e.g. after add/delete)
  useEffect(() => { setItems([...data]); }, [data]);

  const onStartDragRef = useRef((index: number) => {
    if (index < 0) { setActiveIndex(-1); return; }
    // Heights are kept in sync via onLayout; no snapshot needed here.
    setActiveIndex(index);
  });

  const onFinishDragRef = useRef((from: number, to: number) => {
    setActiveIndex(-1);
    if (from === to || from < 0 || to < 0) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      onDragEnd(next);
      return next;
    });
  });

  // Keep refs pointing at latest callbacks without recreating gestures
  useEffect(() => {
    onFinishDragRef.current = (from: number, to: number) => {
      setActiveIndex(-1);
      if (from === to || from < 0 || to < 0) return;
      setItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved!);
        onDragEnd(next);
        return next;
      });
    };
  }, [onDragEnd]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollEnabled // always enabled — GestureDetector's activateAfterLongPress handles drag/scroll conflict
      onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
      scrollEventThrottle={16}
      onLayout={(e) => { listHeightRef.current = e.nativeEvent.layout.height; }}
    >
      {ListHeaderComponent}
      {items.map((item, index) => (
        <DragSortRow<T>
          key={String(index)}
          item={item}
          index={index}
          activeIndexSV={activeIndexSV}
          overIndexSV={overIndexSV}
          dragOffsetY={dragOffsetY}
          itemHeightsSV={itemHeightsSV}
          dragStartContentYSV={dragStartContentYSV}
          dragTranslationYSV={dragTranslationYSV}
          itemGap={itemGap}
          handleColor={handleColor}
          isActive={activeIndex === index}
          onLayout={(h) => {
            itemHeightsRef.current[index] = h;
            itemHeightsSV.value = [...itemHeightsRef.current];
          }}
          onStartDragRef={onStartDragRef}
          onFinishDragRef={onFinishDragRef}
          renderContent={(dragHandle) => renderItem({ item, index, isActive: activeIndex === index, dragHandle })}
        />
      ))}
    </ScrollView>
  );
}

export default function AthkarScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { lang, colors: C, isDark, translitLang, updateSettings } = useApp();
  const tr = t(lang);
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selectedCategory, setSelectedCategory] = useState<AthkarCategory | null>(null);
  const [showPersonalReader, setShowPersonalReader] = useState(false);
  const [personalItems, setPersonalItems] = useState<PersonalThikrItem[]>([]);
  const [highlightThikrIdx, setHighlightThikrIdx] = useState<number>(-1);
  const [highlightQuery, setHighlightQuery] = useState<string>('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [userCatItems, setUserCatItems] = useState<Record<string, PersonalThikrItem[]>>({});
  const [copyHintShown, setCopyHintShown] = useState(true);
  const [thikrReaderHintShown, setThikrReaderHintShown] = useState(true);
  const [thikrGroupHintShown, setThikrGroupHintShown] = useState(true);
  const [gridOrder, setGridOrder] = useState<string[]>([]);
  const [gridReorderHintShown, setGridReorderHintShown] = useState(true);
  const [displayMode, setDisplayMode] = useState<'arabic' | 'full'>(
    (!lang || lang === 'ar') ? 'arabic' : 'full'
  );
  const [favourites, setFavourites] = useState<string[]>([]);
  const [favHintSeen, setFavHintSeen] = useState(false);
  // athkarLang is derived from the persisted translitLang; Arabic display mode forces 'ar'.
  const athkarLang: Lang = displayMode === 'arabic' ? 'ar' : translitLang;
  const [athkarFontSize, setAthkarFontSizeState] = useState<AthkarFontSize>('md');
  const readerRef = useRef<FlatList<Thikr>>(null);
  const pendingAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Progress persistence (tap counts + reader position, per category) ─────────
  // Position (currentIndex) lives inside SwipeableReader; the parent mirrors the
  // latest via positionRef so a save always writes both fields together.
  const [restoredPosition, setRestoredPosition] = useState(0);
  const positionRef = useRef(0);
  const countsRef = useRef<Record<string, number>>({});
  const selectedCategoryRef = useRef<AthkarCategory | null>(null);
  const suppressPersistRef = useRef(false);
  useEffect(() => { countsRef.current = counts; }, [counts]);
  useEffect(() => { selectedCategoryRef.current = selectedCategory; }, [selectedCategory]);
  const saveProgress = useCallback((catId: string, cnts: Record<string, number>, position: number) => {
    const rec = { date: localDateKey(), counts: cnts, position };
    AsyncStorage.setItem(PROGRESS_KEY_PREFIX + catId, JSON.stringify(rec)).catch(() => {});
  }, []);
  // Persist whenever counts change while a category is open. Skipped once right
  // after a load (suppressPersistRef) so restoring never rewrites, and skipped
  // when no category is open so closeCategory's setCounts({}) can't wipe storage.
  useEffect(() => {
    if (!selectedCategory) return;
    if (suppressPersistRef.current) { suppressPersistRef.current = false; return; }
    saveProgress(selectedCategory.id, counts, positionRef.current);
  }, [counts, selectedCategory, saveProgress]);
  const handlePositionChange = useCallback((index: number) => {
    positionRef.current = index;
    const cat = selectedCategoryRef.current;
    if (cat) saveProgress(cat.id, countsRef.current, index);
  }, [saveProgress]);

  // Reset to category list when tab icon is pressed while already on this tab
  useLayoutEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', () => {
      if (selectedCategory !== null || showPersonalReader) {
        setSelectedCategory(null);
        setShowPersonalReader(false);
        setHighlightThikrIdx(-1);
        setHighlightQuery('');
      }
    });
    return unsubscribe;
  }, [navigation, selectedCategory]);

  const setAthkarFontSize = useCallback((fs: AthkarFontSize) => {
    setAthkarFontSizeState(fs);
    AsyncStorage.setItem(ATHKAR_FS_KEY, fs).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(FAVS_KEY).then(raw => {
      if (raw) setFavourites(JSON.parse(raw));
    }).catch(() => {});
    AsyncStorage.getItem(FAV_HINT_KEY).then(val => {
      setFavHintSeen(val === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(PERSONAL_KEY).then(raw => {
      if (raw) setPersonalItems(JSON.parse(raw));
    }).catch(() => {});
    AsyncStorage.getItem(COPY_HINT_KEY).then(val => {
      setCopyHintShown(val === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(THIKR_READER_HINT_KEY).then(val => {
      setThikrReaderHintShown(val === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(THIKR_GROUP_HINT_KEY).then(val => {
      setThikrGroupHintShown(val === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(GRID_ORDER_KEY).then(raw => {
      if (raw) setGridOrder(JSON.parse(raw));
    }).catch(() => {});
    AsyncStorage.getItem(GRID_REORDER_HINT_KEY).then(val => {
      setGridReorderHintShown(val === 'true');
    }).catch(() => {});
    AsyncStorage.getItem(ATHKAR_FS_KEY).then(val => {
      const migrated: Record<string, AthkarFontSize> = { small: 'sm', medium: 'md', large: 'lg' };
      const mapped = val ? (migrated[val] ?? val) : null;
      if (mapped && STEP_ORDER.includes(mapped as AthkarFontSize)) {
        setAthkarFontSizeState(mapped as AthkarFontSize);
      }
    }).catch(() => {});
  }, []);


  useEffect(() => {
    setDisplayMode(!lang || lang === 'ar' ? 'arabic' : 'full');
  }, [lang]);

  useFocusEffect(useCallback(() => {
    setDisplayMode(!lang || lang === 'ar' ? 'arabic' : 'full');
  }, [lang]));

  const sortedCategories = useMemo(() => {
    if (gridOrder.length === 0) return ATHKAR_CATEGORIES;
    const ordered: AthkarCategory[] = [];
    gridOrder.forEach(id => {
      if (id === '__personal__') return;
      const cat = ATHKAR_CATEGORIES.find(c => c.id === id);
      if (cat) ordered.push(cat);
    });
    // Append any new categories not yet in gridOrder
    ATHKAR_CATEGORIES.forEach(cat => {
      if (!ordered.find(c => c.id === cat.id)) ordered.push(cat);
    });
    return ordered;
  }, [gridOrder]);

  // All grid items in order (including __personal__)
  const orderedAllGridItems = useMemo((): Array<'__personal__' | AthkarCategory> => {
    if (gridOrder.length === 0) return ['__personal__', ...ATHKAR_CATEGORIES];
    const result: Array<'__personal__' | AthkarCategory> = [];
    let personalAdded = false;
    gridOrder.forEach(id => {
      if (id === '__personal__') { result.push('__personal__'); personalAdded = true; }
      else {
        const cat = ATHKAR_CATEGORIES.find(c => c.id === id);
        if (cat) result.push(cat);
      }
    });
    if (!personalAdded) result.unshift('__personal__');
    ATHKAR_CATEGORIES.forEach(cat => {
      if (!result.find(it => it !== '__personal__' && (it as AthkarCategory).id === cat.id)) result.push(cat);
    });
    return result;
  }, [gridOrder]);

  const toggleFavourite = useCallback((cat: AthkarCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavourites(prev => {
      const isFav = prev.includes(cat.id);
      const name = (tr[cat.nameKey as keyof typeof tr] as string) ?? cat.nameKey;
      const prompt = isFav ? tr.athkar_fav_remove_prompt : tr.athkar_fav_add_prompt;
      const btn = isFav ? tr.athkar_fav_remove_btn : tr.athkar_fav_add_btn;
      Alert.alert(name, prompt, [
        { text: tr.btn_cancel, style: 'cancel' },
        {
          text: btn,
          style: isFav ? 'destructive' : 'default',
          onPress: () => {
            const next = isFav ? prev.filter(id => id !== cat.id) : [...prev, cat.id];
            setFavourites(next);
            AsyncStorage.setItem(FAVS_KEY, JSON.stringify(next)).catch(() => {});
          },
        },
      ]);
      return prev;
    });
  }, [tr]);

  const saveGridOrder = useCallback((ids: string[]) => {
    setGridOrder(ids);
    AsyncStorage.setItem(GRID_ORDER_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  const dismissGridReorderHint = useCallback(() => {
    setGridReorderHintShown(true);
    AsyncStorage.setItem(GRID_REORDER_HINT_KEY, 'true').catch(() => {});
  }, []);

  const saveUserCatItems = useCallback((catId: string, items: PersonalThikrItem[]) => {
    setUserCatItems(prev => ({ ...prev, [catId]: items }));
    AsyncStorage.setItem(USER_CAT_KEY_PREFIX + catId, JSON.stringify(items)).catch(() => {});
  }, []);

  const dismissCopyHint = useCallback(() => {
    setCopyHintShown(true);
    AsyncStorage.setItem(COPY_HINT_KEY, 'true').catch(() => {});
  }, []);

  const dismissThikrReaderHint = useCallback(() => {
    setThikrReaderHintShown(true);
    AsyncStorage.setItem(THIKR_READER_HINT_KEY, 'true').catch(() => {});
  }, []);

  const dismissThikrGroupHint = useCallback(() => {
    setThikrGroupHintShown(true);
    AsyncStorage.setItem(THIKR_GROUP_HINT_KEY, 'true').catch(() => {});
  }, []);

  const openCategory = useCallback((cat: AthkarCategory, hlIdx?: number, hlQuery?: string) => {
    Haptics.selectionAsync();
    setHighlightThikrIdx(hlIdx ?? -1);
    setHighlightQuery(hlQuery ?? '');
    setSelectedCategory(cat);
    // Clear synchronously (suppress the resulting persist), then load saved progress.
    suppressPersistRef.current = true;
    setCounts({});
    positionRef.current = 0;
    setRestoredPosition(0);
    AsyncStorage.getItem(PROGRESS_KEY_PREFIX + cat.id).then(raw => {
      let loadedCounts: Record<string, number> = {};
      let loadedPos = 0;
      if (raw) {
        try {
          const rec = JSON.parse(raw);
          // Morning/evening athkar are day-bound: yesterday's completions must not
          // count today. Boundary = device local midnight (localDateKey) — chosen
          // over a Fajr boundary so athkar stays decoupled from prayer-times/location
          // and the reset is predictable. Other categories persist indefinitely.
          const isDaily = cat.id === 'morning' || cat.id === 'evening';
          if (!isDaily || rec.date === localDateKey()) {
            loadedCounts = rec.counts ?? {};
            loadedPos = typeof rec.position === 'number' ? rec.position : 0;
          }
        } catch { /* corrupt record → fresh start */ }
      }
      suppressPersistRef.current = true;   // restoring must not rewrite
      setCounts(loadedCounts);
      positionRef.current = loadedPos;
      setRestoredPosition(loadedPos);
    }).catch(() => {});
    AsyncStorage.getItem(USER_CAT_KEY_PREFIX + cat.id).then(raw => {
      if (raw) setUserCatItems(prev => ({ ...prev, [cat.id]: JSON.parse(raw) }));
    }).catch(() => {});
  }, []);

  const savePersonalItems = useCallback((items: PersonalThikrItem[]) => {
    setPersonalItems(items);
    AsyncStorage.setItem(PERSONAL_KEY, JSON.stringify(items)).catch(() => {});
  }, []);

  const closeCategory = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.selectionAsync();
    setSelectedCategory(null);
    setShowPersonalReader(false);
    setCounts({});
  }, []);

  const resetCounts = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCounts({});
  }, []);

  const handleTap = useCallback((cat: AthkarCategory, thikr: Thikr, idx: number) => {
    const key = thikrKey(cat.id, thikr);
    setCounts(prev => {
      const cur = prev[key] ?? 0;
      if (cur >= thikr.count) return prev;
      const next = cur + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= thikr.count) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        pendingAdvance.current = setTimeout(() => {
          const nextIncompleteIdx = cat.adhkar.findIndex((d, i) => {
            if (i <= idx) return false;
            const k = thikrKey(cat.id, d);
            return (prev[k] ?? 0) < d.count;
          });
          if (nextIncompleteIdx !== -1) {
            readerRef.current?.scrollToIndex({ index: nextIncompleteIdx, animated: true, viewPosition: 0.1 });
          }
        }, 600);
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const getCount = useCallback((catId: string, thikr: Thikr) => {
    return counts[thikrKey(catId, thikr)] ?? 0;
  }, [counts]);

  const isDone = useCallback((catId: string, thikr: Thikr, required: number) => {
    return (counts[thikrKey(catId, thikr)] ?? 0) >= required;
  }, [counts]);

  const handleDone = useCallback((cat: AthkarCategory, thikr: Thikr, idx: number) => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCounts(prev => {
      const key = thikrKey(cat.id, thikr);
      if ((prev[key] ?? 0) >= thikr.count) return prev;
      const updated = { ...prev, [key]: thikr.count };
      const nextIncompleteIdx = cat.adhkar.findIndex((d, i) => {
        if (i <= idx) return false;
        const k = thikrKey(cat.id, d);
        return (updated[k] ?? 0) < d.count;
      });
      if (nextIncompleteIdx !== -1) {
        pendingAdvance.current = setTimeout(() => {
          readerRef.current?.scrollToIndex({ index: nextIncompleteIdx, animated: true, viewPosition: 0.1 });
        }, 300);
      }
      return updated;
    });
  }, []);

  const dismissFavHint = useCallback(() => {
    setFavHintSeen(true);
    AsyncStorage.setItem(FAV_HINT_KEY, 'true').catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {showPersonalReader ? (
        <PersonalReaderScreen
          lang={lang}
          isRtl={isRtl}
          tr={tr}
          C={C}
          topInset={topInset}
          bottomInset={bottomInset}
          items={personalItems}
          onSave={savePersonalItems}
          onBack={closeCategory}
          copyHintShown={copyHintShown}
          onCopyHintDismiss={dismissCopyHint}
          thikrReaderHintShown={thikrReaderHintShown}
          onThikrReaderHintDismiss={dismissThikrReaderHint}
        />
      ) : selectedCategory ? (
        <ReaderScreen
          category={selectedCategory}
          lang={lang}
          isRtl={isRtl}
          tr={tr}
          C={C}
          topInset={topInset}
          bottomInset={bottomInset}
          readerRef={readerRef}
          counts={counts}
          getCount={getCount}
          isDone={isDone}
          onTap={handleTap}
          onDone={handleDone}
          onBack={closeCategory}
          onReset={resetCounts}
          displayMode={displayMode}
          athkarLang={athkarLang}
          athkarFontSize={athkarFontSize}
          highlightIdx={highlightThikrIdx}
          highlightQuery={highlightQuery}
          restoredPosition={restoredPosition}
          onPositionChange={handlePositionChange}
          userCatItems={userCatItems[selectedCategory.id] ?? []}
          onUserCatItemsSave={(items) => saveUserCatItems(selectedCategory.id, items)}
          copyHintShown={copyHintShown}
          onCopyHintDismiss={dismissCopyHint}
          thikrReaderHintShown={thikrReaderHintShown}
          onThikrReaderHintDismiss={dismissThikrReaderHint}
          thikrGroupHintShown={thikrGroupHintShown}
          onThikrGroupHintDismiss={dismissThikrGroupHint}
        />
      ) : (
        <GridScreen
          lang={lang}
          isRtl={isRtl}
          tr={tr}
          C={C}
          topInset={topInset}
          bottomInset={bottomInset}
          displayMode={displayMode}
          onDisplayMode={setDisplayMode}
          onSelect={openCategory}
          onOpenPersonal={() => setShowPersonalReader(true)}
          personalItemCount={personalItems.length}
          favourites={favourites}
          onLongPress={toggleFavourite}
          sortedCategories={sortedCategories}
          orderedAllGridItems={orderedAllGridItems}
          onGridReorderSave={saveGridOrder}
          gridReorderHintShown={gridReorderHintShown}
          onGridReorderHintDismiss={dismissGridReorderHint}
          favHintSeen={favHintSeen}
          onFavHintDismiss={dismissFavHint}
          athkarLang={athkarLang}
          setAthkarLang={(l: Lang) => updateSettings({ translitLang: l })}
          athkarFontSize={athkarFontSize}
          setAthkarFontSize={setAthkarFontSize}
        />
      )}

    </View>
  );
}

interface GridProps {
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  displayMode: 'arabic' | 'full';
  onDisplayMode: (m: 'arabic' | 'full') => void;
  onSelect: (cat: AthkarCategory, hlIdx?: number, hlQuery?: string) => void;
  onOpenPersonal: () => void;
  personalItemCount: number;
  favourites: string[];
  onLongPress: (cat: AthkarCategory) => void; // kept for favourites page compat
  sortedCategories: AthkarCategory[];
  orderedAllGridItems: Array<'__personal__' | AthkarCategory>;
  onGridReorderSave: (ids: string[]) => void;
  gridReorderHintShown: boolean;
  onGridReorderHintDismiss: () => void;
  favHintSeen: boolean;
  onFavHintDismiss: () => void;
  athkarLang: Lang;
  setAthkarLang: (l: Lang) => void;
  athkarFontSize: AthkarFontSize;
  setAthkarFontSize: (fs: AthkarFontSize) => void;
}

function GridScreen({ lang, isRtl, tr, C, topInset, bottomInset, displayMode, onDisplayMode, onSelect, onOpenPersonal, personalItemCount, favourites, onLongPress, sortedCategories, orderedAllGridItems, onGridReorderSave, gridReorderHintShown, onGridReorderHintDismiss, favHintSeen, onFavHintDismiss, athkarLang, setAthkarLang, athkarFontSize, setAthkarFontSize }: GridProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderData, setReorderData] = useState<Array<'__personal__' | AthkarCategory>>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageListRef = useRef<FlatList<any>>(null);
  const athkarRtl = isRtlLang(athkarLang);
  const ITEMS_PER_PAGE = 16;
  const NUM_COLS = 4;
  const { width: screenWidth } = useWindowDimensions();
  const TILE_WIDTH = Math.floor((screenWidth - OUTER_PADDING * 2 - TILE_GAP * (COLUMNS - 1)) / COLUMNS);
  const TILE_HEIGHT = Math.floor(TILE_WIDTH * 1.35);
  const GRID_ROWS = 4;
  const GRID_HEIGHT = 8 + (TILE_HEIGHT * GRID_ROWS) + (TILE_GAP * (GRID_ROWS - 1));
  const fsIdx = STEP_ORDER.indexOf(athkarFontSize);
  const canDecrease = fsIdx > 0;
  const canIncrease = fsIdx < STEP_ORDER.length - 1;
  const labelFontSize = FONT_STEPS[athkarFontSize].tile;
  const SIZE_LABELS: Record<AthkarFontSize, string> = { xs: 'XS', sm: 'S', md: 'M', lg: 'L', xl: 'XL' };

  type GridItem = AthkarCategory | null | '__personal__';
  const allGridItems: GridItem[] = orderedAllGridItems as GridItem[];
  const totalCategoryPages = Math.ceil(allGridItems.length / ITEMS_PER_PAGE);
  const totalPages = totalCategoryPages + 1;

  const categoryPages: GridItem[][] = [];
  for (let p = 0; p < totalCategoryPages; p++) {
    const slice: GridItem[] = allGridItems.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    while (slice.length < ITEMS_PER_PAGE) slice.push(null);
    categoryPages.push(slice);
  }
  const favPage = favourites.map(id => sortedCategories.find(c => c.id === id) ?? null).filter(Boolean) as AthkarCategory[];
  const allPages: Array<GridItem[] | 'FAVS'> = [...categoryPages, 'FAVS'];

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentPage(viewableItems[0].index ?? 0);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const normQ = normalizeForAthkarSearch(q);
    const plainQ = q.toLowerCase();
    return sortedCategories.filter(cat => {
      const nameAr = normalizeForAthkarSearch((i18n['ar'] as any)[cat.nameKey] ?? '');
      const nameTr = ((i18n[athkarLang] as any)?.[cat.nameKey] ?? '').toLowerCase();
      const nameFallback = ((i18n['en'] as any)?.[cat.nameKey] ?? '').toLowerCase();
      if (nameAr.includes(normQ) || nameTr.includes(plainQ) || nameFallback.includes(plainQ)) return true;
      return cat.adhkar.some(d => {
        const ar = normalizeForAthkarSearch(d.arabic);
        const tl = d.transliteration.toLowerCase();
        const tKey = d.translationKey as any;
        const tEn = ((i18n['en'] as any)[tKey] ?? '').toLowerCase();
        const tLang = ((i18n[athkarLang] as any)?.[tKey] ?? '').toLowerCase();
        return ar.includes(normQ) || tl.includes(plainQ) || tEn.includes(plainQ) || tLang.includes(plainQ);
      });
    });
  }, [searchQuery, sortedCategories, athkarLang]);

  const enterReorderMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReorderData(orderedAllGridItems);
    setReorderMode(true);
  }, [orderedAllGridItems]);

  if (reorderMode) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16 }]}>
          <View style={{ flex: 1, flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold' }}>
              {tr.btn_done ? (tr.reorder_hint?.split(' ').slice(0, 3).join(' ') ?? 'Reorder') : 'Reorder'}
            </Text>
            <Pressable
              onPress={() => Alert.alert(
                tr.drag_to_reorder,
                tr.drag_to_reorder,
              )}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={16} color={C.textMuted} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onGridReorderSave(reorderData.map(it => it === '__personal__' ? '__personal__' : (it as AthkarCategory).id));
              setReorderMode(false);
            }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1, paddingHorizontal: 14, width: 'auto' as any }]}
          >
            <Text style={{ color: C.tintText, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{tr.btn_done}</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          {tr.drag_to_reorder}
        </Text>
        <DragSortList<'__personal__' | AthkarCategory>
          data={reorderData}
          keyExtractor={(item) => item === '__personal__' ? '__personal__' : (item as AthkarCategory).id}
          onDragEnd={(data) => setTimeout(() => setReorderData(data), 0)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 80, paddingTop: 8 }}
          itemGap={8}
          handleColor={C.tint}
          autoscrollThreshold={60}
          autoscrollSpeed={200}
          renderItem={({ item, isActive, dragHandle }) => {
            const isPersonal = item === '__personal__';
            const cat = item as AthkarCategory;
            const nameKey = isPersonal ? '' : cat.nameKey as any;
            const name = isPersonal
              ? (tr.personal_athkar)
              : displayMode === 'arabic'
                ? (i18n['ar'] as any)[nameKey] ?? nameKey
                : (i18n[athkarLang] as any)?.[nameKey] ?? nameKey;
            const isFav = !isPersonal && favourites.includes(cat.id);
            return (
              <View
                style={{
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: isActive ? C.tint + '18' : C.backgroundCard,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isActive ? C.tint + '66' : C.separator,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                {isPersonal
                  ? <Ionicons name="create-outline" size={22} color={GOLD} style={{ marginRight: 4 }} />
                  : <MaterialCommunityIcons name={cat.icon as any} size={22} color={isFav ? GOLD : C.tint} />
                }
                <Text style={{ flex: 1, fontSize: 14, color: isPersonal ? GOLD : (isFav ? GOLD : C.text), fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold', writingDirection: isRtlLang(athkarLang) ? 'rtl' : 'ltr' }}>
                  {name}
                </Text>
                {dragHandle}
              </View>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.gridTopHeader, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={[styles.headerTop, { marginBottom: 2 }]}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSearchQuery(''); setShowSearch(true); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
              testID="athkar-search-btn"
            >
              <Ionicons name="search" size={18} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); pageListRef.current?.scrollToEnd({ animated: true }); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
              testID="athkar-favs-btn"
            >
              <Ionicons name="star" size={17} color={GOLD} />
            </Pressable>
          </View>
        </View>

        {/* Font sizer — right below search/favourites buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Pressable
              onPress={() => { if (canDecrease) { Haptics.selectionAsync(); setAthkarFontSize(STEP_ORDER[fsIdx - 1]); } }}
              disabled={!canDecrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canDecrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted }]}>A−</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: C.textMuted, minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {SIZE_LABELS[athkarFontSize]}
            </Text>
            <Pressable
              onPress={() => { if (canIncrease) { Haptics.selectionAsync(); setAthkarFontSize(STEP_ORDER[fsIdx + 1]); } }}
              disabled={!canIncrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canIncrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted, fontSize: 14 }]}>A+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={showLangPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowLangPicker(false)}>
          <Pressable
            style={[styles.pickerSheet, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: C.separator }]}>
              <Text style={[styles.pickerTitle, { color: C.text }]}>
                {tr.translationLanguage}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(LANG_META) as Lang[]).filter(l => l !== 'ar').map(l => {
                const active = l === athkarLang;
                return (
                  <Pressable
                    key={l}
                    onPress={() => { Haptics.selectionAsync(); setAthkarLang(l); setShowLangPicker(false); }}
                    style={({ pressed }) => [
                      styles.pickerRow,
                      { borderBottomColor: C.separator, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.pickerFlag}>{LANG_FLAG[l] ?? ''}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerNative, { color: C.text, fontFamily: 'Inter_600SemiBold', textAlign: 'left' }]}>
                        {LANG_META[l]?.native ?? l}
                      </Text>
                      <Text style={[styles.pickerLang, { color: C.textMuted, textAlign: 'left' }]}>
                        {LANG_META[l]?.label ?? l}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={C.tint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 80 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        {/* Arabic / Transliterated segment — full width */}
        <View style={[styles.segmentRow, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onDisplayMode('arabic'); }}
            style={[styles.segmentBtn, displayMode === 'arabic' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="text" size={13} color={displayMode === 'arabic' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: displayMode === 'arabic' ? C.tintText : C.textMuted }]}>
              {tr.display_arabic}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onDisplayMode('full');
            }}
            style={[styles.segmentBtn, displayMode === 'full' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="language" size={13} color={displayMode === 'full' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: displayMode === 'full' ? C.tintText : C.textMuted }]}>
              {tr.athkar_mode_transliterated}
            </Text>
          </Pressable>
        </View>

        {/* Row 3: language dropdown — full width, only in transliterated mode */}
        {displayMode === 'full' && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
            style={({ pressed }) => [
              styles.athkarLangDropdown,
              { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: pressed ? 0.75 : 1, marginTop: 10 },
            ]}
          >
            <Text style={styles.athkarLangDropdownFlag}>{LANG_FLAG[athkarLang] ?? ''}</Text>
            <Text style={[styles.athkarLangDropdownText, { color: C.text, fontFamily: 'Inter_600SemiBold', textAlign: 'left' }]}>
              {LANG_META[athkarLang]?.native ?? athkarLang}
            </Text>
            <Text style={[styles.athkarLangDropdownLabel, { color: C.textMuted }]}>
              {LANG_META[athkarLang]?.label ?? ''}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ marginLeft: 'auto' }} />
          </Pressable>
        )}
      </View>
      {!favHintSeen && (
        <View style={[styles.favHintBanner, { backgroundColor: C.backgroundCard }]}>
          <Text style={[styles.favHintText, { color: C.textMuted, textAlign: isRtl ? 'right' : 'left', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}>
            {tr.athkar_hint_updated}
          </Text>
          <Pressable onPress={onFavHintDismiss} hitSlop={12}>
            <Ionicons name="close" size={16} color={C.textMuted} />
          </Pressable>
        </View>
      )}
      {!gridReorderHintShown && (
        <GridReorderHintBanner tr={tr} C={C} isRtl={isRtl} onDismiss={onGridReorderHintDismiss} />
      )}

      {/* Reorder groups button — sits just above the grid */}
      <View style={{ flexDirection: isRtl ? 'row' : 'row-reverse', paddingHorizontal: 16, paddingBottom: 6 }}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); enterReorderMode(); }}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
          testID="athkar-reorder-btn"
        >
          <Ionicons name="reorder-three-outline" size={20} color={C.tint} />
        </Pressable>
      </View>

      <View style={{ height: GRID_HEIGHT }}>
      <FlatList
        ref={pageListRef}
        data={allPages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ height: GRID_HEIGHT }}
        extraData={[favourites, displayMode, athkarLang, athkarFontSize, personalItemCount]}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        renderItem={({ item: pageData }) => {
          if (pageData === 'FAVS') {
            const padded: (AthkarCategory | null)[] = [...favPage];
            while (padded.length % NUM_COLS !== 0) padded.push(null);
            const favRows: (AthkarCategory | null)[][] = [];
            for (let r = 0; r < padded.length; r += NUM_COLS) {
              favRows.push(padded.slice(r, r + NUM_COLS));
            }
            return (
              <View style={{ width: screenWidth, paddingHorizontal: OUTER_PADDING, paddingTop: 8 }}>
                <Text style={[styles.favPageTitle, { fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_700Bold', textAlign: isRtl ? 'right' : 'left' }]}>
                  {tr.athkar_favourites_title}
                </Text>
                {favPage.length === 0 ? (
                  <View style={styles.noFavContainer}>
                    <Text style={[styles.noFavText, { color: C.textMuted, textAlign: 'center', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}>
                      {tr.athkar_no_favourites}
                    </Text>
                  </View>
                ) : favRows.map((row, rIdx) => (
                  <View
                    key={rIdx}
                    style={{
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      gap: TILE_GAP,
                      marginBottom: rIdx < favRows.length - 1 ? TILE_GAP : 0,
                    }}
                  >
                    {row.map((cat, cIdx) => cat ? (
                      <GridCell
                        key={cat.id}
                        cat={cat}
                        lang={lang}
                        isRtl={isRtl}
                        tr={tr}
                        C={C}
                        onPress={onSelect}
                        isFavourite={true}
                        onLongPress={c => onLongPress(c)}
                        displayMode={displayMode}
                        athkarLang={athkarLang}
                        tileSize={TILE_WIDTH}
                        tileHeight={TILE_HEIGHT}
                        labelFontSize={labelFontSize}
                      />
                    ) : (
                      <View key={`fav-empty-${rIdx}-${cIdx}`} style={{ width: TILE_WIDTH, height: TILE_HEIGHT }} />
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          const pageItems = pageData as GridItem[];
          const rows: GridItem[][] = [];
          for (let r = 0; r < ITEMS_PER_PAGE / NUM_COLS; r++) {
            rows.push(pageItems.slice(r * NUM_COLS, (r + 1) * NUM_COLS));
          }
          return (
            <View style={{ width: screenWidth, paddingHorizontal: OUTER_PADDING, paddingTop: 8 }}>
              {rows.map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={{
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    gap: TILE_GAP,
                    marginBottom: rIdx < rows.length - 1 ? TILE_GAP : 0,
                  }}
                >
                  {row.map((item, cIdx) => {
                    if (item === '__personal__') {
                      return (
                        <PersonalGridCell
                          key="__personal__"
                          isRtl={isRtl}
                          tr={tr}
                          C={C}
                          onPress={onOpenPersonal}
                          personalItemCount={personalItemCount}
                          tileSize={TILE_WIDTH}
                          tileHeight={TILE_HEIGHT}
                          labelFontSize={labelFontSize}
                        />
                      );
                    }
                    if (item === null) {
                      return <View key={`empty-${rIdx}-${cIdx}`} style={{ width: TILE_WIDTH, height: TILE_HEIGHT }} />;
                    }
                    return (
                      <GridCell
                        key={item.id}
                        cat={item}
                        lang={lang}
                        isRtl={isRtl}
                        tr={tr}
                        C={C}
                        onPress={onSelect}
                        isFavourite={favourites.includes(item.id)}
                        onLongPress={c => onLongPress(c)}
                        displayMode={displayMode}
                        athkarLang={athkarLang}
                        tileSize={TILE_WIDTH}
                        tileHeight={TILE_HEIGHT}
                        labelFontSize={labelFontSize}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          );
        }}
      />

      {/* Page nav arrows — overlaid left/right edges of the grid */}
      {currentPage > 0 && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            pageListRef.current?.scrollToIndex({ index: currentPage - 1, animated: true });
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 36,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.4 : 0.55,
          })}
        >
          <Ionicons name="chevron-back" size={24} color={C.tint} />
        </Pressable>
      )}
      {currentPage < totalPages - 1 && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            pageListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 36,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.4 : 0.55,
          })}
        >
          <Ionicons name="chevron-forward" size={24} color={C.tint} />
        </Pressable>
      )}
      </View>

      <View style={styles.pageDotsRow}>
        {Array.from({ length: totalPages }).map((_, i) => {
          const isFav = i === totalPages - 1;
          const active = i === currentPage;
          if (isFav) {
            return (
              <Pressable key={i} onPress={() => pageListRef.current?.scrollToEnd({ animated: true })} hitSlop={8}>
                <Text style={[styles.pageDotStar, { opacity: active ? 1 : 0.4 }]}>⭐</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={i}
              onPress={() => pageListRef.current?.scrollToIndex({ index: i, animated: true })}
              hitSlop={8}
            >
              <View style={[styles.pageDot, { backgroundColor: active ? C.tint : C.separator }]} />
            </Pressable>
          );
        })}
      </View>

      </ScrollView>

      <Modal
        visible={showSearch}
        transparent={false}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={[styles.root, { backgroundColor: C.background }]}>
          <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16, gap: 8 }]}>
            <Pressable
              onPress={() => setShowSearch(false)}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="close" size={20} color={C.tint} />
            </Pressable>
            <View style={[styles.searchInputWrap, { backgroundColor: C.backgroundCard, borderColor: C.separator, flex: 1 }]}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}
                placeholder={tr.athkar_search_placeholder}
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
                textAlign={isRtl ? 'right' : 'left'}
              />
              {!!searchQuery && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={c => c.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={searchQuery.trim().length > 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', fontSize: 15 }}>
                  {tr.athkar_search_empty}
                </Text>
              </View>
            ) : null}
            renderItem={({ item: cat }) => {
              const nameKey = cat.nameKey as any;
              const catName = displayMode === 'arabic'
                ? (i18n['ar'] as any)[nameKey] ?? nameKey
                : (i18n[athkarLang] as any)?.[nameKey] ?? nameKey;
              const cellRtl = displayMode === 'arabic' || isRtlLang(athkarLang);
              return (
                <Pressable
                  onPress={() => {
                    setShowSearch(false);
                    const rawQ = searchQuery.trim();
                    const normQ = normalizeForAthkarSearch(rawQ);
                    const plainQ = rawQ.toLowerCase();
                    let hlIdx = -1;
                    if (rawQ) {
                      hlIdx = cat.adhkar.findIndex(d => {
                        const tKey = d.translationKey as any;
                        const tText = ((i18n[athkarLang] as any)?.[tKey] ?? '').toLowerCase();
                        const tEn = ((i18n['en'] as any)?.[tKey] ?? '').toLowerCase();
                        return normalizeForAthkarSearch(d.arabic).includes(normQ)
                          || d.transliteration.toLowerCase().includes(plainQ)
                          || tText.includes(plainQ)
                          || tEn.includes(plainQ);
                      });
                    }
                    onSelect(cat, hlIdx >= 0 ? hlIdx : undefined, hlIdx >= 0 ? rawQ : undefined);
                  }}
                  style={({ pressed }) => [styles.searchResultRow, { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: pressed ? 0.75 : 1 }]}
                >
                  <MaterialCommunityIcons name={cat.icon as any} size={24} color={favourites.includes(cat.id) ? GOLD : C.tint} />
                  <Text style={[styles.searchResultText, { color: C.text, writingDirection: cellRtl ? 'rtl' : 'ltr', fontFamily: cellRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold' }]}>
                    {catName}
                  </Text>
                  <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={16} color={C.textMuted} style={{ marginLeft: 'auto' }} />
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function CopyHintBanner({ tr, C, isRtl, onDismiss }: { tr: any; C: any; isRtl: boolean; onDismiss: () => void }) {
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 });
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.favHintBanner, animStyle, { backgroundColor: C.tint + '18', borderWidth: StyleSheet.hairlineWidth, borderColor: C.tint + '55', marginBottom: 6 }]}>
      <Ionicons name="copy-outline" size={16} color={C.tint} />
      <Text style={[styles.favHintText, { color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', textAlign: isRtl ? 'right' : 'left' }]}>
        {tr.copy_hint}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={C.tint} />
      </Pressable>
    </Animated.View>
  );
}

function ThikrReaderHintBanner({ tr, C, isRtl, onDismiss }: { tr: any; C: any; isRtl: boolean; onDismiss: () => void }) {
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 });
      setTimeout(onDismiss, 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.favHintBanner, animStyle, { backgroundColor: C.tint + '18', borderWidth: StyleSheet.hairlineWidth, borderColor: C.tint + '55', marginBottom: 6 }]}>
      <Ionicons name="information-circle-outline" size={16} color={C.tint} />
      <Text style={[styles.favHintText, { color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', textAlign: isRtl ? 'right' : 'left' }]}>
        {tr.thikr_reader_hint}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={C.tint} />
      </Pressable>
    </Animated.View>
  );
}

function GridReorderHintBanner({ tr, C, isRtl, onDismiss }: { tr: any; C: any; isRtl: boolean; onDismiss: () => void }) {
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 });
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.favHintBanner, animStyle, { backgroundColor: C.tint + '18', borderWidth: StyleSheet.hairlineWidth, borderColor: C.tint + '55', marginBottom: 4 }]}>
      <Ionicons name="reorder-three-outline" size={16} color={C.tint} />
      <Text style={[styles.favHintText, { color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', textAlign: isRtl ? 'right' : 'left' }]}>
        {tr.reorder_hint}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={C.tint} />
      </Pressable>
    </Animated.View>
  );
}

function PersonalGridCell({ isRtl, tr, C, onPress, personalItemCount, tileSize, tileHeight, labelFontSize }: {
  isRtl: boolean; tr: any; C: any;
  onPress: () => void; personalItemCount: number;
  tileSize: number; tileHeight: number; labelFontSize: number;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.cell,
        {
          width: tileSize,
          height: tileHeight,
          backgroundColor: GOLD + '22',
          borderColor: GOLD + '66',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Ionicons name="create-outline" size={26} color={GOLD} />
      <Text
        style={[
          styles.cellLabel,
          {
            fontSize: labelFontSize,
            lineHeight: labelFontSize * 1.35,
            color: GOLD,
            textAlign: 'center',
            fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold',
          },
        ]}
        numberOfLines={3}
        adjustsFontSizeToFit={false}
      >
        {tr.personal_athkar}
      </Text>
      {personalItemCount > 0 && (
        <View style={{ position: 'absolute', top: 5, right: 5, backgroundColor: GOLD, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={{ fontSize: 9, color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' }}>{personalItemCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

interface CellProps {
  cat: AthkarCategory;
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  onPress: (cat: AthkarCategory) => void;
  isFavourite: boolean;
  onLongPress: (cat: AthkarCategory) => void;
  displayMode: 'arabic' | 'full';
  athkarLang: Lang;
  tileSize: number;
  tileHeight: number;
  labelFontSize: number;
}

function GridCell({ cat, lang, isRtl, tr, C, onPress, isFavourite, onLongPress, displayMode, athkarLang, tileSize, tileHeight, labelFontSize }: CellProps) {
  const nameKey = cat.nameKey as any;
  const name = displayMode === 'arabic'
    ? (i18n['ar'] as any)[nameKey] ?? nameKey
    : (i18n[athkarLang] as any)?.[nameKey] ?? nameKey;
  const cellRtl = displayMode === 'arabic' || isRtlLang(athkarLang);

  return (
    <Pressable
      onPress={() => onPress(cat)}
      onLongPress={() => onLongPress(cat)}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.cell,
        {
          width: tileSize,
          height: tileHeight,
          backgroundColor: isFavourite ? GOLD + '1A' : C.backgroundCard,
          borderColor: isFavourite ? GOLD : C.separator,
          borderWidth: isFavourite ? 1.5 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {isFavourite && (
        <View style={styles.favBadge}>
          <Ionicons name="heart" size={11} color={GOLD} />
        </View>
      )}
      <MaterialCommunityIcons name={cat.icon as any} size={26} color={isFavourite ? GOLD : C.tint} />
      <Text
        style={[
          styles.cellLabel,
          {
            fontSize: labelFontSize,
            lineHeight: labelFontSize * 1.35,
            color: isFavourite ? GOLD : C.text,
            textAlign: 'center',
            writingDirection: cellRtl ? 'rtl' : 'ltr',
            fontFamily: cellRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold',
          },
        ]}
        numberOfLines={3}
        adjustsFontSizeToFit={false}
      >
        {name}
      </Text>
    </Pressable>
  );
}

interface ReaderProps {
  category: AthkarCategory;
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  readerRef: React.RefObject<FlatList<Thikr> | null>;
  counts: Record<string, number>;
  getCount: (catId: string, thikr: Thikr) => number;
  isDone: (catId: string, thikr: Thikr, required: number) => boolean;
  onTap: (cat: AthkarCategory, thikr: Thikr, idx: number) => void;
  onDone: (cat: AthkarCategory, thikr: Thikr, idx: number) => void;
  onBack: () => void;
  onReset: () => void;
  displayMode: 'arabic' | 'full';
  athkarLang: Lang;
  athkarFontSize: AthkarFontSize;
  highlightIdx?: number;
  highlightQuery?: string;
  restoredPosition?: number;
  onPositionChange?: (index: number) => void;
  userCatItems: PersonalThikrItem[];
  onUserCatItemsSave: (items: PersonalThikrItem[]) => void;
  copyHintShown: boolean;
  onCopyHintDismiss: () => void;
  thikrReaderHintShown: boolean;
  onThikrReaderHintDismiss: () => void;
  thikrGroupHintShown: boolean;
  onThikrGroupHintDismiss: () => void;
}

// ─── Swipeable Reader ──────────────────────────────────────────────────────
// One thikr per full-screen page. Horizontal FlatList with pagingEnabled.
// Used by both the per-category reader and the Personal Athkar reader.

interface SwipeableReaderProps {
  categoryName: string;
  categoryNameRtl: boolean;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  pages: SwipePage[];
  onBack: () => void;
  onReset: () => void;
  /** Tap the counter to count up by one (returns whether reps reached count). */
  onTap: (page: SwipePage) => void;
  /** Force-complete via the Done button. */
  onDone: (page: SwipePage) => void;
  onEditUser?: (item: PersonalThikrItem) => void;
  onDeleteUser?: (id: string) => void;
  onAddUser?: () => void;
  athkarLang: Lang;
  athkarFontSize: AthkarFontSize;
  displayMode: 'arabic' | 'full';
  initialIndex?: number;
  searchHighlightIndex?: number;
  searchHighlightQuery?: string;
  /** Notified when the reader page changes, so the parent can persist position. */
  onPositionChange?: (index: number) => void;
  /** Custom title for the header chips/back row. */
  showLangToggleInHeader?: boolean;
}

interface SwipePage {
  key: string;
  arabic: string;
  transliteration: string;
  translation: string;
  translationRtl: boolean;
  required: number;
  current: number;
  done: boolean;
  /** Used by the parent to identify which item this page represents. */
  userItem?: PersonalThikrItem;
  builtinThikr?: Thikr;
  builtinIndex?: number;
}

function SwipeableReader(props: SwipeableReaderProps) {
  const {
    categoryName, categoryNameRtl, isRtl, tr, C,
    topInset, bottomInset, pages,
    onBack, onReset, onTap, onDone,
    onEditUser, onDeleteUser, onAddUser,
    athkarLang, athkarFontSize, displayMode,
    initialIndex = 0,
    searchHighlightIndex = -1,
    searchHighlightQuery = '',
    onPositionChange,
    showLangToggleInHeader = true,
  } = props;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // The tab bar is position:'absolute' with a translucent BlurView, so this reader
  // renders BEHIND it. useBottomTabBarHeight() gives the full bar height (tab bar +
  // home-indicator inset) so the bottom action row clears it — insets.bottom alone
  // (the home indicator only) left the skip-to-complete button half-hidden.
  const tabBarHeight = useBottomTabBarHeight();
  const trContent = t(athkarLang);
  const cardFS = FONT_STEPS[athkarFontSize];
  const listRef = useRef<FlatList<SwipePage>>(null);
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, Math.min(initialIndex, pages.length - 1)));
  const [transliterationCollapsed, setTransliterationCollapsed] = useState<Record<string, boolean>>({});

  // Notify the parent when the page changes so it can persist the position.
  // Via a ref so a changing callback identity doesn't refire on every render.
  const onPosRef = useRef(onPositionChange);
  useEffect(() => { onPosRef.current = onPositionChange; });
  useEffect(() => { onPosRef.current?.(currentIndex); }, [currentIndex]);

  // Toast for copy feedback.
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useSharedValue(0);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastVisible(true);
    toastOpacity.value = withTiming(1, { duration: 150 });
    toastTimerRef.current = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 250 });
      setTimeout(() => setToastVisible(false), 250);
    }, 1000);
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Clipboard.setStringAsync(text);
    } catch { /* ignore */ }
    showCopyToast();
  }, [showCopyToast]);

  // Progress bar reflects total completed pages.
  const total = pages.length;
  const doneCount = pages.filter(p => p.done).length;
  const progress = total > 0 ? doneCount / total : 0;
  const progressWidth = useSharedValue(progress);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` as any }));

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Auto-advance to next not-done page after a small delay when a page completes.
  const lastAutoAdvanceFor = useRef<string | null>(null);
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= pages.length) return;
    const page = pages[currentIndex];
    if (!page || !page.done) return;
    if (lastAutoAdvanceFor.current === page.key) return;
    lastAutoAdvanceFor.current = page.key;
    const timer = setTimeout(() => {
      const nextIncomplete = pages.findIndex((p, i) => i > currentIndex && !p.done);
      if (nextIncomplete >= 0) {
        listRef.current?.scrollToIndex({ index: nextIncomplete, animated: true });
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [currentIndex, pages]);

  // Jump to highlighted page when the reader opens from search.
  useEffect(() => {
    if (searchHighlightIndex >= 0 && searchHighlightIndex < pages.length) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: searchHighlightIndex, animated: false });
        setCurrentIndex(searchHighlightIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchHighlightIndex, pages.length]);

  const goPrev = useCallback(() => {
    const target = Math.max(0, currentIndex - 1);
    Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index: target, animated: true });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    const target = Math.min(pages.length - 1, currentIndex + 1);
    Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index: target, animated: true });
  }, [currentIndex, pages.length]);

  const empty = pages.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, flex: 1, textAlign: 'center', fontFamily: categoryNameRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold', writingDirection: categoryNameRtl ? 'rtl' : 'ltr' }]} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {showLangToggleInHeader && <LangToggle />}
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
          </Pressable>
          {onAddUser && (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); onAddUser(); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="add" size={20} color={C.tintText} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.progressRow, { paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundCard, flex: 1 }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.tint }, progressStyle]} />
        </View>
        <Text style={[styles.progressLabel, { color: C.textMuted }]}>{doneCount}/{total}</Text>
      </View>

      {empty ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
          <Ionicons name="bookmark-outline" size={48} color={C.textMuted} />
          <Text style={{ fontSize: 15, color: C.textMuted, textAlign: 'center', fontFamily: 'Inter_400Regular', lineHeight: 22 }}>
            {tr.add_thikr}
          </Text>
          {onAddUser && (
            <Pressable
              onPress={onAddUser}
              style={({ pressed }) => ({ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ color: C.tintText, fontWeight: '600', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>+</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={pages}
            keyExtractor={(p) => p.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={initialIndex < pages.length ? initialIndex : 0}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            onScrollToIndexFailed={() => {}}
            extraData={[currentIndex, athkarLang, displayMode, athkarFontSize, transliterationCollapsed]}
            renderItem={({ item: page, index }) => {
              const isHighlighted = searchHighlightIndex === index && !!searchHighlightQuery;
              const transliterationVisible = !transliterationCollapsed[page.key];
              return (
                <View style={{ width: screenWidth, paddingHorizontal: 20 }}>
                  <View style={{ alignItems: 'center', paddingTop: 16 }}>
                    <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: categoryNameRtl ? 'Amiri_400Regular' : 'Inter_400Regular', textAlign: 'center', writingDirection: categoryNameRtl ? 'rtl' : 'ltr', letterSpacing: 0.5 }}>
                      {categoryName}
                    </Text>
                    <Text style={{ fontSize: 14, color: C.tint, fontFamily: 'Inter_700Bold', fontWeight: '700', marginTop: 4, letterSpacing: 1 }}>
                      {index + 1} / {pages.length}
                    </Text>
                  </View>

                  <ScrollView
                    style={{ flex: 1, marginTop: 12 }}
                    contentContainerStyle={{ paddingBottom: bottomInset + 24, alignItems: 'stretch' }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Arabic — large, centered, long-press to copy */}
                    <Pressable
                      onLongPress={() => handleCopy(page.arabic)}
                      delayLongPress={350}
                      style={({ pressed }) => ({
                        padding: 18,
                        borderRadius: 18,
                        backgroundColor: isHighlighted
                          ? C.tint + '18'
                          : page.done ? C.tint + '12' : C.backgroundCard,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: isHighlighted ? C.tint + '88'
                          : page.done ? C.tint + '55' : C.separator,
                        opacity: pressed ? 0.95 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontFamily: 'Amiri_700Bold',
                          fontSize: Math.max(cardFS.arabic + 4, 24),
                          lineHeight: Math.max(cardFS.arabic + 4, 24) * 1.85,
                          color: page.done ? C.tint : C.text,
                          textAlign: 'center',
                          writingDirection: 'rtl',
                        }}
                        selectable
                      >
                        {isHighlighted
                          ? inlineHighlight(page.arabic, searchHighlightQuery, C.tint)
                          : page.arabic}
                      </Text>
                    </Pressable>

                    {/* Transliteration — collapsible */}
                    {displayMode === 'full' && !!page.transliteration && (
                      <View style={{ marginTop: 14 }}>
                        <Pressable
                          onPress={() => setTransliterationCollapsed(prev => ({ ...prev, [page.key]: !prev[page.key] }))}
                          style={({ pressed }) => ({
                            flexDirection: isRtl ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 4,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons
                            name={transliterationVisible ? 'chevron-down' : (isRtl ? 'chevron-back' : 'chevron-forward')}
                            size={14}
                            color={C.textMuted}
                          />
                          <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 }}>
                            {trContent.transliteration}
                          </Text>
                        </Pressable>
                        {transliterationVisible && (
                          <Text
                            selectable
                            style={{
                              fontSize: cardFS.translit + 1,
                              lineHeight: (cardFS.translit + 1) * 1.55,
                              color: C.textSecond,
                              fontStyle: 'italic',
                              textAlign: 'center',
                              marginTop: 6,
                            }}
                          >
                            {isHighlighted
                              ? inlineHighlight(transliterateToScript(page.transliteration, athkarLang), searchHighlightQuery, C.tint)
                              : transliterateToScript(page.transliteration, athkarLang)}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Translation */}
                    {displayMode === 'full' && !!page.translation && (
                      <Text
                        selectable
                        style={{
                          fontSize: cardFS.translation + 1,
                          lineHeight: (cardFS.translation + 1) * 1.55,
                          color: page.done ? C.tint + 'cc' : C.textSecond,
                          textAlign: page.translationRtl ? 'right' : 'center',
                          writingDirection: page.translationRtl ? 'rtl' : 'ltr',
                          fontFamily: page.translationRtl ? 'Amiri_400Regular' : 'Inter_400Regular',
                          marginTop: 14,
                        }}
                      >
                        {isHighlighted
                          ? inlineHighlight(page.translation, searchHighlightQuery, C.tint)
                          : page.translation}
                      </Text>
                    )}

                    {/* User-item label + edit/delete row */}
                    {page.userItem && (
                      <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                        {onEditUser && (
                          <Pressable
                            onPress={() => onEditUser(page.userItem!)}
                            style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.backgroundSecond, opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 5 })}
                          >
                            <Ionicons name="pencil-outline" size={14} color={C.textMuted} />
                            <Text style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter_600SemiBold' }}>
                              {tr.edit}
                            </Text>
                          </Pressable>
                        )}
                        {onDeleteUser && (
                          <Pressable
                            onPress={() => onDeleteUser(page.userItem!.id)}
                            style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.danger + '18', opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 5 })}
                          >
                            <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                            <Text style={{ fontSize: 12, color: C.danger, fontFamily: 'Inter_600SemiBold' }}>
                              {tr.delete}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              );
            }}
          />

          {/* Bottom counter + arrows row */}
          <View style={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 12, paddingTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={goPrev}
              disabled={currentIndex === 0}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: C.surface,
                  opacity: currentIndex === 0 ? 0.3 : (pressed ? 0.7 : 1),
                },
              ]}
            >
              <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={22} color={C.tint} />
            </Pressable>

            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              {pages[currentIndex] && (
                <>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTap(pages[currentIndex]!); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: pages[currentIndex]!.done ? C.tint : C.separator,
                      backgroundColor: pages[currentIndex]!.done ? C.tint : C.backgroundCard,
                      opacity: pressed ? 0.85 : 1,
                      minWidth: 130,
                      alignItems: 'center',
                    })}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold', color: pages[currentIndex]!.done ? C.tintText : C.text }}>
                      {pages[currentIndex]!.current}/{pages[currentIndex]!.required}
                    </Text>
                  </Pressable>
                  {pages[currentIndex]!.required > 7 && !pages[currentIndex]!.done && (
                    <Pressable
                      onPress={() => onDone(pages[currentIndex]!)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
                        backgroundColor: C.tint + '18', borderWidth: 1, borderColor: C.tint + '55',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={C.tint} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: C.tint, fontFamily: 'Inter_600SemiBold' }}>
                        {tr.done}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>

            <Pressable
              onPress={goNext}
              disabled={currentIndex >= pages.length - 1}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: C.surface,
                  opacity: currentIndex >= pages.length - 1 ? 0.3 : (pressed ? 0.7 : 1),
                },
              ]}
            >
              <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={22} color={C.tint} />
            </Pressable>
          </View>
        </View>
      )}

      {toastVisible && (
        <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
          <View style={[styles.toastBox, { backgroundColor: C.tint }]}>
            <Ionicons name="checkmark-circle" size={18} color={C.tintText} />
            <Text style={[styles.toastText, { color: C.tintText }]}>{tr.copied_successfully ?? tr.copied_toast}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── ReaderScreen — per-category swipeable reader ──────────────────────────

function ReaderScreen({
  category, lang, isRtl, tr, C,
  topInset, bottomInset,
  counts, getCount, isDone, onTap, onDone, onBack, onReset,
  displayMode, athkarLang, athkarFontSize,
  highlightIdx = -1, highlightQuery = '',
  restoredPosition = 0, onPositionChange,
  userCatItems, onUserCatItemsSave,
}: ReaderProps) {
  const athkarRtl = isRtlLang(athkarLang);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const handleReset = useCallback(() => {
    setUserCounts({});
    onReset();
  }, [onReset]);

  // Form modal for adding / editing user thikr items.
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserItem, setEditingUserItem] = useState<PersonalThikrItem | null>(null);
  const [formText, setFormText] = useState('');
  const [formName, setFormName] = useState('');
  const [formReps, setFormReps] = useState('3');

  const openAddUser = useCallback(() => {
    setEditingUserItem(null);
    setFormText('');
    setFormName('');
    setFormReps('3');
    setShowUserForm(true);
  }, []);

  const openEditUser = useCallback((item: PersonalThikrItem) => {
    setEditingUserItem(item);
    setFormText(item.text);
    setFormName(item.name ?? '');
    setFormReps(String(item.repetitions));
    setShowUserForm(true);
  }, []);

  const handleSaveUserForm = useCallback(() => {
    const text = formText.trim();
    if (!text) return;
    const reps = Math.max(1, Math.min(999, parseInt(formReps, 10) || 1));
    if (editingUserItem) {
      onUserCatItemsSave(userCatItems.map(it => it.id === editingUserItem.id
        ? { ...it, text, name: formName.trim() || undefined, repetitions: reps }
        : it));
    } else {
      onUserCatItemsSave([
        ...userCatItems,
        { id: String(Date.now()), text, name: formName.trim() || undefined, repetitions: reps },
      ]);
    }
    setShowUserForm(false);
  }, [formText, formName, formReps, editingUserItem, userCatItems, onUserCatItemsSave]);

  const handleDeleteUser = useCallback((id: string) => {
    Alert.alert(
      tr.delete,
      undefined,
      [
        { text: tr.btn_cancel, style: 'cancel' },
        {
          text: tr.delete,
          style: 'destructive',
          onPress: () => {
            onUserCatItemsSave(userCatItems.filter(it => it.id !== id));
            setUserCounts(prev => { const n = { ...prev }; delete n[id]; return n; });
          },
        },
      ],
    );
  }, [tr, userCatItems, onUserCatItemsSave]);

  // Build the page list — built-in adhkar first, user-added items at the end.
  const pages: SwipePage[] = useMemo(() => {
    const builtin: SwipePage[] = category.adhkar.map((thikr, i) => {
      const required = thikr.count;
      const current = Math.min(getCount(category.id, thikr), required);
      const done = isDone(category.id, thikr, required);
      // 90 of 202 meaning keys are missing from every non-English partial, so a
      // missing lookup fell through to '' — Arabic + transliteration then a BLANK
      // meaning. Fall back to the English base (never blank) instead. No new
      // translations are generated; this is fallback only.
      const translation = (i18n[athkarLang] as any)?.[thikr.translationKey]
        ?? (i18n.en as any)?.[thikr.translationKey]
        ?? '';
      return {
        key: `b-${i}`,
        arabic: thikr.arabic,
        transliteration: thikr.transliteration,
        translation,
        translationRtl: athkarRtl,
        required,
        current,
        done,
        builtinThikr: thikr,
        builtinIndex: i,
      };
    });
    const user: SwipePage[] = userCatItems.map(item => {
      const current = Math.min(userCounts[item.id] ?? 0, item.repetitions);
      const done = current >= item.repetitions;
      return {
        key: `u-${item.id}`,
        arabic: item.text,
        transliteration: '',
        translation: item.name ?? '',
        translationRtl: false,
        required: item.repetitions,
        current,
        done,
        userItem: item,
      };
    });
    return [...builtin, ...user];
  }, [category, counts, userCatItems, userCounts, athkarLang, athkarRtl, getCount, isDone]);

  const handleTap = useCallback((page: SwipePage) => {
    if (page.builtinThikr && page.builtinIndex !== undefined) {
      onTap(category, page.builtinThikr, page.builtinIndex);
    } else if (page.userItem) {
      const item = page.userItem;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUserCounts(prev => {
        const cur = prev[item.id] ?? 0;
        if (cur >= item.repetitions) return prev;
        const next = cur + 1;
        if (next >= item.repetitions) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return { ...prev, [item.id]: next };
      });
    }
  }, [category, onTap]);

  const handleDone = useCallback((page: SwipePage) => {
    if (page.builtinThikr && page.builtinIndex !== undefined) {
      onDone(category, page.builtinThikr, page.builtinIndex);
    } else if (page.userItem) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserCounts(prev => ({ ...prev, [page.userItem!.id]: page.userItem!.repetitions }));
    }
  }, [category, onDone]);

  const nameKey = category.nameKey as any;
  const catName = displayMode === 'arabic'
    ? (i18n['ar'] as any)[nameKey] ?? nameKey
    : (i18n[athkarLang] as any)?.[nameKey] ?? nameKey;
  const catNameRtl = displayMode === 'arabic' || isRtlLang(athkarLang);

  // Map a search highlight catalog index → corresponding builtin page index.
  // Search highlight target (>=0 only while searching). When not searching, open
  // at the restored reader position instead.
  const searchIndex = useMemo(() => {
    if (highlightIdx < 0) return -1;
    return pages.findIndex(p => p.builtinIndex === highlightIdx);
  }, [highlightIdx, pages]);
  const initialIndex = searchIndex >= 0
    ? searchIndex
    : Math.max(0, Math.min(restoredPosition, pages.length - 1));

  return (
    <>
      <SwipeableReader
        categoryName={catName}
        categoryNameRtl={catNameRtl}
        isRtl={isRtl}
        tr={tr}
        C={C}
        topInset={topInset}
        bottomInset={bottomInset}
        pages={pages}
        onBack={onBack}
        onReset={handleReset}
        onTap={handleTap}
        onDone={handleDone}
        onAddUser={openAddUser}
        onEditUser={openEditUser}
        onDeleteUser={handleDeleteUser}
        athkarLang={athkarLang}
        athkarFontSize={athkarFontSize}
        displayMode={displayMode}
        initialIndex={initialIndex}
        searchHighlightIndex={searchIndex}
        onPositionChange={onPositionChange}
        searchHighlightQuery={highlightQuery}
      />

      {/* Add/Edit user thikr modal */}
      <UserThikrFormModal
        visible={showUserForm}
        editingItem={editingUserItem}
        topInset={topInset}
        isRtl={isRtl}
        tr={tr}
        C={C}
        formText={formText}
        setFormText={setFormText}
        formName={formName}
        setFormName={setFormName}
        formReps={formReps}
        setFormReps={setFormReps}
        onClose={() => setShowUserForm(false)}
        onSave={handleSaveUserForm}
      />
    </>
  );
}

// ─── inlineHighlight ───────────────────────────────────────────────────────
// Used by SwipeableReader to render search-term highlights inside Arabic /
// transliteration / translation text without losing diacritic-aware matching.

function inlineHighlight(text: string, query: string, tintColor: string): React.ReactNode[] {
  if (!query || !text) return [text];
  const normQuery = normalizeForAthkarSearch(query);
  if (!normQuery) return [text];

  const normToOrig: number[] = [];
  let normStr = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[ً-ٰٟؐ-ؚ]/.test(ch)) continue;
    normStr += /[أإآٱ]/.test(ch) ? 'ا' : ch.toLowerCase();
    normToOrig.push(i);
  }

  if (!normStr.includes(normQuery)) return [text];

  const parts: React.ReactNode[] = [];
  let normIdx = 0;
  let lastOrigIdx = 0;

  while (normIdx <= normStr.length - normQuery.length) {
    const mi = normStr.indexOf(normQuery, normIdx);
    if (mi === -1) break;
    const origStart = normToOrig[mi]!;
    const normEnd = mi + normQuery.length;
    const origEnd = normEnd < normToOrig.length ? normToOrig[normEnd]! : text.length;
    if (origStart > lastOrigIdx) parts.push(text.slice(lastOrigIdx, origStart));
    parts.push(
      <Text key={`hl-${mi}`} style={{ backgroundColor: tintColor + '33', color: tintColor }}>
        {text.slice(origStart, origEnd)}
      </Text>
    );
    lastOrigIdx = origEnd;
    normIdx = normEnd || normIdx + 1;
  }
  if (lastOrigIdx < text.length) parts.push(text.slice(lastOrigIdx));
  return parts;
}

// ─── UserThikrFormModal — shared add/edit modal ───────────────────────────

interface UserThikrFormModalProps {
  visible: boolean;
  editingItem: PersonalThikrItem | null;
  topInset: number;
  isRtl: boolean;
  tr: any;
  C: any;
  formText: string;
  setFormText: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  formReps: string;
  setFormReps: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSave: () => void;
}

function UserThikrFormModal({
  visible, editingItem, topInset, isRtl, tr, C,
  formText, setFormText, formName, setFormName, formReps, setFormReps,
  onClose, onSave,
}: UserThikrFormModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, paddingTop: topInset + 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.textSecond} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
            {editingItem ? (tr.edit) : '+'}
          </Text>
          <Pressable
            onPress={onSave}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: C.tint }}
          >
            <Text style={{ color: C.tintText, fontWeight: '600', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {tr.save}
            </Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold' }}>
              {tr.thikr_text}
            </Text>
            <TextInput
              value={formText}
              onChangeText={setFormText}
              multiline
              numberOfLines={4}
              style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator, borderRadius: 12, padding: 12, fontSize: 20, fontFamily: 'Amiri_400Regular', color: C.text, backgroundColor: C.backgroundCard, textAlign: 'right', writingDirection: 'rtl', minHeight: 100 }}
              placeholder={tr.thikr_text_placeholder}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
              {tr.thikr_name}
            </Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: C.text, backgroundColor: C.backgroundCard, textAlign: isRtl ? 'right' : 'left' }}
              placeholderTextColor={C.textMuted}
              placeholder={tr.thikr_name}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
              {tr.repetitions}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setFormReps(r => String(Math.max(1, (parseInt(r, 10) || 1) - 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.backgroundSecond, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="remove" size={18} color={C.tint} />
              </Pressable>
              <TextInput
                value={formReps}
                onChangeText={v => setFormReps(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={{ fontSize: 20, fontWeight: '700', color: C.text, fontFamily: 'Inter_700Bold', minWidth: 50, textAlign: 'center' }}
              />
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setFormReps(r => String(Math.min(999, (parseInt(r, 10) || 1) + 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.backgroundSecond, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={18} color={C.tint} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Personal Athkar Screen ───────────────────────────────────────────────
// User-only thikr items presented in the same swipeable reader.

interface PersonalReaderProps {
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  items: PersonalThikrItem[];
  onSave: (items: PersonalThikrItem[]) => void;
  onBack: () => void;
  copyHintShown: boolean;
  onCopyHintDismiss: () => void;
  thikrReaderHintShown: boolean;
  onThikrReaderHintDismiss: () => void;
}

function PersonalReaderScreen({ lang, isRtl, tr, C, topInset, bottomInset, items, onSave, onBack }: PersonalReaderProps) {
  const { translitLang } = useApp();
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalThikrItem | null>(null);
  const [formText, setFormText] = useState('');
  const [formName, setFormName] = useState('');
  const [formReps, setFormReps] = useState('3');

  const [athkarFontSize, setAthkarFontSize] = useState<AthkarFontSize>('md');
  useEffect(() => {
    AsyncStorage.getItem(ATHKAR_FS_KEY).then(val => {
      const migrated: Record<string, AthkarFontSize> = { small: 'sm', medium: 'md', large: 'lg' };
      const mapped = val ? (migrated[val] ?? val) : null;
      if (mapped && STEP_ORDER.includes(mapped as AthkarFontSize)) {
        setAthkarFontSize(mapped as AthkarFontSize);
      }
    }).catch(() => {});
  }, []);

  const openAdd = useCallback(() => {
    setEditingItem(null);
    setFormText('');
    setFormName('');
    setFormReps('3');
    setShowForm(true);
  }, []);

  const openEdit = useCallback((item: PersonalThikrItem) => {
    setEditingItem(item);
    setFormText(item.text);
    setFormName(item.name ?? '');
    setFormReps(String(item.repetitions));
    setShowForm(true);
  }, []);

  const handleSaveForm = useCallback(() => {
    const text = formText.trim();
    if (!text) return;
    const reps = Math.max(1, Math.min(999, parseInt(formReps, 10) || 1));
    if (editingItem) {
      onSave(items.map(it => it.id === editingItem.id
        ? { ...it, text, name: formName.trim() || undefined, repetitions: reps }
        : it));
    } else {
      onSave([
        ...items,
        { id: String(Date.now()), text, name: formName.trim() || undefined, repetitions: reps },
      ]);
    }
    setShowForm(false);
  }, [formText, formName, formReps, editingItem, items, onSave]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      tr.delete,
      undefined,
      [
        { text: tr.btn_cancel, style: 'cancel' },
        {
          text: tr.delete,
          style: 'destructive',
          onPress: () => {
            onSave(items.filter(it => it.id !== id));
            setCounts(prev => { const n = { ...prev }; delete n[id]; return n; });
          },
        },
      ],
    );
  }, [tr, items, onSave]);

  const pages: SwipePage[] = useMemo(() => items.map(item => {
    const current = Math.min(counts[item.id] ?? 0, item.repetitions);
    const done = current >= item.repetitions;
    return {
      key: `u-${item.id}`,
      arabic: item.text,
      transliteration: '',
      translation: item.name ?? '',
      translationRtl: false,
      required: item.repetitions,
      current,
      done,
      userItem: item,
    };
  }), [items, counts]);

  const handleTap = useCallback((page: SwipePage) => {
    if (!page.userItem) return;
    const item = page.userItem;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCounts(prev => {
      const cur = prev[item.id] ?? 0;
      if (cur >= item.repetitions) return prev;
      const next = cur + 1;
      if (next >= item.repetitions) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { ...prev, [item.id]: next };
    });
  }, []);

  const handleDone = useCallback((page: SwipePage) => {
    if (!page.userItem) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCounts(prev => ({ ...prev, [page.userItem!.id]: page.userItem!.repetitions }));
  }, []);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCounts({});
  }, []);

  const title = tr.personal_athkar;

  return (
    <>
      <SwipeableReader
        categoryName={title}
        categoryNameRtl={isRtl}
        isRtl={isRtl}
        tr={tr}
        C={C}
        topInset={topInset}
        bottomInset={bottomInset}
        pages={pages}
        onBack={onBack}
        onReset={handleReset}
        onTap={handleTap}
        onDone={handleDone}
        onAddUser={openAdd}
        onEditUser={openEdit}
        onDeleteUser={handleDelete}
        athkarLang={translitLang as Lang}
        athkarFontSize={athkarFontSize}
        displayMode={'full'}
        showLangToggleInHeader={false}
      />

      <UserThikrFormModal
        visible={showForm}
        editingItem={editingItem}
        topInset={topInset}
        isRtl={isRtl}
        tr={tr}
        C={C}
        formText={formText}
        setFormText={setFormText}
        formName={formName}
        setFormName={setFormName}
        formReps={formReps}
        setFormReps={setFormReps}
        onClose={() => setShowForm(false)}
        onSave={handleSaveForm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gridTopHeader: {
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  cell: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 6,
    overflow: 'hidden',
  },
  fontPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  favBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  favStar: {
    fontSize: 10,
  },
  favHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  favHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  personalAddBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  personalAddBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  progressRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    width: 69,
    justifyContent: 'flex-end',
  },
  cardIndex: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  inlinePicker: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 4,
  },
  inlinePickerBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
  },
  inlinePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  arabicText: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translitText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  translationText: {
    fontSize: 13,
    lineHeight: 19,
  },
  completionArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 48,
    textAlign: 'center',
  },
  completionSub: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  completionView: {},
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resetCompletionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetCompletionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  helpCard: {
    width: '100%', borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  helpBar: { height: 4 },
  helpText: { fontSize: 14, lineHeight: 22, padding: 20, paddingBottom: 12 },
  helpDismiss: {
    margin: 16, marginTop: 4, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center',
  },
  helpDismissText: { fontSize: 14, fontWeight: '700' },
  athkarLangDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  athkarLangDropdownFlag: { fontSize: 20, lineHeight: 24 },
  athkarLangDropdownText: { fontSize: 14, fontWeight: '600' },
  athkarLangDropdownLabel: { fontSize: 12, opacity: 0.6 },
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerSheet: {
    width: '88%', maxHeight: 420, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerFlag: { fontSize: 22, lineHeight: 28, marginRight: 2 },
  pickerNative: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  pickerLang: { fontSize: 12 },
  pageDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pageDotStar: {
    fontSize: 13,
    lineHeight: 16,
    marginLeft: 4,
    color: GOLD,
  },
  noFavContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  noFavText: {
    fontSize: 14,
    lineHeight: 22,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  favPageTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  toast: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
});
