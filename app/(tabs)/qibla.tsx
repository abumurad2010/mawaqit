import AppLogo from '@/components/AppLogo';
import PageBackground from '@/components/PageBackground';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  FadeIn, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText, G } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQiblaBearing, getDistanceToMecca, formatDistance } from '@/lib/qibla';

const COMPASS_SIZE = 280;
const NEEDLE_LENGTH = COMPASS_SIZE / 2 - 20;
const CENTER = COMPASS_SIZE / 2;

const DIRECTIONS_AR = ['ش', 'شرق', 'ج', 'غرب'];
const DIRECTIONS_EN = ['N', 'E', 'S', 'W'];

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang, location: appLocation } = useApp();
  const C = isDark ? Colors.dark : Colors.light;
  const tr = t(lang);
  const isAr = lang === 'ar';

  const [heading, setHeading] = useState(0);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(true);
  // Real GPS coords used for Qibla — independent of manual location setting
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // The location used for Qibla is always real GPS; falls back to app location only if GPS fails
  const location = gpsCoords ?? appLocation;

  const rotation = useSharedValue(0);
  const qiblaRotation = useSharedValue(0);
  const aligned = useSharedValue(0);
  const prevHeading = useRef(0);
  const hapticFired = useRef(false);

  // Compute Qibla whenever real GPS coords change
  useEffect(() => {
    if (!location) return;
    const bearing = getQiblaBearing(location.lat, location.lng);
    const dist = getDistanceToMecca(location.lat, location.lng);
    setQiblaBearing(bearing);
    setDistance(dist);
  }, [location]);

  // Location permission + fetch actual device GPS
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch {}
      }
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
      <PageBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 10, paddingHorizontal: 20 }]}>
        <View style={{ flex: 1 }} />
        <AppLogo tintColor={C.tint} lang={lang} />
        <View style={[styles.badgeRow, { flex: 1 }]}>
          {qiblaBearing !== null && (
            <>
              <View style={[styles.badge, { backgroundColor: C.surface }]}>
                <Text style={[styles.badgeText, { color: C.tint }]}>
                  {qiblaBearing.toFixed(1)}{tr.degrees}
                </Text>
              </View>
              {distance !== null && (
                <View style={[styles.badge, { backgroundColor: C.surface }]}>
                  <Text style={[styles.badgeText, { color: C.tint }]}>
                    {formatDistance(distance, lang)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Compass area */}
      <View style={styles.compassWrapper}>
        {/* Alignment glow */}
        <Animated.View style={[styles.glow, { backgroundColor: C.tint }, glowStyle]} />

        {/* Static outer ring */}
        <View style={[styles.compassOuter, { borderColor: C.separator }]}>
          {/* Rotating compass disc */}
          <Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE }, compassStyle]}>
            <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
              {/* Outer circle */}
              <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill={isDark ? '#111d15' : '#fff'} stroke={C.separator} strokeWidth={1.5} />

              {/* Degree marks */}
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

              {/* Direction labels */}
              {dirs.map((d, i) => {
                const angle = (i * 90 * Math.PI) / 180;
                const r = CENTER - 36;
                const x = CENTER + r * Math.sin(angle);
                const y = CENTER - r * Math.cos(angle);
                const isN = i === 0;
                return (
                  <SvgText
                    key={d}
                    x={x} y={y + 5}
                    textAnchor="middle"
                    fill={isN ? '#e74c3c' : (isDark ? '#8fc4a0' : '#3a6649')}
                    fontSize={isN ? 16 : 13}
                    fontWeight={isN ? 'bold' : '600'}
                  >
                    {d}
                  </SvgText>
                );
              })}
            </Svg>
          </Animated.View>

          {/* Qibla needle (rotates relative to compass) */}
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'absolute' }, kaabaStyle]}>
              <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
                {/* Qibla direction line */}
                <Line
                  x1={CENTER} y1={CENTER}
                  x2={CENTER} y2={20}
                  stroke={C.gold} strokeWidth={3} strokeLinecap="round"
                />
                {/* Arrow head */}
                <Path
                  d={`M ${CENTER} 12 L ${CENTER - 8} 28 L ${CENTER + 8} 28 Z`}
                  fill={C.gold}
                />
                {/* Kaaba symbol at tip */}
                <SvgText x={CENTER} y={8} textAnchor="middle" fontSize={10} fill={C.gold}>
                  {'\u06be'}{/* Arabic Kaaba-like symbol fallback */}
                </SvgText>
              </Svg>
            </Animated.View>
          </View>

          {/* Center dot */}
          <View style={[styles.centerDot, { backgroundColor: C.tint }]} />
        </View>
      </View>

      {/* Instruction */}
      <Animated.View entering={FadeIn.delay(400)} style={styles.instruction}>
        {magnetometerAvailable ? (
          <Text style={[styles.instrText, {
            color: C.textSecond,
            fontFamily: isAr ? 'Amiri_400Regular' : undefined,
          }]}>
            {tr.pointToMecca}
          </Text>
        ) : (
          <Text style={[styles.instrText, { color: C.textMuted }]}>
            {tr.compassNotAvailable}
          </Text>
        )}
        {location && (
          <Text style={[styles.coordText, { color: C.textMuted }]}>
            {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
          </Text>
        )}
        {magnetometerAvailable && (
          <View style={[styles.calibrateBox, { backgroundColor: C.surface, borderColor: C.separator }]}>
            <Text style={styles.calibrateSymbol}>∞</Text>
            <Text style={[styles.calibrateText, {
              color: C.textMuted,
              fontFamily: isAr ? 'Amiri_400Regular' : undefined,
              textAlign: isAr ? 'right' : 'left',
            }]}>
              {tr.calibrateHint}
            </Text>
          </View>
        )}
      </Animated.View>

      </ScrollView>

      {/* Dua — pinned to bottom, same as all other pages */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  appNameSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, marginBottom: 3 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  scrollContent: { flexGrow: 1 },
  compassWrapper: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 16,
  },
  duaRow: { alignItems: 'center', paddingHorizontal: 24 },
  glow: {
    position: 'absolute',
    width: COMPASS_SIZE + 40,
    height: COMPASS_SIZE + 40,
    borderRadius: (COMPASS_SIZE + 40) / 2,
    zIndex: 0,
  },
  compassOuter: {
    width: COMPASS_SIZE + 20, height: COMPASS_SIZE + 20,
    borderRadius: (COMPASS_SIZE + 20) / 2,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  centerDot: {
    position: 'absolute',
    width: 14, height: 14,
    borderRadius: 7,
    zIndex: 10,
  },
  instruction: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 16, gap: 6 },
  instrText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  coordText: { fontSize: 11, textAlign: 'center' },
  calibrateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  calibrateSymbol: { fontSize: 26, lineHeight: 30, color: '#888' },
  calibrateText: { flex: 1, fontSize: 13, lineHeight: 19 },
  permTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  dua: { fontSize: 13, textAlign: 'center' },
});
