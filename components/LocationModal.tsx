import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { SERIF_EN } from '@/constants/typography';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';

// Bundled city database for offline search (GeoNames cities with population >= 15k, sorted by population)
const CITIES_DB: Array<{ n: string; cc: string; la: number; lo: number }> =
  require('../assets/cities.json');

// ISO 3166-1 alpha-2 → country name (for display)
const CC_NAMES: Record<string, string> = {
  AD:'Andorra',AE:'UAE',AF:'Afghanistan',AG:'Antigua',AI:'Anguilla',AL:'Albania',AM:'Armenia',
  AO:'Angola',AR:'Argentina',AS:'American Samoa',AT:'Austria',AU:'Australia',AW:'Aruba',
  AZ:'Azerbaijan',BA:'Bosnia',BB:'Barbados',BD:'Bangladesh',BE:'Belgium',BF:'Burkina Faso',
  BG:'Bulgaria',BH:'Bahrain',BI:'Burundi',BJ:'Benin',BN:'Brunei',BO:'Bolivia',BR:'Brazil',
  BS:'Bahamas',BT:'Bhutan',BW:'Botswana',BY:'Belarus',BZ:'Belize',CA:'Canada',CD:'DR Congo',
  CF:'Cent. Africa',CG:'Congo',CH:'Switzerland',CI:'Côte d\'Ivoire',CL:'Chile',CM:'Cameroon',
  CN:'China',CO:'Colombia',CR:'Costa Rica',CU:'Cuba',CV:'Cape Verde',CW:'Curaçao',CY:'Cyprus',
  CZ:'Czech Rep.',DE:'Germany',DJ:'Djibouti',DK:'Denmark',DO:'Dominican Rep.',DZ:'Algeria',
  EC:'Ecuador',EE:'Estonia',EG:'Egypt',ER:'Eritrea',ES:'Spain',ET:'Ethiopia',FI:'Finland',
  FJ:'Fiji',FR:'France',GA:'Gabon',GB:'UK',GE:'Georgia',GH:'Ghana',GL:'Greenland',GM:'Gambia',
  GN:'Guinea',GQ:'Eq. Guinea',GR:'Greece',GT:'Guatemala',GU:'Guam',GW:'Guinea-Bissau',
  GY:'Guyana',HK:'Hong Kong',HN:'Honduras',HR:'Croatia',HT:'Haiti',HU:'Hungary',ID:'Indonesia',
  IE:'Ireland',IL:'Israel',IN:'India',IQ:'Iraq',IR:'Iran',IS:'Iceland',IT:'Italy',JM:'Jamaica',
  JO:'Jordan',JP:'Japan',KE:'Kenya',KG:'Kyrgyzstan',KH:'Cambodia',KP:'North Korea',
  KR:'South Korea',KW:'Kuwait',KZ:'Kazakhstan',LA:'Laos',LB:'Lebanon',LI:'Liechtenstein',
  LK:'Sri Lanka',LR:'Liberia',LS:'Lesotho',LT:'Lithuania',LU:'Luxembourg',LV:'Latvia',
  LY:'Libya',MA:'Morocco',MD:'Moldova',ME:'Montenegro',MG:'Madagascar',MK:'North Macedonia',
  ML:'Mali',MM:'Myanmar',MN:'Mongolia',MO:'Macao',MQ:'Martinique',MR:'Mauritania',MT:'Malta',
  MU:'Mauritius',MV:'Maldives',MW:'Malawi',MX:'Mexico',MY:'Malaysia',MZ:'Mozambique',
  NA:'Namibia',NC:'New Caledonia',NE:'Niger',NG:'Nigeria',NI:'Nicaragua',NL:'Netherlands',
  NO:'Norway',NP:'Nepal',NZ:'New Zealand',OM:'Oman',PA:'Panama',PE:'Peru',PG:'Papua New Guinea',
  PH:'Philippines',PK:'Pakistan',PL:'Poland',PR:'Puerto Rico',PS:'Palestine',PT:'Portugal',
  PW:'Palau',PY:'Paraguay',QA:'Qatar',RE:'Réunion',RO:'Romania',RS:'Serbia',RU:'Russia',
  RW:'Rwanda',SA:'Saudi Arabia',SB:'Solomon Islands',SC:'Seychelles',SD:'Sudan',SE:'Sweden',
  SG:'Singapore',SI:'Slovenia',SK:'Slovakia',SL:'Sierra Leone',SN:'Senegal',SO:'Somalia',
  SR:'Suriname',SS:'South Sudan',SV:'El Salvador',SY:'Syria',SZ:'Eswatini',TD:'Chad',
  TG:'Togo',TH:'Thailand',TJ:'Tajikistan',TL:'Timor-Leste',TM:'Turkmenistan',TN:'Tunisia',
  TR:'Turkey',TT:'Trinidad',TW:'Taiwan',TZ:'Tanzania',UA:'Ukraine',UG:'Uganda',US:'USA',
  UY:'Uruguay',UZ:'Uzbekistan',VA:'Vatican',VE:'Venezuela',VN:'Vietnam',VU:'Vanuatu',
  WS:'Samoa',XK:'Kosovo',YE:'Yemen',YT:'Mayotte',ZA:'South Africa',ZM:'Zambia',ZW:'Zimbabwe',
};

