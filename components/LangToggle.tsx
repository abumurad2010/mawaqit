import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function LangToggle() {
  const { lang, isDark, updateSettings } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const toggle = () => {
    Haptics.selectionAsync();
    updateSettings({ lang: lang === 'ar' ? 'en' : 'ar' });
  };

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.btn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.label, { color: C.tint }]}>
        {lang === 'ar' ? 'EN' : 'ع'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn:   { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700' },
});
