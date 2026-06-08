import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Modal,
  FlatList, useWindowDimensions, ScrollView, I18nManager,
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
import { getTranslation, getTransliteration } from '@/lib/quran-translations';

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function hizbLabel(rubElHizb: number, isAr: boolean): string {
  const hizb = getHizbNumber(rubElHizb);
  const q = getHizbQuarter(rubElHizb);
  const frac = ['', '¼ ', '½ ', '¾ '][q];
  return isAr ? `${frac}حزب ${toArabicIndic(hizb)}` : `${frac}Hizb ${hizb}`;
}

interface AyahTapTarget { surah: number; ayah: number }

/* ── Surah banner (uses its own composed View + Text — safe, was rendering fine in v1.4.0) ── */
function SurahBanner({ surahNum, color, textColor, mutedColor, height }: {
  surahNum: number; color: string; textColor: string; mutedColor: string; height: number;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;
  const ayahCount = meta.ayahs;
  const typeLabel = meta.type === 'Meccan' ? 'مكية' : 'مدنية';
  const nameSize = Math.min(20, Math.max(13, height * 0.5));
  const metaSize = Math.min(11, Math.max(9, height * 0.26));
  return (
    <View style={[banner.wrapper, { height }]}>
      <View style={[banner.outer, { borderColor: color }]}>
        <View style={[banner.inner, { borderColor: color }]}>
          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
          </View>
          <View style={banner.center}>
            <Text style={[banner.surahName, { color: textColor, fontFamily: 'Amiri_700Bold', fontSize: nameSize }]}>
              سُورَةُ {meta.arabic}
            </Text>
            <Text style={[banner.meta, { color: mutedColor, fontFamily: 'Amiri_400Regular', fontSize: metaSize }]}>
              {typeLabel} · {toArabicIndic(ayahCount)} آية
            </Text>
          </View>
          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  wrapper: { justifyContent: 'center', paddingHorizontal: 8 },
  outer: { borderWidth: 1.5, borderRadius: 3, padding: 2 },
  inner: {
    borderWidth: 0.75, borderRadius: 1,
    paddingVertical: 4, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  center: { alignItems: 'center', flex: 1 },
  surahName: { letterSpacing: 0.5 },
  meta: { marginTop: 1 },
  sideOrn: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 16 },
  orn: { width: 4, height: 4, borderRadius: 2 },
  ornLine: { width: 1, height: 14 },
});

/* ── One Mushaf line — FIXED renderer ───────────────────────────
 *  • Single flat <Text>, no nested Text with onPress
 *  • Tap handler lives on the outer <Pressable>
 *  • No `numberOfLines`, no `adjustsFontSizeToFit`
 *  • Natural `lineHeight` (fontSize × 1.55) — never the slot height
 *  • Slot view has `overflow: 'hidden'` so the rare line that exceeds
 *    its height clips gracefully instead of pushing the page
 * ──────────────────────────────────────────────────────────── */
function MushafLineView({
  line, height, fontSize,
  textColor, headerColor, mutedColor, tintColor,
  highlightTarget, isBookmarked, onAyahTap,
}: {
  line: MushafLine;
  height: number;
  fontSize: number;
  textColor: string;
  headerColor: string;
  mutedColor: string;
  tintColor: string;
  highlightTarget: AyahTapTarget | null;
  isBookmarked: (s: number, a: number) => boolean;
  onAyahTap: (target: AyahTapTarget) => void;
}) {
  if (line.type === 'blank') {
    return <View style={{ height }} />;
  }
  if (line.type === 'header') {
    return (
      <SurahBanner
        surahNum={line.surah}
        color={tintColor}
        textColor={headerColor}
        mutedColor={mutedColor}
        height={height}
      />
    );
  }
  if (line.type === 'bismillah') {
    return (
      <View style={{ height, justifyContent: 'center', overflow: 'hidden' }}>
        <Text
          style={{
            color: textColor,
            fontFamily: 'AmiriQuran',
            fontSize: fontSize * 0.95,
            lineHeight: fontSize * 1.55,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </Text>
      </View>
    );
  }

  // verse line — one flat Text, end markers as un-tappable nested <Text>
  const firstSeg = line.segments[0];
  const highlighted = firstSeg && highlightTarget?.surah === firstSeg.surahNum && highlightTarget?.ayah === firstSeg.ayahNum;

  return (
    <Pressable
      onPress={() => firstSeg && onAyahTap({ surah: firstSeg.surahNum, ayah: firstSeg.ayahNum })}
      style={{
        height,
        paddingHorizontal: 6,
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: highlighted ? tintColor + '22' : undefined,
        borderRadius: 4,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontFamily: 'AmiriQuran',
          fontSize,
          lineHeight: fontSize * 1.55,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {line.segments.map((seg, si) => {
          const bookmarked = isBookmarked(seg.surahNum, seg.ayahNum);
          return (
            <React.Fragment key={si}>
              {seg.text}
              {seg.isAyahEnd ? (
                <Text style={{ color: bookmarked ? '#C8860A' : tintColor, fontSize: fontSize * 0.78 }}>
                  {' ﴿' + toArabicIndic(seg.ayahNum) + '﴾ '}
                </Text>
              ) : ' '}
            </React.Fragment>
          );
        })}
      </Text>
    </Pressable>
  );
}

/* ── One Mushaf page — fixed-size 15-slot grid ── */
function MushafPageView({
  pageNum, width, height, lineHeight, baseFontSize,
  textColor, headerColor, mutedColor, tintColor, bgColor,
  highlightTarget, isBookmarked, onAyahTap,
}: {
  pageNum: number;
  width: number;
  height: number;
  lineHeight: number;
  baseFontSize: number;
  textColor: string;
  headerColor: string;
  mutedColor: string;
  tintColor: string;
  bgColor: string;
  highlightTarget: AyahTapTarget | null;
  isBookmarked: (s: number, a: number) => boolean;
  onAyahTap: (target: AyahTapTarget) => void;
}) {
  const page = getMushafPage(pageNum);
  if (!page) {
    return <View style={{ width, height, backgroundColor: bgColor }} />;
  }
  return (
    <View style={{ width, height, backgroundColor: bgColor, paddingHorizontal: 12 }}>
      {page.lines.map((line, idx) => (
        <MushafLineView
          key={idx}
          line={line}
          height={lineHeight}
          fontSize={baseFontSize}
          textColor={textColor}
          headerColor={headerColor}
          mutedColor={mutedColor}
          tintColor={tintColor}
          highlightTarget={highlightTarget}
          isBookmarked={isBookmarked}
          onAyahTap={onAyahTap}
        />
      ))}
    </View>
  );
}

/* ── Tap-on-ayah modal: transliteration + translation + bookmark ── */
function AyahDetailModal({
  target, visible, onClose, lang, translitLang, colors,
  isBookmarked, addBookmark, removeBookmark,
}: {
  target: AyahTapTarget | null;
  visible: boolean;
  onClose: () => void;
  lang: string;
  translitLang: string;
  colors: any;
  isBookmarked: (s: number, a: number) => boolean;
  addBookmark: (b: any) => void;
  removeBookmark: (s: number, a: number) => void;
}) {
  if (!target) return null;
  const tr = t(lang as any);
  const meta = SURAH_META[target.surah - 1];
  const transliteration = getTransliteration(target.surah, target.ayah);
  const translation = getTranslation(translitLang, target.surah, target.ayah);
  const bookmarked = isBookmarked(target.surah, target.ayah);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[modalStyles.sheet, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[modalStyles.handle, { backgroundColor: colors.separator }]} />
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.text, fontFamily: 'Amiri_700Bold' }]}>
              {meta?.arabic ?? ''} · {tr.ayah} {toArabicIndic(target.ayah)}
            </Text>
            <Text style={[modalStyles.subtitle, { color: colors.textMuted }]}>
              {meta?.transliteration ?? ''}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {!!transliteration && (
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionLabel, { color: colors.tint }]}>
                  {tr.transliteration}
                </Text>
                <Text style={[modalStyles.bodyText, { color: colors.text, fontStyle: 'italic' }]}>
                  {transliteration}
                </Text>
              </View>
            )}
            {!!translation && (
              <View style={modalStyles.section}>
                <Text style={[modalStyles.sectionLabel, { color: colors.tint }]}>
                  {tr.translation_label ?? 'Translation'}
                </Text>
                <Text style={[modalStyles.bodyText, { color: colors.text }]}>
                  {translation}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={modalStyles.actions}>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
              }}
              style={({ pressed }) => [
                modalStyles.actionBtn,
                { backgroundColor: bookmarked ? colors.tintLight : colors.tint, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={bookmarked ? colors.tint : colors.tintText} />
              <Text style={[modalStyles.actionLabel, { color: bookmarked ? colors.tint : colors.tintText }]}>
                {bookmarked ? tr.removeBookmark : tr.addBookmark}
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                modalStyles.actionBtn,
                { backgroundColor: colors.backgroundSecond, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[modalStyles.actionLabel, { color: colors.text }]}>
                {tr.btn_done}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28,
    borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { marginBottom: 12 },
  title: { fontSize: 22, textAlign: 'center' },
  subtitle: { fontSize: 12, textAlign: 'center', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  bodyText: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});

/* ── Screen ── */
export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; timestamp?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));
  const highlightSurahParam = parseInt(params.highlightSurah ?? '0', 10);
  const highlightAyahParam  = parseInt(params.highlightAyah  ?? '0', 10);

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, translitLang, setLastReadPage, setLastReadSurah,
          addBookmark, removeBookmark, isBookmarked, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [tapTarget, setTapTarget] = useState<AyahTapTarget | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<AyahTapTarget | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );

  const listRef = useRef<FlatList>(null);
  const userScrolling = useRef(false);

  // Auto-clear highlight after 3 s
  useEffect(() => {
    if (!highlightTarget) return;
    const tid = setTimeout(() => setHighlightTarget(null), 3000);
    return () => clearTimeout(tid);
  }, [highlightTarget]);

  // Search/bookmark navigation: jump to the page containing the ayah and highlight it
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
    const page = getMushafPage(pageNum);
    if (page) {
      for (const line of page.lines) {
        if (line.type === 'verse' && line.segments.length > 0) {
          setLastReadSurah(line.segments[0].surahNum);
          break;
        }
        if (line.type === 'header') {
          setLastReadSurah(line.surah);
          break;
        }
      }
    }
  }, [pageNum]);

  // Viewport geometry
  const headerHeight = 56;
  const footerHeight = 36;
  const verticalChrome = topInset + headerHeight + footerHeight + bottomInset;
  const pageHeight = H - verticalChrome;
  const pageWidth = W;
  const lineSlot = pageHeight / 15;
  // Conservative auto-fit: keep font small enough that every line fits, generous enough that text is comfortable.
  const baseFontSize = Math.min(22, Math.max(15, lineSlot * 0.52));

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

  // RTL-aware paging: in Arabic UI, RN auto-flips horizontal contentOffset, so without `inverted` swipe-left maps to "prev"
  // and forward navigation feels backwards. Setting `inverted` in that case restores swipe-left = next.
  // In LTR (English etc.) the default behaviour already does swipe-left = next.
  const useInverted = I18nManager.isRTL;

  const renderItem = useCallback(({ item }: { item: number }) => (
    <MushafPageView
      pageNum={item}
      width={pageWidth}
      height={pageHeight}
      lineHeight={lineSlot}
      baseFontSize={baseFontSize}
      textColor={C.text}
      headerColor={C.text}
      mutedColor={C.textMuted}
      tintColor={C.tint}
      bgColor={isDark ? '#0D0D0D' : '#FAF6EE'}
      highlightTarget={highlightTarget}
      isBookmarked={isBookmarked}
      onAyahTap={(t) => { Haptics.selectionAsync(); setTapTarget(t); }}
    />
  ), [pageWidth, pageHeight, lineSlot, baseFontSize, C, isDark, highlightTarget, isBookmarked]);

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
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16, borderBottomColor: C.separator, height: topInset + headerHeight }]}>
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
          <Text style={[styles.headerJuz, { color: C.textMuted }]}>
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
        inverted={useInverted}
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

      <AyahDetailModal
        target={tapTarget}
        visible={!!tapTarget}
        onClose={() => setTapTarget(null)}
        lang={lang}
        translitLang={translitLang}
        colors={C}
        isBookmarked={isBookmarked}
        addBookmark={addBookmark}
        removeBookmark={removeBookmark}
      />
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
  headerSurah: { fontSize: 17, letterSpacing: 0.5 },
  headerJuz: { fontSize: 11, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNumText: { fontSize: 14 },
});
