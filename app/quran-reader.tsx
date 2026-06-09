/**
 * Quran reader — Madani Mushaf, text-rendered with the official KFGQPC Hafs
 * Uthmanic Script font (v18).
 *
 * Font: King Fahd Glorious Quran Printing Complex, https://qurancomplex.gov.sa/en/techquran/dev/
 *   Font files distributed via github.com/thetruetruth/quran-data-kfgqpc.
 *   License: KFGQPC permits free use for Quranic rendering.
 *
 * Page data: hafsData_v18.json from the same upstream repo (MIT-licensed).
 *
 * Polish goals (Ayah app visual quality):
 *   - vertically distributed page content (justifyContent: space-evenly)
 *   - ornate bordered surah banner with end medallions (drawn in SVG)
 *   - subtle minimal-chrome default: tiny surah label top-left, juz label
 *     top-right, decorative oval page number at the bottom
 *   - TAP page → reveal a full chrome bar (back / ToC / search / bookmark);
 *     TAP again hides it.
 *   - LONG-PRESS ayah → ayah-precise bookmark.
 *   - SWIPE → page navigation (RTL-aware via the reversed data array).
 *
 * Fit policy (NEVER drop content):
 *   The reader renders MushafPageBody twice — once invisibly off-screen for
 *   intrinsic-height measurement, once visibly inside a space-evenly flex
 *   container for distribution. If measured > available, shrink fontSize by
 *   FONT_STEP and re-render. Floor at MIN_FONT; if still overflowing, allow
 *   visual overflow rather than truncating — every ayah, banner, and
 *   bismillah stays mounted.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, FlatList,
  useWindowDimensions, Animated, type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Rect, Circle, Ellipse } from 'react-native-svg';
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
/** Initial guess for pages with a surah banner (page 1 Al-Fatiha, page 2
 *  Al-Baqarah start, etc.). These pages render with a centered breathing
 *  layout (justifyContent: space-evenly) so the banner sits in the right
 *  vertical area regardless of how much surrounding text exists. We keep
 *  the start size modest so a single surah header + bismillah still
 *  reads gracefully on Al-Fatiha. */
const INITIAL_FONT_WITH_BANNER = 24;
/** Initial guess for pages that are ONE flowing ayah group with no banner
 *  (e.g. page 3 Al-Baqarah cont'd). These pages render top-aligned and
 *  the fit-loop shrinks ONLY on overflow, so a larger starting size
 *  ensures the text grows to fill the available area before shrinking. */
const INITIAL_FONT_NO_BANNER = 32;
const MAX_FONT = 32;
const MIN_FONT = 16;
const FONT_STEP = 0.5;
const SAFETY_BUFFER = 8;
const LINE_HEIGHT_MULT = 1.5;
const MINI_LABEL_HEIGHT = 26;
const PAGE_OVAL_HEIGHT = 30;
const ICON_BAR_HEIGHT = 44;
const CHROME_FADE_MS = 240;
/** Muted ornament gold, harmonises with both dark and light backgrounds. */
const GOLD_LIGHT = '#A88B5C';
const GOLD_DARK  = '#C9A875';

/** Per-(page,available-height) converged font size. */
const FIT_CACHE: Record<string, number> = {};
const fitKey = (page: number, available: number) => `${page}@${Math.floor(available)}`;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

interface AyahKey { surah: number; ayah: number }

/* ─────────────────────────────────────────────────────────────────────────
 * OrnateSurahBanner — Madani-style bordered frame with end medallions
 * drawn in react-native-svg, surah title overlaid in calligraphic Arabic.
 * The frame is intentionally muted gold/grey so it reads as decoration
 * rather than chrome.
 * ──────────────────────────────────────────────────────────────────────── */
