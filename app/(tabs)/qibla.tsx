import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat,
  FadeIn, interpolate, Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { getQiblaBearing, getDistanceToMecca, formatDistance, KAABA_LAT, KAABA_LNG } from '@/lib/qibla';
import ThemeToggle from '@/components/ThemeToggle';
import LangToggle from '@/components/LangToggle';
import AppLogo from '@/components/AppLogo';

const COMPASS_SIZE = 280;
const SPRING = { mass: 0.08, damping: 12, stiffness: 180 };
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
  const [isNearlyAligned, setIsNearlyAligned] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);

  // Pulsing animation for the ∞ symbol in the calibration modal
  const infinityPulse = useSharedValue(1);
  const infinityPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: infinityPulse.value }],
    opacity: interpolate(infinityPulse.value, [0.85, 1, 1.08], [0.6, 1, 0.7], Extrapolation.CLAMP),
  }));
  useEffect(() => {
    if (showCalibrate) {
      infinityPulse.value = withRepeat(
        withTiming(1.08, { duration: 900 }),
        -1,
        true,
      );
    } else {
      infinityPulse.value = 1;
    }
  }, [showCalibrate]);

  const rotation = useSharedValue(0);
  const qiblaRotation = useSharedValue(0);
  const aligned = useSharedValue(0);
  const prevHeading = useRef(-1);          // -1 = "no reading yet"
  const prevCompassRot = useRef(0);        // accumulated (unwrapped) compass rotation
  const prevQiblaRot = useRef(0);          // accumulated (unwrapped) Qibla rotation
  const hapticFired = useRef(false);
  const lockedRef = useRef(false);
  const qiblaAnchor = useRef<{ lat: number; lng: number } | null>(null);

  // Compute Qibla — anchored: only recompute if user has moved > 1 km from
  // the location where the bearing was last established. This prevents GPS
  // jitter (typically < 50 m) from causing tiny but visible bearing shifts
  // between sessions or during a single session.
  useEffect(() => {
    if (!location) return;
    if (qiblaAnchor.current) {
      const dlat = location.lat - qiblaAnchor.current.lat;
      const dlng = location.lng - qiblaAnchor.current.lng;
      const approxKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      if (approxKm < 1.0) return; // GPS jitter — ignore
    }
    qiblaAnchor.current = { lat: location.lat, lng: location.lng };
    setQiblaBearing(getQiblaBearing(location.lat, location.lng));
    setDistance(getDistanceToMecca(location.lat, location.lng));
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
      Magnetometer.setUpdateInterval(16); // 60 Hz
      sub = Magnetometer.addListener(({ x, y }) => {
        let angle = Math.atan2(-x, y) * (180 / Math.PI);
        angle = (angle + 360) % 360;

        // Snap to first real reading so the compass starts correct immediately
        if (prevHeading.current < 0) {
          prevHeading.current = angle;
          setHeading(angle);
          return;
        }

        // α=0.7 at 60 Hz — responsive with minimal noise
        let diff = angle - prevHeading.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const smoothed = (prevHeading.current + diff * 0.7 + 360) % 360;
        prevHeading.current = smoothed;
        setHeading(smoothed);
      });
    })();
    return () => sub?.remove();
  }, []);

  // Animate compass rotation — shortest-path unwrapped to prevent spin-around
  useEffect(() => {
    // Compass rose: always rotates opposite to heading
    const targetCompass = -heading;
    let cDelta = targetCompass - prevCompassRot.current;
    if (cDelta > 180) cDelta -= 360;
    if (cDelta < -180) cDelta += 360;
    prevCompassRot.current += cDelta;
    rotation.value = withSpring(prevCompassRot.current, SPRING);

    if (qiblaBearing !== null) {
      // Qibla needle: absolute angle = qiblaBearing - heading
      const targetQibla = qiblaBearing - heading;
      let qDelta = targetQibla - prevQiblaRot.current;
      if (qDelta > 180) qDelta -= 360;
      if (qDelta < -180) qDelta += 360;
      prevQiblaRot.current += qDelta;
      qiblaRotation.value = withSpring(prevQiblaRot.current, SPRING);

      // Check alignment with hysteresis: lock at ≤2°, unlock at >6°
      const diff = Math.abs(((qiblaBearing - heading + 180 + 360) % 360) - 180);
      const wasLocked = lockedRef.current;
      const isAligned = wasLocked ? diff <= 6 : diff <= 2;
      lockedRef.current = isAligned;
      setIsAlignedState(isAligned);
      setIsNearlyAligned(diff < 25);
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

  const mecCardOpacity = useSharedValue(0);
  const showMecCard = distance !== null;
  useEffect(() => {
    if (!showMecCard) {
      mecCardOpacity.value = withTiming(0, { duration: 200 });
    } else {
      mecCardOpacity.value = withTiming(isNearlyAligned ? 1 : 0.35, { duration: 300 });
    }
  }, [showMecCard, isNearlyAligned]);
  const mecCardAnimStyle = useAnimatedStyle(() => ({ opacity: mecCardOpacity.value }));

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

      {/* Content group — instruction + compass + info card, positioned toward the top */}
      <View style={styles.contentGroup}>

        {/* Instruction — just above compass */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.instruction}>
          {isAlignedState ? (
            <Text style={[styles.alignedText, { color: C.tint, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
              {isAr ? '✦ أنت تواجه القبلة ✦' : '✦ Facing the Qibla ✦'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.instrText, { color: C.textSecond, fontFamily: isAr ? 'Amiri_400Regular' : undefined }]}>
                {magnetometerAvailable ? tr.pointToMecca : tr.compassNotAvailable}
              </Text>
              {/* Help button */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowCalibrate(true); }}
                style={[styles.helpBtn, { borderColor: C.separator, backgroundColor: C.backgroundCard }]}
                hitSlop={8}
              >
                <Text style={[styles.helpBtnText, { color: C.tint }]}>?</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

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
                </Svg>
              </Animated.View>
            </View>
            <View style={[styles.centerDot, { backgroundColor: C.tint }]} />
          </View>
        </View>

        {/* Mecca info card — in-flow below compass, opacity-driven */}
        <Animated.View
          pointerEvents={showMecCard ? 'auto' : 'none'}
          style={[styles.mecCard, { borderTopColor: C.separator, borderBottomColor: C.separator }, mecCardAnimStyle]}
        >
          {distance !== null && (() => {
            const col = isAlignedState ? C.tint : C.textMuted;
            return (
              <>
                {/* Row 1: Kaaba latitude | longitude (static, full precision) */}
                <View style={styles.mecRow}>
                  <View style={[styles.mecCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.separator }]}>
                    <Text style={[styles.mecValue, { color: col }]}>{KAABA_LAT}°N</Text>
                    <Text style={[styles.mecLabel, { color: col }]}>{isAr ? 'خط العرض' : 'Latitude'}</Text>
                  </View>
                  <View style={styles.mecCell}>
                    <Text style={[styles.mecValue, { color: col }]}>{KAABA_LNG}°E</Text>
                    <Text style={[styles.mecLabel, { color: col }]}>{isAr ? 'خط الطول' : 'Longitude'}</Text>
                  </View>
                </View>
                {/* Row 2: fixed Qibla bearing | distance */}
                <View style={[styles.mecRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator }]}>
                  <View style={[styles.mecCell, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.separator }]}>
                    <Text style={[styles.mecValue, { color: col }]}>{heading.toFixed(1)}°</Text>
                    <Text style={[styles.mecLabel, { color: col }]}>{isAr ? 'الاتجاه' : 'Bearing'}</Text>
                  </View>
                  <View style={styles.mecCell}>
                    <Text style={[styles.mecValue, { color: col }]}>{`${Math.round(distance).toLocaleString()} km`}</Text>
                    <Text style={[styles.mecLabel, { color: col }]}>{isAr ? 'المسافة' : 'Distance'}</Text>
                  </View>
                </View>
              </>
            );
          })()}
        </Animated.View>

        {/* Calibrate button */}
        {magnetometerAvailable && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowCalibrate(true); }}
            style={[styles.calibrateBtn, { borderColor: C.tint + '50', backgroundColor: C.tint + '12' }]}
          >
            <Text style={[styles.calibrateBtnText, { color: C.tint }]}>
              {isAr ? '⟳  معايرة البوصلة' : '⟳  ' + tr.calibrateBtn}
            </Text>
          </Pressable>
        )}

      </View>

      {/* Flex spacer — keeps dua at the bottom */}
      <View style={{ flex: 1 }} />

      {/* Dua */}
      <View style={[styles.duaRow, { paddingBottom: bottomInset + 62 }]}>
        <Text style={[styles.dua, { color: C.textMuted, fontFamily: 'Amiri_400Regular' }]}>
          {tr.dua}
        </Text>
        <Text style={[styles.freeApp, { color: C.textMuted }]}>
          {tr.freeApp}
        </Text>
      </View>

      {/* Calibration Modal */}
      <Modal visible={showCalibrate} transparent animationType="fade" onRequestClose={() => setShowCalibrate(false)}>
        <View style={styles.calibrateOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCalibrate(false)} />
          <View style={[styles.calibrateSheet, { backgroundColor: C.backgroundCard }]}>
            {/* Title */}
            <Text style={[styles.calibrateModalTitle, { color: C.text, fontFamily: isAr ? 'Amiri_700Bold' : undefined }]}>
              {tr.calibrateTitle ?? (isAr ? 'معايرة البوصلة' : 'Compass Calibration')}
            </Text>

            {/* Animated ∞ symbol */}
            <Animated.View style={[styles.infinityWrap, infinityPulseStyle]}>
              <Text style={[styles.infinitySymbol, { color: C.tint }]}>∞</Text>
            </Animated.View>

            {/* Step 1 */}
            <View style={styles.calibrateStep}>
              <View style={[styles.stepNum, { backgroundColor: C.tint }]}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined, textAlign: isAr ? 'right' : 'left' }]}>
                {tr.calibrateStep1 ?? 'Hold your phone flat and move it in a figure-8 (∞) motion'}
              </Text>
            </View>

            {/* Step 2 */}
            <View style={styles.calibrateStep}>
              <View style={[styles.stepNum, { backgroundColor: C.tint }]}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: C.text, fontFamily: isAr ? 'Amiri_400Regular' : undefined, textAlign: isAr ? 'right' : 'left' }]}>
                {tr.calibrateStep2 ?? 'Repeat 2–3 times until the compass stabilises'}
              </Text>
            </View>

            {/* Done */}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowCalibrate(false); }}
              style={[styles.calibrateDoneBtn, { backgroundColor: C.tint }]}
            >
              <Text style={[styles.calibrateDoneText, { color: C.tintText }]}>
                {tr.calibrateDone ?? (isAr ? 'تأكيد' : 'Done')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: { gap: 4, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentGroup: {
    alignItems: 'center',
    paddingTop: 12,
  },
  compassWrapper: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
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
  mecCard: {
    alignSelf: 'stretch', marginHorizontal: 24, marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mecRow: { flexDirection: 'row' },
  mecCell: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  mecValue: { fontSize: 11, fontWeight: '400', letterSpacing: 0.1 },
  mecLabel: { fontSize: 8, marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.7 },
  instruction: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 10, gap: 4, minHeight: 44 },
  instrText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  alignedText: { fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  permTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  duaRow: { alignItems: 'center', paddingHorizontal: 24, gap: 4 },
  dua: { fontSize: 13, textAlign: 'center' },
  freeApp: { fontSize: 10, textAlign: 'center', opacity: 0.6, letterSpacing: 0.2 },

  // Help button (? next to instruction)
  helpBtn: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  helpBtnText: { fontSize: 11, fontWeight: '700', lineHeight: 14 },

  // Calibrate button below the info card
  calibrateBtn: {
    marginTop: 12, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  calibrateBtnText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },

  // Calibration modal
  calibrateOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 28,
  },
  calibrateSheet: {
    width: '100%', borderRadius: 24,
    paddingVertical: 28, paddingHorizontal: 24,
    alignItems: 'center', gap: 20,
  },
  calibrateModalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  infinityWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  infinitySymbol: { fontSize: 72, fontWeight: '300', lineHeight: 80 },
  calibrateStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, width: '100%' },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepText: { fontSize: 14, lineHeight: 20, flex: 1 },
  calibrateDoneBtn: {
    borderRadius: 16, paddingVertical: 13, paddingHorizontal: 32,
    alignSelf: 'stretch', alignItems: 'center', marginTop: 4,
  },
  calibrateDoneText: { fontSize: 16, fontWeight: '700' },
});
