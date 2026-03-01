import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal,
} from 'react-native';
import { SERIF_EN } from '@/constants/typography';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t, LANG_META, isRtlLang } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { SURAH_META, getSurah } from '@/lib/quran-api';
import { fetchSurahTransliteration, SUPPORTED_TRANSLIT_LANGS, isLangBundled } from '@/lib/quran-transliteration';
import PageBackground from '@/components/PageBackground';
import type { Bookmark } from '@/contexts/AppContext';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BISMILLAH_TRANSLIT = 'Bismi Allāhi l-raḥmāni l-raḥīm';
const AYAHS_PER_PAGE = 5;

export default function SurahTransliterationScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const surahNum = Number(number ?? '1');
  const insets = useSafeAreaInsets();
  const { isDark, lang, translitLang, colors, isBookmarked, addBookmark, removeBookmark, updateSettings } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const isAr = lang === 'ar';
  const tr = t(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const isRtlTranslation = isRtlLang(translitLang);

  const meta = SURAH_META[surahNum - 1];
  const arabicData = getSurah(surahNum);
  const totalAyahs = arabicData.ayahs.length;
  const totalPages = Math.max(1, Math.ceil(totalAyahs / AYAHS_PER_PAGE));

  const [currentPage, setCurrentPage] = useState(1);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const pageAyahs = arabicData.ayahs.slice(
    (currentPage - 1) * AYAHS_PER_PAGE,
    currentPage * AYAHS_PER_PAGE,
  );

  const { data: translitData, isLoading, error, refetch } = useQuery({
    queryKey: ['/translit', surahNum, translitLang],
    queryFn: () => fetchSurahTransliteration(surahNum, translitLang),
    retry: 2,
  });

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

        <View style={[styles.pageIndicator, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Text style={{ color: C.tint, fontSize: 11, fontWeight: '700', fontFamily: SERIF_EN }}>
            {currentPage}/{totalPages}
          </Text>
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
                      {!isLangBundled(l) && !active && (
                        <Ionicons name="cloud-download-outline" size={14} color={C.textMuted} />
                      )}
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
            <Text style={[styles.bismillahArabic, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
              {BISMILLAH}
            </Text>
            <Text style={[styles.bismillahTranslit, { color: C.textSecond, fontFamily: SERIF_EN }]}>
              {BISMILLAH_TRANSLIT}
            </Text>
          </View>
        )}

        {/* Network error */}
        {error && (
          <Pressable
            onPress={() => refetch()}
            style={[styles.errorBanner, { backgroundColor: '#FF3B3020', borderColor: '#FF3B30' }]}
          >
            <Ionicons name="wifi-outline" size={16} color="#FF3B30" />
            <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '600', flex: 1, fontFamily: SERIF_EN }}>
              {isAr ? 'تعذّر التحميل. اضغط للمحاولة' : 'Failed to load. Tap to retry.'}
            </Text>
            <Ionicons name="refresh-outline" size={16} color="#FF3B30" />
          </Pressable>
        )}

        {/* Ayah cards for this page */}
        {pageAyahs.map((item, idx) => {
          const globalIdx = (currentPage - 1) * AYAHS_PER_PAGE + idx;
          const tlit = translitData?.[globalIdx];
          const ayahNum = item.numberInSurah;
          const bookmarked = isBookmarked(surahNum, ayahNum);

          return (
            <View
              key={ayahNum}
              style={[styles.ayahCard, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: C.separator,
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
                <Text style={[styles.arabicText, { color: C.text, fontFamily: 'Amiri_400Regular' }]}>
                  {item.text}
                </Text>

                {/* Transliteration + translation */}
                {isLoading ? (
                  <View style={styles.shimmer}>
                    <View style={[styles.shimmerLine, { backgroundColor: C.separator, width: '90%' }]} />
                    <View style={[styles.shimmerLine, { backgroundColor: C.separator, width: '60%' }]} />
                  </View>
                ) : tlit ? (
                  <>
                    <Text style={[styles.translitText, { color: C.tint, fontFamily: SERIF_EN }]}>
                      {tlit.transliteration}
                    </Text>
                    {tlit.translation.length > 0 && (
                      <Text style={[
                        styles.translationText,
                        { color: C.textSecond, fontWeight: fw, textAlign: isRtlTranslation ? 'right' : 'left', fontFamily: isRtlTranslation ? 'Amiri_400Regular' : SERIF_EN }
                      ]}>
                        {tlit.translation}
                      </Text>
                    )}
                  </>
                ) : null}
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
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
  shimmer: { gap: 6, marginTop: 4 },
  shimmerLine: { height: 10, borderRadius: 5 },
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
