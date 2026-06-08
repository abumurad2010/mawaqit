/**
 * Quran reader — Madani Mushaf, text-rendered with the official KFGQPC Hafs
 * Uthmanic Script font (v18).
 *
 * Font: King Fahd Glorious Quran Printing Complex, https://qurancomplex.gov.sa/en/techquran/dev/
 *   - Font files distributed via github.com/thetruetruth/quran-data-kfgqpc.
 *   - License: KFGQPC permits free use for Quranic rendering.
 *
 * Page data: hafsData_v18.json from the same upstream repo (MIT-licensed).
 *
 * Mawaqit conventions:
 *   - one page per screen, no internal scroll
 *   - swipe LEFT → next page in Arabic UI; LTR mode keeps standard pager
 *   - LONG-PRESS on an ayah → add/remove ayah-precise bookmark
 *   - TAP anywhere on the page → toggle chrome (header + footer) visibility
 *     for distraction-free reading
 *   - taps never open translation popups or menus
 *
 * Fit policy (NEVER drop content):
 *   - Start at fontSize = INITIAL_FONT.
 *   - Measure rendered content height via onLayout.
 *   - If measured > available page height, shrink fontSize by FONT_STEP and
 *     re-render. Floor at MIN_FONT. If still overflowing at the floor, allow
 *     visual overflow rather than truncating — every ayah and banner stays
 *     mounted.
 *   - Cache the converged fontSize per (page, available height) so it's
 *     stable across visits AND adapts when chrome toggles the available height.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, FlatList,
  useWindowDimensions, Animated, type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  SURAH_META,
  getAyahPage,
  getHafsPage,
  TOTAL_PAGES,
  type HafsAyah,
} from '@/lib/quran-api';

const QURAN_FONT = 'KFGQPCHafs';
const INITIAL_FONT = 24;
const MAX_FONT = 26;
const MIN_FONT = 16;
const FONT_STEP = 0.5;
/** Extra height the fit-loop subtracts from the layout box to avoid
 *  edge-clipping caused by Arabic descenders / diacritics. Tight enough
 *  to keep dense pages readable, generous enough to guarantee no
 *  bottom-row clipping in worst cases (e.g. page 3). */
const SAFETY_BUFFER = 8;
const LINE_HEIGHT_MULT = 1.5;
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 20;
const CHROME_FADE_MS = 220;

/** Per-(page,available-height) converged font size. */
const FIT_CACHE: Record<string, number> = {};
const fitKey = (page: number, available: number) => `${page}@${Math.floor(available)}`;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

interface AyahKey { surah: number; ayah: number }

