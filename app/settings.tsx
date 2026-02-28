import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';

const CALC_METHODS: CalcMethod[] = ['MWL', 'ISNA', 'Egypt', 'MakkahUmmQura', 'Karachi', 'Jordan', 'Tehran', 'Jafari'];
const FONT_SIZES = ['small', 'medium', 'large'] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, calcMethod, asrMethod, maghribOffset, countryCode,
    locationMode, themeMode, fontSize, updateSettings,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const Row = ({
    label, right, onPress, noBorder,
  }: { label: string; right: React.ReactNode; onPress?: () => void; noBorder?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { borderBottomColor: C.separator, borderBottomWidth: noBorder ? 0 : 1, opacity: pressed && onPress ? 0.7 : 1 }
      ]}
    >
      <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
        {label}
      </Text>
      <View style={styles.rightSide}>{right}</View>
    </Pressable>
  );

  const Chip = ({ value, current, onPress }: { value: string; current: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: value === current ? C.tint : C.backgroundSecond, borderColor: C.separator },
      ]}
    >
      <Text style={{ color: value === current ? '#fff' : C.textSecond, fontSize: 12, fontWeight: '600' }}>
        {value}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="close" size={20} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {tr.settings}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'المظهر' : 'Appearance'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Row
            label={tr.language}
            right={
              <View style={styles.chips}>
                {(['ar', 'en'] as const).map(l => (
                  <Chip key={l} value={l === 'ar' ? tr.arabic : tr.english} current={lang === l ? (l === 'ar' ? tr.arabic : tr.english) : ''} onPress={() => { Haptics.selectionAsync(); updateSettings({ lang: l }); }} />
                ))}
              </View>
            }
          />
          <Row
            label={tr.theme}
            right={
              <View style={styles.chips}>
                {(['light', 'auto', 'dark'] as const).map(m => (
                  <Chip key={m} value={m === 'light' ? (isAr ? 'فاتح' : 'Light') : m === 'dark' ? (isAr ? 'داكن' : 'Dark') : (isAr ? 'تلقائي' : 'Auto')} current={themeMode === m ? (m === 'light' ? (isAr ? 'فاتح' : 'Light') : m === 'dark' ? (isAr ? 'داكن' : 'Dark') : (isAr ? 'تلقائي' : 'Auto')) : ''} onPress={() => { Haptics.selectionAsync(); updateSettings({ themeMode: m }); }} />
                ))}
              </View>
            }
            noBorder
          />
        </View>

        {/* Quran font */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'خط القرآن' : 'Quran Font'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Row
            label={tr.fontSize}
            right={
              <View style={styles.chips}>
                {FONT_SIZES.map(s => (
                  <Chip
                    key={s}
                    value={s === 'small' ? tr.small : s === 'medium' ? tr.medium : tr.large}
                    current={fontSize === s ? (s === 'small' ? tr.small : s === 'medium' ? tr.medium : tr.large) : ''}
                    onPress={() => { Haptics.selectionAsync(); updateSettings({ fontSize: s }); }}
                  />
                ))}
              </View>
            }
            noBorder
          />
        </View>

        {/* Prayer Calculation */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'حساب أوقات الصلاة' : 'Prayer Calculation'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {tr.calculationMethod}
            </Text>
          </View>
          <View style={styles.methodGrid}>
            {CALC_METHODS.map(m => {
              const label = tr.methods[m] ?? m;
              return (
                <Pressable
                  key={m}
                  onPress={() => { Haptics.selectionAsync(); updateSettings({ calcMethod: m }); }}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: calcMethod === m ? C.tint : C.backgroundSecond,
                      borderColor: calcMethod === m ? C.tint : C.separator,
                    }
                  ]}
                >
                  <Text style={{
                    color: calcMethod === m ? '#fff' : C.textSecond,
                    fontSize: 11, fontWeight: '600', textAlign: 'center',
                    fontFamily: isAr ? 'Amiri_400Regular' : undefined,
                  }} numberOfLines={2}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Asr method */}
          <Row
            label={tr.asrMethod}
            right={
              <View style={styles.chips}>
                {(['standard', 'hanafi'] as AsrMethod[]).map(m => (
                  <Chip key={m} value={m === 'standard' ? tr.standard : tr.hanafi} current={asrMethod === m ? (m === 'standard' ? tr.standard : tr.hanafi) : ''} onPress={() => { Haptics.selectionAsync(); updateSettings({ asrMethod: m }); }} />
                ))}
              </View>
            }
          />

          {/* Maghrib offset — auto */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin'}
            </Text>
            <View style={[styles.autoOffsetBadge, { backgroundColor: C.tint + '22', borderColor: C.tint + '55' }]}>
              <Ionicons name="location-outline" size={14} color={C.tint} />
              <Text style={[styles.autoOffsetText, { color: C.tint }]}>
                {isAr
                  ? `${maghribOffset} ${maghribOffset === 1 ? 'دقيقة' : 'دقائق'} — تلقائي بناءً على موقعك${countryCode ? ` (${countryCode})` : ''}`
                  : `${maghribOffset} min — auto-set for your location${countryCode ? ` (${countryCode})` : ''}`}
              </Text>
            </View>
            <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr
                ? 'يُضاف هذا الوقت بعد الغروب الفلكي وفق معايير دار الإفتاء في بلدك'
                : 'Minutes added after astronomical sunset per your country\'s Islamic authority standard'}
            </Text>
          </View>
        </View>

        {/* Location */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'الموقع' : 'Location'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Row
            label={isAr ? 'وضع الموقع' : 'Location Mode'}
            right={
              <View style={styles.chips}>
                <Chip value={isAr ? 'تلقائي' : 'Auto'} current={locationMode === 'auto' ? (isAr ? 'تلقائي' : 'Auto') : ''} onPress={() => { Haptics.selectionAsync(); updateSettings({ locationMode: 'auto' }); }} />
                <Chip value={isAr ? 'يدوي' : 'Manual'} current={locationMode === 'manual' ? (isAr ? 'يدوي' : 'Manual') : ''} onPress={() => { Haptics.selectionAsync(); updateSettings({ locationMode: 'manual' }); }} />
              </View>
            }
            noBorder
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'عن التطبيق' : 'About'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.aboutText, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
              {tr.dua}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  card: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap', gap: 8,
  },
  settingLabel: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  rightSide: { flexShrink: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  methodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  methodChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
    width: '46%',
  },
  explain: { fontSize: 11, lineHeight: 17, paddingHorizontal: 16, paddingBottom: 12 },
  aboutText: { fontSize: 16, textAlign: 'center', width: '100%' },
  autoOffsetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  autoOffsetText: { fontSize: 13, fontWeight: '600' },
});
