import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Platform, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { fetchSurah, SURAH_META, type Ayah } from '@/lib/quran-api';

const FONT_SIZE_MAP = { small: 22, medium: 27, large: 34 };

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

export default function SurahScreen() {
  const params = useLocalSearchParams<{ number: string; ayah?: string }>();
  const surahNum = parseInt(params.number ?? '1', 10);
  const targetAyah = params.ayah ? parseInt(params.ayah, 10) : null;

  const insets = useSafeAreaInsets();
  const {
    isDark, lang, fontSize, isBookmarked,
    addBookmark, removeBookmark, setLastReadSurah,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkModal, setBookmarkModal] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const ayahPositions = useRef<Record<number, number>>({});
  const scrolled = useRef(false);

  const meta = SURAH_META[surahNum - 1];
  const arabicFontSize = FONT_SIZE_MAP[fontSize];
  const lineH = arabicFontSize * 1.85;

  useEffect(() => {
    setLastReadSurah(surahNum);
  }, [surahNum]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    scrolled.current = false;
    ayahPositions.current = {};
    fetchSurah(surahNum)
      .then(data => setAyahs(data.ayahs))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [surahNum]);

  const scrollToAyah = useCallback((ayahNum: number) => {
    const pos = ayahPositions.current[ayahNum];
    if (pos !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, pos - 80), animated: true });
    }
  }, []);

  useEffect(() => {
    if (targetAyah && ayahs.length > 0 && !scrolled.current) {
      const pos = ayahPositions.current[targetAyah];
      if (pos !== undefined) {
        scrolled.current = true;
        setTimeout(() => scrollToAyah(targetAyah), 300);
      }
    }
  }, [targetAyah, ayahs, ayahPositions.current]);

  const handleLongPress = useCallback((ayah: Ayah) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAyah(ayah);
    setBookmarkModal(true);
  }, []);

  const doBookmark = useCallback((ayah: Ayah) => {
    if (isBookmarked(surahNum, ayah.numberInSurah)) {
      removeBookmark(surahNum, ayah.numberInSurah);
    } else {
      addBookmark({
        surahNumber: surahNum,
        surahName: meta?.arabic ?? '',
        ayahNumber: ayah.numberInSurah,
        ayahText: ayah.text.slice(0, 100),
        timestamp: Date.now(),
      });
    }
    setBookmarkModal(false);
  }, [surahNum, isBookmarked, meta]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const prev = surahNum > 1 ? surahNum - 1 : null;
  const next = surahNum < 114 ? surahNum + 1 : null;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Top nav bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 4, paddingHorizontal: 16, backgroundColor: C.background + 'cc' }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.navCircle, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={20} color={C.tint} />
        </Pressable>

        <Text style={[styles.topTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {meta?.arabic ?? `Surah ${surahNum}`}
        </Text>

        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push('/quran-toc'); }}
          style={({ pressed }) => [styles.navCircle, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="list" size={20} color={C.tint} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.tint} />
          <Text style={[styles.loadingText, { color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {tr.loading}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color={C.textMuted} />
          <Text style={[styles.errorText, { color: C.text }]}>{tr.error}</Text>
          <Pressable onPress={() => {
            setLoading(true); setError(null);
            fetchSurah(surahNum).then(d => setAyahs(d.ayahs)).catch(e => setError(e.message)).finally(() => setLoading(false));
          }}>
            <Text style={{ color: C.tint, marginTop: 12 }}>{tr.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Surah header banner */}
          <View style={[styles.surahHeader, { backgroundColor: C.tint }]}>
            <Text style={[styles.surahArabicName, { fontFamily: 'Amiri_700Bold' }]}>
              {meta?.arabic ?? ''}
            </Text>
            <Text style={styles.surahEnglishName}>{meta?.transliteration}</Text>
            <Text style={styles.surahMeta}>
              {meta?.type === 'Meccan' ? (isAr ? 'مكية' : 'Meccan') : (isAr ? 'مدنية' : 'Medinan')}
              {' · '}
              {meta?.ayahs} {isAr ? 'آية' : 'verses'}
            </Text>
          </View>

          {/* Bismillah */}
          {surahNum !== 9 && (
            <View style={[styles.bismillahRow, { borderBottomColor: C.separator }]}>
              <Text style={[styles.bismillahText, { color: C.tint, fontFamily: 'Amiri_400Regular' }]}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </Text>
            </View>
          )}

          {/* Hint */}
          <Text style={[styles.hint, { color: C.textMuted }]}>
            {isAr ? 'اضغط مطولاً على أي آية لإضافتها للمفضلة' : 'Long press any verse to bookmark it'}
          </Text>

          {/* Ayahs — continuous text, no card borders */}
          <View style={styles.ayahsBlock}>
            {ayahs.map((ayah) => {
              const bookmarked = isBookmarked(surahNum, ayah.numberInSurah);
              return (
                <Pressable
                  key={ayah.number}
                  onLongPress={() => handleLongPress(ayah)}
                  onLayout={(e) => {
                    ayahPositions.current[ayah.numberInSurah] = e.nativeEvent.layout.y;
                    if (targetAyah && ayah.numberInSurah === targetAyah && !scrolled.current) {
                      scrolled.current = true;
                      setTimeout(() => scrollToAyah(targetAyah), 300);
                    }
                  }}
                  style={[
                    styles.ayahRow,
                    bookmarked && { backgroundColor: C.goldLight, borderRadius: 8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.ayahText,
                      {
                        color: bookmarked ? C.text : C.text,
                        fontFamily: 'Amiri_400Regular',
                        fontSize: arabicFontSize,
                        lineHeight: lineH,
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      },
                    ]}
                  >
                    {ayah.text}
                    {bookmarked
                      ? <Text style={{ color: C.gold }}>{' ﴿'}{toArabicIndic(ayah.numberInSurah)}{'﴾'}</Text>
                      : <Text style={{ color: isDark ? '#4d8060' : '#1a7a4a', opacity: 0.7 }}>{' ﴿'}{toArabicIndic(ayah.numberInSurah)}{'﴾'}</Text>
                    }
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Next / prev nav */}
          <View style={[styles.navRow, { marginTop: 24 }]}>
            {prev !== null ? (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.replace({ pathname: '/surah/[number]', params: { number: String(prev) } }); }}
                style={[styles.navBtn, { backgroundColor: C.surface }]}
              >
                <Ionicons name="arrow-back" size={16} color={C.tint} />
                <Text style={[styles.navBtnText, { color: C.tint, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
                  {SURAH_META[prev - 1]?.arabic ?? ''}
                </Text>
              </Pressable>
            ) : <View style={{ flex: 1 }} />}

            {next !== null ? (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.replace({ pathname: '/surah/[number]', params: { number: String(next) } }); }}
                style={[styles.navBtn, { backgroundColor: C.surface, justifyContent: 'flex-end' }]}
              >
                <Text style={[styles.navBtnText, { color: C.tint, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
                  {SURAH_META[next - 1]?.arabic ?? ''}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={C.tint} />
              </Pressable>
            ) : <View style={{ flex: 1 }} />}
          </View>
        </ScrollView>
      )}

      {/* Bookmark modal */}
      <Modal visible={bookmarkModal} transparent animationType="fade" onRequestClose={() => setBookmarkModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBookmarkModal(false)}>
          <View style={[styles.modalBox, { backgroundColor: C.backgroundCard }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
              {selectedAyah ? `﴿${toArabicIndic(selectedAyah.numberInSurah)}﴾ ${meta?.arabic ?? ''}` : ''}
            </Text>
            <Text style={[styles.modalPreview, { color: C.textSecond, fontFamily: 'Amiri_400Regular' }]} numberOfLines={3}>
              {selectedAyah?.text}
            </Text>
            <Pressable
              onPress={() => selectedAyah && doBookmark(selectedAyah)}
              style={[styles.modalBtn, { backgroundColor: selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah) ? '#e74c3c' : C.tint }]}
            >
              <Ionicons
                name={selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah) ? 'bookmark' : 'bookmark-outline'}
                size={18} color="#fff"
              />
              <Text style={styles.modalBtnText}>
                {selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah)
                  ? (isAr ? 'إزالة الإشارة' : 'Remove Bookmark')
                  : (isAr ? 'إضافة إشارة' : 'Add Bookmark')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 10,
  },
  navCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 16, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 16 },
  surahHeader: {
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20,
    borderRadius: 20, marginTop: 12, marginBottom: 0, gap: 4,
  },
  surahArabicName: { fontSize: 30, color: '#fff' },
  surahEnglishName: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  surahMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  bismillahRow: {
    alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, marginBottom: 8,
  },
  bismillahText: { fontSize: 26, textAlign: 'center' },
  hint: { fontSize: 11, textAlign: 'center', marginBottom: 16, marginTop: 4 },
  ayahsBlock: { paddingHorizontal: 4 },
  ayahRow: {
    paddingVertical: 6, paddingHorizontal: 4,
  },
  ayahText: {},
  navRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 4,
  },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  navBtnText: { fontSize: 15, fontWeight: '600', flex: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    width: '100%', borderRadius: 20,
    padding: 20, gap: 12,
  },
  modalTitle: { fontSize: 18, textAlign: 'center' },
  modalPreview: { fontSize: 20, textAlign: 'right', lineHeight: 36 },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 4,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
