import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { SERIF_EN } from '@/constants/typography';
import { useApp } from '@/contexts/AppContext';
import type { LocationData } from '@/contexts/AppContext';
import { t, type Lang } from '@/constants/i18n';

// Localized cities DB — built offline by scripts/build-cities-db.js from GeoNames.
// Shape: { countries: { <lang>: { <cc>: name } }, cities: [ { n, cc, la, lo, i18n, s } ] }
type LocalizedCity = { n: string; cc: string; la: number; lo: number; i18n: Partial<Record<Lang, string>>; s: string[] };
type CitiesDB = { countries: Record<Lang, Record<string, string>>; cities: LocalizedCity[] };
const DB: CitiesDB = require('../assets/cities.json');

interface SearchResult {
  gid?: number;   // not persisted; internal
  n: string;      // English canonical name (for storage)
  cc: string;
  la: number;
  lo: number;
  displayName: string;  // localized in the app's current lang
  displayCountry: string;
}

/**
 * Localized country name for the current app language. Falls back to English when
 * the current locale has no entry (rare, but happens for a few small countries in
 * some low-resource locales).
 */
function countryName(cc: string | undefined, lang: Lang): string {
  if (!cc) return '';
  return DB.countries[lang]?.[cc] ?? DB.countries.en?.[cc] ?? cc;
}

/**
 * City name in the app's current language when known; falls back to English.
 */
function cityDisplayName(city: LocalizedCity, lang: Lang): string {
  return city.i18n[lang] ?? city.i18n.en ?? city.n;
}

/**
 * Search all cities offline. Query is matched against the city's flat search index
 * (every localized name lowercased). Exact-match wins, then prefix, then substring;
 * within each bucket cities are already ordered by population (source file order).
 */
function searchCities(query: string, lang: Lang): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const exact: LocalizedCity[] = [];
  const starts: LocalizedCity[] = [];
  const includes: LocalizedCity[] = [];
  for (const c of DB.cities) {
    for (const s of c.s) {
      if (s === q) { exact.push(c); break; }
      if (s.startsWith(q)) { starts.push(c); break; }
      if (s.includes(q)) { includes.push(c); break; }
    }
    // Cap total scanned in the buckets so a 1-char query doesn't build a giant list
    if (exact.length >= 20 && starts.length >= 20) break;
  }
  const pick = [...exact, ...starts, ...includes].slice(0, 8);
  return pick.map(c => ({
    n: c.n, cc: c.cc, la: c.la, lo: c.lo,
    displayName: cityDisplayName(c, lang),
    displayCountry: countryName(c.cc, lang),
  }));
}

