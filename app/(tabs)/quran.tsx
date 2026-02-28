import AppLogo from '@/components/AppLogo';
import PageBackground from '@/components/PageBackground';
import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { SURAH_META, SURAH_START_PAGES } from '@/lib/quran-api';

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, lastReadSurah, lastReadPage } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const openSurah = (number: number) => {
    Haptics.selectionAsync();
    const page = SURAH_START_PAGES[number] ?? 1;
    router.push({ pathname: '/quran-reader', params: { page: String(page) } });
  };

  const renderItem = ({ item, index }: { item: typeof SURAH_META[0]; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 18, 280)).duration(320)}>
      <Pressable
        onPress={() => openSurah(item.number)}
        style={({ pressed }) => [
          styles.surahRow,
          {
            backgroundColor: item.number === lastReadSurah ? C.tintLight : C.backgroundCard,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.numBadge, { backgroundColor: C.tint }]}>
          <Text style={styles.numText}>{item.number}</Text>
        </View>

        <View style={styles.surahInfo}>
          <Text style={[styles.surahArabic, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
            {item.arabic}
          </Text>
          <Text style={[styles.surahEnglish, { color: C.textMuted }]}>
            {item.transliteration}
            {isAr ? '' : ` · ${item.english}`}
          </Text>
          <Text style={[styles.surahMeta, { color: C.textMuted }]}>
            {item.type === 'Meccan' ? (isAr ? 'مكية' : 'Meccan') : (isAr ? 'مدنية' : 'Medinan')}
            {' · '}
            {item.ayahs} {isAr ? 'آية' : 'verses'}
          </Text>
        </View>

        {item.number === lastReadSurah && (
          <Ionicons name="bookmark" size={14} color={C.gold} style={{ marginRight: 2 }} />
        )}
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />

      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }} />
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/search'); }}
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
      </View>

      {/* Continue Reading */}
      {lastReadPage > 1 && (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/quran-reader', params: { page: String(lastReadPage) } }); }}
          style={({ pressed }) => [styles.continueBtn, { backgroundColor: C.tint, opacity: pressed ? 0.85 : 1, marginHorizontal: 16, marginBottom: 8 }]}
        >
          <Ionicons name="book-outline" size={15} color="#fff" />
          <Text style={[styles.continueBtnText, { fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {isAr ? `متابعة القراءة — صفحة ${lastReadPage}` : `Continue Reading — Page ${lastReadPage}`}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={SURAH_META}
        keyExtractor={item => String(item.number)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 80 }}
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
  appNameSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 3 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
  },
  continueBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, marginBottom: 5,
  },
  numBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahArabic: { fontSize: 18, marginBottom: 2 },
  surahEnglish: { fontSize: 12, marginBottom: 1 },
  surahMeta: { fontSize: 11 },
});
