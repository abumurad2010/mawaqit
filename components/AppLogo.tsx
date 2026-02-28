import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface AppLogoProps {
  tintColor?: string;
  lang?: 'ar' | 'en';
}

export default function AppLogo(_props: AppLogoProps) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={styles.image}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { width: 70, height: 70 },
});
