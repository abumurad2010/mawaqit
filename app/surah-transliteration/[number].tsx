import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS,
} from 'react-native-reanimated';
import { SERIF_EN } from '@/constants/typography';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t, LANG_META, isRtlLang } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { SURAH_META, getSurah } from '@/lib/quran-api';
import { SUPPORTED_TRANSLIT_LANGS } from '@/lib/quran-transliteration';
import { getTranslation, getTransliteration } from '@/lib/quran-translations';
import PageBackground from '@/components/PageBackground';
import type { Bookmark } from '@/contexts/AppContext';

const SWIPE_THRESHOLD = 80;
const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BISMILLAH_TRANSLIT = 'Bismi Allāhi l-raḥmāni l-raḥīm';
const AYAHS_PER_PAGE = 5;

function highlightLatinInline(
  text: string,
  term: string,
  tintColor: string,
): React.ReactNode[] {
  if (!term || !text) return [text];
  const q = term.toLowerCase();
  const tl = text.toLowerCase();
  if (!tl.includes(q)) return [text];
  const parts: React.ReactNode[] = [];
  let idx = 0;
  while (idx < text.length) {
    const mi = tl.indexOf(q, idx);
    if (mi === -1) break;
    if (mi > idx) parts.push(text.slice(idx, mi));
    parts.push(
      <Text
        key={`hl-${mi}`}
        style={{ backgroundColor: tintColor + '33', color: tintColor, borderRadius: 2 }}
      >
        {text.slice(mi, mi + term.length)}
      </Text>
    );
    idx = mi + term.length;
  }
  if (idx < text.length) parts.push(text.slice(idx));
  return parts;
}

