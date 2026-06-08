/**
 * Quran reader — Madani Mushaf page-image viewer.
 *
 * Page images: github.com/adelpro/open-mushaf-native
 * Copyright (c) 2024 adelpro — MIT License
 *
 * Image-based rendering, no font glyph alignment, no Unicode quirks. One
 * 456x672 PNG per page (1-604), rendered via expo-image, navigated via a
 * react-native-gesture-handler pan gesture.
 *
 * Mawaqit conventions enforced on top of the base renderer:
 *   - swipe LEFT  → next page
 *   - swipe RIGHT → previous page
 *   - LONG-PRESS  → add/remove bookmark for current page (no tap handler)
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator,
  useWindowDimensions, I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { SURAH_META, SURAH_START_PAGES, getAyahPage } from '@/lib/quran-api';
import { MUSHAF_HAFS_IMAGES } from '@/constants/mushaf-images';

const TOTAL_PAGES = 604;
const PAGE_ASPECT_RATIO = 456 / 672; // ~0.679 — original image dimensions

const ACTIVATION_OFFSET_X = 10;
const FAIL_OFFSET_Y = 12;
const MAX_TRANSLATION_X = 100;
const SWIPE_THRESHOLD = 50;
const SPRING_DAMPING = 15;
const SPRING_STIFFNESS = 120;

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/** Find the surah whose starting page is the latest <= the given page. */
function getSurahAtPage(page: number): number {
  let best = 1;
  for (let s = 1; s <= 114; s++) {
    const sp = SURAH_START_PAGES[s];
    if (sp && sp <= page && sp >= (SURAH_START_PAGES[best] ?? 1)) best = s;
  }
  return best;
}

/** Estimated juz number for a page (Madani 604-page layout). Juz N starts roughly at page (N-1)*20 + 1, with N=1 at page 1. */
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];
function getJuzAtPage(page: number): number {
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_START_PAGES[i]) return i + 1;
  }
  return 1;
}

