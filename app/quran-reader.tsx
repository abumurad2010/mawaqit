import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert,
  ScrollView, PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQuranPage, SURAH_META, SURAH_START_PAGES, BISMILLAH_TEXT, type PageAyah } from '@/lib/quran-api';

const TOTAL_PAGES = 604;
const SWIPE_THRESHOLD = 55;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function stripBismillah(text: string): string {
  return text.slice(BISMILLAH_TEXT.length).trimStart();
}

function SurahBanner({ surahNum, color, textColor, mutedColor }: {
  surahNum: number; color: string; textColor: string; mutedColor: string;
}) {
  const meta = SURAH_META[surahNum - 1];
  if (!meta) return null;

  const ayahCount = meta.ayahs;
  const typeLabel = meta.type === 'Meccan' ? 'مكية' : 'مدنية';

  return (
    <View style={banner.wrapper}>
      <View style={[banner.outer, { borderColor: color }]}>
        <View style={[banner.inner, { borderColor: color }]}>
          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
            <View style={[banner.orn, { backgroundColor: color }]} />
          </View>

          <View style={banner.center}>
            <Text style={[banner.surahWord, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
              سُورَةُ
            </Text>
            <Text style={[banner.surahName, { color: textColor, fontFamily: 'Amiri_700Bold' }]}>
              {meta.arabic}
            </Text>
            <View style={banner.metaRow}>
              <Text style={[banner.meta, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
                {typeLabel}
              </Text>
              <View style={[banner.metaDot, { backgroundColor: mutedColor }]} />
              <Text style={[banner.meta, { color: mutedColor, fontFamily: 'Amiri_400Regular' }]}>
                {toArabicIndic(ayahCount)} آية
              </Text>
            </View>
          </View>

          <View style={banner.sideOrn}>
            <View style={[banner.orn, { backgroundColor: color }]} />
            <View style={[banner.ornLine, { backgroundColor: color }]} />
            <View style={[banner.orn, { backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  wrapper: { marginTop: 8, marginBottom: 6, marginHorizontal: 4 },
  outer: {
    borderWidth: 1.5,
    borderRadius: 3,
    padding: 3,
  },
  inner: {
    borderWidth: 0.75,
    borderRadius: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center', flex: 1 },
  surahWord: { fontSize: 12, letterSpacing: 1, marginBottom: 2 },
  surahName: { fontSize: 24, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 11 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },
  sideOrn: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 20 },
  orn: { width: 5, height: 5, borderRadius: 2.5 },
  ornLine: { width: 1, height: 20 },
});

export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));
  const highlightSurahParam = parseInt(params.highlightSurah ?? '0', 10);
  const highlightAyahParam  = parseInt(params.highlightAyah  ?? '0', 10);

  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, fontSize, setLastReadPage, updateSettings,
          addBookmark, removeBookmark, isBookmarked, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<{ surah: number; ayah: number } | null>(
    highlightSurahParam && highlightAyahParam
      ? { surah: highlightSurahParam, ayah: highlightAyahParam }
      : null
  );

  // Auto-clear highlight after 2.5 s
  useEffect(() => {
    if (!highlightTarget) return;
    const t = setTimeout(() => setHighlightTarget(null), 2500);
    return () => clearTimeout(t);
  }, [highlightTarget]);
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
    // Quran is RTL: "next" page is to the left, "prev" page is to the right
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

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const handleLongPressAyah = useCallback((ayah: PageAyah) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bookmarked = isBookmarked(ayah.surahNum, ayah.ayahNum);
    const surahName = SURAH_META[ayah.surahNum - 1];
    const label = isAr
      ? `${surahName?.arabic ?? ''} — آية ${toArabicIndic(ayah.ayahNum)}`
      : `${surahName?.transliteration ?? ''} — Ayah ${ayah.ayahNum}`;
    Alert.alert(
      bookmarked ? (isAr ? 'إزالة الإشارة' : 'Remove Bookmark') : (isAr ? 'إضافة إشارة' : 'Bookmark Ayah'),
      label,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: bookmarked ? (isAr ? 'إزالة' : 'Remove') : (isAr ? 'إضافة' : 'Add'),
          onPress: () => {
            if (bookmarked) {
              removeBookmark(ayah.surahNum, ayah.ayahNum);
            } else {
              addBookmark({
                surahNumber: ayah.surahNum,
                surahName: surahName?.transliteration ?? '',
                ayahNumber: ayah.ayahNum,
                ayahText: ayah.text,
                timestamp: Date.now(),
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [isBookmarked, addBookmark, removeBookmark, isAr]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        // Quran is RTL: swipe left (dx < 0) = next page, swipe right (dx > 0) = prev page
        if (g.dx < -SWIPE_THRESHOLD) navigateRef.current('next');
        else if (g.dx > SWIPE_THRESHOLD) navigateRef.current('prev');
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

  const firstSurahOnPage = SURAH_META[pageAyahs[0]?.surahNum - 1];
  const surahLabel = firstSurahOnPage
    ? (isAr ? firstSurahOnPage.arabic : firstSurahOnPage.transliteration)
    : '';

  const bgColor = isDark ? '#0D0D0D' : '#FAF6EE';

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16, borderBottomColor: showFontPanel ? 'transparent' : C.separator }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={C.tint} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerSurah, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
            {surahLabel}
          </Text>
          <Text style={[styles.headerJuz, { color: C.textMuted }]}>
            {isAr
              ? `جزء ${toArabicIndic(juzNum)} · صفحة ${toArabicIndic(pageNum)}`
              : `Juz ${juzNum} · Page ${pageNum}`}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowFontPanel(v => !v); }}
            style={({ pressed }) => [styles.iconBtn, {
              backgroundColor: showFontPanel ? C.tint : C.backgroundCard,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Text style={[styles.aaBtn, { color: showFontPanel ? '#fff' : C.textSecond }]}>Aa</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/bookmarks')}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="bookmark-outline" size={18} color={C.textSecond} />
          </Pressable>
        </View>
      </View>

      {/* ── Font size panel ── */}
      {showFontPanel && (
        <View style={[styles.fontPanel, { backgroundColor: C.backgroundCard, borderBottomColor: C.separator }]}>
          {(['small', 'medium', 'large'] as const).map((size, i) => {
            const textSizes = [15, 20, 26];
            const sizeLabels = isAr
              ? ['صغير', 'متوسط', 'كبير']
              : ['Small', 'Medium', 'Large'];
            const selected = fontSize === size;
            return (
              <Pressable
                key={size}
                testID={`font-size-${size}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateSettings({ fontSize: size });
                }}
                style={[
                  styles.fontOption,
                  selected && { backgroundColor: C.tintLight, borderRadius: 10 },
                ]}
              >
                <Text style={[styles.fontOptionLetter, { color: selected ? C.tint : C.textSecond, fontSize: textSizes[i] }]}>
                  أ
                </Text>
                <Text style={[styles.fontOptionLabel, { color: selected ? C.tint : C.textMuted }]}>
                  {sizeLabels[i]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Page content with swipe ── */}
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
              const hasBismillah = meta?.hasBismillah ?? false;
              const showBismillah = group.showHeader && hasBismillah && group.surahNum !== 1;

              return (
                <View key={`g-${group.surahNum}-${gi}`}>

                  {/* ── Surah banner ── */}
                  {group.showHeader && (
                    <SurahBanner
                      surahNum={group.surahNum}
                      color={C.tint}
                      textColor={C.text}
                      mutedColor={C.textMuted}
                    />
                  )}

                  {/* ── Bismillah line (separate from verse 1) ── */}
                  {showBismillah && (
                    <Text style={[styles.bismillah, {
                      color: C.text,
                      fontSize: arabicFontSize * 1.05,
                      lineHeight: arabicFontSize * 2.3,
                    }]}>
                      {BISMILLAH_TEXT}
                    </Text>
                  )}

                  {/* ── Flowing verse text ── */}
                  <Text
                    style={[styles.ayahText, {
                      color: C.text,
                      fontSize: arabicFontSize,
                      lineHeight: arabicFontSize * 2.1,
                    }]}
                  >
                    {group.ayahs.map(ayah => {
                      let text = ayah.text;
                      if (ayah.ayahNum === 1 && showBismillah) {
                        text = stripBismillah(text);
                      }
                      const bookmarked = isBookmarked(ayah.surahNum, ayah.ayahNum);
                      const isHighlighted = highlightTarget?.surah === ayah.surahNum && highlightTarget?.ayah === ayah.ayahNum;
                      return (
                        <React.Fragment key={`a-${ayah.surahNum}-${ayah.ayahNum}`}>
                          {text}
                          <Text
                            suppressHighlighting
                            onLongPress={() => handleLongPressAyah(ayah)}
                            style={{
                              color: isHighlighted ? C.tintText : (bookmarked ? '#C8860A' : C.tint),
                              backgroundColor: isHighlighted ? C.tint : undefined,
                              borderRadius: 4,
                              fontSize: arabicFontSize * 0.7,
                            }}
                          >
                            {' ﴿'}{toArabicIndic(ayah.ayahNum)}{'﴾ '}
                          </Text>
                        </React.Fragment>
                      );
                    })}
                  </Text>
                </View>
              );
            })
          )}

          {/* Page number at bottom */}
          <View style={styles.pageNumRow}>
            <View style={[styles.pageNumLine, { backgroundColor: C.separator }]} />
            <Text style={[styles.pageNum, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
              {toArabicIndic(pageNum)}
            </Text>
            <View style={[styles.pageNumLine, { backgroundColor: C.separator }]} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── Bottom navigation ── */}
      <View style={[styles.bottomNav, {
        paddingBottom: bottomInset + 14,
        borderTopColor: C.separator,
        backgroundColor: isDark ? 'rgba(13,13,13,0.97)' : 'rgba(250,246,238,0.97)',
      }]}>
        <Pressable
          onPress={() => navigate('prev')}
          disabled={pageNum <= 1}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, opacity: pageNum <= 1 ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={C.tint} />
          <Text style={[styles.navBtnText, { color: C.tint }]}>
            {isAr ? 'السابقة' : 'Prev'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate('next')}
          disabled={pageNum >= TOTAL_PAGES}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: C.backgroundCard, opacity: pageNum >= TOTAL_PAGES ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.navBtnText, { color: C.tint }]}>
            {isAr ? 'التالية' : 'Next'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', gap: 6 },
  headerSurah: { fontSize: 17, letterSpacing: 0.5 },
  headerJuz: { fontSize: 11, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aaBtn: { fontSize: 13, fontWeight: '700', letterSpacing: -0.5 },

  fontPanel: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fontOption: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 4,
  },
  fontOptionLetter: { fontFamily: 'Amiri_700Bold' },
  fontOptionLabel: { fontSize: 10, fontWeight: '600' },

  pageContent: { paddingHorizontal: 16, paddingTop: 4 },

  bismillah: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    writingDirection: 'rtl',
  },

  ayahText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'justify',
    writingDirection: 'rtl',
    marginBottom: 10,
  },

  pageNumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, marginBottom: 4, paddingHorizontal: 8,
  },
  pageNumLine: { flex: 1, height: StyleSheet.hairlineWidth },
  pageNum: { fontSize: 16 },

  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  navBtnText: { fontSize: 13, fontWeight: '600' },
});
