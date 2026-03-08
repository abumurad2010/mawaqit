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

const ALL_LANGS: Array<{ code: string; native: string; label: string; rtl?: boolean }> = [
  { code: 'ar', native: 'العربية', label: 'Arabic', rtl: true },
  { code: 'en', native: 'English',           label: 'English' },
  { code: 'fr', native: 'Français',          label: 'French' },
  { code: 'tr', native: 'Türkçe',            label: 'Turkish' },
  { code: 'ur', native: 'اردو',              label: 'Urdu',   rtl: true },
  { code: 'fa', native: 'فارسی',             label: 'Farsi',  rtl: true },
  { code: 'id', native: 'Indonesia',         label: 'Indonesian' },
  { code: 'ms', native: 'Melayu',            label: 'Malay' },
  { code: 'bn', native: 'বাংলা',             label: 'Bengali' },
];

type Session = 'morning' | 'evening';

const STORAGE_KEY = 'athkar_state';
const LANG_KEY = 'athkar_display_lang';

interface AthkarState {
  date: string;
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
  const [athkarLang, setAthkarLang] = useState<string>('ar');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: AthkarState = JSON.parse(raw);
          if (saved.date === todayStr()) setState(saved);
        }
        const savedLang = await AsyncStorage.getItem(LANG_KEY);
        if (savedLang) setAthkarLang(savedLang);
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

  const selectLang = useCallback(async (code: string) => {
    Haptics.selectionAsync();
    setAthkarLang(code);
    try { await AsyncStorage.setItem(LANG_KEY, code); } catch {}
  }, []);

  const dhikrList = ATHKAR[session];
  const counts = session === 'morning' ? state.morningCounts : state.eveningCounts;

  const getDhikrCount = (d: Dhikr) => counts[d.id] ?? 0;
  const isDhikrDone = (d: Dhikr) => getDhikrCount(d) >= d.count;

  const totalDone = dhikrList.filter(d => isDhikrDone(d)).length;
  const progress = totalDone / dhikrList.length;
  const allDone = progress >= 1;

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

  const isArabicOnly = athkarLang === 'ar';
  const selectedLangInfo = ALL_LANGS.find(l => l.code === athkarLang);
  const isSelectedRtl = !!selectedLangInfo?.rtl;

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
        {/* Left: bell + language dropdown */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowNotifModal(true); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="notifications-outline" size={18} color={accentColor} />
          </Pressable>

          {/* Language pull-down button */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowLangDropdown(v => !v); }}
            style={({ pressed }) => [
              styles.langDropBtn,
              { backgroundColor: C.surface, borderColor: accentColor + '44', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[
              styles.langDropBtnText,
              {
                color: accentColor,
                fontFamily: selectedLangInfo?.rtl ? 'Amiri_400Regular' : SERIF_EN,
              },
            ]}>
              {selectedLangInfo?.native ?? 'العربية'}
            </Text>
            <Ionicons
              name={showLangDropdown ? 'chevron-up' : 'chevron-down'}
              size={11}
              color={accentColor}
            />
          </Pressable>
        </View>

        <AppLogo />
        <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end', flexDirection: 'row' }]}>
          <LangToggle />
          <ThemeToggle />
        </View>
      </View>

      {/* Language dropdown panel — floats below the bell row */}
      {showLangDropdown && (
        <>
          {/* Invisible backdrop to close on outside tap */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowLangDropdown(false)}
          />
          <View style={[
            styles.langDropPanel,
            {
              top: topInset + 50,
              left: 16,
              backgroundColor: C.backgroundCard,
              borderColor: C.separator,
              shadowColor: isDark ? '#000' : '#333',
            },
          ]}>
            {ALL_LANGS.map((l, i) => {
              const active = l.code === athkarLang;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => { selectLang(l.code); setShowLangDropdown(false); }}
                  style={({ pressed }) => [
                    styles.langDropItem,
                    {
                      backgroundColor: active ? accentColor + '18' : 'transparent',
                      borderBottomWidth: i < ALL_LANGS.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: C.separator,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[
                    styles.langDropItemNative,
                    {
                      color: active ? accentColor : C.text,
                      fontFamily: l.rtl ? 'Amiri_400Regular' : SERIF_EN,
                      fontWeight: active ? '700' : '400',
                    },
                  ]}>
                    {l.native}
                  </Text>
                  <Text style={[styles.langDropItemLabel, { color: C.textMuted }]}>
                    {l.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={14} color={accentColor} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Session toggle + Controls */}
      <View style={[styles.sessionBar, { paddingHorizontal: 16 }]}>
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
            onPress={handleReset}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={C.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressWrap, { paddingHorizontal: 16, marginBottom: 6 }]}>
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
          const virtue = getDhikrVirtue(d, athkarLang === 'ar' ? 'ar' : athkarLang);
          const expanded = expandedVirtue === d.id;
          const tapHintLang = athkarLang;
          const cardIsRtl = isRtl;

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
                <View style={[styles.cardHeader, { flexDirection: cardIsRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.dhikrIndex, { backgroundColor: done ? accentColor : C.backgroundSecond }]}>
                    <Text style={[styles.dhikrIndexText, { color: done ? '#fff' : C.textMuted }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.sourceText, { color: C.textMuted, fontFamily: cardIsRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                    {isAr ? d.source : d.sourceEn}
                  </Text>
                  {done && (
                    <Animated.View entering={ZoomIn.duration(200)}>
                      <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                    </Animated.View>
                  )}
                </View>

                {/* Arabic text — always shown */}
                <Text style={[
                  styles.dhikrArabic,
                  { fontSize: 20 * fontScale, lineHeight: 38 * fontScale, color: done ? (isDark ? accentColor + 'cc' : accentColor) : C.text },
                ]}>
                  {d.arabic}
                </Text>

                {/* Transliteration — shown when non-Arabic lang selected */}
                {!isArabicOnly && (
                  <Text style={[
                    styles.dhikrTranslit,
                    { fontSize: 12 * fontScale, lineHeight: 20 * fontScale, color: done ? accentColor + 'aa' : C.textSecond },
                  ]}>
                    {d.transliteration}
                  </Text>
                )}

                {/* Meaning/Translation — shown when non-Arabic lang selected */}
                {!isArabicOnly && (
                  <Text style={[
                    styles.dhikrMeaning,
                    {
                      fontSize: 13 * fontScale,
                      lineHeight: 21 * fontScale,
                      color: done ? (isDark ? accentColor + 'cc' : accentColor) : C.text,
                      fontFamily: isSelectedRtl ? 'Amiri_400Regular' : SERIF_EN,
                      textAlign: isSelectedRtl ? 'right' : 'left',
                    },
                  ]}>
                    {getDhikrTranslation(d, athkarLang)}
                  </Text>
                )}

                {/* Footer: count + virtue toggle */}
                <View style={[styles.cardFooter, { flexDirection: cardIsRtl ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.counter, { backgroundColor: done ? accentColor : C.backgroundSecond, borderColor: done ? accentColor : C.separator }]}>
                    <Text style={[styles.counterText, { color: done ? '#fff' : C.text }]}>
                      {cur}/{d.count}
                    </Text>
                  </View>

                  {!done && (
                    <Text style={[styles.tapHint, { color: C.textMuted, fontFamily: isSelectedRtl ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {TAP_HINT[tapHintLang] ?? TAP_HINT['en']}
                    </Text>
                  )}

                  {virtue && (
                    <Pressable
                      onPress={() => { Haptics.selectionAsync(); setExpandedVirtue(expanded ? null : d.id); }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    >
                      <Ionicons name={expanded ? 'star' : 'star-outline'} size={16} color={accentColor} />
                    </Pressable>
                  )}
                </View>

                {virtue && expanded && (
                  <Animated.View entering={FadeIn.duration(250)} style={[styles.virtueBox, { backgroundColor: accentColor + '15', borderColor: accentColor + '33' }]}>
                    <Ionicons name="sparkles-outline" size={13} color={accentColor} />
                    <Text style={[styles.virtueText, { color: accentColor, fontFamily: (isAr || isSelectedRtl) ? 'Amiri_400Regular' : SERIF_EN }]}>
                      {virtue}
                    </Text>
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua ?? 'صلى الله على سيدنا محمد'}
        </Text>
      </ScrollView>

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

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  langDropBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
    maxWidth: 110,
  },
  langDropBtnText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  langDropPanel: {
    position: 'absolute',
    zIndex: 999,
    elevation: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minWidth: 160,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  langDropItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  langDropItemNative: { fontSize: 14 },
  langDropItemLabel: { fontSize: 11, fontFamily: 'System' },

  completedBanner: {
    marginHorizontal: 14, marginBottom: 8, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  completedText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  card: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 8,
  },
  cardHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dhikrIndex: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dhikrIndexText: { fontSize: 11, fontWeight: '700' },
  sourceText: { flex: 1, fontSize: 10, textAlign: 'left' },

  dhikrArabic: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  dhikrTranslit: {
    fontFamily: 'serif',
    textAlign: 'left',
    fontStyle: 'italic',
    opacity: 0.75,
  },
  dhikrMeaning: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 6,
  },

  cardFooter: { alignItems: 'center', gap: 10, marginTop: 2 },
  counter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  counterText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tapHint: { flex: 1, fontSize: 11 },
  virtueBox: { flexDirection: 'row', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  virtueText: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  dua: { fontSize: 16, textAlign: 'center', marginTop: 12 },

  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  notifCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', padding: 14, gap: 12 },
  notifRow: { alignItems: 'center', gap: 12 },
  notifLabel: { fontSize: 15, fontWeight: '700' },
  notifSub: { fontSize: 12 },
  timeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  timeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  dayChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifExplain: { fontSize: 12, lineHeight: 18 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
});
