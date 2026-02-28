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
  container: { alignItems: 'center', gap: 3 },
  image: { width: 40, height: 40 },
  name: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
});
