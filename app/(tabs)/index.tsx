import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Platform, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import {
  calculatePrayerTimes, formatTime, getNextPrayer, getCountdown,
  type PrayerTimes as PrayerTimesType,
} from '@/lib/prayer-times';

const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night',
  sunrise: 'weather-sunset-up',
  dhuhr: 'weather-sunny',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night-partly-cloudy',
};

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, calcMethod, asrMethod, maghribOffset,
    locationMode, manualLocation, location, setLocation,
    updateSettings,
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
  const [cityResults, setCityResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
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

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      if (times) {
        const next = getNextPrayer(times);
        if (next) setCountdown(getCountdown(next.time));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [times]);

  const nextPrayer = times ? getNextPrayer(times) : null;

  const PRAYER_ORDER: (keyof PrayerTimesType)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const saveManualLocation = () => {
    const lat = parseFloat(manLat);
    const lng = parseFloat(manLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid', 'Please enter valid coordinates');
      return;
    }
    const foundCity = cityResults.find(c => c.lat === lat && c.lng === lng)?.name;
    const cityName = (foundCity ?? cityQuery.trim()) || undefined;
    updateSettings({ locationMode: 'manual', manualLocation: { lat, lng, city: cityName } });
    setLocation({ lat, lng, city: cityName });
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

  const dateStr = now.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark
          ? ['#0a2416', '#070f0a']
          : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, paddingHorizontal: 20 }]}>
        <View>
          <Text style={[styles.appName, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
            {isAr ? 'مواقيت' : 'Mawaqit'}
          </Text>
          <Text style={[styles.dateText, { color: C.textSecond }]} numberOfLines={1}>
            {dateStr}
          </Text>
        </View>
        <View style={styles.headerActions}>
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
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name={locationMode === 'auto' ? 'locate' : 'location-outline'} size={20} color={C.tint} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/settings'); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={20} color={C.tint} />
          </Pressable>
        </View>
      </View>

      {/* Location line */}
      <View style={[styles.locationRow, { paddingHorizontal: 20 }]}>
        <Ionicons name="location-sharp" size={12} color={C.tint} />
        <Text style={[styles.locationText, { color: C.textMuted }]}>
          {loadingLoc
            ? tr.searching
            : location
              ? (location.city ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`)
              : tr.locationPermission}
        </Text>
      </View>

      {/* Next prayer banner */}
      {nextPrayer && times && (
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={[styles.nextBanner, { backgroundColor: C.tint, marginHorizontal: 20 }]}
        >
          <Animated.View style={pulseStyle}>
            <MaterialCommunityIcons
              name={PRAYER_ICONS[nextPrayer.name] as any}
              size={28} color="#fff"
            />
          </Animated.View>
          <View style={[styles.nextCenter, { alignItems: isAr ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.nextLabel, { fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {tr.nextPrayer}
            </Text>
            <Text style={[styles.nextPrayerName, { fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
              {prayerLabel(nextPrayer.name)}
            </Text>
          </View>
          <Text style={styles.countdown}>{countdown}</Text>
        </Animated.View>
      )}

      {/* Prayer times list */}
      <View style={[styles.timesContainer, { paddingHorizontal: 16, flex: 1, justifyContent: 'center' }]}>
        {PRAYER_ORDER.map((key, idx) => {
          const active = isNext(key);
          const passed = !active && isPassed(key);
          return (
            <Animated.View
              entering={FadeInDown.delay(150 + idx * 60).duration(400)}
              key={key}
              style={[
                styles.prayerRow,
                {
                  backgroundColor: active
                    ? C.tint
                    : passed
                    ? C.surface
                    : C.backgroundCard,
                  borderColor: active ? C.tint : C.separator,
                  marginBottom: 8,
                },
              ]}
            >
              <View style={styles.prayerLeft}>
                <MaterialCommunityIcons
                  name={PRAYER_ICONS[key] as any}
                  size={22}
                  color={active ? '#fff' : passed ? C.textMuted : C.tint}
                />
                <Text style={[
                  styles.prayerName,
                  {
                    color: active ? '#fff' : passed ? C.textMuted : C.text,
                    fontFamily: isAr ? 'Amiri_700Bold' : undefined,
                    fontSize: isAr ? 18 : 15,
                  }
                ]}>
                  {prayerLabel(key)}
                </Text>
              </View>
              <Text style={[
                styles.prayerTime,
                { color: active ? '#fff' : passed ? C.textMuted : C.text }
              ]}>
                {times ? formatTime(times[key]) : '—'}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Footer dua */}
      <View style={[styles.footer, { paddingBottom: bottomInset + 60, paddingHorizontal: 20 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: { fontSize: 26, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, marginBottom: 12,
  },
  locationText: { fontSize: 12 },
  nextBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14, gap: 12, marginBottom: 16,
  },
  nextCenter: { flex: 1 },
  nextLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 2 },
  nextPrayerName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  countdown: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timesContainer: {},
  prayerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prayerName: { fontSize: 15, fontWeight: '600' },
  prayerTime: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  footer: { alignItems: 'center' },
  dua: { fontSize: 14, textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  inputRow: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '500' },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cityRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cityList: {
    borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  cityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  cityItemText: { fontSize: 13, flex: 1 },
  divider: {
    borderTopWidth: 1, alignItems: 'center',
    paddingTop: 12, marginTop: 4,
  },
  dividerText: { fontSize: 11, marginTop: -18, paddingHorizontal: 8 },
});
