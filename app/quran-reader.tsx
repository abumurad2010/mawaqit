import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert,
  FlatList, useWindowDimensions,
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
  getMushafPage,
  getHizbNumber,
  getHizbQuarter,
  type MushafLine,
  TOTAL_PAGES,
} from '@/lib/quran-api';

const QURAN_FONT = 'KFGQPCHafs';

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function hizbLabel(rubElHizb: number, isAr: boolean): string {
  const hizb = getHizbNumber(rubElHizb);
  const q = getHizbQuarter(rubElHizb);
  const frac = ['', '¼ ', '½ ', '¾ '][q];
  return isAr ? `${frac}حزب ${toArabicIndic(hizb)}` : `${frac}Hizb ${hizb}`;
}

interface AyahKey { surah: number; ayah: number }

/* ── Surah banner — single bordered row, fits page width ─────────── */
function SurahBanner({ surahNum, color, textColor, height, pageWidth }: {
  surahNum: number; color: string; textColor: string; height: number; pageWidth: number;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;
  const typeLabel = meta.type === 'Meccan' ? 'مكية' : 'مدنية';
  const text = `سورة ${meta.arabic} · ${typeLabel} · ${toArabicIndic(meta.ayahs)} آية`;
  const innerWidth = Math.max(120, pageWidth - 48);
  const maxFontByHeight = height * 0.42;
  const maxFontByWidth = innerWidth / (text.length * 0.55);
  const fontSize = Math.max(12, Math.min(18, Math.min(maxFontByHeight, maxFontByWidth)));
  return (
    <View style={{ height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
      <View style={{
        width: innerWidth,
        height: Math.max(28, height * 0.85),
        borderWidth: 1.2,
        borderColor: color,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
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

/* ── One Mushaf line — long-press only, no tap handler ───────────── */
function MushafLineView({
  line, height, fontSize, pageWidth,
  textColor, mutedColor, tintColor, isBookmarkedFn, onBookmark, highlightTarget,
}: {
  line: MushafLine;
  height: number;
  fontSize: number;
  pageWidth: number;
  textColor: string;
  mutedColor: string;
  tintColor: string;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onBookmark: (target: AyahKey) => void;
  highlightTarget: AyahKey | null;
}) {
  if (line.type === 'blank') {
    return <View style={{ height }} />;
  }
  if (line.type === 'header') {
    return (
      <SurahBanner
        surahNum={line.surah}
        color={tintColor}
        textColor={textColor}
        height={height}
        pageWidth={pageWidth}
      />
    );
  }
  if (line.type === 'bismillah') {
    return (
      <View style={{ height, justifyContent: 'center', overflow: 'hidden' }}>
        <Text
          style={{
            color: textColor,
            fontFamily: QURAN_FONT,
            fontSize: fontSize * 0.92,
            lineHeight: fontSize * 1.6,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </Text>
      </View>
    );
  }

  // verse line — single flat Text, long-press only
  const firstSeg = line.segments[0];
  if (!firstSeg) return <View style={{ height }} />;
  const highlighted = highlightTarget?.surah === firstSeg.surahNum && highlightTarget?.ayah === firstSeg.ayahNum;

  return (
    <Pressable
      onLongPress={() => onBookmark({ surah: firstSeg.surahNum, ayah: firstSeg.ayahNum })}
      delayLongPress={400}
      style={{
        height,
        paddingHorizontal: 4,
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: highlighted ? tintColor + '22' : undefined,
        borderRadius: 4,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontFamily: QURAN_FONT,
          fontSize,
          lineHeight: fontSize * 1.6,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {line.segments.map((seg, si) => {
          const bookmarked = isBookmarkedFn(seg.surahNum, seg.ayahNum);
          return (
            <React.Fragment key={si}>
              {seg.text}
              {seg.isAyahEnd ? (
                <Text style={{ color: bookmarked ? '#C8860A' : tintColor, fontSize: fontSize * 0.82 }}>
                  {' ۝' + toArabicIndic(seg.ayahNum) + ' '}
                </Text>
              ) : ' '}
            </React.Fragment>
          );
        })}
      </Text>
    </Pressable>
  );
}

/* ── One Mushaf page — 15 slots, content fits viewport ───────────── */
function MushafPageView({
  pageNum, width, height, lineSlot, baseFontSize,
  textColor, mutedColor, tintColor, bgColor,
  highlightTarget, isBookmarkedFn, onBookmark,
}: {
  pageNum: number;
  width: number;
  height: number;
  lineSlot: number;
  baseFontSize: number;
  textColor: string;
  mutedColor: string;
  tintColor: string;
  bgColor: string;
  highlightTarget: AyahKey | null;
  isBookmarkedFn: (s: number, a: number) => boolean;
  onBookmark: (target: AyahKey) => void;
}) {
  const page = getMushafPage(pageNum);
  if (!page) return <View style={{ width, height, backgroundColor: bgColor }} />;
  return (
    <View style={{ width, height, backgroundColor: bgColor, paddingHorizontal: 12 }}>
      {page.lines.map((line, idx) => (
        <MushafLineView
          key={idx}
          line={line}
          height={lineSlot}
          fontSize={baseFontSize}
          pageWidth={width}
          textColor={textColor}
          mutedColor={mutedColor}
          tintColor={tintColor}
          isBookmarkedFn={isBookmarkedFn}
          onBookmark={onBookmark}
          highlightTarget={highlightTarget}
        />
      ))}
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

  useEffect(() => {
    setLastReadPage(pageNum);
    const page = getMushafPage(pageNum);
    if (page) {
      for (const line of page.lines) {
        if (line.type === 'verse' && line.segments.length > 0) {
          setLastReadSurah(line.segments[0].surahNum);
          break;
        }
        if (line.type === 'header') { setLastReadSurah(line.surah); break; }
      }
    }
  }, [pageNum]);

  const headerHeight = 56;
  const footerHeight = 32;
  const verticalChrome = topInset + headerHeight + footerHeight + bottomInset;
  const pageHeight = Math.max(360, H - verticalChrome);
  const pageWidth = W;
  const lineSlot = pageHeight / 15;
  const baseFontSize = Math.max(15, Math.min(22, lineSlot * 0.55));

  const currentPage = getMushafPage(pageNum);
  const juzNum = currentPage?.juz ?? 1;
  const rubElHizb = currentPage?.rubElHizb ?? 1;

  const displaySurah = useMemo(() => {
    if (!currentPage) return 1;
    for (const line of currentPage.lines) {
      if (line.type === 'verse' && line.segments.length > 0) return line.segments[0].surahNum;
      if (line.type === 'header') return line.surah;
    }
    return 1;
  }, [currentPage, pageNum]);
  const displayMeta = SURAH_META[displaySurah - 1];
  const surahLabel = displayMeta ? (isAr ? displayMeta.arabic : displayMeta.transliteration) : '';

  const handleBookmark = useCallback((target: AyahKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bookmarked = isBookmarked(target.surah, target.ayah);
    const meta = SURAH_META[target.surah - 1];
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
      lineSlot={lineSlot}
      baseFontSize={baseFontSize}
      textColor={C.text}
      mutedColor={C.textMuted}
      tintColor={C.tint}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarkedFn={isBookmarked}
      onBookmark={handleBookmark}
    />
  ), [pageWidth, pageHeight, lineSlot, baseFontSize, C, isDark, highlightTarget, isBookmarked, handleBookmark]);

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
      <View style={[styles.header, {
        paddingTop: topInset + 4,
        paddingHorizontal: 16,
        borderBottomColor: C.separator,
        height: topInset + headerHeight,
      }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={C.tint} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerSurah, { color: C.text, fontFamily: 'Amiri_700Bold' }]} numberOfLines={1}>
            {surahLabel}
          </Text>
          <Text style={[styles.headerJuz, { color: C.textMuted }]} numberOfLines={1}>
            {isAr
              ? `جزء ${toArabicIndic(juzNum)} · ${hizbLabel(rubElHizb, true)}`
              : `Juz ${juzNum} · ${hizbLabel(rubElHizb, false)}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/bookmarks')}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="bookmark-outline" size={18} color={C.textSecond} />
        </Pressable>
      </View>

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

      <View style={[styles.footer, {
        paddingBottom: bottomInset + 4,
        height: footerHeight + bottomInset,
        borderTopColor: C.separator,
        backgroundColor: bgColor,
      }]}>
        <Text style={[styles.pageNumText, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
          {toArabicIndic(pageNum)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  headerSurah: { fontSize: 16, letterSpacing: 0.5 },
  headerJuz: { fontSize: 11, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNumText: { fontSize: 13 },
});
