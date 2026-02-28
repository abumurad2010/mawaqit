import React from 'react';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';

export default function PageBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <Image
      source={require('@/assets/images/bg-kaaba.png')}
      style={[styles.bg, { width: width * 1.1, height: height * 0.7 }]}
      resizeMode="contain"
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    bottom: -40,
    right: -60,
    opacity: 0.06,
    zIndex: 0,
  },
});
