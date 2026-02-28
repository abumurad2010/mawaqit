import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Platform, Alert, Modal, TextInput, ScrollView, Image
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
    updateSettings, locationUtcOffset,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [times, setTimes] = useState<PrayerTimesType | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [now, setNow] = useState(new Date());
  const [showManual, setShowManual] = useState(false);
  const [manLat, setManLat] = useState(manualLocation?.lat?.toString() ?? '');
  const [manLng, setManLng] = useState(manualLocation?.lng?.toString() ?? '');
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<Array<{ name: string; lat: number; lng: number; countryCode?: string }>>([]);
  const [cityLoading, setCityLoading] = useState(false);

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

  // When all today's prayers have passed, calculate tomorrow's Fajr
  const tomorrowFajr = useMemo(() => {
    if (nextPrayer || !location || !times) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const t = calculatePrayerTimes({
      lat: location.lat, lng: location.lng,
      date: tomorrow, method: calcMethod, asrMethod, maghribOffset,
    });
    return t.fajr;
  }, [nextPrayer, location, times, calcMethod, asrMethod, maghribOffset]);

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

  const saveManualLocation = async () => {
    const lat = parseFloat(manLat);
    const lng = parseFloat(manLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid', 'Please enter valid coordinates');
      return;
    }
    const matchedResult = cityResults.find(c => c.lat === lat && c.lng === lng);
    const cityName = (matchedResult?.name ?? cityQuery.trim()) || undefined;
    let countryCode = matchedResult?.countryCode;

    // If the user typed raw coordinates (no city search result), reverse-geocode for country code
    if (!countryCode) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          { headers: { 'User-Agent': 'MawaqitApp/1.0' } }
        );
        const data = await res.json();
        countryCode = data.address?.country_code?.toUpperCase();
      } catch {}
    }

    updateSettings({ locationMode: 'manual', manualLocation: { lat, lng, city: cityName, countryCode } });
    setLocation({ lat, lng, city: cityName, countryCode });
    setShowManual(false);
    setCityResults([]);
    setCityQuery('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const searchCity = useCallback(async () => {
    if (!cityQuery.trim()) return;
    setCityLoading(true);
    setCityResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': isAr ? 'ar' : 'en', 'User-Agent': 'MawaqitApp/1.0' } }
      );
      const data = await res.json();
      const places = data.map((p: any) => ({
        name: p.display_name?.split(',').slice(0, 2).join(',') ?? p.name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        countryCode: p.address?.country_code?.toUpperCase() as string | undefined,
      }));
      setCityResults(places);
    } catch {
      Alert.alert('Error', 'Could not find city. Please enter coordinates manually.');
    }
    setCityLoading(false);
  }, [cityQuery, isAr]);

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
  const hijri = gregorianToHijri(locationNow.getFullYear(), locationNow.getMonth() + 1, locationNow.getDate());
  const hijriStr = formatHijriDate(hijri, lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const pageText  = isDark ? '#FFFFFF' : C.text;
  const pageMuted = isDark ? '#FFFFFF' : C.textMuted;

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
          <View style={{ flex: 1 }}>
            <ThemeToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={[styles.headerActions, { flex: 1, justifyContent: 'flex-end' }]}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                if (locationMode === 'auto') {
                  setShowManual(true);
                } else {
                  updateSettings({ locationMode: 'auto' });
                  fetchAutoLocation();
                }
              }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name={locationMode === 'auto' ? 'locate' : 'location-outline'} size={19} color={C.tint} />
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
          <Text style={[styles.dateText, { color: pageText }]} numberOfLines={1}>{gregorianStr}</Text>
          <Text style={[styles.hijriText, { color: pageMuted }]} numberOfLines={1}>{hijriStr}</Text>
        </View>

        {/* Row 3: location */}
        <View style={styles.metaRow}>
          <Ionicons name="location-sharp" size={10} color={pageMuted} />
          <Text style={[styles.metaText, { color: pageMuted, flexShrink: 1 }]} numberOfLines={1}>
            {loadingLoc
              ? tr.searching
              : location
                ? (location.city ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`)
                : tr.locationPermission}
          </Text>
        </View>
      </View>

      {/* ── Next prayer hero strip ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 6, marginBottom: 6 }}>
        {displayNext && times ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[styles.heroCard, { backgroundColor: C.tint }]}
          >
            <Animated.View style={pulseStyle}>
              <MaterialCommunityIcons
                name={PRAYER_ICONS[displayNext.name] as any}
                size={16} color="rgba(255,255,255,0.55)"
              />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {'isTomorrow' in displayNext && displayNext.isTomorrow
                  ? tr.tomorrowFajr
                  : tr.nextPrayer}
              </Text>
              <Text style={[styles.heroPrayerName, { fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
                {prayerLabel(displayNext.name)}
              </Text>
            </View>
            <Text style={styles.heroCountdown}>{countdown}</Text>
          </Animated.View>
        ) : (
          <View style={[styles.heroCard, styles.heroCardEmpty, { backgroundColor: C.backgroundCard }]}>
            <Text style={[styles.heroEmptyText, { color: C.textMuted }]}>
              {loadingLoc ? tr.searching : !location ? tr.locationPermission : tr.searching}
            </Text>
          </View>
        )}
      </View>

      {/* ── Prayer list ── */}
      <View style={[styles.prayerCard, { backgroundColor: isDark ? 'rgba(44,44,46,0.15)' : 'rgba(255,255,255,0.15)', marginHorizontal: 16 }]}>
        {PRAYER_ORDER.map((key, idx) => {
          const active = isNext(key);
          const passed = !active && isPassed(key);
          const isLast = idx === PRAYER_ORDER.length - 1;
          return (
            <View key={key} style={!isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }}>
              <View style={[
                styles.prayerRow,
                active && { backgroundColor: C.tintLight },
              ]}>
                <View style={styles.prayerLeft}>
                  <MaterialCommunityIcons
                    name={PRAYER_ICONS[key] as any}
                    size={18}
                    color={active ? C.tint : passed ? (isDark ? '#FFFFFF' : '#777777') : (isDark ? '#FFFFFF' : '#333333')}
                  />
                  <Text style={[
                    styles.prayerName,
                    {
                      color: active ? C.tint : passed ? (isDark ? '#FFFFFF' : '#777777') : (isDark ? '#FFFFFF' : '#111111'),
                      fontWeight: active ? '700' : '400',
                      fontFamily: isAr ? (active ? 'Amiri_700Bold' : 'Amiri_400Regular') : undefined,
                      fontSize: isAr ? 17 : 15,
                    }
                  ]}>
                    {prayerLabel(key)}
                  </Text>
                </View>
                <Text style={[
                  styles.prayerTime,
                  { color: active ? C.tint : passed ? (isDark ? '#FFFFFF' : '#777777') : (isDark ? '#FFFFFF' : '#111111'), fontWeight: active ? '700' : '400' }
                ]}>
                  {times ? formatTimeAtOffset(times[key], locationUtcOffset) : '—'}
                </Text>
              </View>
              {!isLast && <View style={[styles.rowDivider, { backgroundColor: C.separator }]} />}
            </View>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* ── Dua ── */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted }]}>
          {tr.freeApp}
        </Text>
      </View>

      {/* Manual location modal */}
      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalBox, { backgroundColor: C.backgroundCard }]}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
                {tr.manualLocation}
              </Text>

              {/* City search */}
              <Text style={[styles.inputLabel, { color: C.textSecond }]}>
                {isAr ? 'ابحث عن مدينة' : 'Search by city'}
              </Text>
              <View style={[styles.cityRow]}>
                <TextInput
                  style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond, flex: 1 }]}
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder={isAr ? 'أدخل اسم المدينة...' : 'Enter city name...'}
                  placeholderTextColor={C.textMuted}
                  onSubmitEditing={searchCity}
                  returnKeyType="search"
                  textAlign={isAr ? 'right' : 'left'}
                />
                <Pressable
                  onPress={searchCity}
                  style={[styles.searchBtn, { backgroundColor: C.tint }]}
                >
                  {cityLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="search" size={18} color="#fff" />}
                </Pressable>
              </View>

              {/* City results */}
              {cityResults.length > 0 && (
                <View style={[styles.cityList, { borderColor: C.separator }]}>
                  {cityResults.map((c, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setManLat(c.lat.toFixed(6));
                        setManLng(c.lng.toFixed(6));
                        setCityResults([]);
                        setCityQuery(c.name);
                      }}
                      style={[styles.cityItem, i < cityResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator }]}
                    >
                      <Ionicons name="location-outline" size={14} color={C.tint} />
                      <Text style={[styles.cityItemText, { color: C.text }]} numberOfLines={2}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={[styles.divider, { borderColor: C.separator }]}>
                <Text style={[styles.dividerText, { color: C.textMuted }]}>{isAr ? 'أو أدخل الإحداثيات' : 'or enter coordinates'}</Text>
              </View>

              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: C.textSecond }]}>{tr.latitude}</Text>
                <TextInput
                  style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond }]}
                  value={manLat}
                  onChangeText={setManLat}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 31.9516"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: C.textSecond }]}>{tr.longitude}</Text>
                <TextInput
                  style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond }]}
                  value={manLng}
                  onChangeText={setManLng}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 35.9239"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => { setShowManual(false); setCityResults([]); setCityQuery(''); }}
                  style={[styles.modalBtn, { backgroundColor: C.backgroundSecond }]}
                >
                  <Text style={{ color: C.textSecond }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                </Pressable>
                <Pressable
                  onPress={saveManualLocation}
                  style={[styles.modalBtn, { backgroundColor: C.tint }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{isAr ? 'حفظ' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  datesBlock: { alignItems: 'center', gap: 1 },
  dateText: { fontSize: 12, fontWeight: '600', letterSpacing: -0.1 },
  hijriText: { fontSize: 11, fontWeight: '400' },
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
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 1 },
  heroPrayerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heroCountdown: {
    color: '#fff',
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
  prayerName: { fontSize: 15 },
  prayerTime: { fontSize: 15, fontVariant: ['tabular-nums'] },

  /* Dua */
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },

  /* Location modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  inputRow: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cityRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cityList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  cityItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  cityItemText: { fontSize: 13, flex: 1 },
  divider: { borderTopWidth: 1, alignItems: 'center', paddingTop: 12, marginTop: 4 },
  dividerText: { fontSize: 11, marginTop: -18, paddingHorizontal: 8 },
});
