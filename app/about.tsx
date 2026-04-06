import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';

const GOLD = '#C9A84C';
const riwaqLogoDark = require('@/assets/images/riwaq-labs-logo-dark.jpg');
const riwaqLogoLight = require('@/assets/images/riwaq-labs-logo.png');
const appIcon = require('@/assets/images/icon.png');
const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const { colors, lang, isRtl, isDark } = useApp();
  const C = colors;
  const tr = t(lang);
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const textDir = isRtl ? 'right' : 'left';
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const fontFamily = isRtl ? 'Amiri_400Regular' : 'Inter_400Regular';

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* ─── Header ─── */}
      <View style={[
        styles.header,
        { backgroundColor: C.background, borderBottomColor: C.separator, paddingTop: topInset + 12 },
      ]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold' }]}>
          {tr.about_label}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={22} color={C.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── SECTION 1: App Header ─── */}
        <View style={styles.section}>
          <Image source={appIcon} style={styles.appIcon} />
          <Text style={[styles.appName, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
            {'مواقيت · Mawaqit'}
          </Text>
          <Text style={[styles.appTagline, { color: C.textMuted }]}>
            {tr.about_app_tagline}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            v{APP_VERSION}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 2: Studio Identity ─── */}
        <View style={styles.section}>
          <Text style={[styles.developedBy, { color: C.textMuted }]}>
            {tr.developed_by}
          </Text>
          <Image
            source={isDark ? riwaqLogoDark : riwaqLogoLight}
            style={styles.riwaqLogo}
          />
          <Text style={[styles.studioTagline, { color: C.textMuted }]}>
            {tr.about_tagline}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 3: Mission ─── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDir }]}>
            <View style={[styles.accentBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.sectionTitle, { color: C.text, textAlign: textDir, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_700Bold' }]}>
              {tr.about_mission_title}
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: C.textMuted, textAlign: textDir, fontFamily }]}>
            {tr.about_mission_p1}
          </Text>
          <Text style={[styles.bodyText, { color: C.textMuted, textAlign: textDir, fontFamily, marginTop: 10 }]}>
            {tr.about_mission_p2}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 4: Our Promise ─── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDir }]}>
            <View style={[styles.accentBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.sectionTitle, { color: C.text, textAlign: textDir, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_700Bold' }]}>
              {tr.about_promise_title}
            </Text>
          </View>

          {[
            { icon: 'currency-usd-off' as const, title: tr.about_promise_1_title, body: tr.about_promise_1_body },
            { icon: 'hand-heart-outline' as const, title: tr.about_promise_2_title, body: tr.about_promise_2_body },
            { icon: 'shield-lock-outline' as const, title: tr.about_promise_3_title, body: tr.about_promise_3_body },
          ].map((card, i) => (
            <View key={i} style={[styles.promiseCard, { backgroundColor: C.backgroundCard, borderColor: C.separator, flexDirection: rowDir }]}>
              <MaterialCommunityIcons name={card.icon} size={28} color={C.tint} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: C.text, textAlign: textDir, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_600SemiBold' }]}>
                  {card.title}
                </Text>
                <Text style={[styles.cardBody, { color: C.textMuted, textAlign: textDir, fontFamily }]}>
                  {card.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 5: Our Apps ─── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: rowDir }]}>
            <View style={[styles.accentBar, { backgroundColor: C.tint }]} />
            <Text style={[styles.sectionTitle, { color: C.text, textAlign: textDir, fontFamily: isRtl ? 'Amiri_700Bold' : 'Inter_700Bold' }]}>
              {tr.about_apps_title}
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: C.textMuted, textAlign: textDir, fontFamily, marginBottom: 12 }]}>
            {tr.about_apps_subtitle}
          </Text>

          {/* App rows */}
          {[
            {
              icon: <Image source={appIcon} style={{ width: 36, height: 36, borderRadius: 8 }} />,
              name: 'Mawaqit | مواقيت',
              badge: tr.availableNow,
              badgeStyle: { backgroundColor: C.tint },
              badgeTextStyle: { color: '#FFFFFF' },
            },
            {
              icon: <MaterialCommunityIcons name="book-open-variant" size={28} color={C.tint} />,
              name: 'Al-Quran | القرآن الكريم',
              badge: tr.comingSoon,
              badgeStyle: { backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.separator },
              badgeTextStyle: { color: C.textMuted },
            },
            {
              icon: <MaterialCommunityIcons name="hands-pray" size={28} color={C.tint} />,
              name: 'Athkar | الأذكار',
              badge: tr.comingSoon,
              badgeStyle: { backgroundColor: C.backgroundCard, borderWidth: 1, borderColor: C.separator },
              badgeTextStyle: { color: C.textMuted },
            },
            {
              icon: <MaterialCommunityIcons name="smoking-off" size={28} color={C.tint} />,
              name: 'Quit | أقلع',
              sub: tr.about_app_quit_desc,
              badge: tr.inDevelopment,
              badgeStyle: { backgroundColor: GOLD + '20', borderWidth: 1, borderColor: GOLD },
              badgeTextStyle: { color: GOLD },
            },
          ].map((row, i, arr) => (
            <View
              key={i}
              style={[
                styles.appRow,
                { flexDirection: rowDir, borderBottomColor: C.separator, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 },
              ]}
            >
              <View style={styles.appIconWrap}>{row.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appName2, { color: C.text, textAlign: textDir, fontFamily: isRtl ? 'Amiri_400Regular' : 'Inter_600SemiBold' }]}>
                  {row.name}
                </Text>
                {row.sub ? (
                  <Text style={[styles.appSub, { color: C.textMuted, textAlign: textDir, fontFamily }]}>
                    {row.sub}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.badge, row.badgeStyle]}>
                <Text style={[styles.badgeText, row.badgeTextStyle]}>{row.badge}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 6: Closing Dua ─── */}
        <View style={[styles.section, { alignItems: 'center' }]}>
          <Text style={[styles.duaArabic, { color: C.tint, fontFamily: 'Amiri_700Bold' }]}>
            {'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ'}
          </Text>
          <Text style={[styles.duaTranslation, { color: C.textMuted }]}>
            {tr.about_closing_dua}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: C.separator }]} />

        {/* ─── SECTION 7: Footer ─── */}
        <View style={[styles.section, { alignItems: 'center', gap: 8 }]}>
          <Text style={[styles.footerVersion, { color: C.textMuted }]}>
            {`Mawaqit | مواقيت  v${APP_VERSION}`}
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => Linking.openURL('https://mawaqits.com/privacy')}>
              <Text style={[styles.link, { color: C.tint }]}>{tr.about_privacy_link}</Text>
            </Pressable>
            <Text style={[styles.footerDot, { color: C.textMuted }]}>{' · '}</Text>
            <Pressable onPress={() => Linking.openURL('mailto:contact@riwaqlabs.com')}>
              <Text style={[styles.link, { color: C.tint }]}>{tr.about_contact_link}</Text>
            </Pressable>
          </View>
          <Text style={[styles.copyright, { color: C.textMuted }]}>
            {'© 2025 Riwaq Labs · رواق لابز'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: {
    position: 'absolute',
    right: 20,
    bottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    paddingVertical: 20,
    gap: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  appIcon: {
    width: 80, height: 80, borderRadius: 18,
    alignSelf: 'center',
  },
  appName: {
    fontSize: 22,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 14,
    textAlign: 'center',
  },
  developedBy: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  riwaqLogo: {
    width: 160, height: 58,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  studioTagline: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  accentBar: {
    width: 3, height: 18, borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  promiseCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  appRow: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  appIconWrap: {
    width: 40,
    alignItems: 'center',
  },
  appName2: {
    fontSize: 14,
    fontWeight: '500',
  },
  appSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  duaArabic: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 36,
  },
  duaTranslation: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 11,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    fontSize: 12,
  },
  footerDot: {
    fontSize: 12,
  },
  copyright: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
});
