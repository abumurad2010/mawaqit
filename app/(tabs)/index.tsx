import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import LocationModal from '@/components/LocationModal';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SERIF_EN } from '@/constants/typography';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Platform, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, FadeIn,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  calculatePrayerTimes, formatTime, formatTimeAtOffset, getNextPrayer, getCountdown,
  type PrayerTimes as PrayerTimesType,
} from '@/lib/prayer-times';
import { gregorianToHijri, formatHijriDate } from '@/lib/hijri';

/**
 * Parse "HH:MM" → Date on today (or tomorrow) at that local time.
 * Pass `tomorrow = true` when the prayer is actually the next Gregorian day
 * (e.g. Eid prayer shown on Ramadan 30 evening after Maghrib).
 */
function parseHHMM(hhmm: string, tomorrow = false): Date {
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date();
  if (tomorrow) d.setDate(d.getDate() + 1);
  d.setHours(isNaN(hh) ? 7 : hh, isNaN(mm) ? 30 : mm, 0, 0);
  return d;
}


const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night',
  sunrise: 'weather-sunset-up',
  dhuhr: 'brightness-7',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night-partly-cloudy',
};

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, calcMethod, asrMethod, maghribOffset,
    locationMode, manualLocation, location, setLocation,
    updateSettings, locationUtcOffset, hijriAdjustment, colors, firstAdhanOffset, fontSize,
    dhuhaTime: dhuhaTimeSetting, tahajjudTime: tahajjudTimeSetting,
    showDhuha, showQiyam, eidPrayerTime: eidPrayerTimeSetting,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [times, setTimes] = useState<PrayerTimesType | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [now, setNow] = useState(new Date());
  const [showManual, setShowManual] = useState(false);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const fetchAutoLocation = useCallback(async () => {
    setLoadingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoadingLoc(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let city: string | undefined;
      let countryCode: string | undefined;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        city = geo[0]?.city ?? geo[0]?.region ?? undefined;
        countryCode = geo[0]?.isoCountryCode ?? undefined;
      } catch {}
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        city,
        countryCode,
      });
    } catch (e) {
      console.warn(e);
    }
    setLoadingLoc(false);
  }, []);

  useEffect(() => {
    if (locationMode === 'auto') {
      fetchAutoLocation();
    } else if (manualLocation) {
      setLocation(manualLocation);
    }
  }, [locationMode, manualLocation]);

  useEffect(() => {
    if (!location) return;
    const computed = calculatePrayerTimes({
      lat: location.lat,
      lng: location.lng,
      date: now,
      method: calcMethod,
      asrMethod,
      maghribOffset,
    });
    setTimes(computed);
  }, [location, now, calcMethod, asrMethod, maghribOffset]);

  const nextPrayer = times ? getNextPrayer(times) : null;

  // Tomorrow's Fajr — used both for the "next prayer" hero and Tahajjud time
  const tomorrowFajr = useMemo(() => {
    if (!location) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const t = calculatePrayerTimes({
      lat: location.lat, lng: location.lng,
      date: tomorrow, method: calcMethod, asrMethod, maghribOffset,
    });
    return t.fajr;
  }, [location, calcMethod, asrMethod, maghribOffset]);

  // displayNext: either today's next prayer, or tomorrow's Fajr
  const displayNext = nextPrayer
    ?? (tomorrowFajr ? { name: 'fajr' as const, time: tomorrowFajr, isTomorrow: true } : null);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      if (times) {
        const next = getNextPrayer(times);
        const target = next?.time ?? tomorrowFajr;
        if (target) setCountdown(getCountdown(target));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [times, tomorrowFajr]);

  const PRAYER_ORDER: (keyof PrayerTimesType)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const prayerLabel = (key: keyof PrayerTimesType) => {
    const map: Record<keyof PrayerTimesType, string> = {
      fajr: tr.fajr,
      sunrise: tr.sunrise,
      dhuhr: tr.dhuhr,
      asr: tr.asr,
      maghrib: tr.maghrib,
      isha: tr.isha,
    };
    return map[key];
  };

  // Nafl prayer times — user-set exact daily alarms
  const dhuhaTime = times ? parseHHMM(dhuhaTimeSetting ?? '07:30') : null;
  const tahajjudTime = (times)
    ? parseHHMM(tahajjudTimeSetting ?? '03:00')
    : null;

  const isNext = (key: keyof PrayerTimesType) => nextPrayer?.name === key;
  const isPassed = (key: keyof PrayerTimesType) => times ? times[key] < now : false;

  // Shift `now` to the location's timezone when a manual UTC offset is set
  const locationNow = useMemo(() => {
    if (locationUtcOffset === null) return now;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + locationUtcOffset * 3600000);
  }, [now, locationUtcOffset]);

  const gregorianStr = locationNow.toLocaleDateString(
    isAr ? 'ar-SA-u-ca-gregory' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );
  const hijriBase = new Date(locationNow);
  hijriBase.setDate(hijriBase.getDate() + (hijriAdjustment ?? 0));
  const hijri = gregorianToHijri(hijriBase.getFullYear(), hijriBase.getMonth() + 1, hijriBase.getDate());
  const hijriStr = formatHijriDate(hijri, lang);

  // ── Eid detection on the main screen ────────────────────────────────────────
  //
  // ISLAMIC DAY BOUNDARY — the new Hijri day begins at Maghrib, not midnight.
  // At 9 pm on Ramadan 30, the Gregorian date is still "Ramadan 30" but
  // Islamically it is already 1 Shawwal (Eid al-Fitr). To honour this:
  //
  //   1. We detect "today's" Eid using the current Gregorian→Hijri conversion.
  //   2. After Maghrib, we also compute tomorrow's Hijri date and check that.
  //      If tomorrow is Eid, `isEid` becomes true tonight — so the row appears
  //      from the moment the Islamic day turns, not from Gregorian midnight.
  //
  // TOMORROW'S PRAYER TIME — when showing a next-day Eid prayer tonight, we
  // pass `tomorrow = true` to parseHHMM so the Date lands on tomorrow morning.
  // This means the row shows as upcoming (not already-passed).
  //
  // `hijriAdjustment` is applied to both today's and tomorrow's base dates.
  //

  // Is current wall-clock time past today's Maghrib?
  const isAfterMaghrib = times ? now > (times.maghrib as Date) : false;

  // Tomorrow's adjusted Hijri date (used for after-Maghrib look-ahead)
  const tomorrowHijriBase = new Date(locationNow);
  tomorrowHijriBase.setDate(tomorrowHijriBase.getDate() + 1 + (hijriAdjustment ?? 0));
  const tomorrowHijri = gregorianToHijri(
    tomorrowHijriBase.getFullYear(),
    tomorrowHijriBase.getMonth() + 1,
    tomorrowHijriBase.getDate(),
  );

  // Eid flags — today OR (after Maghrib AND tomorrow is Eid)
  const isEidAlFitrToday    = hijri.month === 10 && hijri.day === 1;
  const isEidAlAdhaToday    = hijri.month === 12 && hijri.day === 10;
  const isEidAlFitrTomorrow = isAfterMaghrib && tomorrowHijri.month === 10 && tomorrowHijri.day === 1;
  const isEidAlAdhaTomorrow = isAfterMaghrib && tomorrowHijri.month === 12 && tomorrowHijri.day === 10;

  const isEidAlFitr = isEidAlFitrToday || isEidAlFitrTomorrow;
  const isEidAlAdha = isEidAlAdhaToday || isEidAlAdhaTomorrow;
  const isEid      = isEidAlFitr || isEidAlAdha;

  // When we're showing tomorrow's Eid tonight, build the prayer time on
  // tomorrow's Gregorian date so it appears as upcoming, not past.
  const isEidNextDay = isEid && !isEidAlFitrToday && !isEidAlAdhaToday;
  const eidTime = (times && isEid)
    ? parseHHMM(eidPrayerTimeSetting ?? '07:30', isEidNextDay)
    : null;
  const eidLabel = isEidAlFitr ? tr.eidFitrPrayer : tr.eidAdhaPrayer;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const pageText  = C.text;
  const pageMuted = C.textMuted;
  const fw = C.fontWeightNormal;

  const FONT_STEPS = ['small', 'medium', 'large', 'xlarge'] as const;
  const fsIdx = FONT_STEPS.indexOf(fontSize as typeof FONT_STEPS[number]);
  const pFS = [12, 15, 18, 22][fsIdx] ?? 15;
  const pLH = pFS + 6;
  // Date / location scale alongside prayer rows
  const dFS  = [10, 12, 14, 17][fsIdx] ?? 12;   // Gregorian date
  const hFS  = [9,  11, 13, 15][fsIdx] ?? 11;   // Hijri + location
  const canDecrease = fsIdx > 0;
  const canIncrease = fsIdx < FONT_STEPS.length - 1;
  const decreaseFont = () => {
    if (fsIdx > 0) { Haptics.selectionAsync(); updateSettings({ fontSize: FONT_STEPS[fsIdx - 1] }); }
  };
  const increaseFont = () => {
    if (fsIdx < FONT_STEPS.length - 1) { Haptics.selectionAsync(); updateSettings({ fontSize: FONT_STEPS[fsIdx + 1] }); }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <Image
        source={require('@/assets/images/bg-prayer.png')}
        style={[styles.bgPrayer, { opacity: isDark ? 0.22 : 0.18 }]}
        resizeMode="cover"
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={[styles.headerWrap, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        {/* Row 1: spacer | centered logo | buttons */}
        <View style={styles.header}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowManual(true); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name={locationMode === 'manual' ? 'location-outline' : 'locate'} size={19} color={C.tint} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="settings-outline" size={19} color={C.textSecond} />
            </Pressable>
          </View>
        </View>

        {/* Row 2: dates stacked and centered */}
        <View style={styles.datesBlock}>
          <Text
            style={[styles.dateText, { color: pageText, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: dFS, lineHeight: dFS + 6 }]}
            numberOfLines={1}
          >{gregorianStr}</Text>
          <Text
            style={[styles.hijriText, { color: pageMuted, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: hFS, lineHeight: hFS + 5 }]}
            numberOfLines={1}
          >{hijriStr}</Text>
        </View>

        {/* Row 3: location */}
        <View style={styles.metaRow}>
          <Ionicons name="location-sharp" size={hFS - 2} color={pageMuted} />
          <Text style={[styles.metaText, { color: pageMuted, fontWeight: fw, flexShrink: 1, fontSize: hFS }]} numberOfLines={1}>
            {loadingLoc
              ? tr.searching
              : location
                ? (location.city ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`)
                : tr.locationPermission}
          </Text>
        </View>
      </View>

      {/* ── Font size controls ── */}
      <View style={styles.fontControlRow}>
        <Pressable
          onPress={decreaseFont}
          style={({ pressed }) => [styles.fontPill, { backgroundColor: C.backgroundCard, opacity: (!canDecrease || pressed) ? 0.3 : 1 }]}
          disabled={!canDecrease}
        >
          <Text style={[styles.fontPillLabel, { color: C.textSecond, fontSize: 11 }]}>A−</Text>
        </Pressable>
        {FONT_STEPS.map((_, i) => (
          <View key={i} style={[styles.fontDot, { backgroundColor: i === fsIdx ? C.tint : C.separator }]} />
        ))}
        <Pressable
          onPress={increaseFont}
          style={({ pressed }) => [styles.fontPill, { backgroundColor: C.backgroundCard, opacity: (!canIncrease || pressed) ? 0.3 : 1 }]}
          disabled={!canIncrease}
        >
          <Text style={[styles.fontPillLabel, { color: C.textSecond, fontSize: 14 }]}>A+</Text>
        </Pressable>
      </View>

      {/* ── Next prayer hero strip ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 6 }}>
        {displayNext && times ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[styles.heroCard, { backgroundColor: C.heroCardBg }]}
          >
            <Animated.View style={pulseStyle}>
              <MaterialCommunityIcons
                name={PRAYER_ICONS[displayNext.name] as any}
                size={16} color={C.heroCardSubtext}
              />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: C.heroCardSubtext, fontSize: [8,9,10,11][fsIdx] ?? 9, lineHeight: ([8,9,10,11][fsIdx] ?? 9) + 4 }]}>
                {'isTomorrow' in displayNext && displayNext.isTomorrow
                  ? tr.tomorrowFajr
                  : tr.nextPrayer}
              </Text>
              <Text style={[styles.heroPrayerName, { color: C.heroCardText, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN, fontSize: pFS, lineHeight: pLH }]}>
                {prayerLabel(displayNext.name)}
              </Text>
            </View>
            <Text style={[styles.heroCountdown, { color: C.heroCardText, fontWeight: fw, fontSize: [16,20,24,28][fsIdx] ?? 20 }]}>{countdown}</Text>
          </Animated.View>
        ) : (
          <View style={[styles.heroCard, styles.heroCardEmpty, { backgroundColor: C.backgroundCard }]}>
            <Text style={[styles.heroEmptyText, { color: C.textMuted, fontWeight: fw }]}>
              {loadingLoc ? tr.searching : !location ? tr.locationPermission : tr.searching}
            </Text>
          </View>
        )}
      </View>

      {/* ── Prayer list + dua (scrollable so dua always reachable) ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* ── Prayer list ── */}
      <View style={[styles.prayerCard, { backgroundColor: isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)', marginHorizontal: 16 }]}>
        {/* First Adhan row — shown above Fajr when offset > 0 */}
        {(firstAdhanOffset ?? 0) > 0 && times && (() => {
          const firstAdhanTime = new Date(times.fajr.getTime() - (firstAdhanOffset ?? 0) * 60000);
          const passed = firstAdhanTime < now;
          return (
            <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }}>
              <View style={[styles.prayerRow]}>
                <View style={styles.prayerLeft}>
                  <MaterialCommunityIcons
                    name="mosque"
                    size={18}
                    color={passed ? C.textMuted : C.text}
                  />
                  <Text numberOfLines={1} style={[
                    styles.prayerName,
                    {
                      color: passed ? C.textMuted : C.text,
                      fontWeight: fw,
                      fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN,
                      fontSize: pFS,
                      lineHeight: pLH,
                    }
                  ]}>
                    {tr.firstAdhan}
                  </Text>
                </View>
                <Text style={[styles.prayerTime, { color: passed ? C.textMuted : C.text, fontWeight: fw, fontSize: pFS, lineHeight: pLH }]}>
                  {formatTimeAtOffset(firstAdhanTime, locationUtcOffset)}
                </Text>
              </View>
              <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />
            </View>
          );
        })()}
        {PRAYER_ORDER.map((key, idx) => {
          const active = isNext(key);
          const passed = !active && isPassed(key);
          const isLast = idx === PRAYER_ORDER.length - 1;
          const dividerStyle = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' };
          return (
            <React.Fragment key={key}>
              <View style={dividerStyle}>
                <View style={[
                  styles.prayerRow,
                  active && { backgroundColor: C.tintLight },
                ]}>
                  <View style={styles.prayerLeft}>
                    <MaterialCommunityIcons
                      name={PRAYER_ICONS[key] as any}
                      size={18}
                      color={active ? C.tint : passed ? C.textMuted : C.text}
                    />
                    <Text numberOfLines={1} style={[
                      styles.prayerName,
                      {
                        color: active ? C.tint : passed ? C.textMuted : C.text,
                        fontWeight: active ? '700' : fw,
                        fontFamily: isAr ? (active ? 'Amiri_700Bold' : 'Amiri_400Regular') : SERIF_EN,
                        fontSize: pFS,
                        lineHeight: pLH,
                      }
                    ]}>
                      {prayerLabel(key)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.prayerTime,
                    { color: active ? C.tint : passed ? C.textMuted : C.text, fontWeight: active ? '700' : fw, fontSize: pFS, lineHeight: pLH }
                  ]}>
                    {times ? formatTimeAtOffset(times[key], locationUtcOffset) : '—'}
                  </Text>
                </View>
                <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />
              </View>

              {/* Eid prayer — inserted right after Sunrise on Eid days only */}
              {key === 'sunrise' && isEid && eidTime && (
                <View style={dividerStyle}>
                  <View style={[styles.prayerRow, styles.naflRow]}>
                    <View style={styles.prayerLeft}>
                      <MaterialCommunityIcons
                        name="star-crescent"
                        size={18}
                        color={eidTime < now ? C.textMuted : C.tint}
                      />
                      <Text numberOfLines={1} style={[
                        styles.prayerName,
                        { color: eidTime < now ? C.textMuted : C.tint, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: pFS, lineHeight: pLH }
                      ]}>
                        {eidLabel}
                      </Text>
                      <View style={[styles.naflBadge, { backgroundColor: C.tint + '22' }]}>
                        <Text style={[styles.naflBadgeText, { color: C.tint }]}>{isAr ? 'عيد' : 'Eid'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.prayerTime, { color: eidTime < now ? C.textMuted : C.tint, fontWeight: fw, fontSize: pFS, lineHeight: pLH }]}>
                      {formatTimeAtOffset(eidTime, locationUtcOffset)}
                    </Text>
                  </View>
                  <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />
                </View>
              )}

              {/* Dhuha — inserted after Sunrise (only when enabled in settings) */}
              {key === 'sunrise' && showDhuha && dhuhaTime && (
                <View style={dividerStyle}>
                  <View style={[styles.prayerRow, styles.naflRow]}>
                    <View style={styles.prayerLeft}>
                      <MaterialCommunityIcons
                        name="weather-sunny-alert"
                        size={18}
                        color={dhuhaTime < now ? C.textMuted : C.gold}
                      />
                      <Text numberOfLines={1} style={[
                        styles.prayerName,
                        { color: dhuhaTime < now ? C.textMuted : C.gold, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: pFS, lineHeight: pLH }
                      ]}>
                        {isAr ? 'الضحى' : tr.dhuha}
                      </Text>
                      <View style={[styles.naflBadge, { backgroundColor: C.gold + '22' }]}>
                        <Text style={[styles.naflBadgeText, { color: C.gold }]}>{tr.nafl}</Text>
                      </View>
                    </View>
                    <Text style={[styles.prayerTime, { color: dhuhaTime < now ? C.textMuted : C.gold, fontWeight: fw, fontSize: pFS, lineHeight: pLH }]}>
                      {formatTimeAtOffset(dhuhaTime, locationUtcOffset)}
                    </Text>
                  </View>
                  <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />
                </View>
              )}

              {/* Qiyam — inserted after Isha (only when enabled in settings) */}
              {key === 'isha' && showQiyam && tahajjudTime && (
                <View style={isLast ? undefined : dividerStyle}>
                  <View style={[styles.prayerRow, styles.naflRow]}>
                    <View style={styles.prayerLeft}>
                      <MaterialCommunityIcons
                        name="weather-night"
                        size={18}
                        color={tahajjudTime < now ? C.textMuted : C.gold}
                      />
                      <Text numberOfLines={1} style={[
                        styles.prayerName,
                        { color: tahajjudTime < now ? C.textMuted : C.gold, fontWeight: fw, fontFamily: isAr ? 'Amiri_400Regular' : SERIF_EN, fontSize: pFS, lineHeight: pLH }
                      ]}>
                        {tr.qiyam}
                      </Text>
                      <View style={[styles.naflBadge, { backgroundColor: C.gold + '22' }]}>
                        <Text style={[styles.naflBadgeText, { color: C.gold }]}>{tr.nafl}</Text>
                      </View>
                    </View>
                    <Text style={[styles.prayerTime, { color: tahajjudTime < now ? C.textMuted : C.gold, fontWeight: fw, fontSize: pFS, lineHeight: pLH }]}>
                      {formatTimeAtOffset(tahajjudTime, locationUtcOffset)}
                    </Text>
                  </View>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Spacer pushes dua to bottom when content is short */}
      <View style={{ flex: 1 }} />

      {/* ── Dua ── */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontWeight: fw, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted, fontWeight: fw }]}>
          {tr.freeApp}
        </Text>
      </View>
      </ScrollView>

      <LocationModal visible={showManual} onClose={() => setShowManual(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgPrayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },

  /* Header */
  headerWrap: { gap: 4, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datesBlock: { alignItems: 'center', gap: 0 },
  dateText: { fontSize: 12, fontWeight: '600', letterSpacing: -0.1, lineHeight: 18 },
  hijriText: { fontSize: 11, fontWeight: '400', lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  metaText: { fontSize: 11 },
  metaDot: { fontSize: 11, marginHorizontal: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  /* Next prayer hero */
  heroCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCardEmpty: { alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'center' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  heroLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1, lineHeight: 12 },
  heroPrayerName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  heroCountdown: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  heroEmptyText: { fontSize: 13 },

  /* Prayer card container */
  prayerCard: { borderRadius: 16, overflow: 'hidden' },
  prayerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prayerName: { lineHeight: 20 },
  prayerTime: { lineHeight: 20, fontVariant: ['tabular-nums'] },
  naflRow: { opacity: 0.9 },
  naflBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  naflBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  fontControlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 16, gap: 6, marginBottom: 2,
  },
  fontPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 32, alignItems: 'center' },
  fontPillLabel: { fontWeight: '600', letterSpacing: 0.2 },
  fontDot: { width: 5, height: 5, borderRadius: 3 },

  /* Dua */
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },
});
