import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
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
import type { Bookmark } from '@/contexts/AppContext';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, bookmarks, removeBookmark } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const renderItem = ({ item, index }: { item: Bookmark; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
      <View style={[styles.row, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push({
              pathname: '/surah/[number]',
              params: { number: String(item.surahNumber), ayah: String(item.ayahNumber) },
            });
          }}
          style={styles.rowBody}
        >
          <View style={[styles.goldDot, { backgroundColor: C.gold }]} />
          <View style={styles.info}>
            <Text style={[styles.surahName, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
              {item.surahName}
            </Text>
            <Text style={[styles.ayahNum, { color: C.textSecond }]}>
              {isAr ? `الآية ${item.ayahNumber}` : `Ayah ${item.ayahNumber}`}
            </Text>
            <Text style={[styles.preview, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]} numberOfLines={2}>
              {item.ayahText}…
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeBookmark(item.surahNumber, item.ayahNumber); }}
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="trash-outline" size={18} color={C.danger} />
        </Pressable>
      </View>
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
          <Ionicons name="arrow-back" size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {tr.bookmarks}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={56} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {tr.noBookmarks}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={item => `${item.surahNumber}-${item.ayahNumber}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
          scrollEnabled={!!bookmarks.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden',
  },
  rowBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  goldDot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1 },
  surahName: { fontSize: 18, marginBottom: 2 },
  ayahNum: { fontSize: 12, marginBottom: 4 },
  preview: { fontSize: 14, lineHeight: 22 },
  deleteBtn: { padding: 14, paddingLeft: 8 },
});
