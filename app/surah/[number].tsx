import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  ActivityIndicator, ScrollView, Modal, Animated,
  PanResponder, Dimensions, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { fetchSurah, SURAH_META, type Ayah } from '@/lib/quran-api';

const BASE_FONT_SIZE = 26;
const MIN_SCALE = 0.7;
const MAX_SCALE = 2.2;
const SWIPE_THRESHOLD = 80;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

type PageState = {
  surahNum: number;
  ayahs: Ayah[];
  loading: boolean;
  error: string | null;
};

export default function SurahScreen() {
  const params = useLocalSearchParams<{ number: string; ayah?: string }>();
  const initialNum = parseInt(params.number ?? '1', 10);
  const targetAyah = params.ayah ? parseInt(params.ayah, 10) : null;

  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, fontSize, isBookmarked, addBookmark, removeBookmark, setLastReadSurah } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [surahNum, setSurahNum] = useState(initialNum);
  const [page, setPage] = useState<PageState>({ surahNum: initialNum, ayahs: [], loading: true, error: null });
  const [fontScale, setFontScale] = useState(1.0);
  const [bookmarkModal, setBookmarkModal] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const ayahPositions = useRef<Record<number, number>>({});
  const scrolled = useRef(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const transitioningRef = useRef(false);
  const surahNumRef = useRef(surahNum);

  const meta = SURAH_META[surahNum - 1];
  const arabicFontSize = BASE_FONT_SIZE * fontScale;
  const lineH = arabicFontSize * 1.9;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadSurah = useCallback(async (num: number) => {
    setPage(prev => ({ ...prev, surahNum: num, loading: true, error: null }));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    ayahPositions.current = {};
    scrolled.current = false;
    try {
      const data = await fetchSurah(num);
      setPage({ surahNum: num, ayahs: data.ayahs, loading: false, error: null });
    } catch (e: any) {
      setPage(prev => ({ ...prev, loading: false, error: e.message ?? 'Error' }));
    }
  }, []);

  useEffect(() => {
    setLastReadSurah(surahNum);
    surahNumRef.current = surahNum;
    loadSurah(surahNum);
  }, [surahNum]);

  useEffect(() => {
    if (targetAyah && page.ayahs.length > 0 && !scrolled.current) {
      const pos = ayahPositions.current[targetAyah];
      if (pos !== undefined) {
        scrolled.current = true;
        setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, pos - 80), animated: true }), 300);
      }
    }
  }, [targetAyah, page.ayahs]);

  const navigateTo = useCallback((dir: 'next' | 'prev') => {
    if (transitioningRef.current) return;
    const cur = surahNumRef.current;
    const newNum = dir === 'next' ? cur + 1 : cur - 1;
    if (newNum < 1 || newNum > 114) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    transitioningRef.current = true;
    setTransitioning(true);
    const toX = dir === 'next' ? -W : W;
    Animated.timing(slideAnim, {
      toValue: toX,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(-toX);
      surahNumRef.current = newNum;
      setSurahNum(newNum);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        transitioningRef.current = false;
        setTransitioning(false);
      });
    });
  }, [W, slideAnim]);

  const navigateRef = useRef(navigateTo);
  useEffect(() => { navigateRef.current = navigateTo; }, [navigateTo]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) navigateRef.current('next');
        else if (g.dx > SWIPE_THRESHOLD) navigateRef.current('prev');
      },
    })
  ).current;

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

  const zoomIn = () => setFontScale(s => Math.min(MAX_SCALE, parseFloat((s + 0.15).toFixed(2))));
  const zoomOut = () => setFontScale(s => Math.max(MIN_SCALE, parseFloat((s - 0.15).toFixed(2))));

  const prev = surahNum > 1 ? surahNum - 1 : null;
  const next = surahNum < 114 ? surahNum + 1 : null;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Top nav */}
      <View style={[styles.topBar, { paddingTop: topInset + 4, paddingHorizontal: 16, backgroundColor: C.background + 'cc' }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.navCircle, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={20} color={C.tint} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { color: C.text, fontFamily: 'Amiri_700Bold' }]} numberOfLines={1}>
            {meta?.arabic ?? `Surah ${surahNum}`}
          </Text>
          <Text style={[styles.topSub, { color: C.textMuted }]}>
            {surahNum}/114
          </Text>
        </View>

        <View style={styles.zoomRow}>
          <Pressable
            onPress={zoomOut}
            style={({ pressed }) => [styles.zoomBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.zoomBtnText, { color: C.tint }]}>A−</Text>
          </Pressable>
          <Pressable
            onPress={zoomIn}
            style={({ pressed }) => [styles.zoomBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.zoomBtnTextLg, { color: C.tint }]}>A+</Text>
          </Pressable>
        </View>
      </View>

      {/* Swipe hint strip */}
      <View style={[styles.swipeHint, { backgroundColor: C.surface }]}>
        <Pressable
          onPress={() => prev !== null && navigateTo('prev')}
          style={styles.swipeHintBtn}
          disabled={prev === null}
        >
          <Ionicons name="chevron-forward" size={14} color={prev !== null ? C.tint : C.separator} />
          {prev !== null && (
            <Text style={[styles.swipeHintText, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]} numberOfLines={1}>
              {SURAH_META[prev - 1]?.arabic}
            </Text>
          )}
        </Pressable>

        <Text style={[styles.swipeHintCenter, { color: C.textMuted }]}>
          {isAr ? 'اسحب للتنقل' : 'swipe to navigate'}
        </Text>

        <Pressable
          onPress={() => next !== null && navigateTo('next')}
          style={[styles.swipeHintBtn, { justifyContent: 'flex-end' }]}
          disabled={next === null}
        >
          {next !== null && (
            <Text style={[styles.swipeHintText, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]} numberOfLines={1}>
              {SURAH_META[next - 1]?.arabic}
            </Text>
          )}
          <Ionicons name="chevron-back" size={14} color={next !== null ? C.tint : C.separator} />
        </Pressable>
      </View>

      {/* Content with slide animation + swipe handler */}
      <Animated.View
        style={[styles.contentWrap, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {page.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.tint} />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>{tr.loading}</Text>
          </View>
        ) : page.error ? (
          <View style={styles.center}>
            <Ionicons name="wifi-outline" size={48} color={C.textMuted} />
            <Text style={[styles.errorText, { color: C.text }]}>
              {isAr ? 'تعذر التحميل — تحقق من الاتصال' : 'Could not load — check connection'}
            </Text>
            <Pressable onPress={() => loadSurah(surahNum)}>
              <Text style={{ color: C.tint, marginTop: 12 }}>{tr.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {/* Surah banner */}
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
                <Text style={[styles.bismillahText, { color: C.tint, fontFamily: 'Amiri_400Regular', fontSize: arabicFontSize * 0.92 }]}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Text>
              </View>
            )}

            {/* Hint */}
            <Text style={[styles.hint, { color: C.textMuted }]}>
              {isAr ? 'اضغط مطولاً على آية لحفظها' : 'Long press a verse to bookmark it'}
            </Text>

            {/* Ayahs */}
            <View style={styles.ayahsBlock}>
              {page.ayahs.map((ayah) => {
                const bookmarked = isBookmarked(surahNum, ayah.numberInSurah);
                return (
                  <Pressable
                    key={ayah.number}
                    onLongPress={() => handleLongPress(ayah)}
                    onLayout={(e) => {
                      ayahPositions.current[ayah.numberInSurah] = e.nativeEvent.layout.y;
                      if (targetAyah && ayah.numberInSurah === targetAyah && !scrolled.current) {
                        scrolled.current = true;
                        setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 80), animated: true }), 300);
                      }
                    }}
                    style={[
                      styles.ayahRow,
                      bookmarked && { backgroundColor: C.goldLight, borderRadius: 8 },
                    ]}
                  >
                    <Text
                      style={{
                        color: C.text,
                        fontFamily: 'Amiri_400Regular',
                        fontSize: arabicFontSize,
                        lineHeight: lineH,
                        textAlign: 'right',
                        writingDirection: 'rtl',
                      }}
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

            {/* Bottom surah nav */}
            <View style={[styles.navRow, { marginTop: 24 }]}>
              {prev !== null ? (
                <Pressable
                  onPress={() => navigateTo('prev')}
                  style={[styles.navBtn, { backgroundColor: C.surface }]}
                >
                  <Ionicons name="arrow-forward" size={16} color={C.tint} />
                  <Text style={[styles.navBtnText, { color: C.tint, fontFamily: 'Amiri_400Regular' }]}>
                    {SURAH_META[prev - 1]?.arabic ?? ''}
                  </Text>
                </Pressable>
              ) : <View style={{ flex: 1 }} />}

              {next !== null ? (
                <Pressable
                  onPress={() => navigateTo('next')}
                  style={[styles.navBtn, { backgroundColor: C.surface, justifyContent: 'flex-end' }]}
                >
                  <Text style={[styles.navBtnText, { color: C.tint, fontFamily: 'Amiri_400Regular', textAlign: 'right' }]}>
                    {SURAH_META[next - 1]?.arabic ?? ''}
                  </Text>
                  <Ionicons name="arrow-back" size={16} color={C.tint} />
                </Pressable>
              ) : <View style={{ flex: 1 }} />}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Bookmark modal */}
      <Modal visible={bookmarkModal} transparent animationType="fade" onRequestClose={() => setBookmarkModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBookmarkModal(false)}>
          <View style={[styles.modalBox, { backgroundColor: C.backgroundCard }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
              {selectedAyah ? `﴿${toArabicIndic(selectedAyah.numberInSurah)}﴾ ${meta?.arabic ?? ''}` : ''}
            </Text>
            <Text style={[styles.modalPreview, { color: C.textSecond, fontFamily: 'Amiri_400Regular', fontSize: Math.min(arabicFontSize, 22) }]} numberOfLines={4}>
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
    paddingBottom: 10, zIndex: 10,
  },
  navCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  topTitle: { fontSize: 18, fontWeight: '700' },
  topSub: { fontSize: 11, marginTop: 1 },
  zoomRow: { flexDirection: 'row', gap: 6 },
  zoomBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 12, fontWeight: '700' },
  zoomBtnTextLg: { fontSize: 14, fontWeight: '700' },
  swipeHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 16,
    borderRadius: 10, marginBottom: 6,
  },
  swipeHintBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  swipeHintText: { fontSize: 13, maxWidth: 90 },
  swipeHintCenter: { fontSize: 11, textAlign: 'center', flex: 0 },
  contentWrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
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
  bismillahText: { textAlign: 'center' },
  hint: { fontSize: 11, textAlign: 'center', marginBottom: 16, marginTop: 4 },
  ayahsBlock: { paddingHorizontal: 4 },
  ayahRow: { paddingVertical: 6, paddingHorizontal: 4 },
  navRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 4 },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  navBtnText: { fontSize: 16, fontWeight: '600', flex: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    width: '100%', borderRadius: 20,
    padding: 20, gap: 12,
  },
  modalTitle: { fontSize: 18, textAlign: 'center' },
  modalPreview: { textAlign: 'right', lineHeight: 38 },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 4,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