export default function SurahTransliterationScreen() {
  const { number, startAyah, highlight } = useLocalSearchParams<{ number: string; startAyah?: string; highlight?: string }>();
  const [surahNum, setSurahNum] = useState(Number(number ?? '1'));
  const startAyahNum = Number(startAyah ?? '0');
  const highlightTerm = highlight ?? '';
  const insets = useSafeAreaInsets();
  const { isDark, lang, translitLang, colors, fontSize, isBookmarked, addBookmark, removeBookmark, updateSettings } = useApp();
  const FONT_STEPS = ['small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;
  const fsIdx = FONT_STEPS.indexOf(fontSize as typeof FONT_STEPS[number]);
  const changeFontSize = (dir: 1 | -1) => {
    const next = fsIdx + dir;
    if (next < 0 || next >= FONT_STEPS.length) return;
    updateSettings({ fontSize: FONT_STEPS[next] });
  };
  const C = colors;
  const fw = C.fontWeightNormal;
  const isAr = lang === 'ar';
  const tr = t(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const isRtl = isRtlLang(lang);
  const isRtlTranslation = isRtlLang(translitLang);
  const fontScale = [0.80, 1.0, 1.22, 1.45, 1.70][fsIdx] ?? 1.0;

  const meta = SURAH_META[surahNum - 1];
  const arabicData = getSurah(surahNum);
  const totalAyahs = arabicData.ayahs.length;
  const totalPages = Math.max(1, Math.ceil(totalAyahs / AYAHS_PER_PAGE));

  const initialPage = startAyahNum > 0
    ? Math.min(totalPages, Math.ceil(startAyahNum / AYAHS_PER_PAGE))
    : 1;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Page swipe navigation (with surah overflow at boundaries)
  const flip = useSharedValue(0);
  const transitioningRef = useRef(false);
  const surahNumRef = useRef(surahNum);
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);

  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);

  const flipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${flip.value}deg` },
    ],
  }));

  const flipShadowStyle = useAnimatedStyle(() => ({
    opacity: (Math.abs(flip.value) / 90) * 0.45,
  }));

  const navigateSurah = useCallback((dir: 'next' | 'prev', goToLastPage = false) => {
    if (transitioningRef.current) return;
    const cur = surahNumRef.current;
    const newNum = dir === 'next' ? cur + 1 : cur - 1;
    if (newNum < 1 || newNum > 114) return;
    transitioningRef.current = true;
    // Direction: for RTL swipe right = next, for LTR swipe left = next
    const outAngle = isRtl ? (dir === 'next' ? 90 : -90) : (dir === 'next' ? -90 : 90);

    const doSwap = () => {
      surahNumRef.current = newNum;
      setSurahNum(newNum);
      if (goToLastPage) {
        const newAyahs = getSurah(newNum).ayahs.length;
        const newTotal = Math.max(1, Math.ceil(newAyahs / AYAHS_PER_PAGE));
        setCurrentPage(newTotal);
      } else {
        setCurrentPage(1);
      }
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    };
    const doFinish = () => {
      transitioningRef.current = false;
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flip.value = withTiming(outAngle, { duration: 200, easing: Easing.in(Easing.ease) }, (done) => {
      if (done) {
        runOnJS(doSwap)();
        flip.value = -outAngle;
        flip.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, (done2) => {
          if (done2) runOnJS(doFinish)();
        });
      }
    });
  }, [flip, isRtl]);

  const navigatePage = useCallback((dir: 'next' | 'prev') => {
    if (transitioningRef.current) return;
    const pg = currentPageRef.current;
    const tot = totalPagesRef.current;

    if (dir === 'next') {
      if (pg < tot) {
        // Next page within surah
        transitioningRef.current = true;
        const outAngle = isRtl ? 90 : -90;
        Haptics.selectionAsync();
        flip.value = withTiming(outAngle, { duration: 200, easing: Easing.in(Easing.ease) }, (done) => {
          if (done) {
            runOnJS(setCurrentPage)(pg + 1);
            runOnJS(() => scrollRef.current?.scrollTo({ y: 0, animated: false }))();
            flip.value = -outAngle;
            flip.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, (done2) => {
              if (done2) { transitioningRef.current = false; }
            });
          }
        });
      } else {
        // At last page — overflow to next surah
        navigateSurah('next', false);
      }
    } else {
      if (pg > 1) {
        // Prev page within surah
        transitioningRef.current = true;
        const outAngle = isRtl ? -90 : 90;
        Haptics.selectionAsync();
        flip.value = withTiming(outAngle, { duration: 200, easing: Easing.in(Easing.ease) }, (done) => {
          if (done) {
            runOnJS(setCurrentPage)(pg - 1);
            runOnJS(() => scrollRef.current?.scrollTo({ y: 0, animated: false }))();
            flip.value = -outAngle;
            flip.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, (done2) => {
              if (done2) { transitioningRef.current = false; }
            });
          }
        });
      } else {
        // At first page — overflow to prev surah (go to its last page)
        navigateSurah('prev', true);
      }
    }
  }, [flip, isRtl, navigateSurah]);

  const navigatePageRef = useRef(navigatePage);
  useEffect(() => { navigatePageRef.current = navigatePage; }, [navigatePage]);

  const isRtlRef = useRef(isRtl);
  useEffect(() => { isRtlRef.current = isRtl; }, [isRtl]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        const rtl = isRtlRef.current;
        // RTL: swipe right = next page; LTR: swipe left = next page
        if (rtl) {
          if (g.dx > SWIPE_THRESHOLD) navigatePageRef.current('next');
          else if (g.dx < -SWIPE_THRESHOLD) navigatePageRef.current('prev');
        } else {
          if (g.dx < -SWIPE_THRESHOLD) navigatePageRef.current('next');
          else if (g.dx > SWIPE_THRESHOLD) navigatePageRef.current('prev');
        }
      },
    })
  ).current;

  const prevSurah = surahNum > 1 ? surahNum - 1 : null;
  const nextSurah = surahNum < 114 ? surahNum + 1 : null;


  const [showHighlight, setShowHighlight] = useState(highlightTerm.length > 0);

  const pageAyahs = arabicData.ayahs.slice(
    (currentPage - 1) * AYAHS_PER_PAGE,
    currentPage * AYAHS_PER_PAGE,
  );

  // All translation and transliteration data is bundled offline — no async needed.

  const setTranslitLang = useCallback((l: Lang) => {
    Haptics.selectionAsync();
    updateSettings({ translitLang: l });
    setShowLangPicker(false);
  }, [updateSettings]);

  const toggleBookmark = useCallback((ayahNum: number, ayahText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isBookmarked(surahNum, ayahNum)) {
      removeBookmark(surahNum, ayahNum);
    } else {
      const b: Bookmark = {
        surahNumber: surahNum,
        surahName: meta?.arabic ?? '',
        ayahNumber: ayahNum,
        ayahText,
        timestamp: Date.now(),
        type: 'transliteration',
      };
      addBookmark(b);
    }
  }, [surahNum, meta, isBookmarked, addBookmark, removeBookmark]);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />

      {/* ── Sticky header ── */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: C.background + 'F0', borderBottomColor: C.separator, zIndex: 2 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={[styles.backBtn, { backgroundColor: C.backgroundCard }]}
        >
          <Ionicons name="chevron-back" size={20} color={C.tint} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerArabic, { color: C.text, fontFamily: 'Amiri_700Bold' }]} numberOfLines={1}>
            {meta?.arabic ?? ''}
          </Text>
          <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: SERIF_EN }]} numberOfLines={1}>
            {meta?.transliteration ?? ''} · {totalAyahs} {tr.verses}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); changeFontSize(-1); }}
            disabled={fsIdx === 0}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: fsIdx === 0 ? 0.3 : pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: C.tint, fontSize: 12, fontWeight: '700', fontFamily: 'Amiri_700Bold' }}>A−</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); changeFontSize(1); }}
            disabled={fsIdx === FONT_STEPS.length - 1}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: fsIdx === FONT_STEPS.length - 1 ? 0.3 : pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: C.tint, fontSize: 16, fontWeight: '700', fontFamily: 'Amiri_700Bold' }}>A+</Text>
          </Pressable>
          <View style={[styles.pageIndicator, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
            <Text style={{ color: C.tint, fontSize: 11, fontWeight: '700', fontFamily: SERIF_EN }}>
              {currentPage}/{totalPages}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Sticky language dropdown ── */}
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
        style={({ pressed }) => [
          styles.langBar,
          {
            backgroundColor: C.backgroundCard,
            borderBottomColor: C.separator,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="language-outline" size={14} color={C.tint} />
        <Text style={[styles.langBarNative, { color: C.text, fontFamily: isRtlLang(translitLang) ? 'Amiri_400Regular' : SERIF_EN }]}>
          {LANG_META[translitLang]?.native ?? translitLang}
        </Text>
        <Text style={[styles.langBarLabel, { color: C.textMuted, fontFamily: SERIF_EN }]}>
          {LANG_META[translitLang]?.label ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={13} color={C.textMuted} style={{ marginLeft: 'auto' }} />
      </Pressable>

      {/* ── Language picker modal ── */}
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
              <Text style={[styles.pickerTitle, { color: C.text, fontFamily: SERIF_EN }]}>
                {tr.translationLanguage}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SUPPORTED_TRANSLIT_LANGS.map(l => {
                const active = l === translitLang;
                const rtl = isRtlLang(l);
                return (
                  <Pressable
                    key={l}
                    onPress={() => setTranslitLang(l)}
                    style={({ pressed }) => [
                      styles.pickerRow,
                      { borderBottomColor: C.separator, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerNative, { color: C.text, fontFamily: rtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                        {LANG_META[l]?.native ?? l}
                      </Text>
                      <Text style={[styles.pickerLang, { color: C.textMuted, fontFamily: SERIF_EN }]}>
                        {LANG_META[l]?.label ?? l}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {active && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Scrollable ayah content (swipeable) ── */}
      <Animated.View style={[{ flex: 1, overflow: 'hidden' }, flipStyle]} {...panResponder.panHandlers}>
        {/* Shadow overlay — darkens at 90° edge to enhance 3D depth */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 10 }, flipShadowStyle]}
          pointerEvents="none"
        />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => showHighlight && setShowHighlight(false)}
      >
        {/* Bismillah */}
        {meta?.hasBismillah && surahNum !== 9 && currentPage === 1 && (
          <View style={[styles.bismillahCard, { backgroundColor: C.tintLight, borderColor: C.separator }]}>
            <Text style={[styles.bismillahArabic, { color: C.tint, fontFamily: 'Amiri_700Bold', fontSize: 22 * fontScale }]}>
              {BISMILLAH}
            </Text>
            <Text style={[styles.bismillahTranslit, { color: C.textSecond, fontFamily: SERIF_EN, fontSize: 12 * fontScale }]}>
              {BISMILLAH_TRANSLIT}
            </Text>
          </View>
        )}


        {/* Ayah cards for this page */}
        {pageAyahs.map((item) => {
          const ayahNum = item.numberInSurah;
          const bookmarked = isBookmarked(surahNum, ayahNum);
          const translitText = getTransliteration(surahNum, ayahNum);
          const translationText = getTranslation(translitLang, surahNum, ayahNum);
          const isTarget = showHighlight && highlightTerm.length > 0 && ayahNum === startAyahNum;

          const translitContent = isTarget
            ? highlightLatinInline(translitText, highlightTerm, C.tint)
            : [translitText];
          const translationContent = isTarget
            ? highlightLatinInline(translationText, highlightTerm, C.tint)
            : [translationText];

          return (
            <View
              key={ayahNum}
              style={[styles.ayahCard, {
                backgroundColor: isTarget
                  ? (isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.06)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                borderColor: isTarget ? C.tint + '55' : C.separator,
              }]}
            >
              {/* Top row: badge + bookmark */}
              <View style={styles.ayahTopRow}>
                <View style={[styles.numBadge, { backgroundColor: C.tint }]}>
                  <Text style={[styles.numText, { color: C.tintText }]}>{ayahNum}</Text>
                </View>
                <Pressable
                  onPress={() => toggleBookmark(ayahNum, item.text)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={bookmarked ? C.gold : C.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.ayahContent}>
                {/* Arabic */}
                <Text style={[styles.arabicText, { color: C.text, fontFamily: 'Amiri_400Regular', fontSize: 19 * fontScale, lineHeight: 32 * fontScale }]}>
                  {item.text}
                </Text>

                {/* Transliteration — always available offline */}
                {translitText.length > 0 && (
                  <Text style={[styles.translitText, { color: C.tint, fontFamily: SERIF_EN, fontSize: 14 * fontScale, lineHeight: 22 * fontScale }]}>
                    {translitContent}
                  </Text>
                )}

                {/* Translation — always available offline */}
                {translationText.length > 0 && (
                  <Text style={[
                    styles.translationText,
                    { color: C.textSecond, fontWeight: fw, textAlign: isRtlTranslation ? 'right' : 'left', fontFamily: isRtlTranslation ? 'Amiri_400Regular' : SERIF_EN, fontSize: 13 * fontScale, lineHeight: 21 * fontScale }
                  ]}>
                    {translationContent}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      </Animated.View>

      {/* ── Bottom navigation — outside flip animation ── */}
      <View style={[styles.bottomNav, { paddingBottom: bottomInset + 14, borderTopColor: C.separator, backgroundColor: C.background + 'F0' }]}>
        <Pressable
          onPress={() => navigatePage('prev')}
          disabled={currentPage === 1 && prevSurah === null}
          style={({ pressed }) => [styles.navBtn, { backgroundColor: C.backgroundCard, opacity: (currentPage === 1 && prevSurah === null) ? 0.3 : pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={16} color={C.tint} />
          <Text style={[styles.navBtnText, { color: C.tint }]}>{tr.prev}</Text>
        </Pressable>
        <Text style={[styles.pageCounter, { color: C.textMuted }]}>{currentPage}/{totalPages}</Text>
        <Pressable
          onPress={() => navigatePage('next')}
          disabled={currentPage === totalPages && nextSurah === null}
          style={({ pressed }) => [styles.navBtn, { backgroundColor: C.backgroundCard, opacity: (currentPage === totalPages && nextSurah === null) ? 0.3 : pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.navBtnText, { color: C.tint }]}>{tr.next}</Text>
          <Ionicons name="chevron-forward" size={16} color={C.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerArabic: { fontSize: 20, textAlign: 'center' },
  headerSub: { fontSize: 11, textAlign: 'center', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pageIndicator: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },

  langBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langBarNative: { fontSize: 13, fontWeight: '600' },
  langBarLabel: { fontSize: 12, opacity: 0.6 },

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
  pickerNative: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  pickerLang: { fontSize: 12 },

  bismillahCard: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6, marginBottom: 10,
  },
  bismillahArabic: { fontSize: 22, textAlign: 'center' },
  bismillahTranslit: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  ayahCard: {
    padding: 14, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  ayahTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  numBadge: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { fontSize: 11, fontWeight: '700' },
  ayahContent: { gap: 6 },
  arabicText: { fontSize: 19, lineHeight: 32, textAlign: 'right' },
  translitText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  translationText: { fontSize: 13, lineHeight: 20, opacity: 0.85 },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  pageCounter: { fontSize: 12 },
});
