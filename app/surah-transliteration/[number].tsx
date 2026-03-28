import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal,
} from 'react-native';
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
  const surahNum = Number(number ?? '1');
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

  // Show highlight for 3 seconds then clear
  const [showHighlight, setShowHighlight] = useState(highlightTerm.length > 0);
  useEffect(() => {
    if (!highlightTerm) return;
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 3000);
    return () => clearTimeout(timer);
  }, [highlightTerm]);

  const pageAyahs = arabicData.ayahs.slice(
    (currentPage - 1) * AYAHS_PER_PAGE,
    currentPage * AYAHS_PER_PAGE,
  );

  // All translation and transliteration data is bundled offline — no async needed.

  const goPage = useCallback((p: number) => {
    Haptics.selectionAsync();
    setCurrentPage(p);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

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
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: C.background + 'F0', borderBottomColor: C.separator }]}>
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
            {meta?.transliteration ?? ''} · {totalAyahs} {isAr ? 'آية' : 'verses'}
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
                {isAr ? 'لغة الترجمة' : 'Translation language'}
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

      {/* ── Scrollable ayah content ── */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
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

      {/* ── Fixed bottom navigation bar — always visible ── */}
      <View style={[
        styles.bottomBar,
        {
          paddingBottom: bottomInset + 8,
          backgroundColor: C.background + 'F0',
          borderTopColor: C.separator,
        },
      ]}>
        <Pressable
          onPress={() => currentPage > 1 && goPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: (currentPage === 1 || pressed) ? 0.35 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={C.tint} />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pagePills}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
            .reduce<(number | 'dot')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('dot');
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === 'dot' ? (
                <Text key={`dot-${idx}`} style={[styles.pageDot, { color: C.textMuted }]}>…</Text>
              ) : (
                <Pressable
                  key={p}
                  onPress={() => goPage(p as number)}
                  style={[
                    styles.pagePill,
                    {
                      backgroundColor: p === currentPage ? C.tint : C.backgroundCard,
                      borderColor: p === currentPage ? C.tint : C.separator,
                    },
                  ]}
                >
                  <Text style={{ color: p === currentPage ? C.tintText : C.textMuted, fontSize: 12, fontWeight: '600' }}>
                    {p}
                  </Text>
                </Pressable>
              )
            )
          }
        </ScrollView>

        <Pressable
          onPress={() => currentPage < totalPages && goPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: (currentPage === totalPages || pressed) ? 0.35 : 1 },
          ]}
        >
          <Ionicons name="chevron-forward" size={22} color={C.tint} />
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

  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  pagePills: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pagePill: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  pageDot: { fontSize: 14, paddingHorizontal: 2 },
});
