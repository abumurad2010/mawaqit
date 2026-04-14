import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
} from 'react-native';
import { SERIF_EN } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';import { getAyahPage } from '@/lib/quran-api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Bookmark } from '@/contexts/AppContext';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, colors, bookmarks, removeBookmark } = useApp();
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const renderItem = ({ item }: { item: Bookmark }) => {
    const isTranslit = item.type === 'transliteration';
    const navigate = () => {
      Haptics.selectionAsync();
      if (isTranslit) {
        router.push({
          pathname: '/surah-transliteration/[number]',
          params: { number: String(item.surahNumber) },
        });
      } else {
        const page = getAyahPage(item.surahNumber, item.ayahNumber);
        router.push({
          pathname: '/quran-reader',
          params: {
            page: String(page),
            highlightSurah: String(item.surahNumber),
            highlightAyah: String(item.ayahNumber),
          },
        });
      }
    };
    return (
    <View style={[styles.row, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
        <Pressable onPress={navigate} style={styles.rowBody}>
          <View style={[styles.goldDot, { backgroundColor: isTranslit ? C.tint : C.gold }]} />
          <View style={styles.info}>
            <View style={styles.surahNameRow}>
              <Text style={[styles.surahName, { color: C.text, fontFamily: 'Amiri_700Bold', flex: 1 }]}>
                {item.surahName}
              </Text>
              {isTranslit && (
                <View style={[styles.typeBadge, { backgroundColor: C.tintLight, borderColor: C.tint }]}>
                  <Ionicons name="language" size={10} color={C.tint} />
                  <Text style={[styles.typeBadgeText, { color: C.tint }]}>
                    {tr.translit}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.ayahNum, { color: C.textSecond, fontWeight: fw }]}>
                {`${tr.ayah} ${item.ayahNumber}`}
              </Text>
              {!!item.timestamp && (
                <Text style={[styles.timestamp, { color: C.textMuted, fontWeight: fw }]}>
                  {new Date(item.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-SA' : undefined, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                  {' · '}
                  {new Date(item.timestamp).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : undefined, {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
            <Text style={[styles.preview, { color: C.textMuted, fontWeight: fw, fontFamily: 'Amiri_400Regular' }]} numberOfLines={2}>
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
  );
  };

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
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
          {tr.bookmarks}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={56} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
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
  surahNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  surahName: { fontSize: 18 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  ayahNum: { fontSize: 12 },
  timestamp: { fontSize: 11 },
  preview: { fontSize: 14, lineHeight: 22 },
  deleteBtn: { padding: 14, paddingLeft: 8 },
});
