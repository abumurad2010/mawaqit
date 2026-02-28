import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, TextInput, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { searchQuran, SURAH_META, getAyahPage } from '@/lib/quran-api';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = searchQuran(q);
      setResults(res);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const renderItem = ({ item, index }: { item: { surahNum: number; ayahNum: number; text: string }; index: number }) => {
    const meta = SURAH_META[item.surahNum - 1];
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            const page = getAyahPage(item.surahNum, item.ayahNum);
            router.push({ pathname: '/quran-reader', params: { page: String(page) } });
          }}
          style={[styles.result, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
        >
          <View style={[styles.surahBadge, { backgroundColor: C.tint }]}>
            <Text style={[styles.badgeNum, { color: C.tintText }]}>{item.surahNum}</Text>
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultSurah, { color: C.tint }]}>
              {meta?.arabic ?? ''} · {isAr ? 'آية' : 'Ayah'} {item.ayahNum}
            </Text>
            <Text style={[styles.resultText, { color: C.text, fontFamily: 'Amiri_400Regular' }]} numberOfLines={3}>
              {item.text}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-back" size={20} color={C.tint} />
          </Pressable>
          <View style={[styles.searchBar, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder={tr.searchPlaceholder}
              placeholderTextColor={C.textMuted}
              onSubmitEditing={() => doSearch(query)}
              returnKeyType="search"
              autoFocus
              textAlign={isAr ? 'right' : 'left'}
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.tint} />
          </View>
        ) : searched && results.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              {isAr ? 'لم يتم العثور على نتائج' : 'No results found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40, paddingTop: 8 }}
            scrollEnabled={!!results.length}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  result: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  surahBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badgeNum: { fontSize: 12, fontWeight: '700' },
  resultInfo: { flex: 1 },
  resultSurah: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  resultText: { fontSize: 18, lineHeight: 30 },
});
