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
// LAZY-LOADED so the ~5.5 MB JSON isn't parsed at app start — only when the modal
// first opens.
type LocalizedCity = { n: string; cc: string; la: number; lo: number; i18n: Partial<Record<Lang, string>>; s: string[] };
type CitiesDB = { countries: Record<Lang, Record<string, string>>; cities: LocalizedCity[] };
type DB = CitiesDB & {
  /** rounded (lat*10, lng*10) → nearest city — built once, used by every
   *  localizeSavedCityName / nearestCityCountryCode call so we don't rescan 33k
   *  cities per re-render. */
  coordIndex: Map<string, LocalizedCity>;
};
let _db: DB | null = null;
function getDB(): DB {
  if (_db) return _db;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('../assets/cities.json') as CitiesDB;
  const coordIndex = new Map<string, LocalizedCity>();
  for (const c of raw.cities) {
    const k = `${Math.round(c.la * 10)}|${Math.round(c.lo * 10)}`;
    // First one wins — cities.json is population-desc so the largest city at that
    // 0.1° cell is what we return for a saved-city localization lookup.
    if (!coordIndex.has(k)) coordIndex.set(k, c);
  }
  _db = { ...raw, coordIndex };
  return _db;
}

// Shared normalizer — MUST be the same function used by scripts/build-cities-db.js
// when it built each city's `s` index, or Arabic/Persian queries won't match.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalizeSearchText } = require('@/lib/city-search-normalize') as {
  normalizeSearchText: (s: string) => string;
};

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
  const db = getDB();
  return db.countries[lang]?.[cc] ?? db.countries.en?.[cc] ?? cc;
}

/**
 * City name in the app's current language when known; falls back to English. When we
 * only know a saved city by (lat, lng, countryCode) — the normal case for a favorite
 * saved in an earlier version — look it up in the DB by nearest coord match to render
 * the localized name at render time.
 */
function cityDisplayName(city: LocalizedCity, lang: Lang): string {
  return city.i18n[lang] ?? city.i18n.en ?? city.n;
}

/**
 * Resolve a stored saved-city (which persists (lat, lng, city, countryCode) in
 * English) to its localized display name in the current app language, by finding the
 * DB entry nearest to those coords. Falls back to the stored English name.
 */
function localizeSavedCityName(storedCity: string, lat: number, lng: number, lang: Lang): string {
  if (lang === 'en') return storedCity;
  const db = getDB();
  // Try the 0.1° cell first (~11 km), then the eight neighbours, then give up. O(9)
  // constant lookups vs. the old O(33k) linear scan per render × per favorite.
  const cellLat = Math.round(lat * 10);
  const cellLng = Math.round(lng * 10);
  let best: LocalizedCity | undefined;
  let bestDist = Infinity;
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const cell = db.coordIndex.get(`${cellLat + dLat}|${cellLng + dLng}`);
      if (!cell) continue;
      const d = (cell.la - lat) ** 2 + (cell.lo - lng) ** 2;
      if (d < bestDist) { bestDist = d; best = cell; }
    }
  }
  if (!best || bestDist > 0.02) return storedCity;   // > ~1.5 km: unsure, keep stored
  return best.i18n[lang] ?? storedCity;
}

/**
 * Search all cities offline. Query and index tokens go through the SAME normalizer
 * (lib/city-search-normalize.js) so Arabic/Persian yeh, alef variants, harakat,
 * ta marbuta, zero-width chars etc. all fold identically on both sides.
 *
 * Buckets: exact match, prefix match, substring match — cities within a bucket are
 * ordered by source file order (which is population desc). We break as soon as the
 * total collected across all buckets reaches the cap, so we never do a full 33k scan
 * once we already have enough hits.
 */
const RESULTS_CAP = 8;
const SCAN_CAP = 40;
function searchCities(query: string, lang: Lang): SearchResult[] {
  const q = normalizeSearchText(query);
  if (q.length < 2) return [];
  const db = getDB();
  const exact: LocalizedCity[] = [];
  const starts: LocalizedCity[] = [];
  const includes: LocalizedCity[] = [];
  for (const c of db.cities) {
    for (const s of c.s) {
      if (s === q) { exact.push(c); break; }
      if (s.startsWith(q)) { starts.push(c); break; }
      if (s.includes(q)) { includes.push(c); break; }
    }
    if (exact.length + starts.length + includes.length >= SCAN_CAP) break;
  }
  const pick = [...exact, ...starts, ...includes].slice(0, RESULTS_CAP);
  return pick.map(c => ({
    n: c.n, cc: c.cc, la: c.la, lo: c.lo,
    displayName: cityDisplayName(c, lang),
    displayCountry: countryName(c.cc, lang),
  }));
}

