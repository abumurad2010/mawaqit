import React, { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList, Alert, Modal, Dimensions, TextInput, useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, ZoomIn, FadeIn, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import i18n, { t, isRtlLang, LANG_META, LANG_FLAG } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';
import ATHKAR_CATEGORIES, { AthkarCategory, Thikr } from '@/constants/athkar-data';

const FAVS_KEY = 'athkar_favourites';
const FAV_HINT_KEY = 'athkar_fav_hint_seen';
const ATHKAR_FS_KEY = 'athkar_font_size';
const PERSONAL_KEY = 'personal_athkar';
const USER_CAT_KEY_PREFIX = 'user_thikr_category_';
const COPY_HINT_KEY = 'athkar_copy_hint_shown';
const GRID_ORDER_KEY = 'athkar_grid_order';
const GRID_REORDER_HINT_KEY = 'athkar_grid_reorder_hint_shown';
const THIKR_READER_HINT_KEY = 'athkar_thikr_reader_hint_shown';
const THIKR_ORDER_KEY_PREFIX = 'thikr_order_';

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


function getKey(catId: string, idx: number) {
  return `${catId}_${idx}`;
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
  autoscrollThreshold = 50,
  autoscrollSpeed = 300,
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
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollEnabled={activeIndex < 0} // lock scroll while dragging; autoscroll handles movement
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
  const { lang, colors: C, isDark } = useApp();
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
  const [gridOrder, setGridOrder] = useState<string[]>([]);
  const [gridReorderHintShown, setGridReorderHintShown] = useState(true);
  const [displayMode, setDisplayMode] = useState<'arabic' | 'full'>(
    (!lang || lang === 'ar') ? 'arabic' : 'full'
  );
  const [favourites, setFavourites] = useState<string[]>([]);
  const [favHintSeen, setFavHintSeen] = useState(false);
  const [athkarLang, setAthkarLang] = useState<Lang>((lang as Lang) || 'ar');
  const [athkarFontSize, setAthkarFontSizeState] = useState<AthkarFontSize>('md');
  const readerRef = useRef<FlatList<Thikr>>(null);
  const pendingAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!lang || lang === 'ar') {
      setDisplayMode('arabic');
      setAthkarLang('ar');
    } else {
      setDisplayMode('full');
      setAthkarLang(lang as Lang);
    }
  }, [lang]);

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
      const name = (tr as any)[cat.nameKey] ?? cat.nameKey;
      const prompt = isFav ? (tr as any).athkar_fav_remove_prompt : (tr as any).athkar_fav_add_prompt;
      const btn = isFav ? (tr as any).athkar_fav_remove_btn : (tr as any).athkar_fav_add_btn;
      Alert.alert(name, prompt, [
        { text: 'Cancel', style: 'cancel' },
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

  const openCategory = useCallback((cat: AthkarCategory, hlIdx?: number, hlQuery?: string) => {
    Haptics.selectionAsync();
    setHighlightThikrIdx(hlIdx ?? -1);
    setHighlightQuery(hlQuery ?? '');
    setSelectedCategory(cat);
    setCounts({});
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
    const key = getKey(cat.id, idx);
    setCounts(prev => {
      const cur = prev[key] ?? 0;
      if (cur >= thikr.count) return prev;
      const next = cur + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= thikr.count) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        pendingAdvance.current = setTimeout(() => {
          const nextIncompleteIdx = cat.adhkar.findIndex((d, i) => {
            const k = getKey(cat.id, i);
            const c = (i === idx) ? next : (prev[k] ?? 0);
            return c < d.count;
          });
          if (nextIncompleteIdx !== -1 && nextIncompleteIdx !== idx) {
            readerRef.current?.scrollToIndex({ index: nextIncompleteIdx, animated: true, viewPosition: 0.1 });
          }
        }, 600);
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const getCount = useCallback((catId: string, idx: number) => {
    return counts[getKey(catId, idx)] ?? 0;
  }, [counts]);

  const isDone = useCallback((catId: string, idx: number, required: number) => {
    return (counts[getKey(catId, idx)] ?? 0) >= required;
  }, [counts]);

  const handleDone = useCallback((cat: AthkarCategory, thikr: Thikr, idx: number) => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCounts(prev => {
      const key = getKey(cat.id, idx);
      if ((prev[key] ?? 0) >= thikr.count) return prev;
      const updated = { ...prev, [key]: thikr.count };
      const nextIncompleteIdx = cat.adhkar.findIndex((d, i) => {
        const k = getKey(cat.id, i);
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
          userCatItems={userCatItems[selectedCategory.id] ?? []}
          onUserCatItemsSave={(items) => saveUserCatItems(selectedCategory.id, items)}
          copyHintShown={copyHintShown}
          onCopyHintDismiss={dismissCopyHint}
          thikrReaderHintShown={thikrReaderHintShown}
          onThikrReaderHintDismiss={dismissThikrReaderHint}
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
          setAthkarLang={setAthkarLang}
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
              {(tr as any).btn_done ? ((tr as any).reorder_hint?.split(' ').slice(0, 3).join(' ') ?? 'Reorder') : 'Reorder'}
            </Text>
            <Pressable
              onPress={() => Alert.alert(
                (tr as any).drag_to_reorder ?? 'Hold and drag to reorder',
                (tr as any).drag_to_reorder ?? 'Long-press the ≡ handle beside each item, then drag to its new position.',
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
            <Text style={{ color: C.tintText, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{(tr as any).btn_done ?? 'Done'}</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          {(tr as any).drag_to_reorder ?? 'Hold and drag to reorder'}
        </Text>
        <DragSortList<'__personal__' | AthkarCategory>
          data={reorderData}
          keyExtractor={(item) => item === '__personal__' ? '__personal__' : (item as AthkarCategory).id}
          onDragEnd={(data) => setTimeout(() => setReorderData(data), 0)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 80, paddingTop: 8 }}
          itemGap={8}
          handleColor={C.tint}
          renderItem={({ item, isActive, dragHandle }) => {
            const isPersonal = item === '__personal__';
            const cat = item as AthkarCategory;
            const nameKey = isPersonal ? '' : cat.nameKey as any;
            const name = isPersonal
              ? ((tr as any).personal_athkar ?? 'My Athkar')
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
              عربي
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onDisplayMode('full');
              if (athkarLang === 'ar') {
                setAthkarLang(
                  (lang && lang !== 'ar') ? (lang as Lang) : 'en'
                );
              }
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
            {(tr as any).athkar_hint_updated ?? ''}
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
                  {(tr as any).athkar_favourites_title ?? 'Favourites'}
                </Text>
                {favPage.length === 0 ? (
                  <View style={styles.noFavContainer}>
                    <Text style={[styles.noFavText, { color: C.textMuted, textAlign: 'center', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}>
                      {(tr as any).athkar_no_favourites ?? 'No favourites yet.\nLong-press any category to add it.'}
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
                placeholder={(tr as any).athkar_search_placeholder ?? 'Search adhkar and duas...'}
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
                  {(tr as any).athkar_search_empty ?? 'No results found'}
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
        {(tr as any).copy_hint ?? 'Hold any thikr to copy it'}
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
        {(tr as any).thikr_reader_hint ?? 'Tap the copy icon for copy options • Hold ≡ to reorder'}
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
        {(tr as any).reorder_hint ?? 'Hold any category to reorder'}
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
        {(tr as any).personal_athkar ?? 'My Athkar'}
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
  getCount: (catId: string, idx: number) => number;
  isDone: (catId: string, idx: number, required: number) => boolean;
  onTap: (cat: AthkarCategory, thikr: Thikr, idx: number) => void;
  onDone: (cat: AthkarCategory, thikr: Thikr, idx: number) => void;
  onBack: () => void;
  onReset: () => void;
  displayMode: 'arabic' | 'full';
  athkarLang: Lang;
  athkarFontSize: AthkarFontSize;
  highlightIdx?: number;
  highlightQuery?: string;
  userCatItems: PersonalThikrItem[];
  onUserCatItemsSave: (items: PersonalThikrItem[]) => void;
  copyHintShown: boolean;
  onCopyHintDismiss: () => void;
  thikrReaderHintShown: boolean;
  onThikrReaderHintDismiss: () => void;
}

function ReaderScreen({
  category, lang, isRtl, tr, C,
  topInset, bottomInset, readerRef,
  counts, getCount, isDone, onTap, onDone, onBack, onReset,
  displayMode, athkarLang, athkarFontSize,
  highlightIdx = -1, highlightQuery = '',
  userCatItems, onUserCatItemsSave,
  copyHintShown, onCopyHintDismiss,
  thikrReaderHintShown, onThikrReaderHintDismiss,
}: ReaderProps) {
  const athkarRtl = isRtlLang(athkarLang);
  const cardFS = FONT_STEPS[athkarFontSize];
  const [activeHighlight, setActiveHighlight] = useState(highlightQuery.length > 0);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const handleReset = useCallback(() => {
    setUserCounts({});
    onReset();
  }, [onReset]);
  const [sortMode, setSortMode] = useState(false);
  const [thikrOrder, setThikrOrder] = useState<number[]>([]);

  const orderedAdhkar = useMemo(
    () => thikrOrder.length === category.adhkar.length
      ? thikrOrder.map(i => ({ thikr: category.adhkar[i]!, originalIndex: i }))
      : category.adhkar.map((thikr, i) => ({ thikr, originalIndex: i })),
    [thikrOrder, category.adhkar],
  );

  const combinedItems = useMemo<UnifiedThikrItem[]>(() => [
    ...orderedAdhkar.map(({ thikr, originalIndex }) => ({ kind: 'builtin' as const, thikr, originalIndex })),
    ...userCatItems.map(item => ({ kind: 'user' as const, item })),
  ], [orderedAdhkar, userCatItems]);

  useEffect(() => {
    AsyncStorage.getItem(THIKR_ORDER_KEY_PREFIX + category.id)
      .then(raw => {
        if (!raw) return;
        const saved: number[] = JSON.parse(raw);
        if (saved.length === category.adhkar.length && saved.every(i => i >= 0 && i < category.adhkar.length)) {
          setThikrOrder(saved);
        }
      })
      .catch(() => {});
  }, [category.id]);

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
      onUserCatItemsSave([...userCatItems, { id: String(Date.now()), text, name: formName.trim() || undefined, repetitions: reps }]);
    }
    setShowUserForm(false);
  }, [formText, formName, formReps, editingUserItem, userCatItems, onUserCatItemsSave]);

  const handleDeleteUser = useCallback((id: string) => {
    Alert.alert(
      (tr as any).delete ?? 'Delete',
      undefined,
      [
        { text: (tr as any).btn_cancel ?? 'Cancel', style: 'cancel' },
        {
          text: (tr as any).delete ?? 'Delete',
          style: 'destructive',
          onPress: () => {
            onUserCatItemsSave(userCatItems.filter(it => it.id !== id));
            setUserCounts(prev => { const n = { ...prev }; delete n[id]; return n; });
          },
        },
      ],
    );
  }, [tr, userCatItems, onUserCatItemsSave]);

  const handleUserTap = useCallback((item: PersonalThikrItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUserCounts(prev => {
      const cur = prev[item.id] ?? 0;
      if (cur >= item.repetitions) return prev;
      const next = cur + 1;
      if (next >= item.repetitions) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { ...prev, [item.id]: next };
    });
  }, []);

  const handleUserDone = useCallback((item: PersonalThikrItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserCounts(prev => ({ ...prev, [item.id]: item.repetitions }));
  }, []);

  // Auto-scroll to highlighted thikr on mount
  useEffect(() => {
    if (highlightIdx >= 0 && highlightIdx < category.adhkar.length) {
      const timer = setTimeout(() => {
        const visualIdx = orderedAdhkar.findIndex(item => item.originalIndex === highlightIdx);
        readerRef.current?.scrollToIndex({ index: visualIdx >= 0 ? visualIdx : highlightIdx, animated: true, viewPosition: 0.15 });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [highlightIdx, category.adhkar.length]);

  const nameKey = category.nameKey as any;
  const catName = displayMode === 'arabic'
    ? (i18n['ar'] as any)[nameKey] ?? nameKey
    : (i18n[athkarLang] as any)?.[nameKey] ?? nameKey;
  const catNameRtl = displayMode === 'arabic' || isRtlLang(athkarLang);
  const total = category.adhkar.length;
  const doneCount = category.adhkar.filter((d, i) => isDone(category.id, i, d.count)).length;
  const progress = total > 0 ? doneCount / total : 0;
  const allDone = doneCount === total;

  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` as any }));

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  const [copyHighlightIdx, setCopyHighlightIdx] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useSharedValue(0);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastVisible(true);
    toastOpacity.value = withTiming(1, { duration: 200 });
    toastTimerRef.current = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => setToastVisible(false), 300);
    }, 1500);
  }, []);

  const handleCopy = useCallback((text: string, index: number) => {
    setCopyHighlightIdx(index);
    Clipboard.setStringAsync(text).then(() => {
      setCopyHighlightIdx(null);
      showToast();
    }).catch(() => setCopyHighlightIdx(null));
  }, [showToast]);

  const handleCopyUserItem = useCallback(async (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(text);
    showToast();
  }, [showToast]);

  if (allDone) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16 }]}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text, flex: 1, textAlign: 'center', fontFamily: catNameRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold', writingDirection: catNameRtl ? 'rtl' : 'ltr' }]} numberOfLines={1}>
            {catName}
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <Animated.View entering={ZoomIn.duration(400)} style={[styles.completionView, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Text style={[styles.completionArabic, { color: C.tint }]}>الحمد لله</Text>
          <Text style={[styles.completionSub, { color: C.textMuted, marginTop: 12, fontFamily: catNameRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold', writingDirection: catNameRtl ? 'rtl' : 'ltr' }]}>{catName}</Text>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: C.tint, opacity: pressed ? 0.85 : 1, marginTop: 32 }]}
          >
            <Text style={[styles.doneBtnText, { color: C.tintText }]}>{(tr as any).retry ?? 'Back'}</Text>
          </Pressable>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.resetCompletionBtn, { borderColor: C.tint, opacity: pressed ? 0.7 : 1, marginTop: 12 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={C.tint} />
            <Text style={[styles.resetCompletionText, { color: C.tint }]}>
              {(tr as any).retry ?? 'Reset'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, flex: 1, textAlign: 'center', fontFamily: catNameRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold', writingDirection: catNameRtl ? 'rtl' : 'ltr' }]} numberOfLines={1}>
          {catName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <LangToggle />
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSortMode(v => !v); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: sortMode ? C.tint : C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="reorder-three-outline" size={20} color={sortMode ? C.tintText : C.textMuted} />
          </Pressable>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); openAddUser(); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="add" size={20} color={C.tintText} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.progressRow, { paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundCard, flex: 1 }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.tint }, progressStyle]} />
        </View>
        <Text style={[styles.progressLabel, { color: C.textMuted }]}>{doneCount}/{total}</Text>
      </View>

      {sortMode ? (
        <DragSortList<UnifiedThikrItem>
          data={combinedItems}
          keyExtractor={(item) => item.kind === 'builtin' ? `b-${item.originalIndex}` : `u-${item.item.id}`}
          onDragEnd={(newData) => {
            const builtins = newData.filter(i => i.kind === 'builtin') as Extract<UnifiedThikrItem, { kind: 'builtin' }>[];
            const users = newData.filter(i => i.kind === 'user') as Extract<UnifiedThikrItem, { kind: 'user' }>[];
            const newOrder = builtins.map(i => i.originalIndex);
            setThikrOrder(newOrder);
            AsyncStorage.setItem(THIKR_ORDER_KEY_PREFIX + category.id, JSON.stringify(newOrder)).catch(() => {});
            onUserCatItemsSave(users.map(i => i.item));
          }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
          itemGap={10}
          handleColor={C.tint}
          renderItem={({ item, index, isActive, dragHandle }) => {
            const thikr = item.kind === 'builtin'
              ? item.thikr
              : { arabic: item.item.text, transliteration: '', translationKey: '', count: item.item.repetitions };
            const done = item.kind === 'builtin'
              ? isDone(category.id, item.originalIndex, thikr.count)
              : (userCounts[item.item.id] ?? 0) >= item.item.repetitions;
            return (
              <View
                style={{
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  backgroundColor: isActive ? C.tint + '18' : done ? C.tint + '18' : C.backgroundCard,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isActive ? C.tint + '66' : done ? C.tint + '55' : C.separator,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <View style={{ paddingTop: 4 }}>{dragHandle}</View>
                <View style={{ flex: 1 }}>
                  {item.kind === 'user' && !!item.item.name && (
                    <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
                      {item.item.name}
                    </Text>
                  )}
                  <Text style={{ fontFamily: 'Amiri_700Bold', fontSize: cardFS.arabic, lineHeight: cardFS.arabic * 1.75, textAlign: 'right', writingDirection: 'rtl', color: done ? C.tint : C.text }}>
                    {thikr.arabic}
                  </Text>
                  {displayMode === 'full' && !!thikr.transliteration && (
                    <Text style={{ fontSize: cardFS.translit, lineHeight: cardFS.translit * 1.5, color: C.textMuted, marginTop: 4 }}>
                      {thikr.transliteration}
                    </Text>
                  )}
                </View>
                {item.kind === 'user' && (
                  <Pressable onPress={() => openEditUser(item.item)} hitSlop={8} style={{ paddingTop: 4 }}>
                    <Ionicons name="pencil-outline" size={15} color={C.textMuted} />
                  </Pressable>
                )}
                <Text style={{ fontSize: 11, color: C.textMuted, paddingTop: 6 }}>{index + 1}</Text>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          ref={readerRef as any}
          data={combinedItems}
          keyExtractor={(item) => item.kind === 'builtin' ? `b-${item.originalIndex}` : `u-${item.item.id}`}
          extraData={[displayMode, athkarLang, copyHighlightIdx, highlightQuery, activeHighlight, userCatItems, userCounts]}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          onScrollBeginDrag={() => activeHighlight && setActiveHighlight(false)}
          ListHeaderComponent={(
            <>
              {!thikrReaderHintShown && (
                <ThikrReaderHintBanner tr={tr} C={C} isRtl={isRtl} onDismiss={onThikrReaderHintDismiss} />
              )}
              {!copyHintShown && (
                <CopyHintBanner tr={tr} C={C} isRtl={isRtl} onDismiss={onCopyHintDismiss} />
              )}
            </>
          )}
          renderItem={({ item, index }) => {
            if (item.kind === 'builtin') {
              const { thikr, originalIndex } = item;
              const done = isDone(category.id, originalIndex, thikr.count);
              const cur = getCount(category.id, originalIndex);
              const translation = (i18n[athkarLang] as any)?.[thikr.translationKey] ?? '';
              return (
                <ThikrCard
                  thikr={thikr}
                  index={index}
                  done={done}
                  cur={cur}
                  translation={translation}
                  isRtl={isRtl}
                  translationRtl={athkarRtl}
                  C={C}
                  tr={tr}
                  displayMode={displayMode}
                  athkarLang={athkarLang}
                  onTap={() => onTap(category, thikr, originalIndex)}
                  onDone={() => onDone(category, thikr, originalIndex)}
                  onCopy={(text) => handleCopy(text, originalIndex)}
                  highlighted={copyHighlightIdx === originalIndex}
                  arabicFontSize={cardFS.arabic}
                  translitFontSize={cardFS.translit}
                  translationFontSize={cardFS.translation}
                  searchHighlight={activeHighlight && highlightQuery.length > 0 && originalIndex === highlightIdx}
                  searchQuery={highlightQuery}
                />
              );
            }
            // User-added item
            const userItem = item.item;
            const cur = userCounts[userItem.id] ?? 0;
            const done = cur >= userItem.repetitions;
            const fakeThikr: Thikr = {
              arabic: userItem.text,
              transliteration: '',
              translationKey: '',
              count: userItem.repetitions,
            };
            return (
              <ThikrCard
                thikr={fakeThikr}
                index={index}
                done={done}
                cur={cur}
                translation={userItem.name ?? ''}
                isRtl={isRtl}
                translationRtl={false}
                C={C}
                tr={tr}
                displayMode={displayMode}
                athkarLang={athkarLang}
                onTap={() => handleUserTap(userItem)}
                onDone={() => handleUserDone(userItem)}
                onCopy={(text) => handleCopyUserItem(text)}
                onEdit={() => openEditUser(userItem)}
                highlighted={false}
                arabicFontSize={cardFS.arabic}
                translitFontSize={cardFS.translit}
                translationFontSize={cardFS.translation}
              />
            );
          }}
        />
      )}

      {toastVisible && (
        <Animated.View style={[styles.toast, toastStyle, { backgroundColor: C.tint }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={C.tintText} />
          <Text style={[styles.toastText, { color: C.tintText }]}>{(tr as any).copy_thikr ?? (tr as any).copied_toast ?? 'Thikr copied'}</Text>
        </Animated.View>
      )}

      {/* Add/Edit user thikr modal */}
      <Modal visible={showUserForm} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, paddingTop: topInset + 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator }}>
            <Pressable onPress={() => setShowUserForm(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.textSecond} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {editingUserItem ? ((tr as any).edit ?? 'Edit') : '+'}
            </Text>
            <Pressable
              onPress={handleSaveUserForm}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: C.tint }}
            >
              <Text style={{ color: C.tintText, fontWeight: '600', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {(tr as any).save ?? 'Save'}
              </Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold' }}>
                {(tr as any).thikr_text ?? 'Thikr text'}
              </Text>
              <TextInput
                value={formText}
                onChangeText={setFormText}
                multiline
                numberOfLines={4}
                style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator, borderRadius: 12, padding: 12, fontSize: 20, fontFamily: 'Amiri_400Regular', color: C.text, backgroundColor: C.backgroundCard, textAlign: 'right', writingDirection: 'rtl', minHeight: 100 }}
                placeholder="اكتب الذكر هنا..."
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
                {(tr as any).thikr_name ?? 'Name (optional)'}
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: C.text, backgroundColor: C.backgroundCard, textAlign: isRtl ? 'right' : 'left' }}
                placeholderTextColor={C.textMuted}
                placeholder={(tr as any).thikr_name ?? 'Name (optional)'}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
                {(tr as any).repetitions ?? 'Repetitions'}
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

    </View>
  );
}

interface CardProps {
  thikr: Thikr;
  index: number;
  done: boolean;
  cur: number;
  translation: string;
  isRtl: boolean;
  translationRtl: boolean;
  C: any;
  tr: any;
  displayMode: 'arabic' | 'full';
  athkarLang: Lang;
  onTap: () => void;
  onDone: () => void;
  onCopy: (text: string) => void;
  onEdit?: () => void;
  highlighted: boolean;
  arabicFontSize: number;
  translitFontSize: number;
  translationFontSize: number;
  searchHighlight?: boolean;
  searchQuery?: string;
}

function inlineHighlight(text: string, query: string, tintColor: string): React.ReactNode[] {
  if (!query || !text) return [text];
  const normQuery = normalizeForAthkarSearch(query);
  if (!normQuery) return [text];

  // Build normStr + position map (skip diacritics, normalize Alef variants)
  const normToOrig: number[] = [];
  let normStr = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[\u064B-\u065F\u0670\u0610-\u061A]/.test(ch)) continue;
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
    const origStart = normToOrig[mi];
    const normEnd = mi + normQuery.length;
    const origEnd = normEnd < normToOrig.length ? normToOrig[normEnd] : text.length;
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

function ThikrCard({ thikr, index, done, cur, translation, isRtl, translationRtl, C, tr, displayMode, athkarLang, onTap, onDone, onCopy, onEdit, highlighted, arabicFontSize, translitFontSize, translationFontSize, searchHighlight = false, searchQuery = '' }: CardProps) {
  const showDoneButton = thikr.count > 3 && !done;
  const [showInlinePicker, setShowInlinePicker] = useState(false);

  const handleCopyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (displayMode === 'arabic' || !thikr.transliteration) {
      // Arabic-only mode or no transliteration (user-added items): copy directly
      onCopy(thikr.arabic);
      return;
    }
    // Full mode with transliteration: toggle inline picker
    setShowInlinePicker(prev => !prev);
  }, [displayMode, thikr.arabic, thikr.transliteration, onCopy]);

  const pickAndCopy = useCallback((text: string) => {
    setShowInlinePicker(false);
    onCopy(text);
  }, [onCopy]);

  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(300)} style={{ marginBottom: 10 }}>
      <Pressable
        onPress={() => { setShowInlinePicker(false); onTap(); }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: searchHighlight
              ? C.tint + '12'
              : done ? C.tint + '18' : C.backgroundCard,
            borderColor: searchHighlight ? C.tint + '88'
              : highlighted ? C.tint + '66' : done ? C.tint + '55' : C.separator,
            opacity: pressed && !done ? 0.88 : 1,
          },
        ]}
      >
        {/* Fixed header: Left=number | Center=counter | Right=copy */}
        <View style={styles.cardTop}>
          <Text style={[styles.cardIndex, { color: C.textMuted }]}>{index + 1}</Text>
          <View style={styles.cardCenter}>
            <View style={[
              styles.counterBadge,
              {
                backgroundColor: done ? C.tint : C.backgroundCard,
                borderColor: done ? C.tint : C.separator,
              },
            ]}>
              <Text style={[styles.counterText, { color: done ? C.tintText : C.text }]}>
                {cur}/{thikr.count}
              </Text>
            </View>
            {/* Always present, invisible when not done — keeps layout stable */}
            <Animated.View
              entering={ZoomIn.duration(200)}
              style={{ marginLeft: 4, opacity: done ? 1 : 0 }}
            >
              <Ionicons name="checkmark-circle" size={20} color={C.tint} />
            </Animated.View>
          </View>
          {/* Fixed-width right slot: always same size whether 1 or 2 icons */}
          <View style={styles.cardActions}>
            <Pressable onPress={handleCopyPress} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons name="copy-outline" size={15} color={showInlinePicker ? C.tint : C.textMuted} />
            </Pressable>
            {onEdit ? (
              <Pressable onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="pencil-outline" size={15} color={C.textMuted} />
              </Pressable>
            ) : (
              <View style={{ width: 23 }} />
            )}
          </View>
        </View>

        {/* Inline copy picker — shown in full mode when copy icon tapped */}
        {showInlinePicker && (
          <View style={[styles.inlinePicker, { borderColor: C.separator, backgroundColor: C.backgroundSecond ?? C.surface }]}>
            <Pressable
              onPress={() => pickAndCopy(thikr.arabic)}
              style={({ pressed }) => [styles.inlinePickerBtn, { opacity: pressed ? 0.7 : 1, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.separator }]}
            >
              <Text style={[styles.inlinePickerLabel, { color: C.text }]}>
                {(tr as any).copy_arabic_only ?? 'Arabic'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => pickAndCopy(thikr.transliteration || thikr.arabic)}
              style={({ pressed }) => [styles.inlinePickerBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.inlinePickerLabel, { color: C.text }]}>
                {LANG_META[athkarLang]?.native ?? LANG_META[athkarLang]?.label ?? athkarLang}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 1.75, color: done ? C.tint : C.text }]}>
          {searchHighlight ? inlineHighlight(thikr.arabic, searchQuery, C.tint) : thikr.arabic}
        </Text>

        {displayMode === 'full' && (
          <Text style={[styles.translitText, { fontSize: translitFontSize, lineHeight: translitFontSize * 1.5, color: C.textMuted }]}>
            {searchHighlight ? inlineHighlight(thikr.transliteration, searchQuery, C.tint) : thikr.transliteration}
          </Text>
        )}

        {displayMode === 'full' && !!translation && (
          <Text style={[
            styles.translationText,
            {
              fontSize: translationFontSize,
              lineHeight: translationFontSize * 1.5,
              color: done ? C.tint + 'cc' : C.textSecond,
              textAlign: translationRtl ? 'right' : 'left',
              writingDirection: translationRtl ? 'rtl' : 'ltr',
              fontFamily: translationRtl ? 'Amiri_400Regular' : 'Inter_400Regular',
            },
          ]}>
            {searchHighlight ? inlineHighlight(translation, searchQuery, C.tint) : translation}
          </Text>
        )}

        {showDoneButton && (
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={onDone}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: C.tint + '18',
                borderWidth: 1,
                borderColor: C.tint + '55',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color={C.tint} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.tint, fontFamily: 'Inter_600SemiBold' }}>
                {(tr as any).done ?? 'Done'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert((tr as any).done ?? 'Done', (tr as any).done_help ?? '')}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={16} color={C.textMuted} />
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Personal Athkar Screen ───────────────────────────────────────────────

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

function PersonalReaderScreen({ lang, isRtl, tr, C, topInset, bottomInset, items, onSave, onBack, copyHintShown, onCopyHintDismiss, thikrReaderHintShown, onThikrReaderHintDismiss }: PersonalReaderProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useSharedValue(0);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastVisible(true);
    toastOpacity.value = withTiming(1, { duration: 200 });
    toastTimerRef.current = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => setToastVisible(false), 300);
    }, 1500);
  }, []);

  const [editingItem, setEditingItem] = useState<PersonalThikrItem | null>(null);
  const [formText, setFormText] = useState('');
  const [formName, setFormName] = useState('');
  const [formReps, setFormReps] = useState('3');

  const openAdd = () => {
    setEditingItem(null);
    setFormText('');
    setFormName('');
    setFormReps('3');
    setShowForm(true);
  };

  const openEdit = (item: PersonalThikrItem) => {
    setEditingItem(item);
    setFormText(item.text);
    setFormName(item.name ?? '');
    setFormReps(String(item.repetitions));
    setShowForm(true);
  };

  const handleSaveForm = () => {
    const text = formText.trim();
    if (!text) return;
    const reps = Math.max(1, Math.min(999, parseInt(formReps, 10) || 1));
    if (editingItem) {
      onSave(items.map(it => it.id === editingItem.id
        ? { ...it, text, name: formName.trim() || undefined, repetitions: reps }
        : it));
    } else {
      const newItem: PersonalThikrItem = {
        id: String(Date.now()),
        text,
        name: formName.trim() || undefined,
        repetitions: reps,
      };
      onSave([...items, newItem]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      (tr as any).delete ?? 'Delete',
      (tr as any).done_help ? undefined : undefined,
      [
        { text: (tr as any).btn_cancel ?? 'Cancel', style: 'cancel' },
        {
          text: (tr as any).delete ?? 'Delete',
          style: 'destructive',
          onPress: () => {
            onSave(items.filter(it => it.id !== id));
            setCounts(prev => { const n = { ...prev }; delete n[id]; return n; });
          },
        },
      ],
    );
  };

  const handleTap = (item: PersonalThikrItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCounts(prev => {
      const cur = prev[item.id] ?? 0;
      if (cur >= item.repetitions) return prev;
      const next = cur + 1;
      if (next >= item.repetitions) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { ...prev, [item.id]: next };
    });
  };

  const handleDone = (item: PersonalThikrItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCounts(prev => ({ ...prev, [item.id]: item.repetitions }));
  };

  const [reorderMode, setReorderMode] = useState(false);
  const [reorderData, setReorderData] = useState<PersonalThikrItem[]>([]);

  const enterReorderMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReorderData([...items]);
    setReorderMode(true);
  }, [items]);

  // ── Reorder mode — identical structure to GridScreen group reorder ─────────
  if (reorderMode) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16 }]}>
          <View style={{ flex: 1, flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold' }}>
              {(tr as any).btn_done ? ((tr as any).reorder_hint?.split(' ').slice(0, 3).join(' ') ?? 'Reorder') : 'Reorder'}
            </Text>
            <Pressable
              onPress={() => Alert.alert(
                (tr as any).drag_to_reorder ?? 'Hold and drag to reorder',
                (tr as any).drag_to_reorder ?? 'Long-press the ≡ handle beside each item, then drag to its new position.',
              )}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={16} color={C.textMuted} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onSave(reorderData);
              setReorderMode(false);
            }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1, paddingHorizontal: 14, width: 'auto' as any }]}
          >
            <Text style={{ color: C.tintText, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{(tr as any).btn_done ?? 'Done'}</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          {(tr as any).drag_to_reorder ?? 'Hold and drag to reorder'}
        </Text>
        <DragSortList<PersonalThikrItem>
          data={reorderData}
          keyExtractor={(it) => it.id}
          onDragEnd={(data) => setReorderData(data)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 80, paddingTop: 8 }}
          itemGap={8}
          handleColor={C.tint}
          renderItem={({ item, isActive, dragHandle }) => {
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
                <Ionicons name="create-outline" size={22} color={C.textMuted} />
                <Text style={{ flex: 1, fontSize: 16, fontFamily: 'Amiri_700Bold', color: C.text, writingDirection: 'rtl' }} numberOfLines={2}>
                  {item.text}
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
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header — normal mode */}
      <View style={{ paddingTop: topInset + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
          {(tr as any).personal_athkar ?? 'My Athkar'}
        </Text>
        {items.length > 1 && (
          <Pressable
            onPress={enterReorderMode}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="reorder-three-outline" size={22} color={C.tint} />
          </Pressable>
        )}
        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="add" size={22} color={C.tintText} />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
          <Ionicons name="bookmark-outline" size={48} color={C.textMuted} />
          <Text style={{ fontSize: 15, color: C.textMuted, textAlign: 'center', fontFamily: 'Inter_400Regular', lineHeight: 22 }}>
            {(tr as any).add_thikr ?? 'Add your first thikr'}
          </Text>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => ({ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 })}
          >
            <Text style={{ color: C.tintText, fontWeight: '600', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>+</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {!thikrReaderHintShown && (
            <ThikrReaderHintBanner tr={tr} C={C} isRtl={isRtl} onDismiss={onThikrReaderHintDismiss} />
          )}
          {!copyHintShown && (
            <CopyHintBanner tr={tr} C={C} isRtl={isRtl} onDismiss={onCopyHintDismiss} />
          )}
          {items.map((item) => {
            const cur = counts[item.id] ?? 0;
            const done = cur >= item.repetitions;
            return (
              <View key={item.id} style={{ marginBottom: 10 }}>
                <Pressable
                  onPress={() => handleTap(item)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: done ? C.tint + '18' : C.backgroundCard,
                      borderColor: done ? C.tint + '55' : C.separator,
                      opacity: pressed && !done ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={[styles.counterBadge, { backgroundColor: done ? C.tint : C.backgroundCard, borderColor: done ? C.tint : C.separator }]}>
                      <Text style={[styles.counterText, { color: done ? C.tintText : C.text }]}>{cur}/{item.repetitions}</Text>
                    </View>
                    {done && <Animated.View entering={ZoomIn.duration(200)}><Ionicons name="checkmark-circle" size={20} color={C.tint} /></Animated.View>}
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                      <Ionicons name="pencil-outline" size={16} color={C.textMuted} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={18} color={C.textMuted} />
                    </Pressable>
                  </View>
                  {!!item.name && (
                    <Text style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left', marginBottom: 4 }}>
                      {item.name}
                    </Text>
                  )}
                  <Text style={{ fontFamily: 'Amiri_700Bold', fontSize: 22, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl', color: done ? C.tint : C.text }}>
                    {item.text}
                  </Text>
                  {item.repetitions > 3 && !done && (
                    <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => handleDone(item)}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                          backgroundColor: C.tint + '18', borderWidth: 1, borderColor: C.tint + '55',
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color={C.tint} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: C.tint, fontFamily: 'Inter_600SemiBold' }}>
                          {(tr as any).done ?? 'Done'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => Alert.alert((tr as any).done ?? 'Done', (tr as any).done_help ?? '')} hitSlop={10}>
                        <Ionicons name="help-circle-outline" size={16} color={C.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      {toastVisible && (
        <Animated.View style={[styles.toast, toastStyle, { backgroundColor: C.tint }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={C.tintText} />
          <Text style={[styles.toastText, { color: C.tintText }]}>{(tr as any).copy_thikr ?? 'Thikr copied'}</Text>
        </Animated.View>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, paddingTop: topInset + 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator }}>
            <Pressable onPress={() => setShowForm(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.textSecond} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {editingItem ? ((tr as any).edit ?? 'Edit') : '+'}
            </Text>
            <Pressable
              onPress={handleSaveForm}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: C.tint }}
            >
              <Text style={{ color: C.tintText, fontWeight: '600', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {(tr as any).save ?? 'Save'}
              </Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold' }}>
                {(tr as any).thikr_text ?? 'Thikr text'}
              </Text>
              <TextInput
                value={formText}
                onChangeText={setFormText}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: C.separator,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 20,
                  fontFamily: 'Amiri_400Regular',
                  color: C.text,
                  backgroundColor: C.backgroundCard,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  minHeight: 100,
                }}
                placeholder="اكتب الذكر هنا..."
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
                {(tr as any).thikr_name ?? 'Name (optional)'}
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: C.separator,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 15,
                  fontFamily: 'Inter_400Regular',
                  color: C.text,
                  backgroundColor: C.backgroundCard,
                  textAlign: isRtl ? 'right' : 'left',
                }}
                placeholderTextColor={C.textMuted}
                placeholder={(tr as any).thikr_name ?? 'Name (optional)'}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecond, fontFamily: 'Inter_600SemiBold', textAlign: isRtl ? 'right' : 'left' }}>
                {(tr as any).repetitions ?? 'Repetitions'}
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
                  onChangeText={t => setFormReps(t.replace(/[^0-9]/g, ''))}
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
    </View>
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
    // Fixed width = copy icon (23px) + pencil icon or spacer (23px)
    width: 46,
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
  },
  favPageTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