/* ── Surah banner ────────────────────────────────────────────── */
function SurahBanner({
  surahNum, color, textColor, height, width,
}: {
  surahNum: number; color: string; textColor: string; height: number; width: number;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;
  const typeLabel = meta.type === 'Meccan' ? 'مكية' : 'مدنية';
  const text = `سورة ${meta.arabic} · ${typeLabel} · ${toArabicIndic(meta.ayahs)} آية`;
  const fontSize = Math.max(11, Math.min(17, height * 0.45));
  return (
    <View style={{ height, width, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: width - 12,
        borderWidth: 1.2,
        borderColor: color,
        borderRadius: 4,
        paddingVertical: 3,
        paddingHorizontal: 10,
      }}>
        <Text
          style={{
            color: textColor,
            fontFamily: 'Amiri_700Bold',
            fontSize,
            textAlign: 'center',
          }}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

/* ── Page content body — pure render at a given font size ──────── */
function MushafPageBody({
  ayat, width, fontSize, textColor, tintColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah,
}: {
  ayat: ReadonlyArray<HafsAyah>;
  width: number;
  fontSize: number;
  textColor: string;
  tintColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onLongPressAyah: (target: AyahKey) => void;
}) {
  type Group = { surahNum: number; isSurahStart: boolean; hasBismillah: boolean; ayat: HafsAyah[] };
  const groups: Group[] = [];
  for (const a of ayat) {
    const last = groups[groups.length - 1];
    if (last && last.surahNum === a.surahNum) {
      last.ayat.push(a);
    } else {
      const meta = SURAH_META[a.surahNum - 1];
      const isSurahStart = a.ayahNum === 1;
      // Surah 1 (Al-Fatiha)'s bismillah IS ayah 1, so no separate line.
      // Surah 9 (At-Tawbah) has no bismillah at all.
      const hasBismillah = isSurahStart && !!meta?.hasBismillah && a.surahNum !== 1;
      groups.push({ surahNum: a.surahNum, isSurahStart, hasBismillah, ayat: [a] });
    }
  }

  const lineHeight = fontSize * LINE_HEIGHT_MULT;
  const bannerHeight = Math.max(22, fontSize * 1.35);
  const bismillahHeight = Math.max(22, fontSize * 1.3);

  return (
    <>
      {groups.map((g, gi) => (
        <View key={gi}>
          {g.isSurahStart && (
            <SurahBanner
              surahNum={g.surahNum}
              color={tintColor}
              textColor={textColor}
              height={bannerHeight}
              width={width}
            />
          )}
          {g.hasBismillah && (
            <View style={{ height: bismillahHeight, justifyContent: 'center' }}>
              <Text
                style={{
                  color: textColor,
                  fontFamily: QURAN_FONT,
                  fontSize: fontSize * 0.95,
                  lineHeight: bismillahHeight,
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </Text>
            </View>
          )}
          <Text
            style={{
              color: textColor,
              fontFamily: QURAN_FONT,
              fontSize,
              lineHeight,
              textAlign: 'justify',
              writingDirection: 'rtl',
            }}
          >
            {g.ayat.map((a, ai) => {
              const bookmarked = isBookmarkedFn(a.surahNum, a.ayahNum);
              const highlighted = highlightTarget?.surah === a.surahNum && highlightTarget?.ayah === a.ayahNum;
              return (
                <Text
                  key={ai}
                  suppressHighlighting
                  onLongPress={() => onLongPressAyah({ surah: a.surahNum, ayah: a.ayahNum })}
                  style={{
                    color: highlighted ? tintColor : (bookmarked ? '#C8860A' : textColor),
                    backgroundColor: highlighted ? tintColor + '22' : undefined,
                  }}
                >
                  {a.text + ' '}
                </Text>
              );
            })}
          </Text>
        </View>
      ))}
    </>
  );
}

/* ── One Mushaf page — measure-and-fit + chrome-toggle tap surface ──── */
function MushafPageView({
  pageNum, width, height, textColor, tintColor, bgColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah, onTap,
}: {
  pageNum: number;
  width: number;
  height: number;
  textColor: string;
  tintColor: string;
  bgColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onLongPressAyah: (target: AyahKey) => void;
  onTap: () => void;
}) {
  const ayat = getHafsPage(pageNum);
  const horizPad = 10;
  const vertPad = 6;
  const innerWidth = width - horizPad * 2;
  // SAFETY_BUFFER absorbs Arabic descender/diacritic overhang that the
  // layout engine doesn't always account for in onLayout height. Without
  // it, page 3's last visual line clipped at the bottom-right edge.
  const available = height - vertPad * 2 - SAFETY_BUFFER;

  const cachedFont = FIT_CACHE[fitKey(pageNum, available)];
  const [fontSize, setFontSize] = useState<number>(cachedFont ?? INITIAL_FONT);
  // Reset to INITIAL when the page or available height changes.
  const lastKey = useRef<string>('');
  useEffect(() => {
    const key = fitKey(pageNum, available);
    if (lastKey.current !== key) {
      lastKey.current = key;
      const cached = FIT_CACHE[key];
      setFontSize(cached ?? INITIAL_FONT);
    }
  }, [pageNum, available]);

  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    if (measured > available && fontSize > MIN_FONT) {
      const next = Math.max(MIN_FONT, fontSize - FONT_STEP);
      FIT_CACHE[fitKey(pageNum, available)] = next;
      setFontSize(next);
    } else {
      FIT_CACHE[fitKey(pageNum, available)] = fontSize;
      if (measured > available) {
        // eslint-disable-next-line no-console
        console.warn(`[Mushaf] Page ${pageNum} overflows at MIN_FONT=${MIN_FONT}; measured=${measured}px available=${available}px`);
      }
    }
  }, [fontSize, available, pageNum]);

  // GestureDetector with a short Tap. RN's <Text onLongPress> at the leaf
  // level was eating short taps before they could reach a parent Pressable,
  // so the page-level chrome toggle never fired on ayah-area taps. With
  // gesture-handler, the Tap recognizer runs alongside (not below) the
  // Text gesture system and fires reliably no matter where the user taps.
  // maxDuration=250 prevents the Tap from competing with a long-press
  // (which needs >=500 ms by default).
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((_, success) => {
          'worklet';
          if (success) runOnJS(onTap)();
        }),
    [onTap]
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={{ width, height, backgroundColor: bgColor, paddingHorizontal: horizPad, paddingVertical: vertPad, overflow: 'hidden' }}>
        <View onLayout={onMeasure} style={{ width: innerWidth }}>
          <MushafPageBody
            ayat={ayat}
            width={innerWidth}
            fontSize={fontSize}
            textColor={textColor}
            tintColor={tintColor}
            highlightTarget={highlightTarget}
            isBookmarkedFn={isBookmarkedFn}
            onLongPressAyah={onLongPressAyah}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

/* ── Reader screen ───────────────────────────────────────────────── */
export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; timestamp?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));
  const highlightSurahParam = parseInt(params.highlightSurah ?? '0', 10);
  const highlightAyahParam  = parseInt(params.highlightAyah  ?? '0', 10);

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, setLastReadPage, setLastReadSurah,
          addBookmark, removeBookmark, isBookmarked, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [highlightTarget, setHighlightTarget] = useState<AyahKey | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeAnim = useRef(new Animated.Value(1)).current;

  const listRef = useRef<FlatList>(null);
  const userScrolling = useRef(false);

  useEffect(() => {
    Animated.timing(chromeAnim, {
      toValue: chromeVisible ? 1 : 0,
      duration: CHROME_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [chromeVisible, chromeAnim]);

  useEffect(() => {
    if (!highlightTarget) return;
    const tid = setTimeout(() => setHighlightTarget(null), 3000);
    return () => clearTimeout(tid);
  }, [highlightTarget]);

  // Arabic reading direction: reverse the data so index 0 = page 604, index 603 = page 1.
  // User starts at the right end of the strip; swipe-left decreases the index = next page.
  const pageFromIdx = useCallback(
    (idx: number) => (isAr ? (TOTAL_PAGES - idx) : (idx + 1)),
    [isAr]
  );
  const idxFromPage = useCallback(
    (page: number) => (isAr ? (TOTAL_PAGES - page) : (page - 1)),
    [isAr]
  );

  // Search/bookmark nav: jump to page containing the ayah, set highlight
  useEffect(() => {
    if (!params.highlightSurah || !params.highlightAyah) return;
    const surah = parseInt(params.highlightSurah, 10);
    const ayah = parseInt(params.highlightAyah, 10);
    setHighlightTarget({ surah, ayah });
    const newPage = getAyahPage(surah, ayah);
    if (newPage !== pageNum) {
      setPageNum(newPage);
      listRef.current?.scrollToIndex({ index: idxFromPage(newPage), animated: false });
    }
  }, [params.highlightSurah, params.highlightAyah, params.timestamp, idxFromPage]);

  // Persist last-read
  useEffect(() => {
    setLastReadPage(pageNum);
    const ayat = getHafsPage(pageNum);
    if (ayat[0]) setLastReadSurah(ayat[0].surahNum);
  }, [pageNum]);

  // Page area: full viewport between safe insets; chrome overlays the top and
  // bottom edges when visible. When chrome is hidden the same page area shows
  // through; we shrink the layout-reserved chrome to 0 so the font fit loop
  // gets a taller available height and may grow the font on dense pages.
  const chromeTop = chromeVisible ? HEADER_HEIGHT : 0;
  const chromeBottom = chromeVisible ? FOOTER_HEIGHT : 0;
  const pageHeight = Math.max(360, H - topInset - bottomInset - chromeTop - chromeBottom);
  const pageWidth = W;

  // Header surah label
  const currentAyat = getHafsPage(pageNum);
  const displaySurah = currentAyat[0]?.surahNum ?? 1;
  const displayMeta = SURAH_META[displaySurah - 1];
  const surahLabel = displayMeta ? (isAr ? displayMeta.arabic : displayMeta.transliteration) : '';

  const handleLongPressAyah = useCallback((target: AyahKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const meta = SURAH_META[target.surah - 1];
    const bookmarked = isBookmarked(target.surah, target.ayah);
    const label = isAr
      ? `${meta?.arabic ?? ''} — آية ${toArabicIndic(target.ayah)}`
      : `${meta?.transliteration ?? ''} — ${tr.ayah} ${target.ayah}`;
    Alert.alert(
      bookmarked ? tr.removeBookmark : tr.addBookmark,
      label,
      [
        { text: tr.btn_cancel, style: 'cancel' },
        {
          text: bookmarked ? tr.remove : tr.add,
          onPress: () => {
            if (bookmarked) {
              removeBookmark(target.surah, target.ayah);
            } else {
              addBookmark({
                surahNumber: target.surah,
                surahName: meta?.transliteration ?? '',
                ayahNumber: target.ayah,
                ayahText: '',
                timestamp: Date.now(),
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [isBookmarked, addBookmark, removeBookmark, tr, isAr]);

  const handleTap = useCallback(() => {
    setChromeVisible(v => !v);
  }, []);

  const renderItem = useCallback(({ item }: { item: number }) => (
    <MushafPageView
      pageNum={item}
      width={pageWidth}
      height={pageHeight}
      textColor={C.text}
      tintColor={C.tint}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarkedFn={isBookmarked}
      onLongPressAyah={handleLongPressAyah}
      onTap={handleTap}
    />
  ), [pageWidth, pageHeight, C, isDark, highlightTarget, isBookmarked, handleLongPressAyah, handleTap]);

  const data = useMemo(() => {
    const arr = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
    return isAr ? arr.reverse() : arr;
  }, [isAr]);

  const onMomentumEnd = useCallback((e: any) => {
    if (!userScrolling.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const newPage = pageFromIdx(idx);
    if (newPage !== pageNum && newPage >= 1 && newPage <= TOTAL_PAGES) {
      setPageNum(newPage);
    }
    userScrolling.current = false;
  }, [pageNum, pageWidth, pageFromIdx]);

  const bgColor = isDark ? '#0D0D0D' : '#FAF6EE';

  // Animated chrome translations — slide off-screen when hidden so the text
  // visually owns the full viewport.
  const headerTranslate = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(topInset + HEADER_HEIGHT), 0],
  });
  const footerTranslate = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [bottomInset + FOOTER_HEIGHT, 0],
  });

  return (
    <View style={[styles.root, { backgroundColor: bgColor, paddingTop: topInset + chromeTop, paddingBottom: bottomInset + chromeBottom }]}>
      {/* Pages */}
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(p) => String(p)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        initialScrollIndex={idxFromPage(initialPage)}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onScrollToIndexFailed={() => {}}
        onScrollBeginDrag={() => { userScrolling.current = true; }}
        onMomentumScrollEnd={onMomentumEnd}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />

      {/* Compact header — absolutely overlaid, animates with chromeAnim */}
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        style={[styles.headerOverlay, {
          height: topInset + HEADER_HEIGHT,
          paddingTop: topInset + 2,
          paddingHorizontal: 12,
          borderBottomColor: C.separator,
          backgroundColor: bgColor,
          opacity: chromeAnim,
          transform: [{ translateY: headerTranslate }],
        }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={18} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerSurah, { color: C.text, fontFamily: 'Amiri_700Bold' }]} numberOfLines={1}>
          {surahLabel}
        </Text>
        <Pressable
          onPress={() => router.push('/bookmarks')}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="bookmark-outline" size={16} color={C.textSecond} />
        </Pressable>
      </Animated.View>

      {/* Tiny footer — absolutely overlaid */}
      <Animated.View
        pointerEvents="none"
        style={[styles.footerOverlay, {
          height: bottomInset + FOOTER_HEIGHT,
          paddingBottom: bottomInset + 2,
          borderTopColor: C.separator,
          backgroundColor: bgColor,
          opacity: chromeAnim,
          transform: [{ translateY: footerTranslate }],
        }]}
      >
        <Text style={[styles.pageNumText, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
          {toArabicIndic(pageNum)} / {toArabicIndic(TOTAL_PAGES)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSurah: { fontSize: 16, letterSpacing: 0.4, flex: 1, textAlign: 'center', paddingHorizontal: 8 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  footerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 2, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNumText: { fontSize: 11, letterSpacing: 0.5 },
});