function OrnateSurahBanner({
  surahNum, color, textColor, width, height,
}: {
  surahNum: number; color: string; textColor: string; width: number; height: number;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;
  const innerW = width;
  const innerH = height;
  const titleSize = Math.max(15, Math.min(22, innerH * 0.34));
  const medR = Math.min(13, innerH * 0.2);
  const medCX = Math.max(28, innerW * 0.08);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', marginVertical: 4 }}>
      <Svg width={innerW} height={innerH} viewBox={`0 0 ${innerW} ${innerH}`}>
        {/* Outer frame — thick border with generous margin */}
        <Rect
          x={5} y={5}
          width={innerW - 10} height={innerH - 10}
          rx={4} ry={4}
          stroke={color} strokeWidth={1.4} fill="transparent"
        />
        {/* Inner frame — thinner, gives a doubled-edge look */}
        <Rect
          x={10} y={10}
          width={innerW - 20} height={innerH - 20}
          rx={2} ry={2}
          stroke={color} strokeWidth={0.5} fill="transparent"
        />
        {/* Left medallion — three concentric circles, larger so they read */}
        <Circle cx={medCX} cy={innerH / 2} r={medR} stroke={color} strokeWidth={0.9} fill="transparent" />
        <Circle cx={medCX} cy={innerH / 2} r={medR * 0.62} stroke={color} strokeWidth={0.6} fill="transparent" />
        <Circle cx={medCX} cy={innerH / 2} r={medR * 0.22} fill={color} />
        {/* Right medallion */}
        <Circle cx={innerW - medCX} cy={innerH / 2} r={medR} stroke={color} strokeWidth={0.9} fill="transparent" />
        <Circle cx={innerW - medCX} cy={innerH / 2} r={medR * 0.62} stroke={color} strokeWidth={0.6} fill="transparent" />
        <Circle cx={innerW - medCX} cy={innerH / 2} r={medR * 0.22} fill={color} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            color: textColor,
            fontFamily: 'Amiri_700Bold',
            fontSize: titleSize,
            textAlign: 'center',
          }}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {`سُورَة ${meta.arabic}`}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * PageNumberFrame — bottom-center decorative oval containing Arabic-Indic
 * page number. Renders in muted gold; the digits sit in the middle of the
 * shape.
 * ──────────────────────────────────────────────────────────────────────── */
function PageNumberFrame({
  pageNum, color, width = 64, height = 24,
}: { pageNum: number; color: string; width?: number; height?: number }) {
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 1} ry={height / 2 - 1}
          stroke={color} strokeWidth={0.7} fill="transparent" />
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 5} ry={height / 2 - 5}
          stroke={color} strokeWidth={0.4} fill="transparent" />
        {/* Tiny tasseled dots flanking the oval */}
        <Circle cx={2} cy={height / 2} r={1} fill={color} />
        <Circle cx={width - 2} cy={height / 2} r={1} fill={color} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontFamily: 'Amiri_700Bold', fontSize: 11, letterSpacing: 0.5 }}>
          {toArabicIndic(pageNum)}
        </Text>
      </View>
    </View>
  );
}

