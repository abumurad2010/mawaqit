import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, ZoomIn, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { t, isRtlLang } from '@/constants/i18n';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';
import ATHKAR_CATEGORIES, { AthkarCategory, Dhikr } from '@/constants/athkar-data';

function getKey(catId: string, idx: number) {
  return `${catId}_${idx}`;
}

export default function AthkarScreen() {
  const insets = useSafeAreaInsets();
  const { lang, colors: C } = useApp();
  const tr = t(lang);
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selectedCategory, setSelectedCategory] = useState<AthkarCategory | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [displayMode, setDisplayMode] = useState<'arabic' | 'full'>('full');
  const readerRef = useRef<FlatList<Dhikr>>(null);
  const pendingAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCategory = useCallback((cat: AthkarCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
    setCounts({});
  }, []);

  const closeCategory = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.selectionAsync();
    setSelectedCategory(null);
    setCounts({});
  }, []);

  const resetCounts = useCallback(() => {
    if (pendingAdvance.current) clearTimeout(pendingAdvance.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCounts({});
  }, []);

  const handleTap = useCallback((cat: AthkarCategory, dhikr: Dhikr, idx: number) => {
    const key = getKey(cat.id, idx);
    setCounts(prev => {
      const cur = prev[key] ?? 0;
      if (cur >= dhikr.count) return prev;
      const next = cur + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= dhikr.count) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        pendingAdvance.current = setTimeout(() => {
          const nextIncompleteIdx = cat.adhkar.findIndex((d, i) => {
            const k = getKey(cat.id, i);
            const c = (i === idx) ? next : (prev[k] ?? 0);
            return c < d.count;
          });
          if (nextIncompleteIdx !== -1 && nextIncompleteIdx !== idx) {
            readerRef.current?.scrollToIndex({ index: nextIncompleteIdx, animated: true, viewPosition: 0.1 });
          }
        }, 600);
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const getCount = useCallback((catId: string, idx: number) => {
    return counts[getKey(catId, idx)] ?? 0;
  }, [counts]);

  const isDone = useCallback((catId: string, idx: number, required: number) => {
    return (counts[getKey(catId, idx)] ?? 0) >= required;
  }, [counts]);

  if (selectedCategory) {
    return (
      <ReaderScreen
        category={selectedCategory}
        lang={lang}
        isRtl={isRtl}
        tr={tr}
        C={C}
        topInset={topInset}
        bottomInset={bottomInset}
        readerRef={readerRef}
        counts={counts}
        getCount={getCount}
        isDone={isDone}
        onTap={handleTap}
        onBack={closeCategory}
        onReset={resetCounts}
        displayMode={displayMode}
      />
    );
  }

  return (
    <GridScreen
      lang={lang}
      isRtl={isRtl}
      tr={tr}
      C={C}
      topInset={topInset}
      bottomInset={bottomInset}
      displayMode={displayMode}
      onDisplayMode={setDisplayMode}
      onSelect={openCategory}
    />
  );
}

interface GridProps {
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  displayMode: 'arabic' | 'full';
  onDisplayMode: (m: 'arabic' | 'full') => void;
  onSelect: (cat: AthkarCategory) => void;
}

function GridScreen({ lang, isRtl, tr, C, topInset, bottomInset, displayMode, onDisplayMode, onSelect }: GridProps) {
  const isAr = lang === 'ar';
  const NUM_COLS = 4;
  const rows: AthkarCategory[][] = [];
  for (let i = 0; i < ATHKAR_CATEGORIES.length; i += NUM_COLS) {
    rows.push(ATHKAR_CATEGORIES.slice(i, i + NUM_COLS));
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.gridTopHeader, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={{ flex: 1 }} />
        </View>
        <View style={[styles.segmentRow, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onDisplayMode('arabic'); }}
            style={[styles.segmentBtn, displayMode === 'arabic' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="text" size={13} color={displayMode === 'arabic' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: displayMode === 'arabic' ? C.tintText : C.textMuted }]}>
              {isAr ? 'عربي فقط' : 'Arabic'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onDisplayMode('full'); }}
            style={[styles.segmentBtn, displayMode === 'full' && { backgroundColor: C.tint }]}
          >
            <Ionicons name="language" size={13} color={displayMode === 'full' ? C.tintText : C.textMuted} />
            <Text style={[styles.segmentLabel, { color: displayMode === 'full' ? C.tintText : C.textMuted }]}>
              {isAr ? 'كامل' : 'Full'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.gridContainer, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={[styles.gridRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {row.map((cat) => (
              <GridCell key={cat.id} cat={cat} lang={lang} isRtl={isRtl} tr={tr} C={C} onPress={onSelect} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface CellProps {
  cat: AthkarCategory;
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  onPress: (cat: AthkarCategory) => void;
}

function GridCell({ cat, lang, isRtl, tr, C, onPress }: CellProps) {
  const nameKey = cat.nameKey as any;
  const name = (tr as any)[nameKey] ?? nameKey;

  return (
    <Pressable
      onPress={() => onPress(cat)}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: C.backgroundCard,
          borderColor: C.separator,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={cat.icon as any} size={28} color={C.tint} />
      <Text
        style={[
          styles.cellLabel,
          {
            color: C.text,
            textAlign: 'center',
            writingDirection: isRtl ? 'rtl' : 'ltr',
          },
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>
    </Pressable>
  );
}

interface ReaderProps {
  category: AthkarCategory;
  lang: string;
  isRtl: boolean;
  tr: any;
  C: any;
  topInset: number;
  bottomInset: number;
  readerRef: React.RefObject<FlatList<Dhikr>>;
  counts: Record<string, number>;
  getCount: (catId: string, idx: number) => number;
  isDone: (catId: string, idx: number, required: number) => boolean;
  onTap: (cat: AthkarCategory, dhikr: Dhikr, idx: number) => void;
  onBack: () => void;
  onReset: () => void;
  displayMode: 'arabic' | 'full';
}

function ReaderScreen({
  category, lang, isRtl, tr, C,
  topInset, bottomInset, readerRef,
  counts, getCount, isDone, onTap, onBack, onReset,
  displayMode,
}: ReaderProps) {
  const nameKey = category.nameKey as any;
  const catName = (tr as any)[nameKey] ?? nameKey;
  const total = category.adhkar.length;
  const doneCount = category.adhkar.filter((d, i) => isDone(category.id, i, d.count)).length;
  const progress = total > 0 ? doneCount / total : 0;
  const allDone = doneCount === total;

  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` as any }));

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  if (allDone) {
    return (
      <View style={[styles.root, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16 }]}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {catName}
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <Animated.View entering={ZoomIn.duration(400)} style={[styles.completionView, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Text style={[styles.completionArabic, { color: C.tint }]}>الحمد لله</Text>
          <Text style={[styles.completionSub, { color: C.textMuted, marginTop: 12 }]}>{catName}</Text>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: C.tint, opacity: pressed ? 0.85 : 1, marginTop: 32 }]}
          >
            <Text style={[styles.doneBtnText, { color: C.tintText }]}>{(tr as any).retry ?? 'Back'}</Text>
          </Pressable>
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [styles.resetCompletionBtn, { borderColor: C.tint, opacity: pressed ? 0.7 : 1, marginTop: 12 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={C.tint} />
            <Text style={[styles.resetCompletionText, { color: C.tint }]}>
              {(tr as any).retry ?? 'Reset'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {catName}
        </Text>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.progressRow, { paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundCard, flex: 1 }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.tint }, progressStyle]} />
        </View>
        <Text style={[styles.progressLabel, { color: C.textMuted }]}>{doneCount}/{total}</Text>
      </View>

      <FlatList
        ref={readerRef}
        data={category.adhkar}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: dhikr, index }) => {
          const done = isDone(category.id, index, dhikr.count);
          const cur = getCount(category.id, index);
          const translation = (tr as any)[dhikr.translationKey] ?? '';

          return (
            <DhikrCard
              dhikr={dhikr}
              index={index}
              done={done}
              cur={cur}
              translation={translation}
              isRtl={isRtl}
              C={C}
              displayMode={displayMode}
              onTap={() => onTap(category, dhikr, index)}
            />
          );
        }}
      />
    </View>
  );
}

interface CardProps {
  dhikr: Dhikr;
  index: number;
  done: boolean;
  cur: number;
  translation: string;
  isRtl: boolean;
  C: any;
  displayMode: 'arabic' | 'full';
  onTap: () => void;
}

function DhikrCard({ dhikr, index, done, cur, translation, isRtl, C, displayMode, onTap }: CardProps) {
  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(300)} style={{ marginBottom: 10 }}>
      <Pressable
        onPress={onTap}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: done ? C.tint + '18' : C.backgroundCard,
            borderColor: done ? C.tint + '55' : C.separator,
            opacity: pressed && !done ? 0.88 : 1,
          },
        ]}
      >
        <View style={[styles.cardTop, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.cardIndex, { color: C.textMuted }]}>{index + 1}</Text>
          <View style={[
            styles.counterBadge,
            {
              backgroundColor: done ? C.tint : C.backgroundCard,
              borderColor: done ? C.tint : C.separator,
            },
          ]}>
            <Text style={[styles.counterText, { color: done ? C.tintText : C.text }]}>
              {cur}/{dhikr.count}
            </Text>
          </View>
          {done && (
            <Animated.View entering={ZoomIn.duration(200)}>
              <Ionicons name="checkmark-circle" size={20} color={C.tint} style={{ marginLeft: 4 }} />
            </Animated.View>
          )}
        </View>

        <Text style={[styles.arabicText, { color: done ? C.tint : C.text }]}>
          {dhikr.arabic}
        </Text>

        {displayMode === 'full' && (
          <Text style={[styles.translitText, { color: C.textMuted }]}>
            {dhikr.transliteration}
          </Text>
        )}

        {displayMode === 'full' && !!translation && (
          <Text style={[
            styles.translationText,
            {
              color: done ? C.tint + 'cc' : C.textSecond,
              textAlign: isRtl ? 'right' : 'left',
              writingDirection: isRtl ? 'rtl' : 'ltr',
            },
          ]}>
            {translation}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gridTopHeader: {
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  gridRow: {
    gap: 10,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  progressRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardIndex: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 'auto',
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  arabicText: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translitText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  translationText: {
    fontSize: 13,
    lineHeight: 19,
  },
  completionArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 48,
    textAlign: 'center',
  },
  completionSub: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  completionView: {},
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resetCompletionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetCompletionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
