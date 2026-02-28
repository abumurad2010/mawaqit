import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';

const CALC_METHODS: CalcMethod[] = ['MWL', 'ISNA', 'Egypt', 'MakkahUmmQura', 'Karachi', 'Jordan', 'Tehran', 'Jafari'];
const FONT_SIZES = ['small', 'medium', 'large'] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, calcMethod, asrMethod, maghribBase, countryCode,
    maghribAdjustment, fontSize, hijriAdjustment, notificationsEnabled, updateSettings,
  } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // Local draft state — nothing is saved until the user taps Save
  const [draftCalcMethod, setDraftCalcMethod] = useState(calcMethod);
  const [draftAsrMethod, setDraftAsrMethod] = useState(asrMethod);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftAdjustment, setDraftAdjustment] = useState(maghribAdjustment ?? 0);
  const [draftHijri, setDraftHijri] = useState(hijriAdjustment ?? 0);
  const [draftNotifications, setDraftNotifications] = useState(notificationsEnabled ?? false);

  const hasChanges =
    draftCalcMethod !== calcMethod ||
    draftAsrMethod !== asrMethod ||
    draftFontSize !== fontSize ||
    draftAdjustment !== (maghribAdjustment ?? 0) ||
    draftHijri !== (hijriAdjustment ?? 0) ||
    draftNotifications !== (notificationsEnabled ?? false);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({
      calcMethod: draftCalcMethod,
      asrMethod: draftAsrMethod,
      fontSize: draftFontSize,
      maghribAdjustment: draftAdjustment,
      hijriAdjustment: draftHijri,
      notificationsEnabled: draftNotifications,
    });
    router.back();
  };

  const handleNotificationsToggle = async (value: boolean) => {
    Haptics.selectionAsync();
    if (value && Platform.OS !== 'web') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
    setDraftNotifications(value);
  };

  const Row = ({
    label, right, noBorder,
  }: { label: string; right: React.ReactNode; noBorder?: boolean }) => (
    <View style={[
      styles.settingRow,
      { borderBottomColor: C.separator, borderBottomWidth: noBorder ? 0 : 1 }
    ]}>
      <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
        {label}
      </Text>
      <View style={styles.rightSide}>{right}</View>
    </View>
  );

  const Chip = ({ value, selected, onPress }: { value: string; selected: boolean; onPress: () => void }) => (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[
        styles.chip,
        { backgroundColor: selected ? C.tint : C.backgroundSecond, borderColor: C.separator },
      ]}
    >
      <Text style={{ color: selected ? '#fff' : C.textSecond, fontSize: 12, fontWeight: '600' }}>
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
          <Ionicons name="close" size={20} color={C.textSecond} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {tr.settings}
        </Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: hasChanges ? C.tint : C.tintLight, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={[styles.saveBtnText, { color: hasChanges ? '#fff' : C.tint }]}>
            {isAr ? 'حفظ' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Quran font */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'خط القرآن' : 'Quran Font'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Row
            label={tr.fontSize}
            right={
              <View style={styles.chips}>
                <Chip value={tr.small}  selected={draftFontSize === 'small'}  onPress={() => setDraftFontSize('small')} />
                <Chip value={tr.medium} selected={draftFontSize === 'medium'} onPress={() => setDraftFontSize('medium')} />
                <Chip value={tr.large}  selected={draftFontSize === 'large'}  onPress={() => setDraftFontSize('large')} />
              </View>
            }
            noBorder
          />
        </View>

        {/* Hijri date adjustment */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'التقويم الهجري' : 'Hijri Calendar'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {tr.hijriAdjustment}
            </Text>
            <View style={styles.stepperRow}>
              <View style={[styles.stepperControls, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftHijri(v => Math.max(v - 1, -2)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="remove" size={18} color={C.tint} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: C.text }]}>
                  {draftHijri > 0 ? `+${draftHijri}` : draftHijri}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftHijri(v => Math.min(v + 1, 2)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="add" size={18} color={C.tint} />
                </Pressable>
              </View>
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
                {isAr ? 'يوم' : draftHijri === 0 ? 'no offset' : Math.abs(draftHijri) === 1 ? 'day' : 'days'}
              </Text>
              {draftHijri !== 0 && (
                <Pressable onPress={() => { Haptics.selectionAsync(); setDraftHijri(0); }}>
                  <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>
                    {isAr ? 'إعادة ضبط' : 'Reset'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
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
                  onPress={() => { Haptics.selectionAsync(); setDraftCalcMethod(m); }}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: draftCalcMethod === m ? C.tint : C.backgroundSecond,
                      borderColor: draftCalcMethod === m ? C.tint : C.separator,
                    }
                  ]}
                >
                  <Text style={{
                    color: draftCalcMethod === m ? '#fff' : C.textSecond,
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
                <Chip value={tr.standard} selected={draftAsrMethod === 'standard'} onPress={() => setDraftAsrMethod('standard')} />
                <Chip value={tr.hanafi}   selected={draftAsrMethod === 'hanafi'}   onPress={() => setDraftAsrMethod('hanafi')} />
              </View>
            }
          />

          {/* Maghrib offset — base + stepper */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin'}
            </Text>

            {/* Recommended base */}
            <View style={[styles.autoOffsetBadge, { backgroundColor: C.tint + '22', borderColor: C.tint + '55' }]}>
              <Ionicons name="location-outline" size={13} color={C.tint} />
              <Text style={[styles.autoOffsetText, { color: C.tint }]}>
                {isAr
                  ? `موصى به: ${maghribBase} ${maghribBase === 1 ? 'دقيقة' : 'دقائق'}${countryCode ? ` (${countryCode})` : ''}`
                  : `Recommended: ${maghribBase} min${countryCode ? ` (${countryCode})` : ''}`}
              </Text>
            </View>

            {/* Stepper row */}
            <View style={styles.stepperRow}>
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
                {isAr ? 'تعديل:' : 'Adjustment:'}
              </Text>
              <View style={[styles.stepperControls, { backgroundColor: C.backgroundSecond, borderColor: C.separator }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.max(v - 1, -maghribBase)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="remove" size={18} color={C.tint} />
                </Pressable>
                <Text style={[styles.stepperValue, { color: C.text }]}>
                  {draftAdjustment > 0 ? `+${draftAdjustment}` : draftAdjustment}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(v => Math.min(v + 1, 30)); }}
                  style={({ pressed }) => [styles.stepperBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="add" size={18} color={C.tint} />
                </Pressable>
              </View>
              <View style={[styles.totalBadge, { backgroundColor: C.tint }]}>
                <Text style={styles.totalBadgeText}>
                  {isAr
                    ? `= ${maghribBase + draftAdjustment} د`
                    : `= ${maghribBase + draftAdjustment} min`}
                </Text>
              </View>
            </View>

            {draftAdjustment !== 0 && (
              <Pressable onPress={() => { Haptics.selectionAsync(); setDraftAdjustment(0); }}>
                <Text style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>
                  {isAr ? 'إعادة ضبط' : 'Reset to recommended'}
                </Text>
              </Pressable>
            )}

            <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
              {isAr
                ? 'يُضاف هذا الوقت بعد الغروب الفلكي وفق معايير دار الإفتاء في بلدك'
                : "Minutes added after astronomical sunset per your country's Islamic authority standard"}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {isAr ? 'الإشعارات' : 'Notifications'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Row
            label={tr.notifications}
            right={
              <Switch
                value={draftNotifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: C.separator, true: C.tint }}
                thumbColor="#FFFFFF"
              />
            }
            noBorder
          />
        </View>

        {/* Dua */}
        <Text style={[styles.aboutText, { color: C.textMuted, fontFamily: 'Amiri_400Regular', marginTop: 20, textAlign: 'center' }]}>
          {tr.dua}
        </Text>

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
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 18,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
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
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  stepperLabel: { fontSize: 13, fontWeight: '500' },
  stepperControls: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  stepperBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 36, textAlign: 'center', fontSize: 15, fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  totalBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
