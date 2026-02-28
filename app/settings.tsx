import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/colors';
import type { AccessibilityTheme } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { PrayerNotifConfig } from '@/contexts/AppContext';
import { t, LANG_META, isRtlLang, detectSecondLang } from '@/constants/i18n';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';
import { ALL_CALC_METHODS, getMethodForCountry } from '@/lib/method-by-country';
import { playAthan, stopAthan } from '@/lib/audio';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import type { SecondLang } from '@/contexts/AppContext';

const FONT_SIZES = ['small', 'medium', 'large'] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    isDark, lang, secondLang, resolvedSecondLang, calcMethod, asrMethod, maghribBase, countryCode,
    maghribAdjustment, fontSize, hijriAdjustment, accessibilityTheme,
    prayerNotifications, colors,
    updateSettings,
  } = useApp();
  const C = colors;
  const tr = t(lang);
  const isAr = lang === 'ar';
  const isRtl = isRtlLang(lang);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // Local draft state — nothing is saved until the user taps Save
  const [draftCalcMethod, setDraftCalcMethod] = useState(calcMethod);
  const [draftAsrMethod, setDraftAsrMethod] = useState(asrMethod);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftAdjustment, setDraftAdjustment] = useState(maghribAdjustment ?? 0);
  const [draftHijri, setDraftHijri] = useState(hijriAdjustment ?? 0);
  const [draftNotifications, setDraftNotifications] = useState<Record<string, PrayerNotifConfig>>(
    prayerNotifications ?? {}
  );
  const [draftSecondLang, setDraftSecondLang] = useState<SecondLang>(secondLang ?? 'auto');
  const [draftAccessibilityTheme, setDraftAccessibilityTheme] = useState(accessibilityTheme ?? 'default');
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const recommendedMethod = getMethodForCountry(countryCode);

  const handlePreview = async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (previewing === key) {
      await stopAthan();
      setPreviewing(null);
    } else {
      if (previewing) await stopAthan();
      setPreviewing(key);
      await playAthan('full');
      setPreviewing(null);
    }
  };

  const normNotif = (r: Record<string, PrayerNotifConfig>) =>
    JSON.stringify(Object.fromEntries(Object.entries(r).sort()));

  const hasChanges =
    draftCalcMethod !== calcMethod ||
    draftAsrMethod !== asrMethod ||
    draftFontSize !== fontSize ||
    draftAdjustment !== (maghribAdjustment ?? 0) ||
    draftHijri !== (hijriAdjustment ?? 0) ||
    draftSecondLang !== (secondLang ?? 'auto') ||
    draftAccessibilityTheme !== (accessibilityTheme ?? 'default') ||
    normNotif(draftNotifications) !== normNotif(prayerNotifications ?? {});

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const resolvedDraft = draftSecondLang === 'auto' ? detectSecondLang(countryCode) : draftSecondLang;
    const newLang = lang !== 'ar' ? resolvedDraft : lang;
    updateSettings({
      calcMethod: draftCalcMethod,
      asrMethod: draftAsrMethod,
      fontSize: draftFontSize,
      maghribAdjustment: draftAdjustment,
      hijriAdjustment: draftHijri,
      prayerNotifications: draftNotifications,
      secondLang: draftSecondLang,
      lang: newLang,
      accessibilityTheme: draftAccessibilityTheme,
    });
    router.back();
  };

  const NOTIF_PRAYERS: { key: string; ar: string; en: string }[] = [
    { key: 'fajr',    ar: 'الفجر',       en: 'Fajr' },
    { key: 'dhuha',   ar: 'الضحى',       en: 'Dhuha' },
    { key: 'dhuhr',   ar: 'الظهر',       en: 'Dhuhr' },
    { key: 'asr',     ar: 'العصر',       en: 'Asr' },
    { key: 'maghrib', ar: 'المغرب',      en: 'Maghrib' },
    { key: 'isha',    ar: 'العشاء',      en: 'Isha' },
    { key: 'qiyam',   ar: 'قيام الليل', en: 'Qiyam' },
  ];

  const EMPTY_CFG: PrayerNotifConfig = { banner: false, athan: 'none' };

  const requestNotifPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const setPrayerBanner = async (key: string, on: boolean) => {
    if (on && !await requestNotifPermission()) return;
    Haptics.selectionAsync();
    setDraftNotifications(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_CFG), banner: on },
    }));
  };

  const setPrayerAthan = async (key: string, athan: PrayerNotifConfig['athan']) => {
    if (athan !== 'none' && !await requestNotifPermission()) return;
    Haptics.selectionAsync();
    setDraftNotifications(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_CFG), athan },
    }));
  };


  const Row = ({
    label, right, noBorder,
  }: { label: string; right: React.ReactNode; noBorder?: boolean }) => (
    <View style={[
      styles.settingRow,
      { borderBottomColor: C.separator, borderBottomWidth: noBorder ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' }
    ]}>
      <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
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
      <Text style={{ color: selected ? '#fff' : C.textSecond, fontSize: 11, fontWeight: '600' }}>
        {value}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 4, paddingHorizontal: 16, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="close" size={20} color={C.textSecond} />
        </Pressable>
        <Text style={[styles.title, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : undefined }]}>
          {tr.settings}
        </Text>
        <View style={styles.headerActions}>
          <LangToggle />
          <ThemeToggle />
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
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Language */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
          {tr.language}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Pressable
            onPress={() => setShowLangModal(true)}
            style={({ pressed }) => [
              styles.settingRow,
              { borderBottomColor: C.separator, borderBottomWidth: 0, flexDirection: isRtl ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
                {isAr ? 'العربية' : tr.arabic} ↔ {draftSecondLang === 'auto'
                  ? `${tr.auto} · ${LANG_META[resolvedSecondLang].native}`
                  : LANG_META[draftSecondLang].native}
              </Text>
            </View>
            <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={18} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Language picker modal */}
        <Modal
          visible={showLangModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLangModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: C.background }}>
            <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : undefined }]}>
                {tr.language}
              </Text>
              <Pressable
                onPress={() => setShowLangModal(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Ionicons name="close" size={24} color={C.textMuted} />
              </Pressable>
            </View>
            <ScrollView>
              {/* Auto option */}
              {[{ value: 'auto' as SecondLang, native: tr.auto, label: `${LANG_META[resolvedSecondLang].native} (${tr.auto.toLowerCase()})` },
                ...(['en','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'] as const).map(l => ({
                  value: l as SecondLang,
                  native: LANG_META[l].native,
                  label: LANG_META[l].label,
                }))
              ].map((item, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const isSelected = draftSecondLang === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => { Haptics.selectionAsync(); setDraftSecondLang(item.value); setShowLangModal(false); }}
                    style={({ pressed }) => [
                      styles.settingRow,
                      { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row', paddingHorizontal: 20, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 16, color: C.text, fontWeight: '500', textAlign: isRtl ? 'right' : 'left' }}>
                        {item.native}
                      </Text>
                      <Text style={{ fontSize: 13, color: C.textSecond, textAlign: isRtl ? 'right' : 'left' }}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={C.tint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        {/* Quran font */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
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

        {/* Accessibility */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
          {isAr ? 'إمكانية الوصول' : 'Accessibility'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <Text style={[styles.explain, { color: C.textMuted, paddingTop: 12, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
            {isAr
              ? 'اختر نظام ألوان مناسب لاحتياجاتك البصرية'
              : 'Choose a colour theme suited to your visual needs'}
          </Text>
          {([
            {
              key: 'default' as AccessibilityTheme,
              label: isAr ? 'الافتراضي' : 'Default',
              desc: isAr ? 'النظام الأخضر القياسي' : 'Standard green theme',
              swatchLight: '#1a7a4a', swatchDark: '#34C759',
            },
            {
              key: 'high-contrast' as AccessibilityTheme,
              label: isAr ? 'تباين عالٍ' : 'High Contrast',
              desc: isAr ? 'أسود وأبيض خالص — أقصى وضوح' : 'Pure black & white, maximum clarity',
              swatchLight: '#000000', swatchDark: '#FFFFFF',
            },
            {
              key: 'colorblind' as AccessibilityTheme,
              label: isAr ? 'عمى الألوان' : 'Color Blind',
              desc: isAr ? 'لون أزرق مناسب لعمى الألوان' : 'Blue accent, deuteranopia-friendly',
              swatchLight: '#0055CC', swatchDark: '#409CFF',
            },
            {
              key: 'warm' as AccessibilityTheme,
              label: isAr ? 'دافئ' : 'Warm',
              desc: isAr ? 'يُخفف الضوء الأزرق — مريح للعيون' : 'Amber tones, reduced blue light',
              swatchLight: '#8C6400', swatchDark: '#E8A000',
            },
          ] as const).map((theme, idx, arr) => {
            const isSelected = draftAccessibilityTheme === theme.key;
            const isLast = idx === arr.length - 1;
            const swatch = isDark ? theme.swatchDark : theme.swatchLight;
            return (
              <Pressable
                key={theme.key}
                onPress={() => { Haptics.selectionAsync(); setDraftAccessibilityTheme(theme.key); }}
                style={[
                  styles.accessThemeRow,
                  {
                    borderBottomColor: C.separator,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    backgroundColor: isSelected ? C.tint + '12' : 'transparent',
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {/* Colour swatch */}
                <View style={[styles.accessSwatch, { backgroundColor: swatch }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.accessThemeLabel,
                    { color: isSelected ? C.tint : C.text, fontWeight: isSelected ? '700' : '500', fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {theme.label}
                  </Text>
                  <Text style={[
                    styles.accessThemeDesc,
                    { color: C.textMuted, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {theme.desc}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.tint} />}
              </Pressable>
            );
          })}
        </View>

        {/* Hijri date adjustment */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
          {isAr ? 'التقويم الهجري' : 'Hijri Calendar'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
              {tr.hijriAdjustment}
            </Text>
            <View style={[styles.stepperRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
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
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : undefined }]}>
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
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
          {isAr ? 'حساب أوقات الصلاة' : 'Prayer Calculation'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {/* Calculation method — dropdown row */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowMethodModal(true); }}
            style={[styles.settingRow, { borderBottomColor: C.separator, borderBottomWidth: 1, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
                {tr.calculationMethod}
              </Text>
              <Text style={{ color: C.tint, fontSize: 12, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }} numberOfLines={1}>
                {tr.methods[draftCalcMethod] ?? draftCalcMethod}
              </Text>
            </View>
            <Ionicons name={isRtl ? 'chevron-back' : 'chevron-forward'} size={18} color={C.textMuted} />
          </Pressable>

          {/* Method picker modal */}
          <Modal visible={showMethodModal} animationType="slide" transparent presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: C.separator, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.modalTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : undefined }]}>
                  {tr.calculationMethod}
                </Text>
                <Pressable onPress={() => setShowMethodModal(false)}>
                  <Ionicons name="close" size={22} color={C.textSecond} />
                </Pressable>
              </View>
              <ScrollView>
                {ALL_CALC_METHODS.map((m, idx) => {
                  const label = tr.methods[m] ?? m;
                  const isSelected = draftCalcMethod === m;
                  const isRecommended = recommendedMethod === m;
                  const isLast = idx === ALL_CALC_METHODS.length - 1;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDraftCalcMethod(m);
                        setShowMethodModal(false);
                      }}
                      style={[
                        styles.methodRow,
                        { borderBottomColor: C.separator, borderBottomWidth: isLast ? 0 : 1, flexDirection: isRtl ? 'row-reverse' : 'row' },
                        isSelected && { backgroundColor: C.tint + '18' },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{
                          fontSize: 13, fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? C.tint : C.text,
                          fontFamily: isRtl ? 'Amiri_400Regular' : undefined,
                          textAlign: isRtl ? 'right' : 'left',
                        }}>
                          {label}
                        </Text>
                        {isRecommended && (
                          <View style={[styles.recommendedBadge, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="location-outline" size={11} color={C.tint} />
                            <Text style={{ fontSize: 11, color: C.tint, fontFamily: isRtl ? 'Amiri_400Regular' : undefined }}>
                              {tr.recommendedForLocation}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Modal>

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
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: isRtl ? 'flex-end' : 'flex-start', gap: 8 }]}>
            <Text style={[styles.settingLabel, { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
              {isAr ? 'احتياط المغرب' : 'Maghrib Safety Margin'}
            </Text>

            {/* Recommended base */}
            <View style={[styles.autoOffsetBadge, { backgroundColor: C.tint + '22', borderColor: C.tint + '55', flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Ionicons name="location-outline" size={13} color={C.tint} />
              <Text style={[styles.autoOffsetText, { color: C.tint }]}>
                {isAr
                  ? `موصى به: ${maghribBase} ${maghribBase === 1 ? 'دقيقة' : 'دقائق'}${countryCode ? ` (${countryCode})` : ''}`
                  : `Recommended: ${maghribBase} min${countryCode ? ` (${countryCode})` : ''}`}
              </Text>
            </View>

            {/* Stepper row */}
            <View style={[styles.stepperRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.stepperLabel, { color: C.textSecond, fontFamily: isRtl ? 'Amiri_400Regular' : undefined }]}>
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

            <Text style={[styles.explain, { color: C.textMuted, paddingHorizontal: 0, paddingBottom: 0, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }]}>
              {isAr
                ? 'يُضاف هذا الوقت بعد الغروب الفلكي وفق معايير دار الإفتاء في بلدك'
                : "Minutes added after astronomical sunset per your country's Islamic authority standard"}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: C.tint, fontFamily: isRtl ? 'Amiri_700Bold' : undefined, textAlign: isRtl ? 'right' : 'left', marginLeft: isRtl ? 0 : 4, marginRight: isRtl ? 4 : 0 }]}>
          {isAr ? 'الإشعارات' : 'Notifications'}
        </Text>
        <View style={[styles.card, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          {NOTIF_PRAYERS.map((prayer, idx) => {
            const cfg: PrayerNotifConfig = draftNotifications[prayer.key] ?? EMPTY_CFG;
            const hasBanner = cfg.banner;
            const hasAthan = cfg.athan !== 'none';
            const isLast = idx === NOTIF_PRAYERS.length - 1;

            return (
              <View key={prayer.key} style={[
                styles.notifItem,
                { borderBottomColor: C.separator, borderBottomWidth: isLast && !hasAthan ? 0 : 1 }
              ]}>
                {/* Main row: prayer name + Banner toggle + Athan toggle */}
                <View style={[styles.notifRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Text style={[
                    styles.notifLabel,
                    { color: C.text, fontFamily: isRtl ? 'Amiri_400Regular' : undefined, textAlign: isRtl ? 'right' : 'left' }
                  ]}>
                    {isAr ? prayer.ar : prayer.en}
                  </Text>
                  <View style={styles.notifChips}>

                    {/* Banner toggle — ring bell */}
                    <Pressable
                      onPress={() => setPrayerBanner(prayer.key, !hasBanner)}
                      style={[styles.iconChip, {
                        backgroundColor: hasBanner ? C.tint : C.backgroundSecond,
                        borderColor: hasBanner ? C.tint : C.separator,
                      }]}
                    >
                      <Ionicons
                        name={hasBanner ? 'notifications' : 'notifications-outline'}
                        size={16}
                        color={hasBanner ? '#fff' : C.textSecond}
                      />
                    </Pressable>

                    {/* Athan toggle — speaker */}
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, hasAthan ? 'none' : 'full')}
                      style={[styles.iconChip, {
                        backgroundColor: hasAthan ? C.tint : C.backgroundSecond,
                        borderColor: hasAthan ? C.tint : C.separator,
                      }]}
                    >
                      <Ionicons
                        name={hasAthan ? 'volume-high' : 'volume-mute'}
                        size={16}
                        color={hasAthan ? '#fff' : C.textSecond}
                      />
                    </Pressable>

                  </View>
                </View>

                {/* Sub-row: Full / Abbreviated + Preview — only when athan active */}
                {hasAthan && (
                  <View style={[styles.notifSubRow, {
                    borderTopColor: C.separator,
                    borderBottomColor: C.separator,
                    borderBottomWidth: isLast ? 0 : 0,
                    flexDirection: isRtl ? 'row-reverse' : 'row'
                  }]}>
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, 'full')}
                      style={[styles.subChip, {
                        backgroundColor: cfg.athan === 'full' ? C.tint + '20' : 'transparent',
                        borderColor: cfg.athan === 'full' ? C.tint : C.separator,
                      }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.athan === 'full' ? C.tint : C.textSecond }}>
                        {isAr ? 'كامل' : 'Full'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPrayerAthan(prayer.key, 'abbreviated')}
                      style={[styles.subChip, {
                        backgroundColor: cfg.athan === 'abbreviated' ? C.tint + '20' : 'transparent',
                        borderColor: cfg.athan === 'abbreviated' ? C.tint : C.separator,
                      }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.athan === 'abbreviated' ? C.tint : C.textSecond }}>
                        {isAr ? 'مختصر' : 'Abbr.'}
                      </Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => handlePreview(prayer.key)}
                      style={[styles.previewBtn, { borderColor: C.separator }]}
                    >
                      <Ionicons
                        name={previewing === prayer.key ? 'stop-circle-outline' : 'play-circle-outline'}
                        size={14}
                        color={previewing === prayer.key ? C.tint : C.textSecond}
                      />
                      <Text style={{ fontSize: 11, color: previewing === prayer.key ? C.tint : C.textSecond, fontWeight: '500' }}>
                        {isAr ? 'معاينة' : 'Preview'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16,
  },
  saveBtnText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', marginTop: 18, marginBottom: 6,
  },
  card: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, flexWrap: 'wrap', gap: 8,
  },
  settingLabel: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  rightSide: { flexShrink: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    gap: 12,
  },
  recommendedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  modalContainer: {
    flex: 1, marginTop: Platform.OS === 'ios' ? 40 : 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: '700' },
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
  stepperLabel: { fontSize: 12, fontWeight: '500' },
  stepperControls: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  stepperBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  totalBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  notifItem: {
    paddingHorizontal: 16, paddingVertical: 10,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  notifLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  notifChips: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  iconChip: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifSubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  subChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  accessThemeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  accessSwatch: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  accessThemeLabel: { fontSize: 13, marginBottom: 2 },
  accessThemeDesc: { fontSize: 11, lineHeight: 15 },
});