export default function QuranReaderScreen() {
  const params = useLocalSearchParams<{ page?: string; highlightSurah?: string; highlightAyah?: string; timestamp?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10)));

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, lang, setLastReadPage, setLastReadSurah,
          addBookmark, removeBookmark, isBookmarked, colors } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [pageNum, setPageNum] = useState(initialPage);
  const pageNumRef = useRef(initialPage);
  pageNumRef.current = pageNum;

  // Search/bookmark navigation: jump to page
  useEffect(() => {
    if (!params.highlightSurah || !params.highlightAyah) return;
    const surah = parseInt(params.highlightSurah, 10);
    const ayah = parseInt(params.highlightAyah, 10);
    const newPage = getAyahPage(surah, ayah);
    if (newPage !== pageNumRef.current) setPageNum(newPage);
  }, [params.highlightSurah, params.highlightAyah, params.timestamp]);

  // Persist last-read
  useEffect(() => {
    setLastReadPage(pageNum);
    setLastReadSurah(getSurahAtPage(pageNum));
  }, [pageNum]);

  // Surah / juz labels for header
  const currentSurahNum = useMemo(() => getSurahAtPage(pageNum), [pageNum]);
  const currentMeta = SURAH_META[currentSurahNum - 1];
  const surahLabel = currentMeta ? (isAr ? currentMeta.arabic : currentMeta.transliteration) : '';
  const juzNum = useMemo(() => getJuzAtPage(pageNum), [pageNum]);

  // Bookmark current page (long-press)
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const surahNum = getSurahAtPage(pageNum);
    const meta = SURAH_META[surahNum - 1];
    // We bookmark page as ayah 1 of the page-start surah (image-based reader has no
    // per-ayah anchor; the bookmark is page-scoped).
    const bookmarkAyah = 1;
    const bookmarked = isBookmarked(surahNum, bookmarkAyah);
    const label = isAr
      ? `${meta?.arabic ?? ''} — صفحة ${toArabicIndic(pageNum)}`
      : `${meta?.transliteration ?? ''} — ${tr.page} ${pageNum}`;
    Alert.alert(
      bookmarked ? tr.removeBookmark : tr.addBookmark,
      label,
      [
        { text: tr.btn_cancel, style: 'cancel' },
        {
          text: bookmarked ? tr.remove : tr.add,
          onPress: () => {
            if (bookmarked) {
              removeBookmark(surahNum, bookmarkAyah);
            } else {
              addBookmark({
                surahNumber: surahNum,
                surahName: meta?.transliteration ?? '',
                ayahNumber: bookmarkAyah,
                ayahText: '',
                timestamp: Date.now(),
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [pageNum, isBookmarked, addBookmark, removeBookmark, tr, isAr]);

  // Pan gesture — Mawaqit convention: swipe LEFT (translationX < 0) → next page.
  // Adapted from open-mushaf-native (MIT, copyright 2024 adelpro).
  const translateX = useSharedValue(0);

  const changePage = useCallback((delta: number) => {
    const target = pageNumRef.current + delta;
    if (target < 1 || target > TOTAL_PAGES) return;
    Haptics.selectionAsync();
    setPageNum(target);
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ACTIVATION_OFFSET_X, ACTIVATION_OFFSET_X])
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onUpdate((e) => {
          'worklet';
          translateX.value = Math.max(
            -MAX_TRANSLATION_X,
            Math.min(MAX_TRANSLATION_X, e.translationX),
          );
        })
        .onEnd((e) => {
          'worklet';
          if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
            // Swipe LEFT (translationX < 0) → next page (+1)
            // Swipe RIGHT (translationX > 0) → prev page (-1)
            const delta = e.translationX < 0 ? +1 : -1;
            runOnJS(changePage)(delta);
          }
          translateX.value = withSpring(0, { damping: SPRING_DAMPING, stiffness: SPRING_STIFFNESS });
        }),
    [translateX, changePage],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Long-press detection — separate gesture so it doesn't conflict with pan
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(450)
        .onStart(() => {
          'worklet';
          runOnJS(handleLongPress)();
        }),
    [handleLongPress],
  );

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, longPressGesture),
    [panGesture, longPressGesture],
  );

  const headerHeight = 56;
  const footerHeight = 32;
  const bgColor = isDark ? '#0D0D0D' : '#FAF6EE';

  const imageSource = MUSHAF_HAFS_IMAGES[pageNum];

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: topInset + 4,
        paddingHorizontal: 16,
        borderBottomColor: C.separator,
        height: topInset + headerHeight,
      }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={C.tint} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerSurah, { color: C.text, fontFamily: 'Amiri_700Bold' }]} numberOfLines={1}>
            {surahLabel}
          </Text>
          <Text style={[styles.headerJuz, { color: C.textMuted }]} numberOfLines={1}>
            {isAr
              ? `جزء ${toArabicIndic(juzNum)} · صفحة ${toArabicIndic(pageNum)}`
              : `${tr.juz} ${juzNum} · ${tr.page} ${pageNum}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/bookmarks')}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="bookmark-outline" size={18} color={C.textSecond} />
        </Pressable>
      </View>

      {/* Page viewer */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.pageWrap, animatedStyle, { backgroundColor: bgColor }]}>
            {imageSource ? (
              <Image
                source={imageSource}
                style={{ width: '100%', aspectRatio: PAGE_ASPECT_RATIO, maxHeight: '100%' }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={120}
              />
            ) : (
              <ActivityIndicator color={C.tint} />
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Footer */}
      <View style={[styles.footer, {
        paddingBottom: bottomInset + 4,
        height: footerHeight + bottomInset,
        borderTopColor: C.separator,
        backgroundColor: bgColor,
      }]}>
        <Text style={[styles.pageNumText, { color: C.textMuted, fontFamily: 'Amiri_700Bold' }]}>
          {toArabicIndic(pageNum)} / {toArabicIndic(TOTAL_PAGES)}
        </Text>
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
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  headerSurah: { fontSize: 16, letterSpacing: 0.5 },
  headerJuz: { fontSize: 11, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNumText: { fontSize: 13, letterSpacing: 0.5 },
});
