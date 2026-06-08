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
 *   - taps do nothing — no translation popups, no inline UI
 *   - minimal chrome: thin header (back / surah / bookmark), tiny footer (page)
 *
 * Fit policy (NEVER drop content):
 *   - Start at fontSize = INITIAL_FONT (20).
 *   - Measure rendered content height via onLayout.
 *   - If measured > available page height, shrink fontSize by 0.5 pt and re-render.
 *   - Floor at MIN_FONT (14). If still overflowing at the floor, allow visual
 *     overflow rather than truncating — every ayah and banner stays mounted.
 *   - Cache the converged fontSize per page so it's stable across visits.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, FlatList,
  useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
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
const INITIAL_FONT = 20;
const MAX_FONT = 24;
const MIN_FONT = 14;
const FONT_STEP = 0.5;
/** Per-page converged font size, keyed by page number. */
const FIT_CACHE: Record<number, number> = {};

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

interface AyahKey { surah: number; ayah: number }

/* ── Surah banner — compact bordered row, fits page width ─────── */
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
        width: width - 16,
        borderWidth: 1.2,
        borderColor: color,
        borderRadius: 4,
        paddingVertical: 4,
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
  // Group consecutive ayat by surah so we can insert a banner + bismillah
  // before each surah that starts on this page.
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

  const lineHeight = fontSize * 1.6;
  const bannerHeight = Math.max(22, fontSize * 1.5);
  const bismillahHeight = Math.max(22, fontSize * 1.45);

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
              width={width - 24}
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
          {/* Surah ayat — flowing justified text, each ayah independently long-pressable */}
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

/* ── One Mushaf page — measure-and-fit wrapper ──────────────────
 * Renders MushafPageBody twice when needed:
 *   1) at the current candidate fontSize, with onLayout measuring its
 *      intrinsic height (overflow: 'visible' on the measured wrapper so
 *      the layout engine returns the full child extent even if the page
 *      visually clips it).
 *   2) if measured height > available page height, shrink fontSize by
 *      FONT_STEP and re-render. Loop until fits or floor reached.
 *   The converged value is cached per page so subsequent visits skip
 *   measurement.
 * ──────────────────────────────────────────────────────────── */
function MushafPageView({
  pageNum, width, height, textColor, tintColor, bgColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah,
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
}) {
  const ayat = getHafsPage(pageNum);
  const [fontSize, setFontSize] = useState<number>(() => FIT_CACHE[pageNum] ?? INITIAL_FONT);
  // Re-measure if width changes (rotation / split-screen).
  const widthRef = useRef(width);
  useEffect(() => {
    if (widthRef.current !== width) {
      widthRef.current = width;
      delete FIT_CACHE[pageNum];
      setFontSize(INITIAL_FONT);
    }
  }, [width, pageNum]);

  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

  const onMeasure = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    const available = height - 8; // 4 pt top + 4 pt bottom padding
    if (measured > available && fontSize > MIN_FONT) {
      const next = Math.max(MIN_FONT, fontSize - FONT_STEP);
      FIT_CACHE[pageNum] = next;
      setFontSize(next);
    } else {
      // Converged (fits, or hit the floor). Cache the result.
      FIT_CACHE[pageNum] = fontSize;
      if (measured > available) {
        // eslint-disable-next-line no-console
        console.warn(`[Mushaf] Page ${pageNum} overflows even at MIN_FONT=${MIN_FONT}; measured=${measured}px available=${available}px`);
      }
    }
  }, [fontSize, height, pageNum]);

  return (
    <View style={{ width, height, backgroundColor: bgColor, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, overflow: 'hidden' }}>
      <View onLayout={onMeasure} style={{ width: width - 24 }}>
        <MushafPageBody
          ayat={ayat}
          width={width}
          fontSize={fontSize}
          textColor={textColor}
          tintColor={tintColor}
          highlightTarget={highlightTarget}
          isBookmarkedFn={isBookmarkedFn}
          onLongPressAyah={onLongPressAyah}
        />
      </View>
    </View>
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

  const listRef = useRef<FlatList>(null);
  const userScrolling = useRef(false);

  useEffect(() => {
    if (!highlightTarget) return;
    const tid = setTimeout(() => setHighlightTarget(null), 3000);
    return () => clearTimeout(tid);
  }, [highlightTarget]);

  // Reading direction for the FlatList:
  //   Arabic UI: data reversed so that index 0 holds page 604 and index 603
  //   holds page 1. The user starts at the right end of the strip (high
  //   index), swipes LEFT to walk to lower indices = higher page numbers.
  //   The visual effect: swipe-LEFT advances to the next page, matching
  //   physical Mushaf reading order.
  //   LTR UI: standard order, index 0 → page 1, swipe-LEFT advances.
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

  // Compact chrome — minimize vertical space stolen from the Quran text
  const headerHeight = 44;
  const footerHeight = 22;
  const verticalChrome = topInset + headerHeight + footerHeight + bottomInset;
  const pageHeight = Math.max(360, H - verticalChrome);
  const pageWidth = W;

  // Current-page metadata (for header)
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
    />
  ), [pageWidth, pageHeight, C, isDark, highlightTarget, isBookmarked, handleLongPressAyah]);

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

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Compact header */}
      <View style={[styles.header, {
        paddingTop: topInset + 2,
        paddingHorizontal: 12,
        borderBottomColor: C.separator,
        height: topInset + headerHeight,
      }]}>
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

      {/* Tiny footer */}
      <View style={[styles.footer, {
        paddingBottom: bottomInset + 2,
        height: footerHeight + bottomInset,
        borderTopColor: C.separator,
        backgroundColor: bgColor,
      }]}>
        <Text style={[styles.pageNumText, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
          {toArabicIndic(pageNum)} / {toArabicIndic(TOTAL_PAGES)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSurah: { fontSize: 16, letterSpacing: 0.4, flex: 1, textAlign: 'center', paddingHorizontal: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 2, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNumText: { fontSize: 11, letterSpacing: 0.5 },
});
