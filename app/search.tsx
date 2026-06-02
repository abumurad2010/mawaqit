import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, TextInput, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { searchQuran, SURAH_META, getAyahPage, getAyahText, normalizeArabic } from '@/lib/quran-api';
import { searchTranslations } from '@/lib/quran-translations';

interface SurahResult {
  type: 'surah';
  number: number;
  arabic: string;
  transliteration: string;
  english: string;
}

interface ArabicResult {
  surahNum: number;
  ayahNum: number;
  text: string;
  /** Optional translation/transliteration snippet shown when an ayah matched a non-Arabic corpus. */
  matchSnippet?: string;
}

interface TranslitResult {
  surahNum: number;
  ayahNum: number;
  translitSnippet: string;
  translationSnippet: string;
}

function getSnippet(text: string, term: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text.substring(0, 80) + (text.length > 80 ? '...' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 40);
  return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
}

function searchSurahNames(query: string): SurahResult[] {
  const q = query.trim();
  if (!q) return [];
  const qLow = q.toLowerCase();
  const qNorm = normalizeArabic(q);
  return SURAH_META
    .filter(s =>
      // Arabic: compare after full normalization on both sides
      (qNorm.length > 0 && normalizeArabic(s.arabic).includes(qNorm)) ||
      s.transliteration.toLowerCase().includes(qLow) ||
      s.english.toLowerCase().includes(qLow) ||
      String(s.number) === q
    )
    .map(s => ({
      type: 'surah' as const,
      number: s.number,
      arabic: s.arabic,
      transliteration: s.transliteration,
      english: s.english,
    }));
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ mode?: string; translitLang?: string }>();
  const searchMode = params.mode === 'transliteration' ? 'transliteration' : 'arabic';
  const translitLang = params.translitLang ?? 'en';

  const insets = useSafeAreaInsets();
  const { isDark, lang, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(SurahResult | ArabicResult | TranslitResult)[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) { setResults([]); setSearched(false); setLoading(false); return; }
    setSearched(true);
    try {
      const surahMatches = searchSurahNames(q);
      let ayahMatches: (ArabicResult | TranslitResult)[];
      if (searchMode === 'transliteration') {
        ayahMatches = searchTranslations(q, translitLang, 100).map(m => ({
          surahNum: m.surahNum,
          ayahNum: m.ayahNum,
          translitSnippet: getSnippet(m.transliteration, q),
          translationSnippet: getSnippet(m.translation, q),
        }));
      } else {
        // Arabic mode: match the Uthmani text (modern-spelling tolerant), then also
        // fold in ayat whose loaded translation / transliteration matches, so a
        // single box finds "الربا", "interest" and "moses" alike.
        const arabicHits = searchQuran(q) as ArabicResult[];
        const seen = new Set(arabicHits.map(r => `${r.surahNum}_${r.ayahNum}`));
        const crossHits: ArabicResult[] = [];
        for (const m of searchTranslations(q, translitLang, 100)) {
          const key = `${m.surahNum}_${m.ayahNum}`;
          if (seen.has(key)) continue;
          seen.add(key);
          crossHits.push({
            surahNum: m.surahNum,
            ayahNum: m.ayahNum,
            text: getAyahText(m.surahNum, m.ayahNum),
            matchSnippet: getSnippet(m.translation || m.transliteration, q),
          });
        }
        ayahMatches = [...arabicHits, ...crossHits];
      }
      setResults([...surahMatches, ...ayahMatches]);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [searchMode, translitLang]);

  // Debounced live search (200ms) — avoids re-running on every keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearched(false); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const placeholder = searchMode === 'transliteration'
    ? (tr.search_quran_translit ?? 'Search transliteration...')
    : (tr.search_quran_arabic ?? tr.searchPlaceholder ?? 'Search in Quran...');

  const renderSurahItem = ({ item, index }: { item: SurahResult; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          const page = getAyahPage(item.number, 1);
          router.push({
            pathname: '/quran-reader',
            params: { page: String(page), highlightSurah: String(item.number), highlightAyah: '1' },
          });
        }}
        style={[styles.result, styles.surahResult, { backgroundColor: C.tint + '15', borderColor: C.tint + '55' }]}
      >
        <View style={[styles.surahBadge, { backgroundColor: C.tint }]}>
          <Text style={[styles.badgeNum, { color: C.tintText }]}>{item.number}</Text>
        </View>
        <View style={styles.resultInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.surahTypePill, { backgroundColor: C.tint }]}>
              <Text style={[styles.surahTypePillText, { color: C.tintText }]}>
                {tr.surah ?? 'Surah'}
              </Text>
            </View>
            <Text style={[styles.resultSurah, { color: C.text, fontFamily: 'Amiri_700Bold', fontSize: 16 }]}>
              {item.arabic}
            </Text>
          </View>
          <Text style={[styles.resultText, { color: C.textMuted, fontSize: 12 }]} numberOfLines={1}>
            {item.transliteration}{item.english !== item.transliteration ? ` · ${item.english}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.tint} />
      </Pressable>
    </Animated.View>
  );

  const renderArabicItem = ({ item, index }: { item: ArabicResult; index: number }) => {
    const meta = SURAH_META[item.surahNum - 1];
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            const page = getAyahPage(item.surahNum, item.ayahNum);
            router.push({
              pathname: '/quran-reader',
              params: {
                page: String(page),
                highlightSurah: String(item.surahNum),
                highlightAyah: String(item.ayahNum),
                highlight: query,
              },
            });
          }}
          style={[styles.result, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
        >
          <View style={[styles.surahBadge, { backgroundColor: C.tint }]}>
            <Text style={[styles.badgeNum, { color: C.tintText }]}>{item.surahNum}</Text>
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultSurah, { color: C.tint }]}>
              {meta?.arabic ?? ''} · {tr.ayah} {item.ayahNum}
            </Text>
            <Text style={[styles.resultText, { color: C.text, fontFamily: 'Amiri_400Regular' }]} numberOfLines={3}>
              {item.text}
            </Text>
            {!!item.matchSnippet && (
              <Text style={[styles.resultTranslation, { color: C.textMuted }]} numberOfLines={2}>
                {item.matchSnippet}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderTranslitItem = ({ item, index }: { item: TranslitResult; index: number }) => {
    const meta = SURAH_META[item.surahNum - 1];
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push({
              pathname: '/surah-transliteration/[number]',
              params: {
                number: String(item.surahNum),
                startAyah: String(item.ayahNum),
                highlight: query,
              },
            });
          }}
          style={[styles.result, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
        >
          <View style={[styles.surahBadge, { backgroundColor: C.tint }]}>
            <Text style={[styles.badgeNum, { color: C.tintText }]}>{item.surahNum}</Text>
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultSurah, { color: C.tint }]}>
              {meta?.arabic ?? ''} · {tr.ayah} {item.ayahNum}
            </Text>
            {item.translitSnippet.length > 0 && (
              <Text style={[styles.resultText, { color: C.tint, fontStyle: 'italic' }]} numberOfLines={2}>
                {item.translitSnippet}
              </Text>
            )}
            {item.translationSnippet.length > 0 && (
              <Text style={[styles.resultTranslation, { color: C.textMuted }]} numberOfLines={2}>
                {item.translationSnippet}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: SurahResult | ArabicResult | TranslitResult; index: number }) => {
    if ('type' in item && item.type === 'surah') {
      return renderSurahItem({ item: item as SurahResult, index });
    }
    if (searchMode === 'transliteration') {
      return renderTranslitItem({ item: item as TranslitResult, index });
    }
    return renderArabicItem({ item: item as ArabicResult, index });
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
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-back" size={20} color={C.tint} />
          </Pressable>
          <View style={[styles.searchBar, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
            <Ionicons name={searchMode === 'transliteration' ? 'language' : 'search'} size={16} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
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

        {/* Mode indicator pill */}
        {searchMode === 'transliteration' && (
          <View style={[styles.modePill, { backgroundColor: C.tintLight }]}>
            <Ionicons name="language" size={12} color={C.tint} />
            <Text style={[styles.modePillText, { color: C.tint }]}>
              {tr.transliterationMode}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.tint} />
          </View>
        ) : searched && results.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              {tr.noResults}
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
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
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  modePillText: { fontSize: 11, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  result: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  surahResult: {
    alignItems: 'center',
  },
  surahTypePill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  surahTypePillText: {
    fontSize: 10, fontWeight: '700',
  },
  surahBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badgeNum: { fontSize: 12, fontWeight: '700' },
  resultInfo: { flex: 1, gap: 2 },
  resultSurah: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  resultText: { fontSize: 14, lineHeight: 22 },
  resultTranslation: { fontSize: 12, lineHeight: 18 },
});
