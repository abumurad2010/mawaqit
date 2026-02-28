import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { LANG_META } from '@/constants/i18n';

export default function LangToggle() {
  const { lang, resolvedSecondLang, isDark, colors, updateSettings } = useApp();
  const C = colors;

  const toggle = () => {
    Haptics.selectionAsync();
    if (lang === 'ar') {
      updateSettings({ lang: resolvedSecondLang });
    } else {
      updateSettings({ lang: 'ar' });
    }
  };

  const labelToShow =
    lang === 'ar'
      ? LANG_META[resolvedSecondLang].code
      : 'ع';

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.btn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.label, { color: C.tint }]}>
        {labelToShow}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn:   { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
});
