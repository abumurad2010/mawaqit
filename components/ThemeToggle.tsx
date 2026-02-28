import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

const CYCLE: Array<'light' | 'dark' | 'auto'> = ['auto', 'light', 'dark'];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  light: 'sunny',
  dark:  'moon',
  auto:  'contrast-outline',
};

export default function ThemeToggle() {
  const { themeMode, isDark, colors, updateSettings } = useApp();
  const C = colors;

  const cycle = () => {
    Haptics.selectionAsync();
    const next = CYCLE[(CYCLE.indexOf(themeMode) + 1) % CYCLE.length];
    updateSettings({ themeMode: next });
  };

  return (
    <Pressable
      onPress={cycle}
      style={({ pressed }) => [styles.btn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons
        name={ICONS[themeMode]}
        size={18}
        color={themeMode === 'auto' ? C.textSecond : C.tint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
