import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AppLogoProps {
  tintColor: string;
  lang: 'ar' | 'en';
}

export default function AppLogo({ tintColor, lang }: AppLogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={[styles.name, { color: tintColor }]}>
        {lang === 'ar' ? 'مواقيت' : 'Mawaqit'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  image: { width: 36, height: 36, borderRadius: 8 },
  name: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
