import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Lang } from '@/constants/i18n';

interface MosqueFrameProps {
  color: string;
  lang: Lang;
}

export function MosqueSilhouette({ color, size = 1 }: { color: string; size?: number }) {
  const s = size;
  const op = 0.7;
  return (
    <View style={[styles.wrapper, { opacity: op }]}>
      {/* Far-left tall minaret */}
      <View style={{ alignItems: 'center', marginRight: 2 * s }}>
        <View style={[styles.minaretPoint, { borderLeftWidth: 2.5 * s, borderRightWidth: 2.5 * s, borderBottomWidth: 5 * s, borderBottomColor: color }]} />
        <View style={[styles.minaretBand, { width: 5 * s, height: 2 * s, backgroundColor: color }]} />
        <View style={[styles.minaretShaft, { width: 4 * s, height: 26 * s, backgroundColor: color }]} />
        <View style={[styles.minaretBase, { width: 7 * s, height: 2 * s, backgroundColor: color }]} />
      </View>

      {/* Left shorter minaret */}
      <View style={{ alignItems: 'center', marginRight: 3 * s, alignSelf: 'flex-end' }}>
        <View style={[styles.minaretPoint, { borderLeftWidth: 2 * s, borderRightWidth: 2 * s, borderBottomWidth: 4 * s, borderBottomColor: color }]} />
        <View style={[styles.minaretShaft, { width: 3.5 * s, height: 14 * s, backgroundColor: color }]} />
        <View style={[styles.minaretBase, { width: 6 * s, height: 2 * s, backgroundColor: color }]} />
      </View>

      {/* Kaaba cube — center piece */}
      <View style={{ alignItems: 'center', marginHorizontal: 2 * s }}>
        {/* Decorative band (golden kiswa stripe) */}
        <View style={[styles.kaabaBand, { width: 28 * s, height: 2 * s, backgroundColor: color, marginBottom: 1 * s }]} />
        {/* Main cube body */}
        <View style={[styles.kaabaBody, { width: 28 * s, height: 20 * s, borderColor: color, borderWidth: 1.5 * s }]}>
          {/* Door arch */}
          <View style={[styles.kaabaArch, { width: 7 * s, height: 10 * s, borderColor: color, borderWidth: 1.5 * s, borderTopLeftRadius: 3.5 * s, borderTopRightRadius: 3.5 * s, borderBottomWidth: 0 }]} />
        </View>
        {/* Platform base */}
        <View style={[styles.kaabaBase, { width: 34 * s, height: 3 * s, backgroundColor: color }]} />
      </View>

      {/* Right shorter minaret */}
      <View style={{ alignItems: 'center', marginLeft: 3 * s, alignSelf: 'flex-end' }}>
        <View style={[styles.minaretPoint, { borderLeftWidth: 2 * s, borderRightWidth: 2 * s, borderBottomWidth: 4 * s, borderBottomColor: color }]} />
        <View style={[styles.minaretShaft, { width: 3.5 * s, height: 14 * s, backgroundColor: color }]} />
        <View style={[styles.minaretBase, { width: 6 * s, height: 2 * s, backgroundColor: color }]} />
      </View>

      {/* Far-right tall minaret */}
      <View style={{ alignItems: 'center', marginLeft: 2 * s }}>
        <View style={[styles.minaretPoint, { borderLeftWidth: 2.5 * s, borderRightWidth: 2.5 * s, borderBottomWidth: 5 * s, borderBottomColor: color }]} />
        <View style={[styles.minaretBand, { width: 5 * s, height: 2 * s, backgroundColor: color }]} />
        <View style={[styles.minaretShaft, { width: 4 * s, height: 26 * s, backgroundColor: color }]} />
        <View style={[styles.minaretBase, { width: 7 * s, height: 2 * s, backgroundColor: color }]} />
      </View>
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
      <MosqueSilhouette color={color} size={0.8} />
      <View style={[styles.dividerLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  headerWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  minaretPoint: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  minaretBand: {},
  minaretShaft: {},
  minaretBase: {},
  kaabaBand: {},
  kaabaBody: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  kaabaArch: {
    position: 'absolute',
    bottom: 0,
  },
  kaabaBase: {},
  dividerLine: {
    height: 0.5,
    width: '80%',
    opacity: 0.4,
    marginTop: 4,
  },
});
