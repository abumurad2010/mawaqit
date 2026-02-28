import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform, Modal, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { LANG_META, isRtlLang } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { SURAH_META, getSurah } from '@/lib/quran-api';
import { fetchSurahTransliteration, SUPPORTED_TRANSLIT_LANGS as TRANSLIT_LANGS } from '@/lib/quran-transliteration';
import PageBackground from '@/components/PageBackground';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BISMILLAH_TRANSLIT = 'Bismi Allāhi l-raḥmāni l-raḥīm';

export default function SurahTransliterationScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const surahNum = Number(number ?? '1');
  const insets = useSafeAreaInsets();
  const { isDark, resolvedSecondLang, colors } = useApp();
  const C = colors;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const defaultLang: Lang = resolvedSecondLang === 'ar' ? 'en' : resolvedSecondLang;
  const [translationLang, setTranslationLang] = useState<Lang>(defaultLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const isRtlTranslation = isRtlLang(translationLang);

  const meta = SURAH_META[surahNum - 1];
  const arabicData = getSurah(surahNum);

  const { data: translitData, isLoading, error, refetch } = useQuery({
    queryKey: ['/translit', surahNum, translationLang],
    queryFn: () => fetchSurahTransliteration(surahNum, translationLang),
    retry: 2,
  });

  const renderItem = useCallback(({ item, index }: { item: typeof arabicData.ayahs[0]; index: number }) => {
    const tlit = translitData?.[index];
    const ayahNum = item.numberInSurah;

    return (
      <View style={[styles.ayahCard, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        borderColor: C.separator,
      }]}>
        {/* Number badge */}
        <View style={[styles.numBadge, { backgroundColor: C.tint }]}>
          <Text style={styles.numText}>{ayahNum}</Text>
        </View>

        <View style={styles.ayahContent}>
          {/* Arabic text */}
          <Text style={[styles.arabicText, { color: C.text, fontFamily: 'Amiri_400Regular' }]}>
            {item.text}
          </Text>

          {/* Transliteration */}
          {isLoading ? (
            <View style={styles.shimmer}>
              <View style={[styles.shimmerLine, { backgroundColor: C.separator, width: '90%' }]} />
              <View style={[styles.shimmerLine, { backgroundColor: C.separator, width: '60%' }]} />
            </View>
          ) : tlit ? (
            <>
              <Text style={[styles.translitText, { color: C.tint }]}>
                {tlit.transliteration}
              </Text>
              {tlit.translation.length > 0 && (
                <Text style={[
                  styles.translationText,
                  { color: C.textSecond, textAlign: isRtlTranslation ? 'right' : 'left', fontFamily: isRtlTranslation ? 'Amiri_400Regular' : undefined }
                ]}>
                  {tlit.translation}
                </Text>
              )}
            </>
          ) : null}
        </View>
      </View>
    );
  }, [translitData, isLoading, isDark, C, isRtlTranslation]);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {meta?.hasBismillah && surahNum !== 9 && (
        <View style={[styles.bismillahCard, { backgroundColor: C.tintLight, borderColor: C.separator }]}>
          <Text style={[styles.bismillahArabic, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
            {BISMILLAH}
          </Text>
          <Text style={[styles.bismillahTranslit, { color: C.textSecond }]}>
            {BISMILLAH_TRANSLIT}
          </Text>
        </View>
      )}
      {error && (
        <Pressable
          onPress={() => refetch()}
          style={[styles.errorBanner, { backgroundColor: '#FF3B3020', borderColor: '#FF3B30' }]}
        >
          <Ionicons name="wifi-outline" size={16} color="#FF3B30" />
          <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '600', flex: 1 }}>
            Failed to load. Tap to retry.
          </Text>
          <Ionicons name="refresh-outline" size={16} color="#FF3B30" />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />

      {/* Header */}
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
          <Text style={[styles.headerSub, { color: C.textMuted }]} numberOfLines={1}>
            {meta?.transliteration ?? ''} · {meta?.ayahs} verses
          </Text>
        </View>

        {/* Language picker */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
          style={[styles.langBtn, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
        >
          <Text style={{ color: C.tint, fontSize: 11, fontWeight: '700' }}>
            {LANG_META[translationLang]?.code ?? translationLang.toUpperCase()}
          </Text>
          <Ionicons name="chevron-down" size={12} color={C.tint} />
        </Pressable>
      </View>

      {/* Ayah list */}
      <FlatList
        data={arabicData.ayahs}
        keyExtractor={item => String(item.numberInSurah)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={8}
      />

      {/* Language picker modal */}
      <Modal
        visible={showLangPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLangPicker(false)}>
          <View style={[styles.modalSheet, { backgroundColor: C.backgroundCard, paddingBottom: bottomInset + 8 }]}>
            <View style={[styles.modalHandle, { backgroundColor: C.separator }]} />
            <Text style={[styles.modalTitle, { color: C.text }]}>Translation Language</Text>

            {TRANSLIT_LANGS.map(lang => {
              const meta = LANG_META[lang];
              const active = lang === translationLang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => { Haptics.selectionAsync(); setTranslationLang(lang); setShowLangPicker(false); }}
                  style={[styles.langRow, {
                    backgroundColor: active ? C.tint + '18' : 'transparent',
                    borderColor: active ? C.tint : C.separator,
                  }]}
                >
                  <Text style={[styles.langNative, { color: active ? C.tint : C.text, fontFamily: isRtlLang(lang) ? 'Amiri_400Regular' : undefined }]}>
                    {meta?.native ?? lang}
                  </Text>
                  <Text style={[styles.langLabel, { color: active ? C.tint : C.textMuted }]}>
                    {meta?.label ?? lang}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.tint} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  listHeader: { marginTop: 12, gap: 10, marginBottom: 4 },
  bismillahCard: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6, marginBottom: 8,
  },
  bismillahArabic: { fontSize: 22, textAlign: 'center' },
  bismillahTranslit: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  ayahCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    padding: 14, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  numBadge: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  numText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ayahContent: { flex: 1, gap: 6 },
  arabicText: { fontSize: 19, lineHeight: 32, textAlign: 'right' },
  shimmer: { gap: 6, marginTop: 4 },
  shimmerLine: { height: 10, borderRadius: 5 },
  translitText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  translationText: { fontSize: 13, lineHeight: 20, opacity: 0.85 },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 12, gap: 4,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  langNative: { fontSize: 15, fontWeight: '600', flex: 1 },
  langLabel: { fontSize: 12 },
});
