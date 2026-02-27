import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Modal, Alert,
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
import { SURAH_META, downloadAllSurahs, getDownloadedCount } from '@/lib/quran-api';

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, lastReadSurah } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [downloadedCount, setDownloadedCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [showDlModal, setShowDlModal] = useState(false);

  useEffect(() => {
    getDownloadedCount().then(setDownloadedCount);
  }, []);

  const startDownload = useCallback(async () => {
    setDownloading(true);
    setDlProgress(0);
    setShowDlModal(true);
    const { success, failed } = await downloadAllSurahs((done, total) => {
      setDlProgress(done / total);
      setDownloadedCount(done);
    });
    setDownloading(false);
    await getDownloadedCount().then(setDownloadedCount);
    if (failed > 0) {
      Alert.alert(
        isAr ? 'اكتمل التحميل' : 'Download complete',
        isAr ? `${success} سورة محفوظة، ${failed} فشلت` : `${success} surahs saved, ${failed} failed`
      );
    }
    setShowDlModal(false);
  }, [isAr]);

  const isFullyOffline = downloadedCount >= 114;

  const openSurah = (number: number) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/surah/[number]', params: { number: String(number) } });
  };

  const renderItem = ({ item, index }: { item: typeof SURAH_META[0]; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 18, 280)).duration(320)}>
      <Pressable
        onPress={() => openSurah(item.number)}
        style={({ pressed }) => [
          styles.surahRow,
          {
            backgroundColor: item.number === lastReadSurah ? C.surface : C.backgroundCard,
            borderColor: C.separator,
            opacity: pressed ? 0.8 : 1,
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
          <Ionicons name="bookmark" size={15} color={C.gold} style={{ marginRight: 2 }} />
        )}
        <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, paddingHorizontal: 20 }]}>
        <Text style={[styles.title, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {tr.quran}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/search'); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
            testID="quran-search-btn"
          >
            <Ionicons name="search" size={18} color={C.tint} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/bookmarks'); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="bookmark-outline" size={18} color={C.tint} />
          </Pressable>
        </View>
      </View>

      {/* Bismillah banner */}
      <View style={[styles.bismillah, { backgroundColor: C.surface, marginHorizontal: 20, marginBottom: 10 }]}>
        <Text style={[styles.bismillahText, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Text>
      </View>

      {/* Offline download bar */}
      <Pressable
        onPress={() => {
          if (!downloading && !isFullyOffline) startDownload();
        }}
        style={[
          styles.offlineBar,
          {
            backgroundColor: isFullyOffline ? C.surface : C.tint + '18',
            borderColor: isFullyOffline ? C.separator : C.tint + '44',
            marginHorizontal: 20, marginBottom: 10,
          },
        ]}
      >
        <Ionicons
          name={isFullyOffline ? 'cloud-done-outline' : 'cloud-download-outline'}
          size={17}
          color={isFullyOffline ? C.tint : C.tint}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.offlineLabel, { color: isFullyOffline ? C.textMuted : C.text }]}>
            {isFullyOffline
              ? (isAr ? 'القرآن محفوظ بالكامل — يعمل بدون إنترنت' : 'Full Quran saved — works offline')
              : downloading
                ? (isAr ? `جارٍ التحميل… ${downloadedCount}/114` : `Downloading… ${downloadedCount}/114`)
                : (isAr ? `حمّل للاستخدام بدون إنترنت (${downloadedCount}/114)` : `Download for offline use (${downloadedCount}/114)`)}
          </Text>
          {downloading && (
            <View style={[styles.progressTrack, { backgroundColor: C.separator }]}>
              <View style={[styles.progressFill, { backgroundColor: C.tint, width: `${Math.round(dlProgress * 100)}%` as any }]} />
            </View>
          )}
        </View>
        {!isFullyOffline && !downloading && (
          <Ionicons name="arrow-down-circle-outline" size={20} color={C.tint} />
        )}
        {isFullyOffline && (
          <Ionicons name="checkmark-circle" size={18} color={C.tint} />
        )}
      </Pressable>

      <FlatList
        data={SURAH_META}
        keyExtractor={item => String(item.number)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: bottomInset + 80 }}
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  bismillah: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 14, alignItems: 'center',
  },
  bismillahText: { fontSize: 22, letterSpacing: 1 },
  offlineBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  offlineLabel: { fontSize: 13 },
  progressTrack: {
    height: 4, borderRadius: 2, marginTop: 5, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 6,
  },
  numBadge: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  surahInfo: { flex: 1 },
  surahArabic: { fontSize: 18, marginBottom: 2 },
  surahEnglish: { fontSize: 12, marginBottom: 1 },
  surahMeta: { fontSize: 11 },
});
