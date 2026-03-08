import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  FadeInDown, FadeIn, ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SERIF_EN } from '@/constants/typography';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t, isRtlLang } from '@/constants/i18n';
import ATHKAR, { Dhikr, getDhikrTranslation, getDhikrVirtue } from '@/lib/athkar';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';

const FONT_STEPS = ['small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;
type FontStep = typeof FONT_STEPS[number];

const TAP_HINT: Record<string, string> = {
  ar: 'اضغط للتسبيح',
  en: 'tap to count',
  fr: 'appuyer pour compter',
  tr: 'saymak için dokun',
  ur: 'گننے کے لیے ٹیپ کریں',
  fa: 'برای شمارش ضربه بزنید',
  id: 'ketuk untuk menghitung',
  ms: 'ketuk untuk mengira',
  bn: 'গণনার জন্য ট্যাপ করুন',
};

const ATHKAR_LANGS: Array<{ code: string; native: string; label: string; rtl?: boolean }> = [
  { code: 'en', native: 'English',           label: 'English' },
  { code: 'fr', native: 'Français',          label: 'French' },
  { code: 'tr', native: 'Türkçe',            label: 'Turkish' },
  { code: 'ur', native: 'اردو',              label: 'Urdu',   rtl: true },
  { code: 'fa', native: 'فارسی',             label: 'Farsi',  rtl: true },
  { code: 'id', native: 'Bahasa Indonesia',  label: 'Indonesian' },
  { code: 'ms', native: 'Bahasa Melayu',     label: 'Malay' },
  { code: 'bn', native: 'বাংলা',             label: 'Bengali' },
];

type Session = 'morning' | 'evening';
type DisplayMode = 'arabic' | 'transliteration' | 'translation';

const STORAGE_KEY = 'athkar_state';
const NOTIF_MORNING_ID = 'athkar_morning';
const NOTIF_EVENING_ID = 'athkar_evening';

interface AthkarState {
  date: string; // YYYY-MM-DD
  morningCounts: Record<string, number>;
  eveningCounts: Record<string, number>;
  morningDone: boolean;
  eveningDone: boolean;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function freshState(): AthkarState {
  return {
    date: todayStr(),
    morningCounts: {},
    eveningCounts: {},
    morningDone: false,
    eveningDone: false,
  };
}

export default function AthkarScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, colors: C, fontSize, translitLang, updateSettings } = useApp();
  const tr = t(lang);
  const isRtl = isRtlLang(lang);
  const isAr = lang === 'ar';

  const fsIdx = FONT_STEPS.indexOf(fontSize as FontStep);
  const fontScale = [0.80, 1.0, 1.22, 1.45, 1.70][fsIdx] ?? 1.0;
  const changeFontSize = (dir: 1 | -1) => {
    const next = fsIdx + dir;
    if (next < 0 || next >= FONT_STEPS.length) return;
    Haptics.selectionAsync();
    updateSettings({ fontSize: FONT_STEPS[next] });
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const [session, setSession] = useState<Session>(() => {
    const h = new Date().getHours();
    return h >= 15 ? 'evening' : 'morning';
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>('arabic');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [state, setState] = useState<AthkarState>(freshState());
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [morningNotif, setMorningNotif] = useState(false);
  const [eveningNotif, setEveningNotif] = useState(false);
  const [morningTime, setMorningTime] = useState('05:30');
  const [eveningTime, setEveningTime] = useState('16:00');
  const [morningDays, setMorningDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [eveningDays, setEveningDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [expandedVirtue, setExpandedVirtue] = useState<string | null>(null);
  const [completedAnim, setCompletedAnim] = useState<Session | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: AthkarState = JSON.parse(raw);
          if (saved.date === todayStr()) {
            setState(saved);
          }
        }
        const ns = await AsyncStorage.getItem('athkar_notif_settings');
        if (ns) {
          const n = JSON.parse(ns);
          setMorningNotif(n.morningNotif ?? false);
          setEveningNotif(n.eveningNotif ?? false);
          setMorningTime(n.morningTime ?? '05:30');
          setEveningTime(n.eveningTime ?? '16:00');
          setMorningDays(n.morningDays ?? [0,1,2,3,4,5,6]);
          setEveningDays(n.eveningDays ?? [0,1,2,3,4,5,6]);
        }
      } catch {}
    })();
  }, []);

  const save = useCallback(async (next: AthkarState) => {
    setState(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const dhikrList = ATHKAR[session];
  const counts = session === 'morning' ? state.morningCounts : state.eveningCounts;

  const getDhikrCount = (d: Dhikr) => counts[d.id] ?? 0;
  const isDhikrDone = (d: Dhikr) => getDhikrCount(d) >= d.count;

  const totalDone = dhikrList.filter(d => isDhikrDone(d)).length;
  const progress = totalDone / dhikrList.length;
  const allDone = progress >= 1;

  // Check completion
  useEffect(() => {
    if (allDone) {
      const key = session === 'morning' ? 'morningDone' : 'eveningDone';
      if (!state[key]) {
        const next = { ...state, [key]: true };
        save(next);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCompletedAnim(session);
        setTimeout(() => setCompletedAnim(null), 3000);
      }
    }
  }, [allDone, session]);

  const handleTap = useCallback((d: Dhikr) => {
    if (isDhikrDone(d)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = session === 'morning' ? 'morningCounts' : 'eveningCounts';
    const cur = counts[d.id] ?? 0;
    const next = { ...state, [key]: { ...counts, [d.id]: cur + 1 } };
    save(next);
  }, [session, counts, state]);

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (session === 'morning') {
      save({ ...state, morningCounts: {}, morningDone: false });
    } else {
      save({ ...state, eveningCounts: {}, eveningDone: false });
    }
  };

  // Notifications
  const scheduleNotifications = async (
    mOn: boolean, eOn: boolean,
    mTime: string, eTime: string,
    mDays: number[], eDays: number[],
  ) => {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    for (const n of scheduled) {
      if (n.identifier.startsWith('athkar_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
      }
    }
    if (mOn) {
      const [h, m] = mTime.split(':').map(Number);
      for (const day of mDays) {
        await Notifications.scheduleNotificationAsync({
          identifier: `athkar_morning_${day}`,
          content: {
            title: isAr ? 'أذكار الصباح' : 'Morning Athkar',
            body: isAr ? 'وقت أذكار الصباح ☀️' : 'Time for your morning remembrances ☀️',
            sound: true,
          },
          trigger: { weekday: day + 1, hour: h, minute: m, repeats: true } as any,
        }).catch(() => {});
      }
    }
    if (eOn) {
      const [h, m] = eTime.split(':').map(Number);
      for (const day of eDays) {
        await Notifications.scheduleNotificationAsync({
          identifier: `athkar_evening_${day}`,
          content: {
            title: isAr ? 'أذكار المساء' : 'Evening Athkar',
            body: isAr ? 'وقت أذكار المساء 🌙' : 'Time for your evening remembrances 🌙',
            sound: true,
          },
          trigger: { weekday: day + 1, hour: h, minute: m, repeats: true } as any,
        }).catch(() => {});
      }
    }
  };

  const handleSaveNotif = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isAr ? 'الإذن مطلوب' : 'Permission required',
          isAr ? 'يُرجى السماح بالإشعارات في الإعدادات' : 'Please allow notifications in Settings',
        );
        return;
      }
    }
    await scheduleNotifications(morningNotif, eveningNotif, morningTime, eveningTime, morningDays, eveningDays);
    try {
      await AsyncStorage.setItem('athkar_notif_settings', JSON.stringify({
        morningNotif, eveningNotif, morningTime, eveningTime, morningDays, eveningDays,
      }));
    } catch {}
    setShowNotifModal(false);
  };

  const getLabel = (d: Dhikr) => {
    if (displayMode === 'transliteration') return d.transliteration;
    if (displayMode === 'translation') return getDhikrTranslation(d, translitLang);
    return d.arabic;
  };

  const cycleMode = () => {
    const modes: DisplayMode[] = ['arabic', 'transliteration', 'translation'];
    const idx = modes.indexOf(displayMode);
    setDisplayMode(modes[(idx + 1) % modes.length]);
    Haptics.selectionAsync();
  };

  const modeLabel = () => {
    if (displayMode === 'transliteration') return isAr ? 'نطق' : 'Latin';
    if (displayMode === 'translation') return isAr ? 'ترجمة' : tr.translate ?? 'Translation';
    return isAr ? 'عربي' : 'Arabic';
  };

  const isMorning = session === 'morning';
  const accentColor = isMorning ? (isDark ? '#f5a623' : '#e8891a') : (isDark ? '#7b9ee8' : '#4a6fa8');
  const bgGrad: [string, string] = isMorning
    ? (isDark ? ['#1a1200', '#0d0900'] : ['#fffbf0', '#fff8e7'])
    : (isDark ? ['#0a0e1a', '#050810'] : ['#f0f4ff', '#e8eeff']);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient colors={bgGrad} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6, paddingHorizontal: 16 }]}>
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowNotifModal(true); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="notifications-outline" size={18} color={accentColor} />
          </Pressable>
        </View>
        <AppLogo />
        <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end', flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <LangToggle />
          <ThemeToggle />
        </View>
      </View>

      {/* Session toggle + Progress */}
      <View style={[styles.sessionBar, { paddingHorizontal: 16 }]}>
        {/* Toggle */}
        <View style={[styles.sessionToggle, { backgroundColor: C.backgroundSecond }]}>
          {(['morning', 'evening'] as Session[]).map((s) => {
            const active = session === s;
            return (
              <Pressable
                key={s}
                onPress={() => { Haptics.selectionAsync(); setSession(s); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}
                style={[styles.sessionTab, active && { backgroundColor: accentColor, borderRadius: 10 }]}
              >
                <Text style={{ fontSize: 16 }}>
                  {s === 'morning' ? '☀️' : '🌙'}
                </Text>
                <Text style={[styles.sessionTabText, { color: active ? '#fff' : C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                  {s === 'morning' ? (isAr ? 'صباح' : 'Morning') : (isAr ? 'مساء' : 'Evening')}
                </Text>
                {(s === 'morning' ? state.morningDone : state.eveningDone) && (
                  <Ionicons name="checkmark-circle" size={14} color={active ? '#fff' : accentColor} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={() => changeFontSize(-1)}
            disabled={fsIdx === 0}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: fsIdx === 0 ? 0.3 : pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700', fontFamily: 'Amiri_700Bold' }}>A−</Text>
          </Pressable>
          <Pressable
            onPress={() => changeFontSize(1)}
            disabled={fsIdx === FONT_STEPS.length - 1}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: fsIdx === FONT_STEPS.length - 1 ? 0.3 : pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: accentColor, fontSize: 15, fontWeight: '700', fontFamily: 'Amiri_700Bold' }}>A+</Text>
          </Pressable>
          <Pressable
            onPress={cycleMode}
            style={({ pressed }) => [styles.modeBtn, { backgroundColor: C.surface, borderColor: accentColor + '44', opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor }}>{modeLabel()}</Text>
          </Pressable>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={C.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressWrap, { paddingHorizontal: 16, marginBottom: 8 }]}>
        <View style={[styles.progressTrack, { backgroundColor: C.backgroundSecond }]}>
          <Animated.View style={[
            styles.progressFill,
            { backgroundColor: accentColor, width: `${Math.round(progress * 100)}%` as any },
          ]} />
        </View>
        <Text style={[styles.progressText, { color: C.textMuted, fontFamily: SERIF_EN }]}>
          {totalDone}/{dhikrList.length}
        </Text>
      </View>

      {/* Sticky language bar — always visible, same style as Quran transliteration */}
      {displayMode !== 'arabic' && (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowLangPicker(true); }}
          style={({ pressed }) => [
            styles.langBar,
            {
              backgroundColor: C.backgroundCard,
              borderBottomColor: C.separator,
              borderTopColor: C.separator,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name="language-outline" size={14} color={accentColor} />
          <Text style={[styles.langBarNative, {
            color: C.text,
            fontFamily: ATHKAR_LANGS.find(l => l.code === translitLang)?.rtl ? 'Amiri_400Regular' : SERIF_EN,
          }]}>
            {ATHKAR_LANGS.find(l => l.code === translitLang)?.native ?? translitLang}
          </Text>
          <Text style={[styles.langBarLabel, { color: C.textMuted, fontFamily: SERIF_EN, flex: 1 }]}>
            {ATHKAR_LANGS.find(l => l.code === translitLang)?.label ?? ''}
          </Text>
          <Ionicons name="chevron-down" size={13} color={C.textMuted} />
        </Pressable>
      )}

      {/* Completion banner */}
      {allDone && (
        <Animated.View entering={ZoomIn.duration(400)} style={[styles.completedBanner, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
          <Text style={[styles.completedText, { color: accentColor, fontFamily: 'Amiri_700Bold' }]}>
            {isMorning
              ? (isAr ? '✨ أتممت أذكار الصباح ✨' : '✨ Morning Athkar Complete ✨')
              : (isAr ? '✨ أتممت أذكار المساء ✨' : '✨ Evening Athkar Complete ✨')}
          </Text>
        </Animated.View>
      )}

      {/* Dhikr list */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 80, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {dhikrList.map((d, idx) => {
          const done = isDhikrDone(d);
          const cur = getDhikrCount(d);
          const virtue = getDhikrVirtue(d, translitLang);
          const expanded = expandedVirtue === d.id;
          const isArabicMode = displayMode === 'arabic';

          return (
            <Animated.View key={d.id} entering={FadeInDown.delay(idx * 40).duration(350)}>
              <Pressable
                onPress={() => handleTap(d)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: done
                      ? (isDark ? accentColor + '18' : accentColor + '12')
                      : C.backgroundCard,
                    borderColor: done ? accentColor + '55' : C.separator,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Top: number + source */}
                <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.dhikrIndex, { backgroundColor: done ? accentColor : C.backgroundSecond }]}>
                    <Text style={[styles.dhikrIndexText, { color: done ? '#fff' : C.textMuted }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.sourceText, { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                    {isAr ? d.source : d.sourceEn}
                  </Text>
                  {done && (
                    <Animated.View entering={ZoomIn.duration(200)}>
                      <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                    </Animated.View>
                  )}
                </View>

                {/* Main text */}
                <Text style={[
                  styles.dhikrText,
                  isArabicMode && [styles.dhikrArabic, { fontSize: 20 * fontScale, lineHeight: 38 * fontScale }],
                  !isArabicMode && [styles.dhikrLatin, { fontSize: 13 * fontScale, lineHeight: 22 * fontScale }],
                  { color: done ? (isDark ? accentColor + 'cc' : accentColor) : C.text },
                ]}>
                  {getLabel(d)}
                </Text>

                {/* Footer: count + virtue toggle */}
                <View style={[styles.cardFooter, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  {/* Counter */}
                  <View style={[styles.counter, { backgroundColor: done ? accentColor : C.backgroundSecond, borderColor: done ? accentColor : C.separator }]}>
                    <Text style={[styles.counterText, { color: done ? '#fff' : C.text }]}>
                      {cur}/{d.count}
                    </Text>
                  </View>

                  {/* Tap hint */}
                  {!done && (
                    <Text style={[styles.tapHint, { color: C.textMuted, fontFamily: (isRtl || ATHKAR_LANGS.find(l => l.code === translitLang)?.rtl) ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {TAP_HINT[displayMode === 'arabic' ? 'ar' : translitLang] ?? TAP_HINT['en']}
                    </Text>
                  )}

                  {/* Virtue toggle */}
                  {virtue && (
                    <Pressable
                      onPress={() => { Haptics.selectionAsync(); setExpandedVirtue(expanded ? null : d.id); }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    >
                      <Ionicons name={expanded ? 'star' : 'star-outline'} size={16} color={accentColor} />
                    </Pressable>
                  )}
                </View>

                {/* Virtue text */}
                {virtue && expanded && (
                  <Animated.View entering={FadeIn.duration(250)} style={[styles.virtueBox, { backgroundColor: accentColor + '15', borderColor: accentColor + '33' }]}>
                    <Ionicons name="sparkles-outline" size={13} color={accentColor} />
                    <Text style={[styles.virtueText, { color: accentColor, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {virtue}
                    </Text>
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Bottom dua */}
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua ?? 'صلى الله على سيدنا محمد'}
        </Text>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLangPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <Pressable style={styles.langBackdrop} onPress={() => setShowLangPicker(false)}>
          <Pressable
            style={[styles.langSheet, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.langSheetHeader, { borderBottomColor: C.separator }]}>
              <Text style={[styles.langSheetTitle, { color: C.text, fontFamily: SERIF_EN }]}>
                {isAr ? 'لغة الترجمة' : 'Translation language'}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ATHKAR_LANGS.map(l => {
                const active = l.code === translitLang;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateSettings({ translitLang: l.code as any });
                      setShowLangPicker(false);
                    }}
                    style={({ pressed }) => [
                      styles.langRow,
                      { borderBottomColor: C.separator, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langNative, { color: C.text, fontFamily: l.rtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                        {l.native}
                      </Text>
                      <Text style={[styles.langLabel, { color: C.textMuted, fontFamily: SERIF_EN }]}>
                        {l.label}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={accentColor} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotifModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: C.background }]}>
          <LinearGradient colors={bgGrad} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
              {isAr ? 'تنبيهات الأذكار' : 'Athkar Reminders'}
            </Text>
            <Pressable onPress={() => setShowNotifModal(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Morning */}
            <View style={[styles.notifCard, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
              <View style={[styles.notifRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 22 }}>☀️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
                    {isAr ? 'أذكار الصباح' : 'Morning Athkar'}
                  </Text>
                  <Text style={[styles.notifSub, { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                    {isAr ? 'بعد صلاة الفجر' : 'After Fajr prayer'}
                  </Text>
                </View>
                <Switch
                  value={morningNotif}
                  onValueChange={setMorningNotif}
                  thumbColor={morningNotif ? '#f5a623' : '#ccc'}
                  trackColor={{ false: C.separator, true: '#f5a62366' }}
                />
              </View>
              {morningNotif && (
                <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 12 }}>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.timeLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {isAr ? 'الأيام' : 'Days'}
                    </Text>
                    <View style={[styles.timeButtons, { flexWrap: 'wrap' }]}>
                      {(isAr
                        ? ['أح','إث','ثل','أر','خم','جم','سب']
                        : ['Su','Mo','Tu','We','Th','Fr','Sa']
                      ).map((label, dayIdx) => {
                        const sel = morningDays.includes(dayIdx);
                        return (
                          <Pressable
                            key={dayIdx}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setMorningDays(prev =>
                                sel ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx].sort()
                              );
                            }}
                            style={[styles.dayChip, {
                              backgroundColor: sel ? '#f5a623' : C.backgroundSecond,
                              borderColor: sel ? '#f5a623' : C.separator,
                            }]}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sel ? '#fff' : C.textSecond }}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.timeLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {isAr ? 'الوقت' : 'Time'}
                    </Text>
                    <View style={styles.timeButtons}>
                      {['05:00', '05:30', '06:00', '06:30', '07:00'].map(tt => (
                        <Pressable
                          key={tt}
                          onPress={() => { Haptics.selectionAsync(); setMorningTime(tt); }}
                          style={[styles.timeChip, {
                            backgroundColor: morningTime === tt ? '#f5a623' : C.backgroundSecond,
                            borderColor: morningTime === tt ? '#f5a623' : C.separator,
                          }]}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: morningTime === tt ? '#fff' : C.textSecond }}>{tt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Evening */}
            <View style={[styles.notifCard, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
              <View style={[styles.notifRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 22 }}>🌙</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: C.text, fontFamily: 'Amiri_700Bold' }]}>
                    {isAr ? 'أذكار المساء' : 'Evening Athkar'}
                  </Text>
                  <Text style={[styles.notifSub, { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                    {isAr ? 'بعد صلاة العصر' : 'After Asr prayer'}
                  </Text>
                </View>
                <Switch
                  value={eveningNotif}
                  onValueChange={setEveningNotif}
                  thumbColor={eveningNotif ? '#7b9ee8' : '#ccc'}
                  trackColor={{ false: C.separator, true: '#7b9ee866' }}
                />
              </View>
              {eveningNotif && (
                <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 12 }}>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.timeLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {isAr ? 'الأيام' : 'Days'}
                    </Text>
                    <View style={[styles.timeButtons, { flexWrap: 'wrap' }]}>
                      {(isAr
                        ? ['أح','إث','ثل','أر','خم','جم','سب']
                        : ['Su','Mo','Tu','We','Th','Fr','Sa']
                      ).map((label, dayIdx) => {
                        const sel = eveningDays.includes(dayIdx);
                        return (
                          <Pressable
                            key={dayIdx}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setEveningDays(prev =>
                                sel ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx].sort()
                              );
                            }}
                            style={[styles.dayChip, {
                              backgroundColor: sel ? '#7b9ee8' : C.backgroundSecond,
                              borderColor: sel ? '#7b9ee8' : C.separator,
                            }]}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sel ? '#fff' : C.textSecond }}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.timeLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {isAr ? 'الوقت' : 'Time'}
                    </Text>
                    <View style={styles.timeButtons}>
                      {['15:30', '16:00', '16:30', '17:00', '17:30'].map(tt => (
                        <Pressable
                          key={tt}
                          onPress={() => { Haptics.selectionAsync(); setEveningTime(tt); }}
                          style={[styles.timeChip, {
                            backgroundColor: eveningTime === tt ? '#7b9ee8' : C.backgroundSecond,
                            borderColor: eveningTime === tt ? '#7b9ee8' : C.separator,
                          }]}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: eveningTime === tt ? '#fff' : C.textSecond }}>{tt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Explanation */}
            <Text style={[styles.notifExplain, { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : SERIF_EN, textAlign: isRtl ? 'right' : 'left' }]}>
              {isAr
                ? 'سيتم إرسال تذكير يومي في الوقت المحدد. يمكنك تغيير التوقيت من إعدادات الهاتف.'
                : 'A daily reminder will be sent at the selected time. You can change the time in your phone settings.'}
            </Text>

            <Pressable
              onPress={handleSaveNotif}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { color: '#fff' }]}>
                {isAr ? 'حفظ التذكيرات' : 'Save Reminders'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerActions: { gap: 6, alignItems: 'center' },

  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sessionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sessionToggle: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  sessionTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6 },
  sessionTabText: { fontSize: 13, fontWeight: '600' },
  controls: { gap: 6, alignItems: 'center' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  completedBanner: {
    marginHorizontal: 14, marginBottom: 8, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  completedText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  card: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10,
  },
  cardHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dhikrIndex: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dhikrIndexText: { fontSize: 11, fontWeight: '700' },
  sourceText: { flex: 1, fontSize: 10, textAlign: 'left' },
  dhikrText: { lineHeight: 28 },
  dhikrArabic: { fontSize: 20, fontFamily: 'Amiri_400Regular', textAlign: 'right', lineHeight: 38 },
  dhikrLatin: { fontSize: 13, lineHeight: 22 },
  cardFooter: { alignItems: 'center', gap: 10 },
  counter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  counterText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tapHint: { flex: 1, fontSize: 11 },
  virtueBox: { flexDirection: 'row', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  virtueText: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  dua: { fontSize: 16, textAlign: 'center', marginTop: 12 },
  langBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  langBarNative: { fontSize: 13, fontWeight: '600' },
  langBarLabel: { fontSize: 12, opacity: 0.6 },
  langBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  langSheet: {
    width: '88%', maxHeight: 400, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  langSheetHeader: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langSheetTitle: { fontSize: 16, fontWeight: '600' },
  langRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langNative: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  langLabel: { fontSize: 12 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  notifCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', padding: 14, gap: 12 },
  notifRow: { alignItems: 'center', gap: 12 },
  notifLabel: { fontSize: 15, fontWeight: '700' },
  notifSub: { fontSize: 12 },
  timeRow: { alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  timeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  timeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  dayChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifExplain: { fontSize: 12, lineHeight: 18 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
});