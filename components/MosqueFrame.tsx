import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Lang } from '@/constants/i18n';

interface MosqueFrameProps {
  color: string;
  lang: Lang;
}

export function MosqueSilhouette({ color, size = 1 }: { color: string; size?: number }) {
  const s = size;
  return (
    <View style={[styles.silouette, { opacity: 0.65 }]}>
      {/* Far left minaret */}
      <View style={[styles.minaretThin, { height: 18 * s, backgroundColor: color }]} />
      <View style={{ width: 3 * s }} />
      {/* Left minaret */}
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.minaretCap, { backgroundColor: color, width: 5 * s, height: 4 * s, borderRadius: 2.5 * s }]} />
        <View style={[styles.minaretShaft, { backgroundColor: color, width: 5 * s, height: 22 * s }]} />
      </View>
      <View style={{ width: 2 * s }} />
      {/* Left arch */}
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.archDome, { backgroundColor: color, width: 16 * s, height: 8 * s, borderTopLeftRadius: 8 * s, borderTopRightRadius: 8 * s }]} />
        <View style={[styles.archBody, { backgroundColor: color, width: 16 * s, height: 10 * s }]} />
      </View>
      <View style={{ width: 2 * s }} />
      {/* Central dome (main) */}
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.centralCap, { backgroundColor: color, width: 4 * s, height: 5 * s, borderRadius: 2 * s }]} />
        <View style={[styles.centralDome, { backgroundColor: color, width: 32 * s, height: 16 * s, borderTopLeftRadius: 16 * s, borderTopRightRadius: 16 * s }]} />
        <View style={[styles.centralBody, { backgroundColor: color, width: 36 * s, height: 12 * s }]} />
      </View>
      <View style={{ width: 2 * s }} />
      {/* Right arch */}
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.archDome, { backgroundColor: color, width: 16 * s, height: 8 * s, borderTopLeftRadius: 8 * s, borderTopRightRadius: 8 * s }]} />
        <View style={[styles.archBody, { backgroundColor: color, width: 16 * s, height: 10 * s }]} />
      </View>
      <View style={{ width: 2 * s }} />
      {/* Right minaret */}
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.minaretCap, { backgroundColor: color, width: 5 * s, height: 4 * s, borderRadius: 2.5 * s }]} />
        <View style={[styles.minaretShaft, { backgroundColor: color, width: 5 * s, height: 22 * s }]} />
      </View>
      <View style={{ width: 3 * s }} />
      {/* Far right minaret */}
      <View style={[styles.minaretThin, { height: 18 * s, backgroundColor: color }]} />
    </View>
  );
}

export function MosqueHeader({ color, lang }: MosqueFrameProps) {
  const isAr = lang === 'ar';
  return (
    <View style={styles.headerWrap}>
      <Text style={[styles.appName, { color, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
        {isAr ? 'مواقيت' : 'Mawaqit'}
      </Text>
      <MosqueSilhouette color={color} />
      <View style={[styles.dividerLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  silouette: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
  },
  minaretThin: {
    width: 3,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  minaretCap: {},
  minaretShaft: {},
  archDome: {},
  archBody: {},
  centralCap: {
    marginBottom: 1,
  },
  centralDome: {},
  centralBody: {},
  dividerLine: {
    height: 0.5,
    width: '80%',
    opacity: 0.4,
    marginTop: 4,
  },
});