function cityDisplayName(city: { n: string; cc: string }): string {
  return `${city.n}, ${CC_NAMES[city.cc] ?? city.cc}`;
}

/** Returns true if the query contains any non-Latin characters (Arabic, Urdu, Persian, CJK, Cyrillic, etc.) */
function hasNonLatinChars(text: string): boolean {
  return Array.from(text).some(ch => ch.codePointAt(0)! > 0x024F);
}

/**
 * Arabic/Urdu/Persian city name → English equivalent used in the bundled GeoNames database.
 * Covers Arab world capitals, major cities, and commonly searched Islamic holy sites.
 */
const ARABIC_CITY_MAP: Record<string, string> = {
  // Saudi Arabia
  'مكة': 'Makkah', 'مكه': 'Makkah', 'مكة المكرمة': 'Makkah', 'مكه المكرمه': 'Makkah',
  'المدينة': 'Madinah', 'المدينه': 'Madinah', 'المدينة المنورة': 'Madinah', 'يثرب': 'Madinah',
  'الرياض': 'Riyadh', 'جدة': 'Jeddah', 'جده': 'Jeddah',
  'الدمام': 'Dammam', 'الطائف': 'Taif', 'تبوك': 'Tabuk', 'بريدة': 'Buraydah',
  'حائل': 'Hail', 'نجران': 'Najran', 'جازان': 'Jizan', 'خميس مشيط': 'Khamis Mushait',
  'الخبر': 'Khobar', 'الأحساء': 'Al-Ahsa', 'ينبع': 'Yanbu',
  // Egypt
  'القاهرة': 'Cairo', 'الاسكندرية': 'Alexandria', 'الإسكندرية': 'Alexandria',
  'الجيزة': 'Giza', 'الجيزه': 'Giza', 'شبرا الخيمة': 'Shubra el Kheima',
  'أسيوط': 'Asyut', 'الأقصر': 'Luxor', 'أسوان': 'Aswan',
  'المنصورة': 'Mansoura', 'بورسعيد': 'Port Said', 'السويس': 'Suez',
  'طنطا': 'Tanta', 'الزقازيق': 'Zagazig', 'المحلة الكبرى': 'Mahalla al Kubra',
  // UAE
  'دبي': 'Dubai', 'أبو ظبي': 'Abu Dhabi', 'أبوظبي': 'Abu Dhabi',
  'الشارقة': 'Sharjah', 'عجمان': 'Ajman', 'رأس الخيمة': 'Ras al Khaimah',
  // Qatar, Bahrain, Kuwait, Oman, Yemen
  'الدوحة': 'Doha', 'المنامة': 'Manama', 'الكويت': 'Kuwait City',
  'مسقط': 'Muscat', 'صلالة': 'Salalah',
  'صنعاء': 'Sanaa', 'عدن': 'Aden', 'تعز': 'Taiz', 'الحديدة': 'Al Hudaydah',
  // Iraq
  'بغداد': 'Baghdad', 'الموصل': 'Mosul', 'البصرة': 'Basrah',
  'أربيل': 'Erbil', 'كركوك': 'Kirkuk', 'النجف': 'Najaf', 'كربلاء': 'Karbala',
  'السليمانية': 'Sulaymaniyah', 'الناصرية': 'Nasiriyah', 'الحلة': 'Hilla',
  'الكوت': 'Kut', 'دهوك': 'Dohuk', 'سامراء': 'Samarra',
  // Syria
  'دمشق': 'Damascus', 'حلب': 'Aleppo', 'حمص': 'Homs', 'حماة': 'Hamah',
  'اللاذقية': 'Latakia', 'دير الزور': 'Dayr Az Zawr', 'الرقة': 'Ar Raqqah',
  // Lebanon, Jordan, Palestine
  'بيروت': 'Beirut', 'طرابلس': 'Tripoli', 'صيدا': 'Sidon',
  'عمان': 'Amman', 'إربد': 'Irbid', 'الزرقاء': 'Zarqa', 'العقبة': 'Aqaba',
  'القدس': 'Jerusalem', 'غزة': 'Gaza', 'رام الله': 'Ramallah',
  'نابلس': 'Nablus', 'الخليل': 'Hebron', 'جنين': 'Jenin',
  // Libya, Tunisia, Algeria, Morocco
  'طرابلس ليبيا': 'Tripoli', 'بنغازي': 'Benghazi', 'مصراتة': 'Misratah',
  'تونس': 'Tunis', 'صفاقس': 'Sfax', 'سوسة': 'Sousse', 'القيروان': 'Kairouan',
  'الجزائر': 'Algiers', 'وهران': 'Oran', 'قسنطينة': 'Constantine',
  'الرباط': 'Rabat', 'الدار البيضاء': 'Casablanca', 'فاس': 'Fes',
  'مراكش': 'Marrakesh', 'أكادير': 'Agadir', 'مكناس': 'Meknes', 'طنجة': 'Tangier',
  // Sudan, Mauritania, Djibouti, Somalia
  'الخرطوم': 'Khartoum', 'أم درمان': 'Omdurman', 'بورسودان': 'Port Sudan',
  'نواكشوط': 'Nouakchott', 'جيبوتي': 'Djibouti', 'مقديشو': 'Mogadishu',
  // Iran (commonly searched in Arabic/Farsi)
  'طهران': 'Tehran', 'مشهد': 'Mashhad', 'أصفهان': 'Isfahan', 'اصفهان': 'Isfahan',
  'شيراز': 'Shiraz', 'تبريز': 'Tabriz', 'قم': 'Qom', 'الأهواز': 'Ahvaz',
  // Pakistan (Urdu spellings)
  'كراتشي': 'Karachi', 'لاهور': 'Lahore', 'إسلام آباد': 'Islamabad',
  'إسلام اباد': 'Islamabad', 'بيشاور': 'Peshawar', 'مولتان': 'Multan',
  'فيصل آباد': 'Faisalabad', 'كويتا': 'Quetta', 'راولبندي': 'Rawalpindi',
  // Turkey (Arabic spellings)
  'اسطنبول': 'Istanbul', 'إسطنبول': 'Istanbul', 'أنقرة': 'Ankara', 'إزمير': 'Izmir',
  // Indonesia / Malaysia (Arabic script)
  'جاكرتا': 'Jakarta', 'كوالالمبور': 'Kuala Lumpur',
};

