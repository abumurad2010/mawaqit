import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, ZoomIn, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';
import i18n, { t, isRtlLang, LANG_META } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';
import ATHKAR_CATEGORIES, { AthkarCategory, Dhikr } from '@/constants/athkar-data';

const FAVS_KEY = 'athkar_favourites';
const FAV_HINT_KEY = 'athkar_fav_hint_seen';
const GOLD = '#C9A84C';

const DHIKR_HELP_KEYS = new Set([
  'athkar_sleep_ikhlas', 'athkar_sleep_falaq', 'athkar_sleep_nas',
  'athkar_sleep_aslamt', 'athkar_sleep_janb',
  'athkar_sick_3', 'athkar_sick_4',
  'athkar_istikhara_1', 'athkar_friday_3', 'athkar_ruqyah_1',
]);

function AthkarHelpBtn({ onPress, C }: { onPress: () => void; C: any }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 1.5, borderColor: C.tint,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.4 : 1,
      })}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.tint, lineHeight: 13 }}>?</Text>
    </Pressable>
  );
}

function getKey(catId: string, idx: number) {
  return `${catId}_${idx}`;
}

export default function AthkarScreen() {
  const insets = useSafeAreaInsets();
  const { lang, colors: C, isDark } = useApp();
  const tr = t(lang);
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selectedCategory, setSelectedCategory] = useState<AthkarCategory | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [displayMode, setDisplayMode] = useState<'arabic' | 'full'>('full');
  const [favourites, setFavourites] = useState<string[]>([]);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [favHintSeen, setFavHintSeen] = useState(false);
  const [athkarLang, setAthkarLang] = useState<Lang>(lang as Lang);
  const readerRef = useRef<FlatList<Dhikr>>(null);
  const pendingAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FAVS_KEY).then(raw => {
      if (raw) setFavourites(JSON.parse(raw));
    }).catch(() => {});
    AsyncStorage.getItem(FAV_HINT_KEY).then(val => {
      setFavHintSeen(val === 'true');
    }).catch(() => {});
  }, []);

  const sortedCategories = useMemo(() => ATHKAR_CATEGORIES, []);

  const toggleFavourite = useCallback((cat: AthkarCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavourites(prev => {
      const isFav = prev.includes(cat.id);
      const name = (tr as any)[cat.nameKey] ?? cat.nameKey;
      const prompt = isFav ? (tr as any).athkar_fav_remove_prompt : (tr as any).athkar_fav_add_prompt;
      const btn = isFav ? (tr as any).athkar_fav_remove_btn : (tr as any).athkar_fav_add_btn;
      Alert.alert(name, prompt, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: btn,
          style: isFav ? 'destructive' : 'default',
          onPress: () => {
            const next = isFav ? prev.filter(id => id !== cat.id) : [...prev, cat.id];
            setFavourites(next);
            AsyncStorage.setItem(FAVS_KEY, JSON.stringify(next)).catch(() => {});
          },
        },
      ]);
      return prev;
    });
  }, [tr]);

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

  const showHelp = useCallback((text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHelpContent(text);
  }, []);

  const dismissFavHint = useCallback(() => {
    setFavHintSeen(true);
    AsyncStorage.setItem(FAV_HINT_KEY, 'true').catch(() => {});
  }, []);

  const dismissHelp = useCallback(() => setHelpContent(null), []);

  const gotItLabel = lang === 'ar' ? 'حسناً' : (lang === 'ur' || lang === 'fa') ? 'ٹھیک ہے' : 'Got it';

  return (
    <View style={{ flex: 1 }}>
      {selectedCategory ? (
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
          showHelp={showHelp}
          athkarLang={athkarLang}
          setAthkarLang={setAthkarLang}
        />
      ) : (
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
          favourites={favourites}
          onLongPress={toggleFavourite}
          sortedCategories={sortedCategories}
          showHelp={showHelp}
          favHintSeen={favHintSeen}
          onFavHintDismiss={dismissFavHint}
        />
      )}

      <Modal
        visible={!!helpContent}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissHelp}
      >
        <Pressable style={styles.helpBackdrop} onPress={dismissHelp}>
          <Pressable
            style={[styles.helpCard, { backgroundColor: isDark ? '#0e2b1a' : '#ffffff', borderColor: C.tint }]}
            onPress={() => {}}
          >
            <View style={[styles.helpBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.helpText, { color: C.text, textAlign: isRtl ? 'right' : 'left', fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_400Regular' }]}>
              {helpContent ?? ''}
            </Text>
            <Pressable
              onPress={dismissHelp}
              style={({ pressed }) => [styles.helpDismiss, { backgroundColor: C.tint, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.helpDismissText, { color: C.tintText }]}>{gotItLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  favourites: string[];
  onLongPress: (cat: AthkarCategory) => void;
  sortedCategories: AthkarCategory[];
  showHelp: (text: string) => void;
  favHintSeen: boolean;
  onFavHintDismiss: () => void;
}

function GridScreen({ lang, isRtl, tr, C, topInset, bottomInset, displayMode, onDisplayMode, onSelect, favourites, onLongPress, sortedCategories, showHelp, favHintSeen, onFavHintDismiss }: GridProps) {
  const NUM_COLS = 4;
  const rows: { cat: AthkarCategory; gIdx: number }[][] = [];
  for (let i = 0; i < sortedCategories.length; i += NUM_COLS) {
    rows.push(sortedCategories.slice(i, i + NUM_COLS).map((cat, j) => ({ cat, gIdx: i + j })));
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.segmentRow, { flex: 1, backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); onDisplayMode('arabic'); }}
              style={[styles.segmentBtn, displayMode === 'arabic' && { backgroundColor: C.tint }]}
            >
              <Ionicons name="text" size={13} color={displayMode === 'arabic' ? C.tintText : C.textMuted} />
              <Text style={[styles.segmentLabel, { color: displayMode === 'arabic' ? C.tintText : C.textMuted }]}>
                {tr.athkar_mode_arabic}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); onDisplayMode('full'); }}
              style={[styles.segmentBtn, displayMode === 'full' && { backgroundColor: C.tint }]}
            >
              <Ionicons name="language" size={13} color={displayMode === 'full' ? C.tintText : C.textMuted} />
              <Text style={[styles.segmentLabel, { color: displayMode === 'full' ? C.tintText : C.textMuted }]}>
                {tr.athkar_mode_transliterated}
              </Text>
            </Pressable>
          </View>
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_toggle ?? '')} C={C} />
        </View>
      </View>

      {!favHintSeen && (
        <View style={[styles.favHintBanner, { backgroundColor: C.backgroundCard }]}>
          <Text style={[styles.favHintText, { color: C.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
            {(tr as any).athkar_fav_hint ?? ''}
          </Text>
          <Pressable onPress={onFavHintDismiss} hitSlop={12}>
            <Ionicons name="close" size={16} color={C.textMuted} />
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.gridContainer, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={[styles.gridRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {row.map(({ cat }) => (
              <GridCell
                key={cat.id}
                cat={cat}
                lang={lang}
                isRtl={isRtl}
                tr={tr}
                C={C}
                onPress={onSelect}
                isFavourite={favourites.includes(cat.id)}
                onLongPress={onLongPress}
              />
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
  isFavourite: boolean;
  onLongPress: (cat: AthkarCategory) => void;
}

function GridCell({ cat, lang, isRtl, tr, C, onPress, isFavourite, onLongPress }: CellProps) {
  const nameKey = cat.nameKey as any;
  const name = (tr as any)[nameKey] ?? nameKey;

  return (
    <Pressable
      onPress={() => onPress(cat)}
      onLongPress={() => onLongPress(cat)}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: isFavourite ? GOLD + '1A' : C.backgroundCard,
          borderColor: isFavourite ? GOLD : C.separator,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {isFavourite && (
        <View style={styles.favBadge}>
          <Text style={styles.favStar}>⭐</Text>
        </View>
      )}
      <MaterialCommunityIcons name={cat.icon as any} size={28} color={isFavourite ? GOLD : C.tint} />
      <Text
        style={[
          styles.cellLabel,
          {
            color: isFavourite ? GOLD : C.text,
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
  showHelp: (text: string) => void;
  athkarLang: Lang;
  setAthkarLang: (l: Lang) => void;
}

function ReaderScreen({
  category, lang, isRtl, tr, C,
  topInset, bottomInset, readerRef,
  counts, getCount, isDone, onTap, onBack, onReset,
  displayMode, showHelp, athkarLang, setAthkarLang,
}: ReaderProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const athkarRtl = isRtlLang(athkarLang);

  useEffect(() => {
    console.log('Athkar lang selector mounted:', athkarLang);
    console.log('Available languages:', Object.keys(i18n));
  }, [athkarLang]);

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
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_language ?? '')} C={C} />
          <LangToggle />
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
          </Pressable>
          <AthkarHelpBtn onPress={() => showHelp((tr as any).help_athkar_counter ?? '')} C={C} />
        </View>
      </View>

      <View style={[styles.progressRow, { paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundCard, flex: 1 }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.tint }, progressStyle]} />
        </View>
        <Text style={[styles.progressLabel, { color: C.textMuted }]}>{doneCount}/{total}</Text>
      </View>

      {displayMode === 'full' && (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
          style={({ pressed }) => [
            styles.athkarLangDropdown,
            { backgroundColor: C.backgroundCard, borderColor: C.separator, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Ionicons name="language-outline" size={15} color={C.tint} />
          <Text style={[styles.athkarLangDropdownText, { color: C.text, fontFamily: athkarRtl ? 'Amiri_400Regular' : 'Inter_600SemiBold' }]}>
            {LANG_META[athkarLang]?.native ?? athkarLang}
          </Text>
          <Text style={[styles.athkarLangDropdownLabel, { color: C.textMuted }]}>
            {LANG_META[athkarLang]?.label ?? ''}
          </Text>
          <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ marginLeft: 'auto' }} />
        </Pressable>
      )}

      <FlatList
        ref={readerRef}
        data={category.adhkar}
        keyExtractor={(_, i) => String(i)}
        extraData={athkarLang}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: dhikr, index }) => {
          const done = isDone(category.id, index, dhikr.count);
          const cur = getCount(category.id, index);
          const translation = (i18n[athkarLang] as any)?.[dhikr.translationKey] ?? '';

          return (
            <DhikrCard
              dhikr={dhikr}
              index={index}
              done={done}
              cur={cur}
              translation={translation}
              isRtl={isRtl}
              translationRtl={athkarRtl}
              C={C}
              displayMode={displayMode}
              onTap={() => onTap(category, dhikr, index)}
              showHelp={showHelp}
            />
          );
        }}
      />

      <Modal
        visible={showLangPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowLangPicker(false)}>
          <Pressable
            style={[styles.pickerSheet, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: C.separator }]}>
              <Text style={[styles.pickerTitle, { color: C.text }]}>
                {(tr as any).help_athkar_language ? ((isRtl ? 'لغة الترجمة' : 'Translation language')) : 'Translation language'}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(LANG_META) as Lang[]).map(l => {
                const active = l === athkarLang;
                const rtl = isRtlLang(l);
                return (
                  <Pressable
                    key={l}
                    onPress={() => { Haptics.selectionAsync(); setAthkarLang(l); setShowLangPicker(false); }}
                    style={({ pressed }) => [
                      styles.pickerRow,
                      { borderBottomColor: C.separator, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerNative, { color: C.text, fontFamily: rtl ? 'Amiri_400Regular' : 'Inter_600SemiBold' }]}>
                        {LANG_META[l]?.native ?? l}
                      </Text>
                      <Text style={[styles.pickerLang, { color: C.textMuted }]}>
                        {LANG_META[l]?.label ?? l}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={C.tint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  translationRtl: boolean;
  C: any;
  displayMode: 'arabic' | 'full';
  onTap: () => void;
  showHelp: (text: string) => void;
}

function DhikrCard({ dhikr, index, done, cur, translation, isRtl, translationRtl, C, displayMode, onTap, showHelp }: CardProps) {
  const hasHelpNote = DHIKR_HELP_KEYS.has(dhikr.translationKey);
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
          {hasHelpNote && !!translation && (
            <AthkarHelpBtn onPress={() => showHelp(translation)} C={C} />
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
              textAlign: translationRtl ? 'right' : 'left',
              writingDirection: translationRtl ? 'rtl' : 'ltr',
              fontFamily: translationRtl ? 'Amiri_400Regular' : 'Inter_400Regular',
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
  favBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  favStar: {
    fontSize: 10,
  },
  favHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  favHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  helpCard: {
    width: '100%', borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  helpBar: { height: 4 },
  helpText: { fontSize: 14, lineHeight: 22, padding: 20, paddingBottom: 12 },
  helpDismiss: {
    margin: 16, marginTop: 4, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center',
  },
  helpDismissText: { fontSize: 14, fontWeight: '700' },
  athkarLangDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  athkarLangDropdownText: { fontSize: 14, fontWeight: '600' },
  athkarLangDropdownLabel: { fontSize: 12, opacity: 0.6 },
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerSheet: {
    width: '88%', maxHeight: 420, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerNative: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  pickerLang: { fontSize: 12 },
});
