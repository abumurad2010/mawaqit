import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  FadeIn, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText, G } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQiblaBearing, getDistanceToMecca, formatDistance } from '@/lib/qibla';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';

const COMPASS_SIZE = 280;
const NEEDLE_LENGTH = COMPASS_SIZE / 2 - 20;
const CENTER = COMPASS_SIZE / 2;

const DIRECTIONS_AR = ['ش', 'شرق', 'ج', 'غرب'];
const DIRECTIONS_EN = ['N', 'E', 'S', 'W'];

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, location } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [heading, setHeading] = useState(0);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(true);
  const [isAlignedState, setIsAlignedState] = useState(false);

  const rotation = useSharedValue(0);
  const qiblaRotation = useSharedValue(0);
  const aligned = useSharedValue(0);
  const prevHeading = useRef(0);
  const hapticFired = useRef(false);

  // Compute Qibla
  useEffect(() => {
    if (!location) return;
    const bearing = getQiblaBearing(location.lat, location.lng);
    const dist = getDistanceToMecca(location.lat, location.lng);
    setQiblaBearing(bearing);
    setDistance(dist);
  }, [location]);

  // Location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Magnetometer
  useEffect(() => {
    let sub: any;
    (async () => {
      const avail = await Magnetometer.isAvailableAsync();
      if (!avail) { setMagnetometerAvailable(false); return; }
      Magnetometer.setUpdateInterval(100);
      sub = Magnetometer.addListener(({ x, y }) => {
        let angle = Math.atan2(-x, y) * (180 / Math.PI);
        angle = (angle + 360) % 360;
        // Smooth
        let diff = angle - prevHeading.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const smoothed = (prevHeading.current + diff * 0.3 + 360) % 360;
        prevHeading.current = smoothed;
        setHeading(smoothed);
      });
    })();
    return () => sub?.remove();
  }, []);

  // Animate compass rotation
  useEffect(() => {
    rotation.value = withTiming(-heading, { duration: 150 });
    if (qiblaBearing !== null) {
      const qiblaAngle = qiblaBearing - heading;
      qiblaRotation.value = withTiming(qiblaAngle, { duration: 150 });

      // Check alignment
      const diff = Math.abs(((qiblaBearing - heading + 180 + 360) % 360) - 180);
      const isAligned = diff < 5;
      setIsAlignedState(isAligned);
      aligned.value = withTiming(isAligned ? 1 : 0, { duration: 300 });

      if (isAligned && !hapticFired.current) {
        hapticFired.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (!isAligned) {
        hapticFired.current = false;
      }
    }
  }, [heading, qiblaBearing]);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const kaabaStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${qiblaRotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(aligned.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
  }));

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  if (hasPermission === false) {
    return (
      <View style={[styles.root, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.permTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
          {tr.locationPermission}
        </Text>
        <Pressable onPress={async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          setHasPermission(status === 'granted');
        }}>
          <Text style={{ color: C.tint, fontSize: 15, marginTop: 12 }}>{tr.requestPermission}</Text>
        </Pressable>
      </View>
    );
  }

  const dirs = isAr ? DIRECTIONS_AR : DIRECTIONS_EN;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ['#0a2416', '#070f0a'] : ['#e8f5ec', '#f8fdf9']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <ThemeToggle />
            <LangToggle />
          </View>
          <AppLogo tintColor={C.tint} lang={lang} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      {/* Compass */}
      <View style={styles.compassWrapper}>
        <Animated.View style={[styles.glow, { backgroundColor: C.tint }, glowStyle]} />
        <View style={[styles.compassOuter, { borderColor: C.separator }]}>
          <Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE }, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              <Circle cx={CENTER} cy={CENTER} r={CENTER - 2}
                fill={isDark ? '#111d15' : '#fff'} stroke={C.separator} strokeWidth={1.5} />
              {Array.from({ length: 72 }).map((_, i) => {
                const angle = (i * 5 * Math.PI) / 180;
                const isMajor = i % 6 === 0;
                const inner = CENTER - (isMajor ? 22 : 15);
                const outer2 = CENTER - 8;
                const x1 = CENTER + inner * Math.sin(angle);
                const y1 = CENTER - inner * Math.cos(angle);
                const x2 = CENTER + outer2 * Math.sin(angle);
                const y2 = CENTER - outer2 * Math.cos(angle);
                return (
                  <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isMajor ? (isDark ? '#4d7a5e' : '#aacfb8') : (isDark ? '#1a3323' : '#d6ecde')}
                    strokeWidth={isMajor ? 1.5 : 0.8}
                  />
                );
              })}
              {dirs.map((d, i) => {
                const angle = (i * 90 * Math.PI) / 180;
                const r = CENTER - 36;
                const x = CENTER + r * Math.sin(angle);
                const y = CENTER - r * Math.cos(angle);
                const isN = i === 0;
                return (
                  <SvgText key={d} x={x} y={y + 5} textAnchor="middle"
                    fill={isN ? '#e74c3c' : (isDark ? '#8fc4a0' : '#3a6649')}
                    fontSize={isN ? 16 : 13} fontWeight={isN ? 'bold' : '600'}
                  >{d}</SvgText>
                );
              })}
            </Svg>
          </Animated.View>

          {/* Qibla needle */}
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'absolute' }, kaabaStyle]}>
              <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
                <Line x1={CENTER} y1={CENTER} x2={CENTER} y2={20}
                  stroke={C.gold} strokeWidth={3} strokeLinecap="round" />
                <Path d={`M ${CENTER} 12 L ${CENTER - 8} 28 L ${CENTER + 8} 28 Z`} fill={C.gold} />
                <SvgText x={CENTER} y={8} textAnchor="middle" fontSize={10} fill={C.gold}>
                  {'\u06be'}
                </SvgText>
              </Svg>
            </Animated.View>
          </View>
          <View style={[styles.centerDot, { backgroundColor: C.tint }]} />
        </View>
      </View>

      {/* User coordinates */}
      {location && (
        <Animated.View entering={FadeIn.delay(250)} style={[styles.coordsRow, { borderBottomColor: C.separator }]}>
          <View style={styles.coordCell}>
            <Text style={[styles.coordLabel, { color: C.textMuted }]}>{isAr ? 'خط العرض' : 'Latitude'}</Text>
            <Text style={[styles.coordValue, { color: C.text }]}>{location.lat.toFixed(6)}°</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: C.separator }]} />
          <View style={styles.coordCell}>
            <Text style={[styles.coordLabel, { color: C.textMuted }]}>{isAr ? 'خط الطول' : 'Longitude'}</Text>
            <Text style={[styles.coordValue, { color: C.text }]}>{location.lng.toFixed(6)}°</Text>
          </View>
        </Animated.View>
      )}

      {/* Bearing & distance */}
      {qiblaBearing !== null && (
        <Animated.View entering={FadeIn.delay(300)} style={[styles.infoStrip, { borderTopColor: C.separator, borderBottomColor: C.separator }]}>
          <View style={styles.infoCell}>
            <Text style={[styles.infoValue, { color: C.text }]}>{qiblaBearing.toFixed(1)}°</Text>
            <Text style={[styles.infoLabel, { color: C.textMuted }]}>{isAr ? 'الاتجاه' : 'Bearing'}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: C.separator }]} />
          {distance !== null && (
            <View style={styles.infoCell}>
              <Text style={[styles.infoValue, { color: C.text }]}>{Math.round(distance).toLocaleString()} km</Text>
              <Text style={[styles.infoLabel, { color: C.textMuted }]}>{isAr ? 'إلى مكة' : 'Distance'}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Instruction */}
      <Animated.View entering={FadeIn.delay(400)} style={styles.instruction}>
        {isAlignedState ? (
          <Text style={[styles.alignedText, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
            {isAr ? '✦ أنت تواجه القبلة ✦' : '✦ Facing the Qibla ✦'}
          </Text>
        ) : (
          <Text style={[styles.instrText, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
            {magnetometerAvailable ? tr.pointToMecca : tr.compassNotAvailable}
          </Text>
        )}
      </Animated.View>

      {/* Dua */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 60 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted }]}>
          {tr.freeApp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { gap: 4, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compassWrapper: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 12, flex: 1,
  },
  glow: {
    position: 'absolute',
    width: COMPASS_SIZE + 40, height: COMPASS_SIZE + 40,
    borderRadius: (COMPASS_SIZE + 40) / 2, zIndex: 0,
  },
  compassOuter: {
    width: COMPASS_SIZE + 20, height: COMPASS_SIZE + 20,
    borderRadius: (COMPASS_SIZE + 20) / 2,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  centerDot: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7, zIndex: 10,
  },
  // Subtle info strip between compass and instruction
  infoStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    paddingVertical: 10, marginHorizontal: 20, marginBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoCell: { alignItems: 'center', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  infoLabel: { fontSize: 10, marginTop: 2, letterSpacing: 0.3 },
  infoDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  coordsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    paddingVertical: 8, marginHorizontal: 20, marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coordCell: { alignItems: 'center', flex: 1 },
  coordLabel: { fontSize: 9, letterSpacing: 0.4, marginBottom: 2, textTransform: 'uppercase' },
  coordValue: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
  instruction: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 12, gap: 4 },
  instrText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  alignedText: { fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  permTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 14, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },
});