/** Translates Arabic/non-Latin query to English using city map, falls back to original. */
function mapNonLatinQuery(query: string): string {
  const trimmed = query.trim();
  // Try exact match first, then partial prefix match
  if (ARABIC_CITY_MAP[trimmed]) return ARABIC_CITY_MAP[trimmed]!;
  for (const [arabic, english] of Object.entries(ARABIC_CITY_MAP)) {
    if (arabic.startsWith(trimmed) || trimmed.startsWith(arabic)) return english;
  }
  return trimmed; // no mapping — pass through (will likely return no results)
}

function searchCitiesOffline(query: string): Array<{ name: string; lat: number; lng: number; countryCode: string }> {
  const rawQ = query.trim();
  if (!rawQ) return [];
  // If query has non-Latin chars, try to map to English equivalent
  const q = (hasNonLatinChars(rawQ) ? mapNonLatinQuery(rawQ) : rawQ).toLowerCase();
  // CITIES_DB is sorted by population desc — iterate in order so higher-pop cities win ties
  const exact: typeof CITIES_DB = [];
  const starts: typeof CITIES_DB = [];
  const includes: typeof CITIES_DB = [];
  for (const city of CITIES_DB) {
    const name = city.n.toLowerCase();
    const country = (CC_NAMES[city.cc] ?? city.cc).toLowerCase();
    if (name === q) { exact.push(city); if (exact.length >= 5) break; }
    else if (name.startsWith(q) || country === q) starts.push(city);
    else if (name.includes(q) || country.includes(q)) includes.push(city);
  }
  return [...exact, ...starts, ...includes].slice(0, 5).map(city => ({
    name: cityDisplayName(city),
    lat: city.la,
    lng: city.lo,
    countryCode: city.cc,
  }));
}

