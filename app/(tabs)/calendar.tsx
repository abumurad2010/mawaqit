import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import PageBackground from '@/components/PageBackground';
import LocationModal from '@/components/LocationModal';
import { SERIF_EN } from '@/constants/typography';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  calculatePrayerTimes, formatTimeAtOffset,
  type PrayerTimes as PrayerTimesType,
} from '@/lib/prayer-times';
import {
  gregorianToHijri, hijriMonthName,
  getDaysInGregorianMonth, getFirstDayOfMonth,
} from '@/lib/hijri';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveJumaaOffset, getJumaaTime } from '@/lib/jumaa';

const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night',
  sunrise: 'weather-sunset-up',
  dhuhr: 'brightness-7',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night-partly-cloudy',
};

const GREGORIAN_MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const GREGORIAN_MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
];

const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_AR = ['أح','إث','ثل','أر','خم','جم','سب'];

function toArabicIndic(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, location, calcMethod, asrMethod, maghribOffset, locationUtcOffset, hijriAdjustment, colors, jumaaMode, jumaaOffsetMinutes, countryCode, locationMode } = useApp();
  const [showLocModal, setShowLocModal] = useState(false);
  const C = colors;
  const fw = C.fontWeightNormal;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<{ y: number; m: number; d: number }>({
    y: today.getFullYear(),
    m: today.getMonth() + 1,
    d: today.getDate(),
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesType | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // Compute prayer times for selected date
  useEffect(() => {
    if (!location) return;
    const d = new Date(selectedDate.y, selectedDate.m - 1, selectedDate.d);
    const times = calculatePrayerTimes({
      lat: location.lat,
      lng: location.lng,
      date: d,
      method: calcMethod,
      asrMethod,
      maghribOffset,
    });
    setPrayerTimes(times);
  }, [selectedDate, location, calcMethod, asrMethod, maghribOffset]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const daysInMonth = getDaysInGregorianMonth(viewYear, viewMonth);
    const cells: Array<{ day: number | null; hijri: { d: number; m: number } | null }> = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, hijri: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const shifted = new Date(viewYear, viewMonth - 1, d + (hijriAdjustment ?? 0));
      const h = gregorianToHijri(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
      cells.push({ day: d, hijri: { d: h.day, m: h.month } });
    }
    return cells;
  }, [viewYear, viewMonth, hijriAdjustment]);

  const goToPrevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    Haptics.selectionAsync();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDate({ y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() });
  };

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const isSelected = (d: number) =>
    d === selectedDate.d && viewMonth === selectedDate.m && viewYear === selectedDate.y;

  const monthName = isAr ? GREGORIAN_MONTHS_AR[viewMonth - 1] : GREGORIAN_MONTHS_EN[viewMonth - 1];
  const dayNames = isAr ? DAYS_AR : DAYS_EN;

  const PRAYER_ORDER: (keyof PrayerTimesType)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerLabels: Record<string, string> = {
    fajr: tr.fajr, sunrise: tr.sunrise, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha,
  };

  const selectedIsFriday = useMemo(
    () => new Date(selectedDate.y, selectedDate.m - 1, selectedDate.d).getDay() === 5,
    [selectedDate],
  );
  const jumaaDate = useMemo(() => {
    if (!selectedIsFriday || !prayerTimes) return null;
    const offsetMins = resolveJumaaOffset(jumaaMode, jumaaOffsetMinutes ?? 0, countryCode);
    return getJumaaTime(offsetMins, prayerTimes.dhuhr);
  }, [selectedIsFriday, prayerTimes, jumaaMode, jumaaOffsetMinutes, countryCode]);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <PageBackground />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 10, paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: 20 }]}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable
              onPress={goToToday}
              style={[styles.todayBtn, { backgroundColor: C.backgroundCard }]}
            >
              <Text style={[styles.todayBtnText, { color: C.tint }]}>
                {isAr ? 'اليوم' : 'Today'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowLocModal(true); }}
              style={[styles.iconBtn, { backgroundColor: C.backgroundCard }]}
            >
              <Ionicons name={locationMode === 'manual' ? 'location-outline' : 'locate'} size={19} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }}
              style={[styles.iconBtn, { backgroundColor: C.backgroundCard }]}
            >
              <Ionicons name="settings-outline" size={19} color={C.textSecond} />
            </Pressable>
          </View>
        </View>

        {/* Month navigation */}
        <View style={[styles.monthNav, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={goToPrevMonth} style={[styles.arrowBtn, { backgroundColor: C.backgroundCard }]}>
            <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={[styles.monthName, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
              {monthName} {isAr ? toArabicIndic(viewYear) : viewYear}
            </Text>
            <Text style={[styles.hijriMonthLabel, { color: C.tint }]}>
              {(() => {
                const s1 = new Date(viewYear, viewMonth - 1, 1 + (hijriAdjustment ?? 0));
                const s2 = new Date(viewYear, viewMonth - 1, getDaysInGregorianMonth(viewYear, viewMonth) + (hijriAdjustment ?? 0));
                const h1 = gregorianToHijri(s1.getFullYear(), s1.getMonth() + 1, s1.getDate());
                const h2 = gregorianToHijri(s2.getFullYear(), s2.getMonth() + 1, s2.getDate());
                const m1 = hijriMonthName(h1.month, lang);
                const m2 = hijriMonthName(h2.month, lang);
                const yr = h1.month !== h2.month
                  ? `${m1} – ${m2} ${isAr ? toArabicIndic(h2.year) : h2.year} هـ`
                  : `${m1} ${isAr ? toArabicIndic(h1.year) : h1.year} ${isAr ? 'هـ' : 'AH'}`;
                return yr;
              })()}
            </Text>
          </View>
          <Pressable onPress={goToNextMonth} style={[styles.arrowBtn, { backgroundColor: C.backgroundCard }]}>
            <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={20} color={C.tint} />
          </Pressable>
        </View>

        {/* Day headers */}
        <View style={[styles.dayHeaderRow, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {dayNames.map((d, i) => {
            const isFri = isAr ? i === 5 : i === 5;
            return (
              <View key={i} style={styles.dayHeaderCell}>
                <Text style={[styles.dayHeaderText, {
                  color: isFri ? C.tint : C.textMuted,
                  fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                }]}>
                  {d}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Calendar grid */}
        <View style={[styles.grid, { paddingHorizontal: 16, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {calendarDays.map((cell, idx) => {
            if (!cell.day) {
              return <View key={`empty-${idx}`} style={styles.cell} />;
            }
            const tod = isToday(cell.day);
            const sel = isSelected(cell.day);
            const isFriday = (getFirstDayOfMonth(viewYear, viewMonth) + cell.day - 1) % 7 === 5;
            return (
              <Pressable
                key={cell.day}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate({ y: viewYear, m: viewMonth, d: cell.day! });
                }}
                style={[
                  styles.cell,
                  sel && { backgroundColor: C.tint, borderRadius: 12 },
                  tod && !sel && { borderWidth: 1.5, borderColor: C.tint, borderRadius: 12 },
                ]}
              >
                <Text style={[styles.cellDay, {
                  color: sel ? C.tintText : tod ? C.tint : isFriday ? C.tint : C.text,
                  fontWeight: sel || tod ? '700' : fw,
                }]}>
                  {isAr ? toArabicIndic(cell.day) : cell.day}
                </Text>
                {cell.hijri && (
                  <Text style={[styles.cellHijri, {
                    color: sel ? 'rgba(255,255,255,0.8)' : C.textMuted,
                    fontWeight: fw,
                  }]}>
                    {isAr ? toArabicIndic(cell.hijri.d) : cell.hijri.d}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Prayer times for selected date */}
        {location ? (
          <View style={[styles.prayerSection, { paddingHorizontal: 16 }]}>
            <Text style={[styles.sectionTitle, {
              color: C.textSecond,
              fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
              textAlign: isAr ? 'right' : 'left',
            }]}>
              {isAr ? 'أوقات الصلاة' : 'Prayer Times'}
            </Text>
            <View style={[styles.prayerCard, { backgroundColor: isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)' }]}>
              {PRAYER_ORDER.map((key) => (
                <React.Fragment key={key}>
                  <View>
                    <View style={[styles.prayerRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.prayerLeft, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={PRAYER_ICONS[key] as any}
                          size={17} color={C.tint}
                        />
                        <Text style={[styles.prayerName, {
                          color: C.text,
                          fontWeight: fw,
                          fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                          fontSize: isAr ? 16 : 14,
                        }]}>
                          {prayerLabels[key]}
                        </Text>
                      </View>
                      <Text style={[styles.prayerTime, { color: C.textSecond, fontWeight: fw }]}>
                        {prayerTimes ? formatTimeAtOffset(prayerTimes[key], locationUtcOffset) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.rowDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
                  </View>
                  {key === 'dhuhr' && jumaaDate && (
                    <View>
                      <View style={[styles.prayerRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.prayerLeft, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="mosque" size={17} color={C.tint} />
                          <Text style={[styles.prayerName, {
                            color: C.tint,
                            fontWeight: fw,
                            fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                            fontSize: isAr ? 16 : 14,
                          }]}>
                            {tr.jumaa}
                          </Text>
                        </View>
                        <Text style={[styles.prayerTime, { color: C.tint, fontWeight: fw }]}>
                          {formatTimeAtOffset(jumaaDate, locationUtcOffset)}
                        </Text>
                      </View>
                      <View style={[styles.rowDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
                    </View>
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.noLocation, { paddingHorizontal: 16 }]}>
            <Ionicons name="location-outline" size={32} color={C.textMuted} />
            <Text style={[styles.noLocationText, { color: C.textMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN }]}>
              {isAr ? 'يرجى تحديد الموقع لعرض أوقات الصلاة' : 'Set your location to see prayer times'}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Dua — fixed footer */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontWeight: fw, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted, fontWeight: fw }]}>
          {tr.freeApp}
        </Text>
      </View>
      <LocationModal visible={showLocModal} onClose={() => setShowLocModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { gap: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  appNameSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 3 },
  screenTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  todayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 4,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCenter: { alignItems: 'center', flex: 1 },
  monthName: { fontSize: 18, fontWeight: '700' },
  hijriMonthLabel: { fontSize: 12, marginTop: 2 },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  cell: { width: `${100 / 7}%`, paddingVertical: 6, alignItems: 'center' },
  cellDay: { fontSize: 14 },
  cellHijri: { fontSize: 9, marginTop: 1 },
  prayerSection: { gap: 6, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  prayerCard: { borderRadius: 16, overflow: 'hidden' },
  prayerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prayerName: { fontSize: 14 },
  prayerTime: { fontSize: 14, fontVariant: ['tabular-nums'] },
  noLocation: { alignItems: 'center', gap: 8, paddingVertical: 20, marginBottom: 16 },
  noLocationText: { fontSize: 14, textAlign: 'center' },
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },
});