function nearestCityCountryCode(lat: number, lng: number): string | undefined {
  const db = getDB();
  // Same 3×3 cell probe as localizeSavedCityName — O(9) lookups. Only widens to a full
  // scan for coords that fall outside every populated cell (e.g. deep-ocean coords the
  // user typed by hand into Advanced), which happens rarely.
  const cellLat = Math.round(lat * 10);
  const cellLng = Math.round(lng * 10);
  let best: LocalizedCity | undefined;
  let bestDist = Infinity;
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const cell = db.coordIndex.get(`${cellLat + dLat}|${cellLng + dLng}`);
      if (!cell) continue;
      const d = (cell.la - lat) ** 2 + (cell.lo - lng) ** 2;
      if (d < bestDist) { bestDist = d; best = cell; }
    }
  }
  if (best) return best.cc;
  // Fallback: mid-ocean etc. — linear scan.
  for (const city of db.cities) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manLat, setManLat] = useState('');
  const [manLng, setManLng] = useState('');
  // Session snapshot for Cancel: whatever the app's location state was when this sheet
  // opened. Cancel restores exactly that. Also drives whether the Done footer button
  // becomes prominent (differs from snapshot = "you've changed something this session").
  const [snapshot, setSnapshot] = useState<{ mode: 'auto' | 'manual'; loc: LocationData | null } | null>(null);

  // Reset the sheet's transient state ONLY on open. Depending on manualLocation
  // makes this fire again the moment handleTapResult switches location, which
  // wipes cityQuery/cityResults mid-flow and kills the tap-to-switch UX.
  useEffect(() => {
    if (visible) {
      setCityQuery('');
      setCityResults([]);
      setShowAdvanced(false);
      setManLat(manualLocation?.lat?.toString() ?? '');
      setManLng(manualLocation?.lng?.toString() ?? '');
      setSnapshot({ mode: locationMode, loc: manualLocation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // True if the user has moved the app's active location since opening the sheet.
  const hasChanged = useMemo(() => {
    if (!snapshot) return false;
    if (snapshot.mode !== locationMode) return true;
    if (locationMode === 'manual') {
      const a = snapshot.loc, b = manualLocation;
      if (!a || !b) return a !== b;
      if (a.lat !== b.lat || a.lng !== b.lng) return true;
    }
    return false;
  }, [snapshot, locationMode, manualLocation]);

  const handleCancel = useCallback(async () => {
    Haptics.selectionAsync();
    if (snapshot && hasChanged) {
      if (snapshot.mode === 'auto') {
        // Restore auto/GPS mode. The effect in app/(tabs)/index.tsx that watches
        // locationMode + manualLocation will re-trigger fetchAutoLocation.
        await updateSettings({ locationMode: 'auto', manualLocation: null });
      } else if (snapshot.loc) {
        await switchToLocation(snapshot.loc);
      }
    }
    onClose();
  }, [snapshot, hasChanged, updateSettings, switchToLocation, onClose]);

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

  // Tap a search result → switch active location immediately. The persistent
  // active-location banner (below Saved Cities) becomes visible while the new
  // location is not yet in savedCities and offers the sole Save affordance;
  // there is no separate ephemeral prompt.
  const handleTapResult = useCallback(async (c: SearchResult) => {
    Haptics.selectionAsync();
    const loc: LocationData = {
      lat: c.la, lng: c.lo, city: c.n, countryCode: c.cc || nearestCityCountryCode(c.la, c.lo),
    };
    await switchToLocation(loc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [switchToLocation]);

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

  const applyManualCoords = async () => {
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
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View style={[styles.sheet, { backgroundColor: C.backgroundCard }]}>
          <View style={styles.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.content}
          >
            {/* 1. Title */}
            <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : SERIF_EN }]}>
              {tr.location as string}
            </Text>

            {/* 2. GPS */}
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

            {/* 3. Saved cities */}
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
                          {localizeSavedCityName(c.city, c.lat, c.lng, lang)}
                          {c.countryCode ? `, ${countryName(c.countryCode, lang)}` : ''}
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

            {/* 4. Active-location banner — persistent while the active manual
                 location is not in savedCities. Shows the city name and a
                 single Save affordance. Disappears on save, on switching to a
                 saved city, or on switching to GPS. */}
            {locationMode === 'manual' && manualLocation && !activeCityIsSaved && (
              <View style={[styles.banner, { backgroundColor: C.tint + '14', borderColor: C.tint + '33' }]}>
                <Ionicons name="location" size={14} color={C.tint} />
                <Text style={[styles.bannerText, { color: C.text }]} numberOfLines={1}>
                  {`${localizeSavedCityName(manualLocation.city ?? '', manualLocation.lat, manualLocation.lng, lang)}${manualLocation.countryCode ? `, ${countryName(manualLocation.countryCode, lang)}` : ''}`}
                </Text>
                <Pressable onPress={saveCurrentAsFavorite} hitSlop={8} style={styles.bannerAction}>
                  <Ionicons name="bookmark-outline" size={14} color={C.tint} />
                  <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>{tr.save as string}</Text>
                </Pressable>
              </View>
            )}

            {/* 5. Live search */}
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

            {/* 6. Results */}
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

            {/* 7. Advanced disclosure — manual lat/lng, last-resort offline path */}
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
                  onPress={applyManualCoords}
                  style={[styles.btn, { backgroundColor: C.tint }]}
                >
                  <Text style={{ color: C.tintText, fontWeight: '600' }}>{tr.save as string}</Text>
                </Pressable>
              </View>
            )}

            {/* 8. Footer: Cancel + Done, side-by-side. Done is tinted once the user has
                 changed the active location this session; both neutral before then. */}
            <View style={styles.footerRow}>
              <Pressable
                onPress={handleCancel}
                style={[styles.btn, styles.footerBtn, { backgroundColor: C.backgroundSecond }]}
              >
                <Text style={{ color: C.textSecond, fontWeight: '500' }}>{tr.btn_cancel as string}</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={[
                  styles.btn, styles.footerBtn,
                  hasChanged
                    ? { backgroundColor: C.tint }
                    : { backgroundColor: C.backgroundSecond },
                ]}
              >
                <Text style={{
                  color: hasChanged ? C.tintText : C.textSecond,
                  fontWeight: hasChanged ? '700' : '500',
                }}>{tr.done as string}</Text>
              </Pressable>
            </View>
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
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  footerBtn: { flex: 1 },
});
