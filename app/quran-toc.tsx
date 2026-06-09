import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, TextInput,
} from 'react-native';
import { SERIF_EN } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import PageBackground from '@/components/PageBackground';
import { useApp } from '@/contexts/AppContext';
import { t, isRtlLang } from '@/constants/i18n';
import { SURAH_META, SURAH_START_PAGES } from '@/lib/quran-api';
import { fetchSurahNamesByLang } from '@/lib/quran-transliteration';
import { useQuery } from '@tanstack/react-query';

export default function QuranTOCScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, lastReadSurah, colors } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { data: surahNamesMap } = useQuery<Record<number, string>>({
    queryKey: ['/surah-names', lang],
    queryFn: () => fetchSurahNamesByLang(lang),
    enabled: !isAr,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const [filter, setFilter] = useState('');
  const filtered = SURAH_META.filter(s =>
    s.arabic.includes(filter) ||
    s.transliteration.toLowerCase().includes(filter.toLowerCase()) ||
    s.english.toLowerCase().includes(filter.toLowerCase()) ||
    (surahNamesMap?.[s.number] ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    String(s.number).includes(filter)
  );

  const renderItem = ({ item, index }: { item: typeof SURAH_META[0]; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 15, 280)).duration(320)}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          const page = SURAH_START_PAGES[item.number] ?? 1;
          router.replace({ pathname: '/quran-reader', params: { page: String(page) } });
        }}
        style={({ pressed }) => [styles.surahRow, {
          backgroundColor: item.number === lastReadSurah ? C.tintLight : isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
          opacity: pressed ? 0.75 : 1,
        }]}
      >
        <View style={[styles.numBadge, { backgroundColor: C.tint }]}>
          <Text style={[styles.numText, { color: C.tintText }]}>{item.number}</Text>
        </View>
        <View style={styles.surahInfo}>
          <Text style={[styles.surahArabic, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>{item.arabic}</Text>
          <Text style={[styles.surahEnglish, { color: C.textMuted, fontWeight: fw, fontFamily: SERIF_EN }]}>
            {item.transliteration}
            {!isAr && <Text style={{ fontFamily: isRtlLang(lang) ? 'Amiri_400Regular' : SERIF_EN }}>{` · ${surahNamesMap?.[item.number] ?? item.arabic}`}</Text>}
          </Text>
          <Text style={[styles.surahMeta, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
            {item.type === 'Meccan' ? tr.makkiyya : tr.madaniyya}{' · '}{item.ayahs} {tr.verses}{' · '}{tr.page} {SURAH_START_PAGES[item.number] ?? 1}
          </Text>
        </View>
        {item.number === lastReadSurah && <Ionicons name="bookmark" size={14} color={C.gold} style={{ marginRight: 2 }} />}
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />

      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={18} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
          {tr.surahList}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: C.backgroundSecond, borderColor: C.separator, marginHorizontal: 16, marginBottom: 8 }]}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          value={filter}
          onChangeText={setFilter}
          placeholder={tr.searchSurah}
          placeholderTextColor={C.textMuted}
          textAlign={isAr ? 'right' : 'left'}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.number)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 10,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, marginBottom: 5,
  },
  numBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { fontSize: 13, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahArabic: { fontSize: 18, marginBottom: 2 },
  surahEnglish: { fontSize: 12, marginBottom: 1 },
  surahMeta: { fontSize: 11 },
});
