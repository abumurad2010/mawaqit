import React from 'react';
import { Image, StyleSheet, View, useColorScheme } from 'react-native';

export default function PageBackground() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return (
    <View style={[styles.bg, { opacity: isDark ? 0.22 : 0.18 }]} pointerEvents="none">
      <Image
        source={require('@/assets/images/bg-prayer.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
});
