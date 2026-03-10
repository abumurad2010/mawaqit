import React from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrivacyPolicy() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <Text style={styles.title}>Privacy Policy — Mawaqit | مواقيت</Text>
      <Text style={styles.date}>Last updated: March 2026</Text>

      <Text style={styles.section}>1. Introduction</Text>
      <Text style={styles.body}>
        Mawaqit ("the App") is an Islamic utility application providing prayer
        times, Qibla direction, Quran, Athkar, and Hijri calendar. This Privacy
        Policy explains how we handle your information. We are committed to
        protecting your privacy and complying with applicable data protection
        laws.
      </Text>

      <Text style={styles.section}>2. Information We Collect</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>Location Data:</Text> The App requests access
        to your device location solely to calculate accurate prayer times and
        Qibla direction for your city. Location data is processed entirely on
        your device and is never transmitted to our servers or any third party.
        {"\n\n"}
        <Text style={styles.bold}>User Preferences:</Text> Settings such as your
        chosen prayer calculation method, language, theme, and notification
        preferences are stored locally on your device using AsyncStorage. This
        data never leaves your device.{"\n\n"}
        <Text style={styles.bold}>No Account Required:</Text> The App does not
        require you to create an account, register, or provide any personal
        information such as name, email, or phone number.
      </Text>

      <Text style={styles.section}>3. Information We Do NOT Collect</Text>
      <Text style={styles.body}>
        We do not collect, store, or transmit:{"\n"}• Personal identification
        information{"\n"}• Device identifiers or advertising IDs{"\n"}• Usage
        analytics or behavioral data{"\n"}• Crash reports sent to third parties
        {"\n"}• Any data to external servers
      </Text>

      <Text style={styles.section}>4. Permissions</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>Location (optional):</Text> Used only to
        auto-detect your city for prayer time calculation. You may manually
        enter your city instead and deny this permission.{"\n\n"}
        <Text style={styles.bold}>Notifications (optional):</Text> Used to
        deliver Adhan and Athkar reminders at times you configure. You may
        disable notifications at any time in your device settings.
      </Text>

      <Text style={styles.section}>5. Third-Party Services</Text>
      <Text style={styles.body}>
        The App does not integrate any third-party advertising networks,
        analytics services, or social media SDKs. The Quran audio and text
        content is sourced from open Islamic data repositories and is bundled
        within the App.
      </Text>

      <Text style={styles.section}>6. Children's Privacy</Text>
      <Text style={styles.body}>
        The App is suitable for all ages. We do not knowingly collect any
        information from children under the age of 13.
      </Text>

      <Text style={styles.section}>7. Changes to This Policy</Text>
      <Text style={styles.body}>
        We may update this Privacy Policy from time to time. Any changes will be
        reflected with an updated date at the top of this page. Continued use of
        the App after changes constitutes acceptance of the updated policy.
      </Text>

      <Text style={styles.section}>8. Contact</Text>
      <Text style={styles.body}>
        If you have any questions about this Privacy Policy, please contact us
        at:{"\n"}
        mawaqit.app@gmail.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 6 },
  date: { fontSize: 12, color: "#888", marginBottom: 24 },
  section: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginTop: 20,
    marginBottom: 6,
  },
  body: { fontSize: 13, color: "#444", lineHeight: 22 },
  bold: { fontWeight: "700", color: "#222" },
});
