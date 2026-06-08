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
 * Mawaqit conventions enforced on top:
 *   - one page per screen, no internal scroll
 *   - swipe LEFT → next page; RIGHT → previous (RTL-aware via I18nManager)
 *   - LONG-PRESS on an ayah → add/remove ayah-precise bookmark
 *   - taps do nothing — no translation popups, no inline UI
 *   - minimal chrome: thin header (back / surah / bookmark), tiny footer (page)
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, FlatList,
  useWindowDimensions, I18nManager,
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

/* ── One Mushaf page — KFGQPC Hafs text rendering ──────────────
 * Each ayah is a Pressable with onLongPress only. The whole page is laid
 * out as flowing justified Arabic text, broken at ayah boundaries by
 * inserting space between them. New-surah markers are rendered inline as
 * a SurahBanner View; bismillah is its own line.
 *
 * For sizing we don't try to match the 15-line printed layout exactly —
 * we pick a font size such that the total content of the page fits the
 * available height with a small safety margin. Pages with banners +
 * bismillah leave less room for ayah text, so we count the ayat and
 * compute a target line count.
 * ──────────────────────────────────────────────────────────── */
function MushafPageView({
  pageNum, width, height, baseFontSize,
  textColor, mutedColor, tintColor, bgColor,
  highlightTarget, isBookmarkedFn, onLongPressAyah,
}: {
  pageNum: number;
  width: number;
  height: number;
  baseFontSize: number;
  textColor: string;
  mutedColor: string;
  tintColor: string;
  bgColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onLongPressAyah: (target: AyahKey) => void;
}) {
  const ayat = getHafsPage(pageNum);
  if (ayat.length === 0) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }

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

  const lineHeight = baseFontSize * 1.6;
  const bannerHeight = baseFontSize * 1.5;
  const bismillahHeight = baseFontSize * 1.45;

  return (
    <View style={{ width, height, backgroundColor: bgColor, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, justifyContent: 'center' }}>
      <View style={{ flex: 1, justifyContent: 'flex-start' }}>
      {groups.map((g, gi) => (
        <View key={gi} style={{ marginBottom: 2 }}>
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
                  fontSize: baseFontSize * 0.95,
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
              fontSize: baseFontSize,
              lineHeight,
              textAlign: 'justify',
              writingDirection: 'rtl',
            }}
          >
            {g.ayat.map((a, ai) => {
              const bookmarked = isBookmarkedFn(a.surahNum, a.ayahNum);
              const highlighted = highlightTarget?.surah === a.surahNum && highlightTarget?.ayah === a.ayahNum;
              // For surah 1 (Al-Fatiha) ayah 1, the bismillah IS the ayah — keep as-is.
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

  // Search/bookmark nav: jump to page containing the ayah, set highlight
  useEffect(() => {
    if (!params.highlightSurah || !params.highlightAyah) return;
    const surah = parseInt(params.highlightSurah, 10);
    const ayah = parseInt(params.highlightAyah, 10);
    setHighlightTarget({ surah, ayah });
    const newPage = getAyahPage(surah, ayah);
    if (newPage !== pageNum) {
      setPageNum(newPage);
      listRef.current?.scrollToIndex({ index: newPage - 1, animated: false });
    }
  }, [params.highlightSurah, params.highlightAyah, params.timestamp]);

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

  // Auto-fit font: target ~15-16 logical lines per page with a 1.6x line-height
  // multiplier, leave 4% slack for surah banners/bismillah/inter-group margins.
  const targetLines = 15.5;
  const computedFont = Math.floor((pageHeight * 0.96) / (targetLines * 1.6));
  const baseFontSize = Math.max(16, Math.min(28, computedFont));

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
      baseFontSize={baseFontSize}
      textColor={C.text}
      mutedColor={C.textMuted}
      tintColor={C.tint}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarkedFn={isBookmarked}
      onLongPressAyah={handleLongPressAyah}
    />
  ), [pageWidth, pageHeight, baseFontSize, C, isDark, highlightTarget, isBookmarked, handleLongPressAyah]);

  const data = useMemo(() => Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1), []);

  const onMomentumEnd = useCallback((e: any) => {
    if (!userScrolling.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const newPage = idx + 1;
    if (newPage !== pageNum && newPage >= 1 && newPage <= TOTAL_PAGES) {
      setPageNum(newPage);
    }
    userScrolling.current = false;
  }, [pageNum, pageWidth]);

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
        initialScrollIndex={initialPage - 1}
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
