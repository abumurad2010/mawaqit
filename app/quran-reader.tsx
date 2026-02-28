import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  ScrollView, PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQuranPage, SURAH_META, SURAH_START_PAGES, type PageAyah } from '@/lib/quran-api';

const TOTAL_PAGES = 604;
const SWIPE_THRESHOLD = 55;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function MosqueArch({ color }: { color: string }) {
  return (
    <View style={arch.container}>
      <View style={arch.row}>
        <View style={[arch.minaretSm, { backgroundColor: color }]} />
        <View style={{ width: 4 }} />
        <View style={[arch.minaretMd, { backgroundColor: color }]} />
        <View style={{ width: 3 }} />
        <View style={{ alignItems: 'center' }}>
          <View style={[arch.crescent, { borderColor: color }]} />
          <View style={[arch.dome, { backgroundColor: color }]} />
          <View style={[arch.domeBase, { backgroundColor: color }]} />
        </View>
        <View style={{ width: 3 }} />
        <View style={[arch.minaretMd, { backgroundColor: color }]} />
        <View style={{ width: 4 }} />
        <View style={[arch.minaretSm, { backgroundColor: color }]} />
      </View>
      <View style={[arch.baseLine, { backgroundColor: color }]} />
    </View>
  );
}

const arch = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 4, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 0 },
  minaretSm: { width: 4, height: 18, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  minaretMd: { width: 5, height: 24, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  crescent: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, marginBottom: 1,
  },
  dome: {
    width: 36, height: 18,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  domeBase: { width: 40, height: 14 },
  baseLine: { height: 1, width: '90%', opacity: 0.35, marginTop: 2 },
});

