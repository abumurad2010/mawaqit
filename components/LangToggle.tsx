import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Modal, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { LANG_META, LANG_FLAG } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';

const ALL_LANGS: Lang[] = ['ar','en','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'];

export default function LangToggle() {
  const { lang, colors: C, updateSettings } = useApp();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const select = (l: Lang) => {
    Haptics.selectionAsync();
    updateSettings({ lang: l });
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setOpen(true); }}
        style={({ pressed }) => [styles.btn, { backgroundColor: C.backgroundCard, opacity: pressed ? 0.6 : 1 }]}
        testID="lang-toggle-btn"
      >
        <Text style={styles.btnFlag}>{LANG_FLAG[lang]}</Text>
        <Text style={[styles.btnLabel, { color: C.tint }]}>{LANG_META[lang].code}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[
          styles.sheet,
          {
            backgroundColor: C.backgroundCard,
            paddingBottom: insets.bottom + 8,
            top: Platform.OS === 'web' ? 67 : insets.top + 56,
          },
        ]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {ALL_LANGS.map((l, idx) => {
              const isSelected = lang === l;
              const isLast = idx === ALL_LANGS.length - 1;
              return (
                <Pressable
                  key={l}
                  onPress={() => select(l)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: C.separator,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={styles.flag}>{LANG_FLAG[l]}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.native, { color: C.text }]}>
                      {LANG_META[l].native}
                    </Text>
                    <Text style={[styles.sub, { color: C.textSecond }]}>
                      {LANG_META[l].label}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={C.tint} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: 12 },
  btnFlag: { fontSize: 18, lineHeight: 22 },
  btnLabel: { fontSize: 12, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 14,
  },
  flag: { fontSize: 22, lineHeight: 28 },
  native: { fontSize: 16, fontWeight: '500', textAlign: 'left' },
  sub: { fontSize: 13, textAlign: 'left' },
});
