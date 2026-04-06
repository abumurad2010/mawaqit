import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert,
  ScrollView, PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQuranPage, SURAH_META, SURAH_START_PAGES, BISMILLAH_TEXT, type PageAyah } from '@/lib/quran-api';

const TOTAL_PAGES = 604;
const SWIPE_THRESHOLD = 55;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function stripBismillah(text: string): string {
  return text.slice(BISMILLAH_TEXT.length).trimStart();
}

function SurahBanner({ surahNum, color, textColor, mutedColor }: {
  surahNum: number; color: string; textColor: string; mutedColor: string;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;

  const ayahCount = meta.ayahs;
  const typeLabel = meta.type === 'Meccan' ? 'مكية' : 'مدنية';

  return (
    <View style={banner.wrapper}>
      <View style={[banner.outer, { borderColor: color }]}>
        <View style={[banner.inner, { borderColor: color }]}>
          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
            <View style={[banner.orn, { backgroundColor: color }]} />
          </View>

          <View style={banner.center}>
            <Text style={[banner.surahWord, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
              {toArabicIndic(surahNum)} · سُورَةُ
            </Text>
            <Text style={[banner.surahName, { color: textColor, fontFamily: 'Amiri_700Bold' }]}>
              {meta.arabic}
            </Text>
            <View style={banner.metaRow}>
              <Text style={[banner.meta, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
                {typeLabel}
              </Text>
              <View style={[banner.metaDot, { backgroundColor: mutedColor }]} />
              <Text style={[banner.meta, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
                {toArabicIndic(ayahCount)} آية
              </Text>
            </View>
          </View>

          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
            <View style={[banner.orn, { backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  wrapper: { marginTop: 8, marginBottom: 6, marginHorizontal: 4 },
  outer: {
    borderWidth: 1.5,
    borderRadius: 3,
    padding: 3,
  },
  inner: {
    borderWidth: 0.75,
    borderRadius: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center', flex: 1 },
  surahWord: { fontSize: 12, letterSpacing: 1, marginBottom: 2 },
  surahName: { fontSize: 24, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 11 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },
  sideOrn: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 20 },
  orn: { width: 5, height: 5, borderRadius: 2.5 },
  ornLine: { width: 1, height: 20 },
});

// Must mirror stripArabicDiacritics + normalizeForSearch from lib/quran-api.ts exactly.
// Diacritics range includes \u0670 (Arabic superscript Alef, common in Quran text).
const ARABIC_DIACRITIC_RE = /[\u064B-\u065F\u0670\u0610-\u061A]/;

function normalizeArabic(s: string): string {
  // Apply char-by-char: same logic as normalizeForSearch so matches are consistent
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ARABIC_DIACRITIC_RE.test(ch)) continue;        // skip diacritics
    out += /[أإآٱ]/.test(ch) ? 'ا' : ch.toLowerCase(); // normalize Alef + lowercase
  }
  return out;
}

function highlightArabicInline(
  text: string,
  term: string,
  tintColor: string,
): React.ReactNode[] {
  if (!term || !text) return [text];

  const normTerm = normalizeArabic(term);
  if (!normTerm) return [text];

  // Build position map: normPos → origPos (skip diacritics, Alef is 1:1 mapped)
  const normToOrig: number[] = [];
  let normStr = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ARABIC_DIACRITIC_RE.test(ch)) continue;
    normStr += /[أإآٱ]/.test(ch) ? 'ا' : ch.toLowerCase();
    normToOrig.push(i);
  }

  if (!normStr.includes(normTerm)) return [text];

  const parts: React.ReactNode[] = [];
  let normIdx = 0;
  let lastOrigIdx = 0;

  while (normIdx <= normStr.length - normTerm.length) {
    const mi = normStr.indexOf(normTerm, normIdx);
    if (mi === -1) break;
    const origStart = normToOrig[mi];
    const normEnd = mi + normTerm.length;
    const origEnd = normEnd < normToOrig.length ? normToOrig[normEnd] : text.length;
    if (origStart > lastOrigIdx) {
      parts.push(text.slice(lastOrigIdx, origStart));
    }
    parts.push(
      <Text
        key={`hl-${mi}`}
        style={{ backgroundColor: tintColor + '33', color: tintColor, borderRadius: 2 }}
      >
        {text.slice(origStart, origEnd)}
      </Text>
    );
    lastOrigIdx = origEnd;
    normIdx = normEnd || normIdx + 1;
  }
  if (lastOrigIdx < text.length) parts.push(text.slice(lastOrigIdx));
  return parts;
}

export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; highlight?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));
  const highlightSurahParam = parseInt(params.highlightSurah ?? '0', 10);
  const highlightAyahParam  = parseInt(params.highlightAyah  ?? '0', 10);
  const highlightTerm = params.highlight ?? '';

  const insets = useSafeAreaInsets();
  const { isDark, lang, fontSize, setLastReadPage,
          addBookmark, removeBookmark, isBookmarked, colors, updateSettings } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [highlightTarget, setHighlightTarget] = useState<{ surah: number; ayah: number } | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );

  const flip = useSharedValue(0);
  const navigating = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const flipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${flip.value}deg` },
    ],
  }));

  const flipShadowStyle = useAnimatedStyle(() => ({
    opacity: (Math.abs(flip.value) / 90) * 0.45,
  }));

  const FONT_STEPS = ['small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;
  const fsIdx = FONT_STEPS.indexOf(fontSize as typeof FONT_STEPS[number]);
  const fontScale = [0.80, 1.0, 1.22, 1.45, 1.70][fsIdx] ?? 1.0;
  const arabicFontSize = 22 * fontScale;
  const changeFontSize = (dir: 1 | -1) => {
    const next = fsIdx + dir;
    if (next < 0 || next >= FONT_STEPS.length) return;
    Haptics.selectionAsync();
    updateSettings({ fontSize: FONT_STEPS[next] });
  };

  useEffect(() => {
    setLastReadPage(pageNum);
  }, [pageNum]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (navigating.current) return;
    const newPage = direction === 'next' ? pageNum + 1 : pageNum - 1;
    if (newPage < 1 || newPage > TOTAL_PAGES) return;
    navigating.current = true;
    // Mushaf is always RTL: next page flips right (+90°), prev page flips left (−90°)
    const outAngle = direction === 'next' ? 90 : -90;

    const doSwap = () => {
      setPageNum(newPage);
      setHighlightTarget(null);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    };
    const doFinish = () => {
      navigating.current = false;
    };

    flip.value = withTiming(outAngle, { duration: 200, easing: Easing.in(Easing.ease) }, (done) => {
      if (done) {
        runOnJS(doSwap)();
        flip.value = -outAngle;
        flip.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, (done2) => {
          if (done2) runOnJS(doFinish)();
        });
      }
    });
    Haptics.selectionAsync();
  }, [pageNum, flip]);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const handleLongPressAyah = useCallback((ayah: PageAyah) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bookmarked = isBookmarked(ayah.surahNum, ayah.ayahNum);
    const surahName = SURAH_META[ayah.surahNum - 1];
    const label = isAr
      ? `${surahName?.arabic ?? ''} — آية ${toArabicIndic(ayah.ayahNum)}`
      : `${surahName?.transliteration ?? ''} — Ayah ${ayah.ayahNum}`;
    Alert.alert(
      bookmarked ? (isAr ? 'إزالة الإشارة' : 'Remove Bookmark') : (isAr ? 'إضافة إشارة' : 'Bookmark Ayah'),
      label,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: bookmarked ? (isAr ? 'إزالة' : 'Remove') : (isAr ? 'إضافة' : 'Add'),
          onPress: () => {
            if (bookmarked) {
              removeBookmark(ayah.surahNum, ayah.ayahNum);
            } else {
              addBookmark({
                surahNumber: ayah.surahNum,
                surahName: surahName?.transliteration ?? '',
                ayahNumber: ayah.ayahNum,
                ayahText: ayah.text,
                timestamp: Date.now(),
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [isBookmarked, addBookmark, removeBookmark, isAr]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        // Quran is RTL: swipe right (dx > 0) = next page, swipe left (dx < 0) = prev page
        if (g.dx > SWIPE_THRESHOLD) navigateRef.current('next');
        else if (g.dx < -SWIPE_THRESHOLD) navigateRef.current('prev');
      },
    })
  ).current;

  const pageAyahs = getQuranPage(pageNum);

  const groups: Array<{ surahNum: number; ayahs: PageAyah[]; showHeader: boolean }> = [];
  for (const ayah of pageAyahs) {
    if (groups.length === 0 || groups[groups.length - 1].surahNum !== ayah.surahNum) {
      groups.push({ surahNum: ayah.surahNum, ayahs: [ayah], showHeader: ayah.ayahNum === 1 });
    } else {
      groups[groups.length - 1].ayahs.push(ayah);
    }
  }

  const juzNum = pageAyahs[0]?.juz ?? 1;

  const firstSurahOnPage = SURAH_META[pageAyahs[0]?.surahNum - 1];
  const surahLabel = firstSurahOnPage
    ? (isAr ? firstSurahOnPage.arabic : firstSurahOnPage.transliteration)
    : '';

  const bgColor = isDark ? '#0D0D0D' : '#FAF6EE';

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16, borderBottomColor: C.separator, zIndex: 2 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={C.tint} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerSurah, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
            {surahLabel}
          </Text>
          <Text style={[styles.headerJuz, { color: C.textMuted }]}>
            {isAr
              ? `جزء ${toArabicIndic(juzNum)} · صفحة ${toArabicIndic(pageNum)}`
              : `Juz ${juzNum} · Page ${pageNum}`}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Pressable
              onPress={() => changeFontSize(-1)}
              disabled={fsIdx === 0}
              style={[styles.fontPill, { backgroundColor: C.backgroundCard, opacity: fsIdx === 0 ? 0.3 : 1 }]}
            >
              <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', fontFamily: 'Inter_600SemiBold' }}>A−</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: C.textMuted, minWidth: 24, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {(['XS','S','M','L','XL'] as const)[fsIdx] ?? 'M'}
            </Text>
            <Pressable
              onPress={() => changeFontSize(1)}
              disabled={fsIdx === FONT_STEPS.length - 1}
              style={[styles.fontPill, { backgroundColor: C.backgroundCard, opacity: fsIdx === FONT_STEPS.length - 1 ? 0.3 : 1 }]}
            >
              <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700', fontFamily: 'Inter_600SemiBold' }}>A+</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/bookmarks')}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="bookmark-outline" size={18} color={C.textSecond} />
          </Pressable>
        </View>
      </View>

      {/* ── Page content with swipe ── */}
      <Animated.View
        style={[{ flex: 1, overflow: 'hidden' }, flipStyle]}
        {...panResponder.panHandlers}
      >
        {/* Shadow overlay — darkens at 90° edge to enhance 3D depth */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 10 }, flipShadowStyle]}
          pointerEvents="none"
        />
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.pageContent, { paddingBottom: bottomInset + 90 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled
          onScrollBeginDrag={() => highlightTarget && setHighlightTarget(null)}
        >
          {pageAyahs.length === 0 ? (
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 60, fontFamily: 'Amiri_400Regular', fontSize: 18 }}>
              ...
            </Text>
          ) : (
            groups.map((group, gi) => {
              const meta = SURAH_META[group.surahNum - 1];
              const hasBismillah = meta?.hasBismillah ?? false;
              const showBismillah = group.showHeader && hasBismillah && group.surahNum !== 1;

              return (
                <View key={`g-${group.surahNum}-${gi}`}>

                  {/* ── Surah banner ── */}
                  {group.showHeader && (
                    <SurahBanner
                      surahNum={group.surahNum}
                      color={C.tint}
                      textColor={C.text}
                      mutedColor={C.textMuted}
                    />
                  )}

                  {/* ── Bismillah line (separate from verse 1) ── */}
                  {showBismillah && (
                    <Text style={[styles.bismillah, {
                      color: C.text,
                      fontSize: arabicFontSize * 1.05,
                      lineHeight: arabicFontSize * 2.3,
                    }]}>
                      {BISMILLAH_TEXT}
                    </Text>
                  )}

                  {/* ── Flowing verse text ── */}
                  <Text
                    style={[styles.ayahText, {
                      color: C.text,
                      fontSize: arabicFontSize,
                      lineHeight: arabicFontSize * 2.1,
                    }]}
                  >
                    {group.ayahs.map(ayah => {
                      let text = ayah.text;
                      if (ayah.ayahNum === 1 && showBismillah) {
                        text = stripBismillah(text);
                      }
                      const bookmarked = isBookmarked(ayah.surahNum, ayah.ayahNum);
                      const isHighlighted = highlightTarget?.surah === ayah.surahNum && highlightTarget?.ayah === ayah.ayahNum;
                      const ayahContent = (isHighlighted && highlightTerm)
                        ? highlightArabicInline(text, highlightTerm, C.tint)
                        : [text];
                      return (
                        <React.Fragment key={`a-${ayah.surahNum}-${ayah.ayahNum}`}>
                          {ayahContent}
                          <Text
                            suppressHighlighting
                            onLongPress={() => handleLongPressAyah(ayah)}
                            style={{
                              color: isHighlighted ? C.tintText : (bookmarked ? '#C8860A' : C.tint),
                              backgroundColor: isHighlighted ? C.tint : undefined,
                              borderRadius: 4,
                              fontSize: arabicFontSize * 0.7,
                            }}
                          >
                            {' ﴿'}{toArabicIndic(ayah.ayahNum)}{'﴾ '}
                          </Text>
                        </React.Fragment>
                      );
                    })}
                  </Text>
                </View>
              );
            })
          )}

          {/* Page number at bottom */}
          <View style={styles.pageNumRow}>
            <View style={[styles.pageNumLine, { backgroundColor: C.separator }]} />
            <Text style={[styles.pageNum, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
              {toArabicIndic(pageNum)}
            </Text>
            <View style={[styles.pageNumLine, { backgroundColor: C.separator }]} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── Bottom navigation ── */}
      <View style={[styles.bottomNav, {
        paddingBottom: bottomInset + 14,
        borderTopColor: C.separator,
        backgroundColor: isDark ? 'rgba(13,13,13,0.97)' : 'rgba(250,246,238,0.97)',
      }]}>
        <Pressable
          onPress={() => navigate('prev')}
          disabled={pageNum <= 1}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, opacity: pageNum <= 1 ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={C.tint} />
          <Text style={[styles.navBtnText, { color: C.tint }]}>
            {isAr ? 'السابقة' : 'Prev'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate('next')}
          disabled={pageNum >= TOTAL_PAGES}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, opacity: pageNum >= TOTAL_PAGES ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.navBtnText, { color: C.tint }]}>
            {isAr ? 'التالية' : 'Next'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.tint} />
        </Pressable>
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
  headerCenter: { alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', gap: 6 },
  headerSurah: { fontSize: 17, letterSpacing: 0.5 },
  headerJuz: { fontSize: 11, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fontPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pageContent: { paddingHorizontal: 16, paddingTop: 4 },

  bismillah: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    writingDirection: 'rtl',
  },

  ayahText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'justify',
    writingDirection: 'rtl',
    marginBottom: 10,
  },

  pageNumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, marginBottom: 4, paddingHorizontal: 8,
  },
  pageNumLine: { flex: 1, height: StyleSheet.hairlineWidth },
  pageNum: { fontSize: 16 },

  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  navBtnText: { fontSize: 13, fontWeight: '600' },
});
