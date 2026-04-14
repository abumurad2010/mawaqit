import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  ActivityIndicator, ScrollView, Modal,
  PanResponder, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, Easing, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t, isRtlLang } from '@/constants/i18n';
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

  const insets = useSafeAreaInsets();
  const { isDark, lang, fontSize, isBookmarked, addBookmark, removeBookmark, setLastReadSurah, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const isRtl = isRtlLang(lang);

  const [surahNum, setSurahNum] = useState(initialNum);
  const [page, setPage] = useState<PageState>({ surahNum: initialNum, ayahs: [], loading: true, error: null });
  const [fontScale, setFontScale] = useState(1.0);
  const [bookmarkModal, setBookmarkModal] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const ayahPositions = useRef<Record<number, number>>({});
  const ayahsBlockY = useRef(0);
  const surahHeaderY = useRef(0);
  const scrolled = useRef(false);
  const flip = useSharedValue(0);
  const transitioningRef = useRef(false);
  const surahNumRef = useRef(surahNum);

  const meta = SURAH_META[surahNum - 1];
  const arabicFontSize = BASE_FONT_SIZE * fontScale;
  const lineH = arabicFontSize * 1.9;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const loadSurah = useCallback(async (num: number) => {
    console.log('[LOAD_SURAH] number=', num, 'targetAyah=', targetAyah);
    setPage(prev => ({ ...prev, surahNum: num, loading: true, error: null }));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    ayahPositions.current = {};
    ayahsBlockY.current = 0;
    surahHeaderY.current = 0;
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

  // Scroll to top (y=0) when ayah=1 (TOC navigation), or center a specific ayah
  // (bookmarks / search deep-links). 300ms lets the layout pass complete first.
  // initialNum in deps ensures the guard resets on every new TOC navigation.
  useEffect(() => {
    scrolled.current = false;
    if (!targetAyah || page.ayahs.length === 0 || scrolled.current) return;
    scrolled.current = true;
    if (targetAyah === 1) {
      // TOC always navigates with ayah:1 — surah header is the first element, scroll to top.
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 300);
    } else {
      // Deep-link to a specific ayah (bookmarks, search) — center it vertically.
      setTimeout(() => {
        const pos = ayahPositions.current[targetAyah] ?? 0;
        const screenH = Dimensions.get('window').height;
        const scrollY = Math.max(0, ayahsBlockY.current + pos - screenH * 0.4);
        scrollRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 800);
    }
  }, [targetAyah, page.ayahs, initialNum]);

  const flipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${flip.value}deg` },
    ],
  }));

  const flipShadowStyle = useAnimatedStyle(() => ({
    opacity: (Math.abs(flip.value) / 90) * 0.45,
  }));

  const navigateTo = useCallback((dir: 'next' | 'prev') => {
    if (transitioningRef.current) return;
    const cur = surahNumRef.current;
    const newNum = dir === 'next' ? cur + 1 : cur - 1;
    if (newNum < 1 || newNum > 114) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    transitioningRef.current = true;
    setTransitioning(true);
    const outAngle = dir === 'next' ? -90 : 90;

    const doSwap = () => {
      surahNumRef.current = newNum;
      setSurahNum(newNum);
    };
    const doFinish = () => {
      transitioningRef.current = false;
      setTransitioning(false);
    };

    flip.value = withTiming(outAngle, { duration: 200, easing: Easing.in(Easing.ease) }, (done) => {
      if (done) {
        runOnJS(doSwap)();
        flip.value = -outAngle;
        flip.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, (done2) => {
          if (done2) runOnJS(doFinish)();
        });
      }
    });
  }, [flip]);

  const navigateRef = useRef(navigateTo);
  useEffect(() => { navigateRef.current = navigateTo; }, [navigateTo]);

  const isRtlRef = useRef(isRtl);
  useEffect(() => { isRtlRef.current = isRtl; }, [isRtl]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        const rtl = isRtlRef.current;
        if (g.dx < -SWIPE_THRESHOLD) navigateRef.current(rtl ? 'prev' : 'next');
        else if (g.dx > SWIPE_THRESHOLD) navigateRef.current(rtl ? 'next' : 'prev');
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
            {isAr
              ? `سورة ${toArabicIndic(surahNum)} · ${toArabicIndic(meta?.ayahs ?? 0)} آية`
              : `Surah ${surahNum} · ${meta?.transliteration ?? ''}`}
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
          <Ionicons name="chevron-back" size={14} color={prev !== null ? C.tint : C.separator} />
          {prev !== null && (
            <Text style={[styles.swipeHintText, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]} numberOfLines={1}>
              {SURAH_META[prev - 1]?.arabic}
            </Text>
          )}
        </Pressable>

        <Text style={[styles.swipeHintCenter, { color: C.textMuted }]}>
          {tr.swipeToNavigate}
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
          <Ionicons name="chevron-forward" size={14} color={next !== null ? C.tint : C.separator} />
        </Pressable>
      </View>

      {/* Content with page flip animation + swipe handler */}
      <Animated.View
        style={[styles.contentWrap, flipStyle]}
        {...panResponder.panHandlers}
      >
        {/* Shadow overlay — darkens at 90° edge to enhance 3D depth */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 10 }, flipShadowStyle]}
          pointerEvents="none"
        />
        {page.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.tint} />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>{tr.loading}</Text>
          </View>
        ) : page.error ? (
          <View style={styles.center}>
            <Ionicons name="wifi-outline" size={48} color={C.textMuted} />
            <Text style={[styles.errorText, { color: C.text }]}>
              {tr.loadError}
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
            <View
              style={[styles.surahHeader, { backgroundColor: C.tint }]}
              onLayout={(e) => {
                surahHeaderY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.surahArabicName, { fontFamily: 'Amiri_700Bold', color: C.tintText }]}>
                {meta?.arabic ?? ''}
              </Text>
              <Text style={[styles.surahEnglishName, { color: C.tintText, opacity: 0.8 }]}>{meta?.transliteration}</Text>
              <Text style={[styles.surahMeta, { color: C.tintText, opacity: 0.65 }]}>
                {meta?.type === 'Meccan' ? tr.makkiyya : tr.madaniyya}
                {' · '}
                {meta?.ayahs} {tr.verses}
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
              {tr.longPressBookmark}
            </Text>

            {/* Ayahs */}
            <View
              style={styles.ayahsBlock}
              onLayout={(e) => { ayahsBlockY.current = e.nativeEvent.layout.y; }}
            >
              {page.ayahs.map((ayah) => {
                const bookmarked = isBookmarked(surahNum, ayah.numberInSurah);
                return (
                  <Pressable
                    key={ayah.number}
                    onLongPress={() => handleLongPress(ayah)}
                    onLayout={(e) => {
                      ayahPositions.current[ayah.numberInSurah] = e.nativeEvent.layout.y;
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
                  <Ionicons name="arrow-back" size={16} color={C.tint} />
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
                  <Ionicons name="arrow-forward" size={16} color={C.tint} />
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
                size={18} color={selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah) ? '#fff' : C.tintText}
              />
              <Text style={[styles.modalBtnText, { color: selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah) ? '#fff' : C.tintText }]}>
                {selectedAyah && isBookmarked(surahNum, selectedAyah.numberInSurah)
                  ? tr.removeBookmark
                  : tr.addBookmark}
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
  surahArabicName: { fontSize: 30 },
  surahEnglishName: { fontSize: 14 },
  surahMeta: { fontSize: 12 },
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
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
