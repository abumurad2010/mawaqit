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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { SURAH_META, getAyahPage } from '@/lib/quran-api';

export default function QuranTOCScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [filter, setFilter] = useState('');

  const filtered = SURAH_META.filter(s =>
    s.arabic.includes(filter) ||
    s.transliteration.toLowerCase().includes(filter.toLowerCase()) ||
    s.english.toLowerCase().includes(filter.toLowerCase()) ||
    String(s.number).includes(filter)
  );

  const renderItem = ({ item, index }: { item: typeof SURAH_META[0]; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 15, 300)).duration(300)}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.back();
          setTimeout(() => {
            const page = getAyahPage(item.number, 1);
            router.push({
              pathname: '/quran-reader',
              params: {
                page: String(page),
                highlightSurah: String(item.number),
                highlightAyah: String(1),
              },
            });
          }, 300);
        }}
        style={({ pressed }) => [styles.row, { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[styles.num, { color: C.textMuted }]}>{item.number}</Text>
        <View style={styles.rowInfo}>
          <Text style={[styles.arabic, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>{item.arabic}</Text>
          <Text style={[styles.translit, { color: C.textMuted }]}>{item.transliteration}</Text>
        </View>
        <Text style={[styles.tag, { color: C.tint, backgroundColor: C.surface }]}>
          {item.type === 'Meccan' ? tr.makkiyyaAbbr : tr.madaniyyaAbbr}
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="close" size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
          {tr.surahList}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search bar */}
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
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 5,
  },
  num: { width: 28, fontSize: 12, textAlign: 'center' },
  rowInfo: { flex: 1 },
  arabic: { fontSize: 17 },
  translit: { fontSize: 11 },
  tag: {
    fontSize: 11, fontWeight: '700',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
});
