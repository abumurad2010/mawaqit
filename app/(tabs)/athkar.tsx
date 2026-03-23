import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList, Alert, Modal, Dimensions, TextInput, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, ZoomIn, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';
import i18n, { t, isRtlLang, LANG_META, LANG_FLAG } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';
import ATHKAR_CATEGORIES, { AthkarCategory, Dhikr } from '@/constants/athkar-data';

const FAVS_KEY = 'athkar_favourites';
const FAV_HINT_KEY = 'athkar_fav_hint_seen';
const ATHKAR_FS_KEY = 'athkar_font_size';
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

const DHIKR_HELP_KEYS = new Set([
  'athkar_sleep_ikhlas', 'athkar_sleep_falaq', 'athkar_sleep_nas',
  'athkar_sleep_aslamt', 'athkar_sleep_janb',
  'athkar_sick_3', 'athkar_sick_4',
  'athkar_istikhara_1', 'athkar_friday_3', 'athkar_ruqyah_1',
]);

function AthkarHelpBtn({ onPress, C }: { onPress: () => void; C: any }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 1.5, borderColor: C.tint,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.4 : 1,
      })}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.tint, lineHeight: 13 }}>?</Text>
    </Pressable>
  );
}

function getKey(catId: string, idx: number) {
  return `${catId}_${idx}`;
}

