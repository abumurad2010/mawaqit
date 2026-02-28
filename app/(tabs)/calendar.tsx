import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  gregorianToHijri, hijriMonthName, formatHijriDate,
  getDaysInGregorianMonth, getFirstDayOfMonth,
} from '@/lib/hijri';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const { isDark, lang, location, calcMethod, asrMethod, maghribOffset, locationUtcOffset } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
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
      const h = gregorianToHijri(viewYear, viewMonth, d);
      cells.push({ day: d, hijri: { d: h.day, m: h.month } });
    }
    return cells;
  }, [viewYear, viewMonth]);

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

  const selectedHijri = gregorianToHijri(selectedDate.y, selectedDate.m, selectedDate.d);

  const PRAYER_ORDER: (keyof PrayerTimesType)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerLabels: Record<string, string> = {
    fajr: tr.fajr, sunrise: tr.sunrise, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 10, paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: 20 }]}>
          <View>
            <Text style={[styles.appNameSmall, { color: C.tint }]}>
              {isAr ? 'مواقيت' : 'MAWAQIT'}
            </Text>
            <Text style={[styles.screenTitle, { color: C.text }]}>
              {isAr ? 'التقويم' : 'Calendar'}
            </Text>
          </View>
          <Pressable
            onPress={goToToday}
            style={[styles.todayBtn, { backgroundColor: C.backgroundCard }]}
          >
            <Text style={[styles.todayBtnText, { color: C.tint }]}>
              {isAr ? 'اليوم' : 'Today'}
            </Text>
          </Pressable>
        </View>

        {/* Month navigation */}
        <View style={[styles.monthNav, { paddingHorizontal: 16 }]}>
          <Pressable onPress={goToPrevMonth} style={[styles.arrowBtn, { backgroundColor: C.backgroundCard }]}>
            <Ionicons name={isAr ? 'chevron-forward' : 'chevron-back'} size={20} color={C.tint} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={[styles.monthName, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
              {monthName} {isAr ? toArabicIndic(viewYear) : viewYear}
            </Text>
            <Text style={[styles.hijriMonthLabel, { color: C.tint }]}>
              {(() => {
                const h1 = gregorianToHijri(viewYear, viewMonth, 1);
                const h2 = gregorianToHijri(viewYear, viewMonth, getDaysInGregorianMonth(viewYear, viewMonth));
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
        <View style={[styles.dayHeaderRow, { paddingHorizontal: 16 }]}>
          {dayNames.map((d, i) => (
            <View key={i} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, {
                color: i === 5 ? C.tint : C.textMuted,
                fontFamily: isAr ? 'Amiri_400Regular' : undefined,
              }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={[styles.grid, { paddingHorizontal: 16 }]}>
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
                  color: sel ? '#fff' : tod ? C.tint : isFriday ? C.tint : C.text,
                  fontWeight: sel || tod ? '700' : '400',
                }]}>
                  {isAr ? toArabicIndic(cell.day) : cell.day}
                </Text>
                {cell.hijri && (
                  <Text style={[styles.cellHijri, {
                    color: sel ? 'rgba(255,255,255,0.8)' : C.textMuted,
                  }]}>
                    {isAr ? toArabicIndic(cell.hijri.d) : cell.hijri.d}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Selected date info */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          key={`${selectedDate.y}-${selectedDate.m}-${selectedDate.d}`}
          style={[styles.selectedInfo, { backgroundColor: C.backgroundCard, marginHorizontal: 16 }]}
        >
          <View style={styles.selectedDates}>
            <Text style={[styles.selectedGregorian, { color: C.text }]}>
              {new Date(selectedDate.y, selectedDate.m - 1, selectedDate.d).toLocaleDateString(
                isAr ? 'ar-SA-u-ca-gregory' : 'en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </Text>
            <Text style={[styles.selectedHijri, { color: C.tint, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {formatHijriDate(selectedHijri, lang)}
            </Text>
          </View>
        </Animated.View>

        {/* Prayer times for selected date */}
        {location ? (
          <View style={[styles.prayerSection, { paddingHorizontal: 16 }]}>
            <Text style={[styles.sectionTitle, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr ? 'أوقات الصلاة' : 'Prayer Times'}
            </Text>
            <View style={[styles.prayerCard, { backgroundColor: C.backgroundCard }]}>
              {PRAYER_ORDER.map((key, idx) => (
                <View key={key}>
                  <View style={styles.prayerRow}>
                    <View style={styles.prayerLeft}>
                      <MaterialCommunityIcons
                        name={PRAYER_ICONS[key] as any}
                        size={17} color={C.tint}
                      />
                      <Text style={[styles.prayerName, {
                        color: C.text,
                        fontFamily: isAr ? 'Amiri_400Regular' : undefined,
                        fontSize: isAr ? 16 : 14,
                      }]}>
                        {prayerLabels[key]}
                      </Text>
                    </View>
                    <Text style={[styles.prayerTime, { color: C.textSecond }]}>
                      {prayerTimes ? formatTimeAtOffset(prayerTimes[key], locationUtcOffset) : '—'}
                    </Text>
                  </View>
                  {idx < PRAYER_ORDER.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.noLocation, { paddingHorizontal: 16 }]}>
            <Ionicons name="location-outline" size={32} color={C.textMuted} />
            <Text style={[styles.noLocationText, { color: C.textMuted, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr ? 'يرجى تحديد الموقع لعرض أوقات الصلاة' : 'Set your location to see prayer times'}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Dua — fixed footer */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { gap: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  appNameSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 3 },
  screenTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  todayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 4,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
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
  selectedInfo: { borderRadius: 16, padding: 16, marginBottom: 12 },
  selectedDates: { gap: 4 },
  selectedGregorian: { fontSize: 14, fontWeight: '600' },
  selectedHijri: { fontSize: 16 },
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
  duaRow: { alignItems: 'center', paddingHorizontal: 24 },
  dua: { fontSize: 13, textAlign: 'center' },
});
