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
  const [cityLoading, setCityLoading] = useState(false);
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
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        city = geo[0]?.city ?? geo[0]?.region ?? undefined;
        countryCode = geo[0]?.isoCountryCode ?? undefined;
      } catch {}
      updateSettings({ locationMode: 'auto', manualLocation: null });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city, countryCode });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.warn(e);
    }
    setFetchingGPS(false);
  };

  const searchCity = useCallback(async () => {
    if (!cityQuery.trim()) return;
    setCityLoading(true);
    setCityResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': isAr ? 'ar' : 'en', 'User-Agent': 'MawaqitApp/1.0' } },
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
    if (!countryCode) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          { headers: { 'User-Agent': 'MawaqitApp/1.0' } },
        );
        const data = await res.json();
        countryCode = data.address?.country_code?.toUpperCase();
      } catch {}
    }
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
                {isAr ? 'استخدام الموقع التلقائي (GPS)' : 'Use GPS Location'}
              </Text>
            </Pressable>

            <View style={[styles.divider, { borderColor: C.separator }]}>
              <Text style={[styles.dividerText, { color: C.textMuted, backgroundColor: C.backgroundCard }]}>
                {isAr ? 'أو حدد يدوياً' : 'or set manually'}
              </Text>
            </View>

            {/* City search */}
            <Text style={[styles.label, { color: C.textSecond }]}>
              {isAr ? 'ابحث عن مدينة' : 'Search by city'}
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
                  placeholder={isAr ? 'أدخل اسم المدينة...' : 'Enter city name...'}
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
                {cityLoading
                  ? <ActivityIndicator size="small" color={C.tintText} />
                  : <Ionicons name="search" size={18} color={C.tintText} />}
              </Pressable>
            </View>

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
                <Text style={{ color: C.textSecond }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable
                onPress={saveManualLocation}
                style={[styles.btn, { backgroundColor: C.tint }]}
              >
                <Text style={{ color: C.tintText, fontWeight: '600' }}>{isAr ? 'حفظ' : 'Save'}</Text>
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
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