export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));

  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, fontSize, setLastReadPage } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const navigating = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const fontScale = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.22 : 1.0;
  const arabicFontSize = 22 * fontScale;

  useEffect(() => {
    setLastReadPage(pageNum);
  }, [pageNum]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (navigating.current) return;
    const newPage = direction === 'next' ? pageNum + 1 : pageNum - 1;
    if (newPage < 1 || newPage > TOTAL_PAGES) return;
    navigating.current = true;
    const toX = direction === 'next' ? -W : W;
    Animated.timing(slideAnim, { toValue: toX, duration: 180, useNativeDriver: true }).start(() => {
      setPageNum(newPage);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      slideAnim.setValue(-toX);
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        navigating.current = false;
      });
    });
    Haptics.selectionAsync();
  }, [pageNum, W, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) navigate('next');
        else if (g.dx > SWIPE_THRESHOLD) navigate('prev');
      },
    })
  ).current;

  const pageAyahs = getQuranPage(pageNum);

  const groups: Array<{ surahNum: number; ayahs: PageAyah[]; showHeader: boolean }> = [];
  for (const ayah of pageAyahs) {
    if (groups.length === 0 || groups[groups.length - 1].surahNum !== ayah.surahNum) {
      groups.push({ surahNum: ayah.surahNum, ayahs: [ayah], showHeader: ayah.ayahNum === 1 });
    } else {
      groups[groups.length - 1].ayahs.push(ayah);
    }
  }

  const juzNum = pageAyahs[0]?.juz ?? 1;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#0a1a0f' : '#f5f0e6' }]}>
      <LinearGradient
        colors={isDark ? ['#0a2010', '#070e08'] : ['#f5f0e6', '#ede8d5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.appName, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
            {isAr ? 'مواقيت' : 'Mawaqit'}
          </Text>
          <Text style={[styles.pageLabel, { color: C.textMuted }]}>
            {isAr
              ? `صفحة ${toArabicIndic(pageNum)} · جزء ${toArabicIndic(juzNum)}`
              : `Page ${pageNum} · Juz ${juzNum}`}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/bookmarks')}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="bookmark-outline" size={18} color={C.tint} />
        </Pressable>
      </View>

      {/* Mosque arch decoration */}
      <MosqueArch color={C.tint} />

      {/* Page content with swipe */}
      <Animated.View
        style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.pageContent, { paddingBottom: bottomInset + 90 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled
        >
          {pageAyahs.length === 0 ? (
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 60, fontFamily: 'Amiri_400Regular', fontSize: 18 }}>
              ...
            </Text>
          ) : (
            groups.map((group, gi) => {
              const meta = SURAH_META[group.surahNum - 1];
              return (
                <View key={`g-${group.surahNum}-${gi}`}>
                  {/* Surah header — shown when surah starts on this page */}
                  {group.showHeader && (
                    <View style={[styles.surahHeader, {
                      borderColor: C.tint,
                      backgroundColor: isDark ? 'rgba(26,122,74,0.15)' : 'rgba(26,122,74,0.09)',
                    }]}>
                      <Text style={[styles.surahHeaderBismi, { color: C.tint }]}>
                        {'﴿ '}
                        {meta?.arabic ?? ''}
                        {' ﴾'}
                      </Text>
                      <Text style={[styles.surahHeaderMeta, { color: C.textMuted }]}>
                        {meta?.type === 'Meccan'
                          ? (isAr ? 'مكية' : 'Meccan')
                          : (isAr ? 'مدنية' : 'Medinan')}
                        {'  ·  '}
                        {isAr ? toArabicIndic(meta?.ayahs ?? 0) : (meta?.ayahs ?? 0)}
                        {' '}{isAr ? 'آية' : 'verses'}
                      </Text>
                    </View>
                  )}

                  {/* Ayah text — flowing Arabic */}
                  <Text
                    style={[styles.ayahText, {
                      color: C.text,
                      fontSize: arabicFontSize,
                      lineHeight: arabicFontSize * 2.1,
                    }]}
                  >
                    {group.ayahs.map(ayah => (
                      <React.Fragment key={`a-${ayah.surahNum}-${ayah.ayahNum}`}>
                        {ayah.text}
                        <Text style={{ color: C.tint, fontSize: arabicFontSize * 0.72 }}>
                          {' ﴿'}{toArabicIndic(ayah.ayahNum)}{'﴾ '}
                        </Text>
                      </React.Fragment>
                    ))}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {/* Bottom navigation */}
      <View style={[styles.bottomNav, {
        paddingBottom: bottomInset + 14,
        borderTopColor: C.separator,
        backgroundColor: isDark ? 'rgba(10,26,15,0.95)' : 'rgba(245,240,230,0.95)',
      }]}>
        <Pressable
          onPress={() => navigate('prev')}
          disabled={pageNum <= 1}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.surface, opacity: pageNum <= 1 ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={18} color={C.tint} />
          <Text style={[styles.navBtnText, { color: C.tint, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {isAr ? 'السابقة' : 'Prev'}
          </Text>
        </Pressable>

        <Text style={[styles.pageCenter, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
          {isAr ? toArabicIndic(pageNum) : pageNum}
          <Text style={{ fontSize: 14, color: C.textMuted }}>
            {isAr ? `/${toArabicIndic(TOTAL_PAGES)}` : `/${TOTAL_PAGES}`}
          </Text>
        </Text>

        <Pressable
          onPress={() => navigate('next')}
          disabled={pageNum >= TOTAL_PAGES}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.surface, opacity: pageNum >= TOTAL_PAGES ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.navBtnText, { color: C.tint, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {isAr ? 'التالية' : 'Next'}
          </Text>
          <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color={C.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 6,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  appName: { fontSize: 17, letterSpacing: 0.5 },
  pageLabel: { fontSize: 11, marginTop: 2 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  pageContent: { paddingHorizontal: 18, paddingTop: 6 },
  surahHeader: {
    alignItems: 'center', borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 20,
    marginBottom: 12, marginTop: 6,
  },
  surahHeaderBismi: {
    fontSize: 22, fontFamily: 'Amiri_700Bold', textAlign: 'center',
    letterSpacing: 1,
  },
  surahHeaderMeta: { fontSize: 12, marginTop: 4, fontFamily: 'Amiri_400Regular' },
  ayahText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'justify',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 0.5,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  navBtnText: { fontSize: 13, fontWeight: '600' },
  pageCenter: { fontSize: 24 },
});
