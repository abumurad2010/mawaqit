import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Modal, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { LANG_META, isRtlLang } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';

const ALL_LANGS: Lang[] = ['ar','en','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'];

export default function LangToggle() {
  const { lang, colors: C, updateSettings } = useApp();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const isRtl = isRtlLang(lang);

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
        <Text style={[styles.label, { color: C.tint }]}>
          {LANG_META[lang].code}
        </Text>
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
              const rtlItem = isRtlLang(l);
              return (
                <Pressable
                  key={l}
                  onPress={() => select(l)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: C.separator,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      flexDirection: isRtl ? 'row-reverse' : 'row',
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.native, { color: C.text, textAlign: rtlItem ? 'right' : 'left' }]}>
                      {LANG_META[l].native}
                    </Text>
                    <Text style={[styles.label2, { color: C.textSecond, textAlign: rtlItem ? 'right' : 'left' }]}>
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
  btn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 420,
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
    paddingVertical: 12,
    gap: 12,
  },
  native: { fontSize: 16, fontWeight: '500' },
  label2: { fontSize: 13 },
});