export default function AthkarScreen() {
  const insets = useSafeAreaInsets();
  const { lang, colors: C, isDark } = useApp();
  const tr = t(lang);
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selectedCategory, setSelectedCategory] = useState<AthkarCategory | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [displayMode, setDisplayMode] = useState<'arabic' | 'full'>(
    (!lang || lang === 'ar') ? 'arabic' : 'full'
  );
  const [favourites, setFavourites] = useState<string[]>([]);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [favHintSeen, setFavHintSeen] = useState(false);
  const [athkarLang, setAthkarLang] = useState<Lang>((lang as Lang) || 'ar');
  const [athkarFontSize, setAthkarFontSizeState] = useState<AthkarFontSize>('md');
  const readerRef = useRef<FlatList<Dhikr>>(null);
  const pendingAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    AsyncStorage.getItem(ATHKAR_FS_KEY).then(val => {
      const migrated: Record<string, AthkarFontSize> = { small: 'sm', medium: 'md', large: 'lg' };
      const mapped = val ? (migrated[val] ?? val) : null;
      if (mapped && STEP_ORDER.includes(mapped as AthkarFontSize)) {
        setAthkarFontSizeState(mapped as AthkarFontSize);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    ATHKAR_CATEGORIES.forEach(cat =>
      console.log(
        cat.id, '→', cat.icon,
        (MaterialCommunityIcons as any).glyphMap?.[cat.icon] ? 'FOUND' : 'MISSING — FALLBACK NEEDED',
      )
    );
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

  const sortedCategories = useMemo(() => ATHKAR_CATEGORIES, []);

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

  const openCategory = useCallback((cat: AthkarCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
    setCounts({});
  }, []);

  const closeCategory = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.selectionAsync();
    setSelectedCategory(null);
    setCounts({});
  }, []);

  const resetCounts = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCounts({});
  }, []);

  const handleTap = useCallback((cat: AthkarCategory, dhikr: Dhikr, idx: number) => {
    const key = getKey(cat.id, idx);
    setCounts(prev => {
      const cur = prev[key] ?? 0;
      if (cur >= dhikr.count) return prev;
      const next = cur + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= dhikr.count) {
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

  const showHelp = useCallback((text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHelpContent(text);
  }, []);

  const dismissFavHint = useCallback(() => {
    setFavHintSeen(true);
    AsyncStorage.setItem(FAV_HINT_KEY, 'true').catch(() => {});
  }, []);

  const dismissHelp = useCallback(() => setHelpContent(null), []);

  const gotItLabel = lang === 'ar' ? 'حسناً' : (lang === 'ur' || lang === 'fa') ? 'ٹھیک ہے' : 'Got it';

  return (
    <View style={{ flex: 1 }}>
      {selectedCategory ? (
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
          onBack={closeCategory}
          onReset={resetCounts}
          displayMode={displayMode}
          showHelp={showHelp}
          athkarLang={athkarLang}
          athkarFontSize={athkarFontSize}
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
          favourites={favourites}
          onLongPress={toggleFavourite}
          sortedCategories={sortedCategories}
          showHelp={showHelp}
          favHintSeen={favHintSeen}
          onFavHintDismiss={dismissFavHint}
          athkarLang={athkarLang}
          setAthkarLang={setAthkarLang}
          athkarFontSize={athkarFontSize}
          setAthkarFontSize={setAthkarFontSize}
        />
      )}

      <Modal
        visible={!!helpContent}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissHelp}
      >
        <Pressable style={styles.helpBackdrop} onPress={dismissHelp}>
          <Pressable
            style={[styles.helpCard, { backgroundColor: isDark ? '#0e2b1a' : '#ffffff', borderColor: C.tint }]}
            onPress={() => {}}
          >
            <View style={[styles.helpBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.helpText, { color: C.text, textAlign: isRtl ? 'right' : 'left', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}>
              {helpContent ?? ''}
            </Text>
            <Pressable
              onPress={dismissHelp}
              style={({ pressed }) => [styles.helpDismiss, { backgroundColor: C.tint, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.helpDismissText, { color: C.tintText }]}>{gotItLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  onSelect: (cat: AthkarCategory) => void;
  favourites: string[];
  onLongPress: (cat: AthkarCategory) => void;
  sortedCategories: AthkarCategory[];
  showHelp: (text: string) => void;
  favHintSeen: boolean;
  onFavHintDismiss: () => void;
  athkarLang: Lang;
  setAthkarLang: (l: Lang) => void;
  athkarFontSize: AthkarFontSize;
  setAthkarFontSize: (fs: AthkarFontSize) => void;
}

function GridScreen({ lang, isRtl, tr, C, topInset, bottomInset, displayMode, onDisplayMode, onSelect, favourites, onLongPress, sortedCategories, showHelp, favHintSeen, onFavHintDismiss, athkarLang, setAthkarLang, athkarFontSize, setAthkarFontSize }: GridProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const totalCategoryPages = Math.ceil(sortedCategories.length / ITEMS_PER_PAGE);
  const totalPages = totalCategoryPages + 1;

  const categoryPages: (AthkarCategory | null)[][] = [];
  for (let p = 0; p < totalCategoryPages; p++) {
    const slice: (AthkarCategory | null)[] = sortedCategories.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    while (slice.length < ITEMS_PER_PAGE) slice.push(null);
    categoryPages.push(slice);
  }
  const favPage = favourites.map(id => sortedCategories.find(c => c.id === id) ?? null).filter(Boolean) as AthkarCategory[];
  const allPages: Array<(AthkarCategory | null)[] | 'FAVS'> = [...categoryPages, 'FAVS'];

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentPage(viewableItems[0].index ?? 0);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return sortedCategories.filter(cat => {
      const nameAr = ((i18n['ar'] as any)[cat.nameKey] ?? '').toLowerCase();
      const nameTr = ((i18n[athkarLang] as any)?.[cat.nameKey] ?? '').toLowerCase();
      const nameFallback = ((i18n['en'] as any)?.[cat.nameKey] ?? '').toLowerCase();
      if (nameAr.includes(q) || nameTr.includes(q) || nameFallback.includes(q)) return true;
      return cat.adhkar.some(d => {
        const ar = d.arabic.toLowerCase();
        const tl = d.transliteration.toLowerCase();
        const tKey = d.translationKey as any;
        const tEn = ((i18n['en'] as any)[tKey] ?? '').toLowerCase();
        const tLang = ((i18n[athkarLang] as any)?.[tKey] ?? '').toLowerCase();
        return ar.includes(q) || tl.includes(q) || tEn.includes(q) || tLang.includes(q);
      });
    });
  }, [searchQuery, sortedCategories, athkarLang]);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.gridTopHeader, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); pageListRef.current?.scrollToEnd({ animated: true }); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
              testID="athkar-favs-btn"
            >
              <Ionicons name="star" size={17} color={GOLD} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSearchQuery(''); setShowSearch(true); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
              testID="athkar-search-btn"
            >
              <Ionicons name="search" size={18} color={C.tint} />
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
                {isRtl ? 'لغة الترجمة' : 'Translation language'}
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
        {/* Row 1: font sizer + help right-aligned, above the segment row */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_toggle ?? '')} C={C} />
        </View>

        {/* Row 2: Arabic / Transliterated segment — full width */}
        <View style={[styles.segmentRow, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onDisplayMode('arabic'); }}
            style={[styles.segmentBtn, displayMode === 'arabic' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="text" size={13} color={displayMode === 'arabic' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: displayMode === 'arabic' ? C.tintText : C.textMuted }]}>
              {tr.athkar_mode_arabic}
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
        extraData={[favourites, displayMode, athkarLang, athkarFontSize]}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        renderItem={({ item: pageData }) => {
          if (pageData === 'FAVS') {
            const padded: (AthkarCategory | null)[] = [...favPage];
            while (padded.length % NUM_COLS !== 0) padded.push(null);
            const favRows: (AthkarCategory | null)[][] = [];
            for (let r = 0; r < padded.length; r += NUM_COLS) {
              favRows.push(padded.slice(r, r + NUM_COLS));
            }
            console.log('TILE_WIDTH:', TILE_WIDTH, 'TILE_HEIGHT:', TILE_HEIGHT, 'GAP:', TILE_GAP, 'TOTAL:', (TILE_WIDTH * COLUMNS) + (TILE_GAP * (COLUMNS - 1)) + (OUTER_PADDING * 2), 'SCREEN:', screenWidth);
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
                        onLongPress={onLongPress}
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
          const pageItems = pageData as (AthkarCategory | null)[];
          const rows: (AthkarCategory | null)[][] = [];
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
                  {row.map((cat, cIdx) => cat ? (
                    <GridCell
                      key={cat.id}
                      cat={cat}
                      lang={lang}
                      isRtl={isRtl}
                      tr={tr}
                      C={C}
                      onPress={onSelect}
                      isFavourite={favourites.includes(cat.id)}
                      onLongPress={onLongPress}
                      displayMode={displayMode}
                      athkarLang={athkarLang}
                      tileSize={TILE_WIDTH}
                      tileHeight={TILE_HEIGHT}
                      labelFontSize={labelFontSize}
                    />
                  ) : (
                    <View key={`empty-${rIdx}-${cIdx}`} style={{ width: TILE_WIDTH, height: TILE_HEIGHT }} />
                  ))}
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
                  onPress={() => { setShowSearch(false); onSelect(cat); }}
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
      delayLongPress={400}
      style={({ pressed }) => [
        styles.cell,
        {
          width: tileSize,
          height: tileHeight,
          backgroundColor: isFavourite ? GOLD + '1A' : C.backgroundCard,
          borderColor: isFavourite ? GOLD : C.separator,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {isFavourite && (
        <View style={styles.favBadge}>
          <Text style={styles.favStar}>⭐</Text>
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
  readerRef: React.RefObject<FlatList<Dhikr>>;
  counts: Record<string, number>;
  getCount: (catId: string, idx: number) => number;
  isDone: (catId: string, idx: number, required: number) => boolean;
  onTap: (cat: AthkarCategory, dhikr: Dhikr, idx: number) => void;
  onBack: () => void;
  onReset: () => void;
  displayMode: 'arabic' | 'full';
  showHelp: (text: string) => void;
  athkarLang: Lang;
  athkarFontSize: AthkarFontSize;
}

function ReaderScreen({
  category, lang, isRtl, tr, C,
  topInset, bottomInset, readerRef,
  counts, getCount, isDone, onTap, onBack, onReset,
  displayMode, showHelp, athkarLang, athkarFontSize,
}: ReaderProps) {
  const athkarRtl = isRtlLang(athkarLang);
  const cardFS = FONT_STEPS[athkarFontSize];

  useEffect(() => {
    console.log('Athkar lang selector mounted:', athkarLang);
    console.log('Available languages:', Object.keys(i18n));
  }, [athkarLang]);

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

  const handleCopy = useCallback((dhikr: Dhikr, translation: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopyHighlightIdx(index);
    const copyText = async (text: string) => {
      setCopyHighlightIdx(null);
      await Clipboard.setStringAsync(text);
      showToast();
    };
    const clearHighlight = () => setCopyHighlightIdx(null);
    const tCopy = (key: string, fallback: string) => (tr as any)[key] ?? fallback;
    if (displayMode === 'arabic') {
      Alert.alert(
        tCopy('copy_dhikr_title', 'Copy Dhikr'),
        undefined,
        [
          { text: tCopy('copy_arabic_only', 'Arabic text only'), onPress: () => copyText(dhikr.arabic) },
          { text: tCopy('btn_cancel', 'Cancel'), style: 'cancel', onPress: clearHighlight },
        ],
      );
    } else {
      Alert.alert(
        tCopy('copy_dhikr_title', 'Copy Dhikr'),
        undefined,
        [
          { text: tCopy('copy_arabic_only', 'Arabic text only'), onPress: () => copyText(dhikr.arabic) },
          { text: tCopy('copy_translit_only', 'Transliteration only'), onPress: () => copyText(dhikr.transliteration) },
          { text: tCopy('copy_translation_only', 'Translation only'), onPress: () => copyText(translation) },
          { text: tCopy('copy_arabic_translit', 'Arabic + Transliteration'), onPress: () => copyText(dhikr.arabic + '\n\n' + dhikr.transliteration) },
          { text: tCopy('copy_arabic_translation', 'Arabic + Translation'), onPress: () => copyText(dhikr.arabic + '\n\n' + translation) },
          { text: tCopy('copy_all', 'Copy all'), onPress: () => copyText(dhikr.arabic + '\n\n' + dhikr.transliteration + '\n\n' + translation) },
          { text: tCopy('btn_cancel', 'Cancel'), style: 'cancel', onPress: clearHighlight },
        ],
      );
    }
  }, [displayMode, tr, showToast]);

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
            onPress={onReset}
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
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_language ?? '')} C={C} />
          <LangToggle />
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
          </Pressable>
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_counter ?? '')} C={C} />
        </View>
      </View>

      <View style={[styles.progressRow, { paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundCard, flex: 1 }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.tint }, progressStyle]} />
        </View>
        <Text style={[styles.progressLabel, { color: C.textMuted }]}>{doneCount}/{total}</Text>
      </View>

      <FlatList
        ref={readerRef}
        data={category.adhkar}
        keyExtractor={(_, i) => String(i)}
        extraData={[athkarLang, copyHighlightIdx]}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: dhikr, index }) => {
          const done = isDone(category.id, index, dhikr.count);
          const cur = getCount(category.id, index);
          const translation = (i18n[athkarLang] as any)?.[dhikr.translationKey] ?? '';

          return (
            <DhikrCard
              dhikr={dhikr}
              index={index}
              done={done}
              cur={cur}
              translation={translation}
              isRtl={isRtl}
              translationRtl={athkarRtl}
              C={C}
              displayMode={displayMode}
              onTap={() => onTap(category, dhikr, index)}
              onCopy={() => handleCopy(dhikr, translation, index)}
              highlighted={copyHighlightIdx === index}
              showHelp={showHelp}
              arabicFontSize={cardFS.arabic}
              translitFontSize={cardFS.translit}
              translationFontSize={cardFS.translation}
            />
          );
        }}
      />

      {toastVisible && (
        <Animated.View style={[styles.toast, toastStyle, { backgroundColor: C.tint }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={C.tintText} />
          <Text style={[styles.toastText, { color: C.tintText }]}>{(tr as any).copied_toast ?? 'Copied'}</Text>
        </Animated.View>
      )}
    </View>
  );
}

interface CardProps {
  dhikr: Dhikr;
  index: number;
  done: boolean;
  cur: number;
  translation: string;
  isRtl: boolean;
  translationRtl: boolean;
  C: any;
  displayMode: 'arabic' | 'full';
  onTap: () => void;
  onCopy: () => void;
  highlighted: boolean;
  showHelp: (text: string) => void;
  arabicFontSize: number;
  translitFontSize: number;
  translationFontSize: number;
}

function DhikrCard({ dhikr, index, done, cur, translation, isRtl, translationRtl, C, displayMode, onTap, onCopy, highlighted, showHelp, arabicFontSize, translitFontSize, translationFontSize }: CardProps) {
  const hasHelpNote = DHIKR_HELP_KEYS.has(dhikr.translationKey);
  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(300)} style={{ marginBottom: 10 }}>
      <Pressable
        onPress={onTap}
        onLongPress={onCopy}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: done ? C.tint + '18' : C.backgroundCard,
            borderColor: highlighted ? C.tint + '66' : done ? C.tint + '55' : C.separator,
            opacity: pressed && !done ? 0.88 : 1,
          },
        ]}
      >
        <View style={[styles.cardTop, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.cardIndex, { color: C.textMuted }]}>{index + 1}</Text>
          <View style={[
            styles.counterBadge,
            {
              backgroundColor: done ? C.tint : C.backgroundCard,
              borderColor: done ? C.tint : C.separator,
            },
          ]}>
            <Text style={[styles.counterText, { color: done ? C.tintText : C.text }]}>
              {cur}/{dhikr.count}
            </Text>
          </View>
          {done && (
            <Animated.View entering={ZoomIn.duration(200)}>
              <Ionicons name="checkmark-circle" size={20} color={C.tint} style={{ marginLeft: 4 }} />
            </Animated.View>
          )}
          {hasHelpNote && !!translation && (
            <AthkarHelpBtn onPress={() => showHelp(translation)} C={C} />
          )}
        </View>

        <Text style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 1.75, color: done ? C.tint : C.text }]}>
          {dhikr.arabic}
        </Text>

        {displayMode === 'full' && (
          <Text style={[styles.translitText, { fontSize: translitFontSize, lineHeight: translitFontSize * 1.5, color: C.textMuted }]}>
            {dhikr.transliteration}
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
            {translation}
          </Text>
        )}
      </Pressable>
    </Animated.View>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardIndex: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 'auto',
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