function nearestCityCountryCode(lat: number, lng: number): string | undefined {
  let best: LocalizedCity | undefined;
  let bestDist = Infinity;
  for (const city of DB.cities) {
    const d = (city.la - lat) ** 2 + (city.lo - lng) ** 2;
    if (d < bestDist) { bestDist = d; best = city; }
  }
  return best?.cc;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LocationModal({ visible, onClose }: Props) {
  const {
    lang, colors, updateSettings, setLocation, manualLocation, locationMode,
    savedCities, addSavedCity, removeSavedCity, useSavedCity, switchToLocation,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<SearchResult[]>([]);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [pendingCityToSave, setPendingCityToSave] = useState<SearchResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manLat, setManLat] = useState('');
  const [manLng, setManLng] = useState('');

  useEffect(() => {
    if (visible) {
      setCityQuery('');
      setCityResults([]);
      setPendingCityToSave(null);
      setShowAdvanced(false);
      setManLat(manualLocation?.lat?.toString() ?? '');
      setManLng(manualLocation?.lng?.toString() ?? '');
    }
  }, [visible, manualLocation]);

  // Live search with 300 ms debounce. Purely local — no network. Free debounce win.
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 1) { setCityResults([]); return; }
    const t = setTimeout(() => { setCityResults(searchCities(q, lang)); }, 300);
    return () => clearTimeout(t);
  }, [cityQuery, lang]);

  const handleUseGPS = async () => {
    Haptics.selectionAsync();
    setFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(tr.locationPermission, tr.requestPermission);
        setFetchingGPS(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let city: string | undefined;
      let countryCode: string | undefined;
      let localName: string | undefined;
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        city = geo[0]?.city ?? geo[0]?.region ?? undefined;
        countryCode = geo[0]?.isoCountryCode ?? undefined;
      } catch {}
      // Fetch localized city name from Nominatim in the current app language.
      // Optional one-shot GPS reverse — not a search-path call.
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
          { headers: { 'Accept-Language': lang === 'en' ? 'en' : `${lang}, en;q=0.8`, 'User-Agent': 'Mawaqit/1.3.8' } },
        );
        if (nominatimRes.ok) {
          const nominatimData = await nominatimRes.json() as { address?: Record<string, string>; display_name?: string };
          const addr = nominatimData.address;
          localName = addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? nominatimData.display_name?.split(',')[0];
        }
      } catch {}
      updateSettings({ locationMode: 'auto', manualLocation: null });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city, localName, countryCode });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.warn(e);
    }
    setFetchingGPS(false);
  };

  // Tap a search result → switch immediately (no wait for a Save button), leave the
  // sheet open, show a "Save to favorites?" prompt. Save or Skip.
  const handleTapResult = useCallback(async (c: SearchResult) => {
    Haptics.selectionAsync();
    const loc: LocationData = {
      lat: c.la, lng: c.lo, city: c.n, countryCode: c.cc || nearestCityCountryCode(c.la, c.lo),
    };
    await switchToLocation(loc);
    setPendingCityToSave(c);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [switchToLocation]);

  const savePendingCity = useCallback(async () => {
    if (!pendingCityToSave) return;
    Haptics.selectionAsync();
    const c = pendingCityToSave;
    await addSavedCity({ lat: c.la, lng: c.lo, city: c.n, countryCode: c.cc });
    setPendingCityToSave(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pendingCityToSave, addSavedCity]);

  // If the ACTIVE manual location is not yet saved as a favorite, offer a top banner
  // that saves it — so a searched-but-unsaved city can still be favorited later
  // without repeating the search.
  const activeCityIsSaved = useMemo(() => {
    if (locationMode !== 'manual' || !manualLocation) return true; // GPS → nothing to save
    const key = (a: number, b: number) => `${a.toFixed(4)},${b.toFixed(4)}`;
    return (savedCities ?? []).some(c => key(c.lat, c.lng) === key(manualLocation.lat, manualLocation.lng));
  }, [locationMode, manualLocation, savedCities]);

  const saveCurrentAsFavorite = useCallback(async () => {
    if (locationMode !== 'manual' || !manualLocation) return;
    Haptics.selectionAsync();
    await addSavedCity({
      lat: manualLocation.lat, lng: manualLocation.lng,
      city: manualLocation.city ?? `${manualLocation.lat.toFixed(2)}, ${manualLocation.lng.toFixed(2)}`,
      countryCode: manualLocation.countryCode,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [locationMode, manualLocation, addSavedCity]);

  const saveManualCoords = async () => {
    const lat = parseFloat(manLat);
    const lng = parseFloat(manLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert(tr.invalid_input, tr.invalid_coordinates);
      return;
    }
    const cc = nearestCityCountryCode(lat, lng);
    const loc: LocationData = { lat, lng, city: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, countryCode: cc };
    await switchToLocation(loc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.backgroundCard }]}>
          <View style={styles.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.content}
          >
            <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
              {tr.location as string}
            </Text>

            {/* Current-location save banner: shows when the active manual location isn't yet a favorite */}
            {locationMode === 'manual' && manualLocation && !activeCityIsSaved && (
              <View style={[styles.banner, { backgroundColor: C.tint + '14', borderColor: C.tint + '33' }]}>
                <Ionicons name="location" size={14} color={C.tint} />
                <Text style={[styles.bannerText, { color: C.text }]} numberOfLines={1}>
                  {manualLocation.city ?? `${manualLocation.lat.toFixed(2)}, ${manualLocation.lng.toFixed(2)}`}
                  {manualLocation.countryCode ? `, ${countryName(manualLocation.countryCode, lang)}` : ''}
                </Text>
                <Pressable onPress={saveCurrentAsFavorite} hitSlop={8} style={styles.bannerAction}>
                  <Ionicons name="bookmark-outline" size={14} color={C.tint} />
                  <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>{tr.save as string}</Text>
                </Pressable>
              </View>
            )}

            {/* Use GPS */}
            <Pressable
              onPress={handleUseGPS}
              style={[styles.gpsBtn, { backgroundColor: C.tint + '18', borderColor: C.tint + '44' }]}
            >
              {fetchingGPS
                ? <ActivityIndicator size="small" color={C.tint} />
                : <Ionicons name="locate" size={16} color={C.tint} />}
              <Text style={[styles.gpsBtnText, { color: C.tint }]}>
                {tr.useGPSLocation as string}
              </Text>
            </Pressable>

            {/* Saved / Favorite cities */}
            {(savedCities?.length ?? 0) > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: C.textSecond }]}>
                  {tr.savedCities as string}
                </Text>
                <View style={[styles.cityList, { borderColor: C.separator }]}>
                  {savedCities.map((c, i) => (
                    <View
                      key={c.id}
                      style={[
                        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
                        i < savedCities.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator },
                      ]}
                    >
                      <Pressable
                        onPress={async () => {
                          Haptics.selectionAsync();
                          await useSavedCity(c.id);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          onClose();
                        }}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Ionicons name="bookmark" size={14} color={C.tint} />
                        <Text style={[styles.cityItemText, { color: C.text }]} numberOfLines={2}>
                          {c.city}{c.countryCode ? `, ${countryName(c.countryCode, lang)}` : ''}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => { Haptics.selectionAsync(); await removeSavedCity(c.id); }}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={16} color={C.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Live search */}
            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: C.textSecond }]}>
                {tr.searchByCity as string}
              </Text>
              <View style={[styles.inputWrap, { borderColor: C.separator, backgroundColor: C.backgroundSecond }]}>
                <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.inputInner, { color: C.text }]}
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder={tr.typeAnyLanguage as string}
                  placeholderTextColor={C.textMuted}
                  textAlign={isAr ? 'right' : 'left'}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {cityQuery.length > 0 && (
                  <Pressable onPress={() => { setCityQuery(''); setCityResults([]); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={C.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>

            {cityResults.length > 0 && (
              <View style={[styles.cityList, { borderColor: C.separator }]}>
                {cityResults.map((c, i) => (
                  <Pressable
                    key={`${c.la.toFixed(3)},${c.lo.toFixed(3)}-${i}`}
                    onPress={() => handleTapResult(c)}
                    style={[styles.cityItem, i < cityResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator }]}
                  >
                    <Ionicons name="location-outline" size={14} color={C.tint} />
                    <Text style={[styles.cityItemText, { color: C.text }]} numberOfLines={2}>
                      {c.displayName}{c.displayCountry ? `, ${c.displayCountry}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Save-to-favorites prompt after tap-to-switch */}
            {pendingCityToSave && (
              <View style={[styles.banner, { backgroundColor: C.tint + '14', borderColor: C.tint + '33' }]}>
                <Text style={[styles.bannerText, { color: C.text, flex: 1 }]} numberOfLines={1}>
                  {tr.saveToFavorites as string} — {pendingCityToSave.displayName}
                </Text>
                <Pressable onPress={savePendingCity} hitSlop={8} style={styles.bannerAction}>
                  <Ionicons name="bookmark" size={14} color={C.tint} />
                  <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>{tr.save as string}</Text>
                </Pressable>
                <Pressable onPress={() => setPendingCityToSave(null)} hitSlop={8} style={{ marginLeft: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>{tr.skip as string}</Text>
                </Pressable>
              </View>
            )}

            {/* Advanced: manual lat/lng — last-resort offline path */}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowAdvanced(v => !v); }}
              style={[styles.advancedToggle, { borderColor: C.separator }]}
            >
              <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{tr.advanced as string}</Text>
            </Pressable>
            {showAdvanced && (
              <View style={{ gap: 8 }}>
                <View style={styles.inputRow}>
                  <Text style={[styles.label, { color: C.textSecond }]}>{tr.latitude as string}</Text>
                  <TextInput
                    style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond }]}
                    value={manLat}
                    onChangeText={setManLat}
                    keyboardType="numbers-and-punctuation"
                    placeholder="31.9516"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={[styles.label, { color: C.textSecond }]}>{tr.longitude as string}</Text>
                  <TextInput
                    style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond }]}
                    value={manLng}
                    onChangeText={setManLng}
                    keyboardType="numbers-and-punctuation"
                    placeholder="35.9239"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
                <Pressable
                  onPress={saveManualCoords}
                  style={[styles.btn, { backgroundColor: C.tint }]}
                >
                  <Text style={{ color: C.tintText, fontWeight: '600' }}>{tr.save as string}</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={onClose}
              style={[styles.btn, { backgroundColor: C.backgroundSecond, marginTop: 6 }]}
            >
              <Text style={{ color: C.textSecond }}>{tr.close as string}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  content: { padding: 24, gap: 14, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    gap: 8,
  },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  bannerAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  gpsBtnText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
  },
  inputInner: { flex: 1, paddingVertical: 10, fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  inputRow: { gap: 6 },
  cityList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  cityItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  cityItemText: { fontSize: 13, flex: 1 },
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  btn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
