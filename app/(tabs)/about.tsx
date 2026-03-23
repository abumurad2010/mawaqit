import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Amiri_700Bold } from '@expo-google-fonts/amiri';
import * as Linking from 'expo-linking';

import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { SERIF_EN } from '@/constants/typography';

const APP_VERSION = '1.0.0';
const GOLD = '#C9A84C';

export default function AboutScreen() {
  const { colors, lang, isRtl } = useApp();
  const C = colors;
  const tr = t(lang);
  const insets = useSafeAreaInsets();

  const textDir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';

  function SectionTitle({ label }: { label: string }) {
    return (
      <View style={[styles.sectionTitleRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.sectionAccent, { backgroundColor: C.tint }]} />
        <Text style={[styles.sectionTitle, { color: C.text, textAlign }]}>{label}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── SECTION 1: App Header ─── */}
      <View style={styles.appHeaderSection}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.appIcon}
        />
        <Text style={[styles.appName, { color: C.tint, fontFamily: Amiri_700Bold }]}>
          مواقيت · Mawaqit
        </Text>
        <Text style={[styles.appTagline, { color: C.textMuted }]}>
          {tr.about_app_tagline}
        </Text>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 2: Studio Identity ─── */}
      <View style={styles.section}>
        <Text style={[styles.studioName, { color: C.text, fontFamily: SERIF_EN }]}>
          Riwaq Labs
        </Text>
        <Text style={[styles.studioArabic, { color: C.tint, fontFamily: Amiri_700Bold }]}>
          رواق لابز
        </Text>
        <Text style={[styles.studioTagline, { color: C.textMuted }]}>
          {tr.about_tagline}
        </Text>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 3: Mission ─── */}
      <View style={styles.section}>
        <SectionTitle label={tr.about_mission_title} />
        <Text
          style={[styles.bodyText, { color: C.textMuted, textAlign, writingDirection: textDir }]}
        >
          {tr.about_mission_p1}
        </Text>
        <Text
          style={[styles.bodyText, { color: C.textMuted, textAlign, writingDirection: textDir, marginTop: 10 }]}
        >
          {tr.about_mission_p2}
        </Text>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 4: Our Promise ─── */}
      <View style={styles.section}>
        <SectionTitle label={tr.about_promise_title} />

        {/* Card 1 */}
        <View style={[styles.promiseCard, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="tag-off-outline" size={28} color={C.tint} />
            <Text style={[styles.cardTitle, { color: C.text, textAlign, marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0 }]}>
              {tr.about_promise_1_title}
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: C.textMuted, textAlign, writingDirection: textDir }]}>
            {tr.about_promise_1_body}
          </Text>
        </View>

        {/* Card 2 */}
        <View style={[styles.promiseCard, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="hand-heart-outline" size={28} color={C.tint} />
            <Text style={[styles.cardTitle, { color: C.text, textAlign, marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0 }]}>
              {tr.about_promise_2_title}
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: C.textMuted, textAlign, writingDirection: textDir }]}>
            {tr.about_promise_2_body}
          </Text>
        </View>

        {/* Card 3 */}
        <View style={[styles.promiseCard, { backgroundColor: C.backgroundCard, borderColor: C.separator }]}>
          <View style={[styles.cardHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={28} color={C.tint} />
            <Text style={[styles.cardTitle, { color: C.text, textAlign, marginLeft: isRtl ? 0 : 10, marginRight: isRtl ? 10 : 0 }]}>
              {tr.about_promise_3_title}
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: C.textMuted, textAlign, writingDirection: textDir }]}>
            {tr.about_promise_3_body}
          </Text>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 5: Our Apps ─── */}
      <View style={styles.section}>
        <SectionTitle label={tr.about_apps_title} />
        <Text style={[styles.bodyText, { color: C.textMuted, textAlign, writingDirection: textDir, marginBottom: 16 }]}>
          {tr.about_apps_subtitle}
        </Text>

        {/* Row 1: Mawaqit */}
        <View style={[styles.appRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomColor: C.separator }]}>
          <Image source={require('@/assets/images/icon.png')} style={styles.appRowIcon} />
          <Text style={[styles.appRowName, { color: C.text, flex: 1, textAlign: isRtl ? 'right' : 'left' }]}>
            Mawaqit | مواقيت
          </Text>
          <View style={[styles.badge, { backgroundColor: C.tintLight, borderColor: C.tint }]}>
            <Text style={[styles.badgeText, { color: C.tint }]}>
              {isRtl ? 'متوفر الآن' : 'Available Now'}
            </Text>
          </View>
        </View>

        {/* Row 2: Al-Quran */}
        <View style={[styles.appRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomColor: C.separator }]}>
          <View style={styles.appRowIconPlaceholder}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color={C.tint} />
          </View>
          <Text style={[styles.appRowName, { color: C.text, flex: 1, textAlign: isRtl ? 'right' : 'left' }]}>
            Al-Quran | القرآن الكريم
          </Text>
          <View style={[styles.badge, { backgroundColor: 'transparent', borderColor: C.separator }]}>
            <Text style={[styles.badgeText, { color: C.textMuted }]}>
              {isRtl ? 'قريباً' : 'Coming Soon'}
            </Text>
          </View>
        </View>

        {/* Row 3: Athkar */}
        <View style={[styles.appRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomColor: C.separator }]}>
          <View style={styles.appRowIconPlaceholder}>
            <MaterialCommunityIcons name="hands-pray" size={24} color={C.tint} />
          </View>
          <Text style={[styles.appRowName, { color: C.text, flex: 1, textAlign: isRtl ? 'right' : 'left' }]}>
            Athkar | الأذكار
          </Text>
          <View style={[styles.badge, { backgroundColor: 'transparent', borderColor: C.separator }]}>
            <Text style={[styles.badgeText, { color: C.textMuted }]}>
              {isRtl ? 'قريباً' : 'Coming Soon'}
            </Text>
          </View>
        </View>

        {/* Row 4: Quit */}
        <View style={[styles.appRow, { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomColor: C.separator }]}>
          <View style={styles.appRowIconPlaceholder}>
            <MaterialCommunityIcons name="smoking-off" size={24} color={C.tint} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={[styles.appRowName, { color: C.text, textAlign: isRtl ? 'right' : 'left' }]}>
              Quit | أقلع
            </Text>
            <Text style={[styles.appRowDesc, { color: C.textMuted, textAlign: isRtl ? 'right' : 'left' }]}>
              {tr.about_app_quit_desc}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(201,168,76,0.12)', borderColor: GOLD }]}>
            <Text style={[styles.badgeText, { color: GOLD }]}>
              {isRtl ? 'قيد التطوير' : 'In Development'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 6: Closing Dua ─── */}
      <View style={styles.duaSection}>
        <Text style={[styles.duaArabic, { color: C.tint, fontFamily: Amiri_700Bold }]}>
          رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ
        </Text>
        <Text style={[styles.duaTranslation, { color: C.textMuted }]}>
          {tr.about_closing_dua}
        </Text>
      </View>

      <View style={[styles.separator, { backgroundColor: C.separator }]} />

      {/* ─── SECTION 7: Footer ─── */}
      <View style={styles.footerSection}>
        <View style={styles.footerLinks}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://mawaqits.com/privacy')}
            testID="about-privacy-link"
          >
            <Text style={[styles.footerLink, { color: C.tint }]}>
              {tr.about_privacy_link}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.footerDot, { color: C.textMuted }]}>·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:contact@riwaqlabs.com')}
            testID="about-contact-link"
          >
            <Text style={[styles.footerLink, { color: C.tint }]}>
              {tr.about_contact_link}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.versionText, { color: C.textMuted }]}>
          v{APP_VERSION}
        </Text>
        <Text style={[styles.copyrightText, { color: C.textMuted }]}>
          © 2025 Riwaq Labs · رواق لابز
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },

  /* App Header */
  appHeaderSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  appName: {
    fontSize: 22,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 14,
    textAlign: 'center',
  },

  separator: {
    height: 1,
    marginVertical: 4,
    borderRadius: 1,
  },

  /* Sections */
  section: {
    paddingVertical: 24,
    gap: 12,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },

  /* Studio Identity */
  studioName: {
    fontSize: 28,
    textAlign: 'center',
    fontWeight: '700',
  },
  studioArabic: {
    fontSize: 20,
    textAlign: 'center',
  },
  studioTagline: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  /* Promise Cards */
  promiseCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  /* Apps List */
  appRow: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  appRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  appRowIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  appRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Closing Dua */
  duaSection: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  duaArabic: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 38,
  },
  duaTranslation: {
    fontSize: 12,
    textAlign: 'center',
  },

  /* Footer */
  footerSection: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerDot: {
    fontSize: 13,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
  },
  copyrightText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
