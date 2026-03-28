import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import PageBackground from '@/components/PageBackground';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Modal, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERIF_EN } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '@/contexts/AppContext';
import { t, LANG_META, LANG_FLAG, isRtlLang } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { SURAH_META, SURAH_START_PAGES } from '@/lib/quran-api';
import { SUPPORTED_TRANSLIT_LANGS, fetchSurahNamesByLang } from '@/lib/quran-transliteration';
import { useQuery } from '@tanstack/react-query';

type QuranMode = 'mushaf' | 'transliteration';

type QuranFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const Q_STEP_ORDER: QuranFontSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const Q_SIZE_LABELS: Record<QuranFontSize, string> = { xs: 'XS', sm: 'S', md: 'M', lg: 'L', xl: 'XL' };
const Q_FONT_STEPS: Record<QuranFontSize, { arabic: number; english: number; meta: number; num: number; badge: number }> = {
  xs: { arabic: 14, english: 10, meta: 9,  num: 10, badge: 30 },
  sm: { arabic: 18, english: 12, meta: 11, num: 12, badge: 36 },
  md: { arabic: 22, english: 14, meta: 13, num: 14, badge: 42 },
  lg: { arabic: 26, english: 17, meta: 15, num: 16, badge: 48 },
  xl: { arabic: 30, english: 20, meta: 17, num: 18, badge: 54 },
};
const QURAN_FS_KEY = 'quran_font_size';

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, lastReadSurah, lastReadPage, colors, translitLang, updateSettings } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [mode, setMode] = useState<QuranMode>('mushaf');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [quranFontSize, setQuranFontSizeState] = useState<QuranFontSize>('sm');

  useEffect(() => {
    AsyncStorage.getItem(QURAN_FS_KEY).then(val => {
      if (val && Q_STEP_ORDER.includes(val as QuranFontSize)) {
        setQuranFontSizeState(val as QuranFontSize);
      }
    }).catch(() => {});
  }, []);

  const setQuranFontSize = (fs: QuranFontSize) => {
    setQuranFontSizeState(fs);
    AsyncStorage.setItem(QURAN_FS_KEY, fs).catch(() => {});
  };

  const fsIdx = Q_STEP_ORDER.indexOf(quranFontSize);
  const canDecrease = fsIdx > 0;
  const canIncrease = fsIdx < Q_STEP_ORDER.length - 1;
  const qFS = Q_FONT_STEPS[quranFontSize];

  const { data: surahNamesMap } = useQuery<Record<number, string>>({
    queryKey: ['/surah-names', translitLang],
    queryFn: () => fetchSurahNamesByLang(translitLang),
    enabled: mode === 'transliteration',
    staleTime: 1000 * 60 * 60 * 24,
  });

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const openSurah = (number: number) => {
    Haptics.selectionAsync();
    if (mode === 'transliteration') {
      router.push({ pathname: '/surah-transliteration/[number]', params: { number: String(number) } });
    } else {
      const page = SURAH_START_PAGES[number] ?? 1;
      router.push({ pathname: '/quran-reader', params: { page: String(page) } });
    }
  };

  const setTranslitLang = (l: Lang) => {
    Haptics.selectionAsync();
    updateSettings({ translitLang: l });
  };

  const renderItem = ({ item, index }: { item: typeof SURAH_META[0]; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 18, 280)).duration(320)}>
      <Pressable
        onPress={() => openSurah(item.number)}
        style={({ pressed }) => [
          styles.surahRow,
          {
            backgroundColor: item.number === lastReadSurah && mode === 'mushaf'
              ? C.tintLight
              : isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.numBadge, { backgroundColor: C.tint, width: qFS.badge, height: qFS.badge, borderRadius: qFS.badge * 0.28 }]}>
          <Text style={[styles.numText, { color: C.tintText, fontSize: qFS.num }]}>{item.number}</Text>
        </View>

        <View style={styles.surahInfo}>
          <Text style={[styles.surahArabic, { color: C.text, fontFamily: 'Amiri_700Bold', fontSize: qFS.arabic }]}>
            {item.arabic}
          </Text>
          <Text style={[styles.surahEnglish, { color: C.textMuted, fontWeight: fw, fontFamily: SERIF_EN, fontSize: qFS.english }]}>
            {item.transliteration}
            {mode === 'transliteration'
              ? surahNamesMap
                ? <Text style={{ fontFamily: isRtlLang(translitLang) ? 'Amiri_400Regular' : SERIF_EN }}>
                    {` · ${surahNamesMap[item.number] ?? item.english}`}
                  </Text>
                : ` · ${item.english}`
              : (!isAr ? ` · ${item.english}` : '')
            }
          </Text>
          <Text style={[styles.surahMeta, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: qFS.meta }]}>
            {item.type === 'Meccan' ? (isAr ? 'مكية' : 'Meccan') : (isAr ? 'مدنية' : 'Medinan')}
            {' · '}
            {item.ayahs} {isAr ? 'آية' : 'verses'}
          </Text>
        </View>

        {item.number === lastReadSurah && mode === 'mushaf' && (
          <Ionicons name="bookmark" size={14} color={C.gold} style={{ marginRight: 2 }} />
        )}
        {mode === 'transliteration'
          ? <Ionicons name="language-outline" size={14} color={C.tint} />
          : <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
        }
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />

      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>

        {/* Row 1: toggles | logo | actions */}
        <View style={[styles.headerTop, { marginBottom: 2 }]}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/search', params: { mode, translitLang } }); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="search" size={18} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/bookmarks'); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="bookmark-outline" size={18} color={C.textSecond} />
            </Pressable>
          </View>
        </View>

        {/* Font sizer — right below action buttons, right-aligned */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Pressable
              onPress={() => { if (canDecrease) { Haptics.selectionAsync(); setQuranFontSize(Q_STEP_ORDER[fsIdx - 1]); } }}
              disabled={!canDecrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canDecrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted }]}>A−</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: C.textMuted, minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold' }}>
              {Q_SIZE_LABELS[quranFontSize]}
            </Text>
            <Pressable
              onPress={() => { if (canIncrease) { Haptics.selectionAsync(); setQuranFontSize(Q_STEP_ORDER[fsIdx + 1]); } }}
              disabled={!canIncrease}
              style={[styles.fontPill, { backgroundColor: C.backgroundSecond, opacity: canIncrease ? 1 : 0.3 }]}
            >
              <Text style={[styles.fontPillLabel, { color: C.textMuted, fontSize: 14 }]}>A+</Text>
            </Pressable>
          </View>
        </View>

        {/* Mode segmented control */}
        <View style={[styles.segmentRow, { backgroundColor: C.backgroundSecond, borderColor: C.separator, marginTop: 10 }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('mushaf'); }}
            style={[styles.segmentBtn, mode === 'mushaf' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="book" size={13} color={mode === 'mushaf' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: mode === 'mushaf' ? C.tintText : C.textMuted }]}>
              {isAr ? 'المصحف' : 'Mushaf'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('transliteration'); }}
            style={[styles.segmentBtn, mode === 'transliteration' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="language" size={13} color={mode === 'transliteration' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: mode === 'transliteration' ? C.tintText : C.textMuted }]}>
              {isAr ? 'النقل الحرفي' : 'Transliteration'}
            </Text>
          </Pressable>
        </View>

        {/* Translation language dropdown — only in transliteration mode */}
        {mode === 'transliteration' && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
            style={({ pressed }) => [
              styles.langDropdown,
              {
                backgroundColor: C.backgroundCard,
                borderColor: C.separator,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={styles.langDropdownFlag}>{LANG_FLAG[translitLang] ?? ''}</Text>
            <Text style={[styles.langDropdownText, { color: C.text, fontFamily: SERIF_EN, textAlign: 'left' }]}>
              {LANG_META[translitLang]?.native ?? translitLang}
            </Text>
            <Text style={[styles.langDropdownLabel, { color: C.textMuted, fontFamily: SERIF_EN }]}>
              {LANG_META[translitLang]?.label ?? ''}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ marginLeft: 'auto' }} />
          </Pressable>
        )}

        {/* Language picker modal */}
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
                  return (
                    <Pressable
                      key={l}
                      onPress={() => { setTranslitLang(l); setShowLangPicker(false); }}
                      style={({ pressed }) => [
                        styles.pickerRow,
                        { borderBottomColor: C.separator, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={styles.pickerFlag}>{LANG_FLAG[l] ?? ''}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerNative, { color: C.text, fontFamily: SERIF_EN, textAlign: 'left' }]}>
                          {LANG_META[l]?.native ?? l}
                        </Text>
                        <Text style={[styles.pickerLang, { color: C.textMuted, fontFamily: SERIF_EN, textAlign: 'left' }]}>
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
      </View>

      {/* Continue Reading — only in Mushaf mode */}
      {mode === 'mushaf' && lastReadPage > 1 && (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/quran-reader', params: { page: String(lastReadPage) } }); }}
          style={({ pressed }) => [styles.continueBtn, { backgroundColor: C.tint, opacity: pressed ? 0.85 : 1, marginHorizontal: 16, marginBottom: 8 }]}
        >
          <Ionicons name="book-outline" size={15} color={C.tintText} />
          <Text style={[styles.continueBtnText, { color: C.tintText, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
            {isAr ? `متابعة القراءة — صفحة ${lastReadPage}` : `Continue Reading — Page ${lastReadPage}`}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={SURAH_META}
        keyExtractor={item => String(item.number)}
        renderItem={renderItem}
        extraData={[surahNamesMap, quranFontSize]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 24 }}
        ListFooterComponent={
          <View style={[styles.duaRow, { paddingBottom: 8 }]}>
            <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
              {tr.dua}
            </Text>
            <Text style={[styles.freeApp, { color: C.textMuted }]}>
              {tr.freeApp}
            </Text>
          </View>
        }
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topHeader: { marginBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fontPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row', borderRadius: 12, padding: 3,
    borderWidth: StyleSheet.hairlineWidth, gap: 3,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 10,
  },
  segmentLabel: { fontSize: 12, fontWeight: '600' },
  langDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  langDropdownFlag: { fontSize: 20, lineHeight: 24 },
  langDropdownText: { fontSize: 14, fontWeight: '600' },
  langDropdownLabel: { fontSize: 12, opacity: 0.6 },
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
  pickerFlag: { fontSize: 22, lineHeight: 28, marginRight: 2 },
  pickerNative: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  pickerLang: { fontSize: 12 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
  },
  continueBtnText: { fontSize: 13, fontWeight: '600' },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, marginBottom: 5,
  },
  numBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { fontSize: 12, fontWeight: '700' },
  surahInfo: { flex: 1 },
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4, marginTop: 16 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },
  surahArabic: { marginBottom: 2 },
  surahEnglish: { marginBottom: 1 },
  surahMeta: {},
});