/* ── Page content body — pure render at a given font size ──────── */
function MushafPageBody({
  ayat, width, fontSize, textColor, ornamentColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah,
}: {
  ayat: ReadonlyArray<HafsAyah>;
  width: number;
  fontSize: number;
  textColor: string;
  ornamentColor: string;
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
      const hasBismillah = isSurahStart && !!meta?.hasBismillah && a.surahNum !== 1;
      groups.push({ surahNum: a.surahNum, isSurahStart, hasBismillah, ayat: [a] });
    }
  }

  const lineHeight = fontSize * LINE_HEIGHT_MULT;
  // Thicker banner — feels like a panel, not a thin label. Internal padding
  // pushes the title up off the bottom border and the medallions sit with
  // breathing room above and below them.
  const bannerHeight = Math.max(58, fontSize * 2.6);
  const bismillahHeight = Math.max(26, fontSize * 1.5);

  return (
    <>
      {groups.map((g, gi) => (
        <View key={gi}>
          {g.isSurahStart && (
            <OrnateSurahBanner
              surahNum={g.surahNum}
              color={ornamentColor}
              textColor={textColor}
              width={width}
              height={bannerHeight}
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
                    color: highlighted ? ornamentColor : (bookmarked ? '#C8860A' : textColor),
                    backgroundColor: highlighted ? ornamentColor + '22' : undefined,
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

/* ── One Mushaf page — measure off-screen, render distributed ──── */
function MushafPageView({
  pageNum, width, height, textColor, ornamentColor, bgColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah, onTap,
}: {
  pageNum: number;
  width: number;
  height: number;
  textColor: string;
  ornamentColor: string;
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
  const available = height - vertPad * 2 - SAFETY_BUFFER;

  // Page composition — decides initial font + layout policy.
  //   hasBanner  : any group on this page starts a surah (banner + breathing
  //                space; Al-Fatiha / Al-Baqarah start aesthetic).
  //   multiGroup : two or more surahs share the page (mid-page transitions
  //                like 293 Al-Isra→Al-Kahf, 604 with three short surahs).
  //   Single dense group, no banner (most pages — 3, 4, 50, 292):
  //     start font HIGH (32) so the text naturally fills top-to-bottom;
  //     justifyContent: 'flex-start' so the first line sits at the top.
  //   Banner or multi-group:
  //     start font modest (24), use 'space-evenly' to distribute groups
  //     evenly — preserves the centered breathing-space layout users
  //     specifically asked us to keep on pages 1 and 2.
  const { hasBanner, multiGroup } = useMemo(() => {
    let banner = false;
    let lastSurah = -1;
    let nGroups = 0;
    for (const a of ayat) {
      if (a.surahNum !== lastSurah) {
        nGroups++;
        lastSurah = a.surahNum;
        if (a.ayahNum === 1) banner = true;
      }
    }
    return { hasBanner: banner, multiGroup: nGroups > 1 };
  }, [ayat]);
  const useBreathingLayout = hasBanner || multiGroup;
  const initialFont = useBreathingLayout ? INITIAL_FONT_WITH_BANNER : INITIAL_FONT_NO_BANNER;

  const cachedFont = FIT_CACHE[fitKey(pageNum, available)];
  const [fontSize, setFontSize] = useState<number>(cachedFont ?? initialFont);
  const lastKey = useRef<string>('');
  useEffect(() => {
    const key = fitKey(pageNum, available);
    if (lastKey.current !== key) {
      lastKey.current = key;
      const cached = FIT_CACHE[key];
      setFontSize(cached ?? initialFont);
    }
  }, [pageNum, available, initialFont]);

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
      } else {
        // eslint-disable-next-line no-console
        console.log(`[Mushaf] Page ${pageNum} fit: layout=${useBreathingLayout ? 'breathing' : 'fill'} fontSize=${fontSize} measured=${Math.round(measured)} available=${Math.round(available)}`);
      }
    }
  }, [fontSize, available, pageNum, useBreathingLayout]);

  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

  // GestureDetector with a short Tap. gesture-handler's recognizer runs
  // parallel to RN's Text gesture system so it fires reliably regardless of
  // where on the page the user taps — including on top of an ayah Text.
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
        {/* Off-screen measurement — intrinsic height drives the fit-loop. */}
        <View
          onLayout={onMeasure}
          style={{ position: 'absolute', top: 0, left: -10000, width: innerWidth, opacity: 0 }}
          pointerEvents="none"
        >
          <MushafPageBody
            ayat={ayat}
            width={innerWidth}
            fontSize={fontSize}
            textColor={textColor}
            ornamentColor={ornamentColor}
            highlightTarget={highlightTarget}
            isBookmarkedFn={isBookmarkedFn}
            onLongPressAyah={onLongPressAyah}
          />
        </View>
        {/* Visible render — breathing/centered when there's a banner or
            multiple surahs on this page (preserves the Al-Fatiha and
            Al-Baqarah-start aesthetic); top-aligned & fill-height for
            single-group continuation pages so the text covers the whole
            page rather than bunching in the middle. */}
        <View style={{ flex: 1, justifyContent: useBreathingLayout ? 'space-evenly' : 'flex-start' }}>
          <MushafPageBody
            ayat={ayat}
            width={innerWidth}
            fontSize={fontSize}
            textColor={textColor}
            ornamentColor={ornamentColor}
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
  const ornamentColor = isDark ? GOLD_DARK : GOLD_LIGHT;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [highlightTarget, setHighlightTarget] = useState<AyahKey | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );
  const [chromeVisible, setChromeVisible] = useState(false);
  const chromeAnim = useRef(new Animated.Value(0)).current;

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

  // Arabic: reverse the data so a finger-left drag decreases the index = next page.
  const pageFromIdx = useCallback(
    (idx: number) => (isAr ? (TOTAL_PAGES - idx) : (idx + 1)),
    [isAr]
  );
  const idxFromPage = useCallback(
    (page: number) => (isAr ? (TOTAL_PAGES - page) : (page - 1)),
    [isAr]
  );

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

  useEffect(() => {
    setLastReadPage(pageNum);
    const ayat = getHafsPage(pageNum);
    if (ayat[0]) setLastReadSurah(ayat[0].surahNum);
  }, [pageNum]);

  // Layout: top safe + MINI_LABEL row + page + PAGE_OVAL row + bottom safe.
  // Chrome icon bar overlays the MINI_LABEL row when revealed (no layout shift).
  const pageHeight = Math.max(360, H - topInset - bottomInset - MINI_LABEL_HEIGHT - PAGE_OVAL_HEIGHT);
  const pageWidth = W;

  // Current-page metadata
  const currentAyat = getHafsPage(pageNum);
  const displaySurah = currentAyat[0]?.surahNum ?? 1;
  const displayMeta = SURAH_META[displaySurah - 1];
  const surahLabel = displayMeta ? (isAr ? displayMeta.arabic : displayMeta.transliteration) : '';
  const juzNum = currentAyat[0]?.juz ?? 1;
  const juzLabel = isAr ? `جزء ${toArabicIndic(juzNum)}` : `${tr.juz} ${juzNum}`;

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
      ornamentColor={ornamentColor}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarkedFn={isBookmarked}
      onLongPressAyah={handleLongPressAyah}
      onTap={handleTap}
    />
  ), [pageWidth, pageHeight, C, isDark, ornamentColor, highlightTarget, isBookmarked, handleLongPressAyah, handleTap]);

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
  const iconBarTranslate = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(ICON_BAR_HEIGHT + 8), 0],
  });

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Mini-label strip — always visible */}
      <View style={{
        height: topInset + MINI_LABEL_HEIGHT,
        paddingTop: topInset + 2,
        paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : 'Inter_400Regular', fontSize: 11, letterSpacing: 0.3 }} numberOfLines={1}>
          {surahLabel}
        </Text>
        <Text style={{ color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : 'Inter_400Regular', fontSize: 11, letterSpacing: 0.3 }} numberOfLines={1}>
          {juzLabel}
        </Text>
      </View>

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

      {/* Decorative page-number oval — bottom centre, always visible */}
      <View style={{
        height: PAGE_OVAL_HEIGHT + bottomInset,
        paddingBottom: bottomInset + 2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <PageNumberFrame pageNum={pageNum} color={ornamentColor} />
      </View>

      {/* Full chrome icon bar — slides down from above on tap */}
      <Animated.View
        pointerEvents={chromeVisible ? 'auto' : 'none'}
        style={[styles.iconBar, {
          paddingTop: topInset + 2,
          height: topInset + ICON_BAR_HEIGHT,
          backgroundColor: bgColor,
          borderBottomColor: C.separator,
          opacity: chromeAnim,
          transform: [{ translateY: iconBarTranslate }],
        }]}
      >
        <View style={styles.iconBarRow}>
          <View style={styles.iconGroup}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="chevron-back" size={18} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/quran-toc')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="list" size={18} color={C.textSecond} />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/search', params: { mode: 'mushaf' } })}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="search" size={16} color={C.textSecond} />
            </Pressable>
          </View>
          <View style={styles.iconGroup}>
            <Pressable
              onPress={() => router.push('/bookmarks')}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="bookmark-outline" size={16} color={C.textSecond} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  iconBarRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