function nearestCityCountryCode(lat: number, lng: number): string | undefined {
  let best: typeof CITIES_DB[0] | undefined;
  let bestDist = Infinity;
  for (const city of CITIES_DB) {
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
  const { lang, colors, updateSettings, setLocation, manualLocation } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<Array<{ name: string; lat: number; lng: number; countryCode?: string }>>([]);
  const [manLat, setManLat] = useState('');
  const [manLng, setManLng] = useState('');
  const [fetchingGPS, setFetchingGPS] = useState(false);

  useEffect(() => {
    if (visible) {
      setManLat(manualLocation?.lat?.toString() ?? '');
      setManLng(manualLocation?.lng?.toString() ?? '');
      setCityQuery(manualLocation?.city ?? '');
      setCityResults([]);
    }
  }, [visible]);

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
      // Fetch localized city name from Nominatim in the current app language
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
          { headers: { 'Accept-Language': lang === 'en' ? 'en' : `${lang}, en;q=0.8`, 'User-Agent': 'Mawaqit/1.0' } },
        );
        if (nominatimRes.ok) {
          const nominatimData = await nominatimRes.json() as { address?: Record<string, string>; display_name?: string };
          const addr = nominatimData.address;
          localName = addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? nominatimData.display_name?.split(',')[0];
        }
      } catch { /* Nominatim is optional — fall back to expo-location city */ }
      updateSettings({ locationMode: 'auto', manualLocation: null });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city, localName, countryCode });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.warn(e);
    }
    setFetchingGPS(false);
  };

  const searchCity = useCallback(() => {
    if (!cityQuery.trim()) return;
    setCityResults(searchCitiesOffline(cityQuery));
  }, [cityQuery]);

  const saveManualLocation = () => {
    const lat = parseFloat(manLat);
    const lng = parseFloat(manLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert(tr.invalid_input, tr.invalid_coordinates);
      return;
    }
    const matchedResult = cityResults.find(c => c.lat === lat && c.lng === lng);
    const cityName = (matchedResult?.name ?? cityQuery.trim()) || undefined;
    const countryCode = matchedResult?.countryCode ?? nearestCityCountryCode(lat, lng);
    updateSettings({ locationMode: 'manual', manualLocation: { lat, lng, city: cityName, countryCode } });
    setLocation({ lat, lng, city: cityName, countryCode });
    setCityResults([]);
    setCityQuery('');
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
              {tr.manualLocation}
            </Text>

            {/* Use GPS button */}
            <Pressable
              onPress={handleUseGPS}
              style={[styles.gpsBtn, { backgroundColor: C.tint + '18', borderColor: C.tint + '44' }]}
            >
              {fetchingGPS
                ? <ActivityIndicator size="small" color={C.tint} />
                : <Ionicons name="locate" size={16} color={C.tint} />}
              <Text style={[styles.gpsBtnText, { color: C.tint }]}>
                {tr.useGPSLocation}
              </Text>
            </Pressable>

            <View style={[styles.divider, { borderColor: C.separator }]}>
              <Text style={[styles.dividerText, { color: C.textMuted, backgroundColor: C.backgroundCard }]}>
                {tr.orSetManually}
              </Text>
            </View>

            {/* City search */}
            <Text style={[styles.label, { color: C.textSecond }]}>
              {tr.searchByCity}
            </Text>
            <View style={styles.cityRow}>
              <View style={[styles.inputWrap, { borderColor: C.separator, backgroundColor: C.backgroundSecond }]}>
                <TextInput
                  style={[styles.inputInner, { color: C.text }]}
                  value={cityQuery}
                  onChangeText={text => {
                    setCityQuery(text);
                    if (!text) setCityResults([]);
                  }}
                  placeholder={tr.enterCityName}
                  placeholderTextColor={C.textMuted}
                  onSubmitEditing={searchCity}
                  returnKeyType="search"
                  textAlign={isAr ? 'right' : 'left'}
                  autoCorrect={false}
                />
                {cityQuery.length > 0 && (
                  <Pressable
                    onPress={() => { setCityQuery(''); setCityResults([]); }}
                    hitSlop={8}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={17} color={C.textMuted} />
                  </Pressable>
                )}
              </View>
              <Pressable onPress={searchCity} style={[styles.searchBtn, { backgroundColor: C.tint }]}>
                <Ionicons name="search" size={18} color={C.tintText} />
              </Pressable>
            </View>

            {/* Non-Latin input hint — shown inline below search row */}
            {cityQuery.length > 0 && hasNonLatinChars(cityQuery) && (
              <Text style={[styles.offlineNote, { color: C.textMuted }]}>
                {tr.offline_search_hint}
              </Text>
            )}

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

            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: C.textSecond }]}>{tr.latitude}</Text>
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
              <Text style={[styles.label, { color: C.textSecond }]}>{tr.longitude}</Text>
              <TextInput
                style={[styles.input, { color: C.text, borderColor: C.separator, backgroundColor: C.backgroundSecond }]}
                value={manLng}
                onChangeText={setManLng}
                keyboardType="decimal-pad"
                placeholder="e.g. 35.9239"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => { onClose(); setCityResults([]); setCityQuery(''); }}
                style={[styles.btn, { backgroundColor: C.backgroundSecond }]}
              >
                <Text style={{ color: C.textSecond }}>{tr.btn_cancel}</Text>
              </Pressable>
              <Pressable
                onPress={saveManualLocation}
                style={[styles.btn, { backgroundColor: C.tint }]}
              >
                <Text style={{ color: C.tintText, fontWeight: '600' }}>{tr.save}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  content: { padding: 24, gap: 14, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  gpsBtnText: { fontSize: 14, fontWeight: '600' },
  divider: { borderTopWidth: 1, alignItems: 'center', paddingTop: 12, marginTop: 2 },
  dividerText: { fontSize: 11, marginTop: -18, paddingHorizontal: 10 },
  label: { fontSize: 13, fontWeight: '500' },
  cityRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputInner: {
    flex: 1, paddingVertical: 10, fontSize: 15,
  },
  clearBtn: {
    paddingLeft: 6,
  },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  inputRow: { gap: 6 },
  searchBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cityList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  cityItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  cityItemText: { fontSize: 13, flex: 1 },
  offlineNote: { fontSize: 11, textAlign: 'center', marginTop: -6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
