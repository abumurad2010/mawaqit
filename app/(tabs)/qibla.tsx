import React, { useState, useEffect, useRef } from ‘react’;
import { View, Text, StyleSheet, Platform, Pressable } from ‘react-native’;
import { useSafeAreaInsets } from ‘react-native-safe-area-context’;
import { Magnetometer } from ‘expo-sensors’;
import * as Location from ‘expo-location’;
import * as Haptics from ‘expo-haptics’;
import { LinearGradient } from ‘expo-linear-gradient’;
import Animated, {
useSharedValue, useAnimatedStyle, withTiming,
FadeIn, FadeInUp, interpolate, Extrapolation,
} from ‘react-native-reanimated’;
import Svg, { Circle, Line, Path, Text as SvgText } from ‘react-native-svg’;
import Colors from ‘@/constants/colors’;
import { useApp } from ‘@/contexts/AppContext’;
import { t } from ‘@/constants/i18n’;
import { getQiblaBearing, getDistanceToMecca } from ‘@/lib/qibla’;

const COMPASS_SIZE = 280;
const CENTER = COMPASS_SIZE / 2;
const DIRECTIONS_AR = [‘ش’, ‘شرق’, ‘ج’, ‘غرب’];
const DIRECTIONS_EN = [‘N’, ‘E’, ‘S’, ‘W’];

export default function QiblaScreen() {
const insets = useSafeAreaInsets();
const { isDark, lang, location } = useApp();
const C = isDark ? Colors.dark : Colors.light;
const tr = t(lang);
const isAr = lang === ‘ar’;

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

useEffect(() => {
if (!location) return;
setQiblaBearing(getQiblaBearing(location.lat, location.lng));
setDistance(getDistanceToMecca(location.lat, location.lng));
}, [location]);

useEffect(() => {
(async () => {
const { status } = await Location.requestForegroundPermissionsAsync();
setHasPermission(status === ‘granted’);
})();
}, []);

useEffect(() => {
let sub: any;
(async () => {
const avail = await Magnetometer.isAvailableAsync();
if (!avail) { setMagnetometerAvailable(false); return; }
Magnetometer.setUpdateInterval(100);
sub = Magnetometer.addListener(({ x, y }) => {
let angle = Math.atan2(-x, y) * (180 / Math.PI);
angle = (angle + 360) % 360;
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

useEffect(() => {
rotation.value = withTiming(-heading, { duration: 150 });
if (qiblaBearing !== null) {
qiblaRotation.value = withTiming(qiblaBearing - heading, { duration: 150 });
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

const compassStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
const kaabaStyle   = useAnimatedStyle(() => ({ transform: [{ rotate: `${qiblaRotation.value}deg` }] }));
const glowStyle    = useAnimatedStyle(() => ({
opacity: interpolate(aligned.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
}));

const topInset    = Platform.OS === ‘web’ ? 67 : insets.top;
const bottomInset = Platform.OS === ‘web’ ? 34 : insets.bottom;

if (hasPermission === false) {
return (
<View style={[styles.root, { backgroundColor: C.background, justifyContent: ‘center’, alignItems: ‘center’ }]}>
<Text style={[styles.permTitle, { color: C.text }]}>{tr.locationPermission}</Text>
<Pressable onPress={async () => {
const { status } = await Location.requestForegroundPermissionsAsync();
setHasPermission(status === ‘granted’);
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
colors={isDark ? [’#0a2416’, ‘#070f0a’] : [’#e8f5ec’, ‘#f8fdf9’]}
style={StyleSheet.absoluteFill}
start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
/>
<View style={[styles.header, { paddingTop: topInset + 8, paddingHorizontal: 20 }]}>
<Text style={[styles.title, { color: C.tint, fontFamily: isAr ? ‘Amiri_700Bold’ : undefined }]}>
{tr.qibla}
</Text>
{qiblaBearing !== null && (
<View style={[styles.badge, { backgroundColor: C.surface }]}>
<Text style={[styles.badgeText, { color: C.tint }]}>
{qiblaBearing.toFixed(1)}{tr.degrees}
</Text>
</View>
)}
</View>
<View style={styles.compassWrapper}>
<Animated.View style={[styles.glow, { backgroundColor: C.tint }, glowStyle]} />
<View style={[styles.compassOuter, { borderColor: C.separator }]}>
<Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE }, compassStyle]}>
<Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
<Circle cx={CENTER} cy={CENTER} r={CENTER - 2}
fill={isDark ? ‘#111d15’ : ‘#fff’} stroke={C.separator} strokeWidth={1.5} />
{Array.from({ length: 72 }).map((_, i) => {
const angle = (i * 5 * Math.PI) / 180;
const isMajor = i % 6 === 0;
const inner = CENTER - (isMajor ? 22 : 15);
const outer2 = CENTER - 8;
return (
<Line key={i}
x1={CENTER + inner * Math.sin(angle)} y1={CENTER - inner * Math.cos(angle)}
x2={CENTER + outer2 * Math.sin(angle)} y2={CENTER - outer2 * Math.cos(angle)}
stroke={isMajor ? (isDark ? ‘#4d7a5e’ : ‘#aacfb8’) : (isDark ? ‘#1a3323’ : ‘#d6ecde’)}
strokeWidth={isMajor ? 1.5 : 0.8}
/>
);
})}
{dirs.map((d, i) => {
const angle = (i * 90 * Math.PI) / 180;
const r = CENTER - 36;
return (
<SvgText key={d}
x={CENTER + r * Math.sin(angle)} y={CENTER - r * Math.cos(angle) + 5}
textAnchor=‘middle’
fill={i === 0 ? ‘#e74c3c’ : (isDark ? ‘#8fc4a0’ : ‘#3a6649’)}
fontSize={i === 0 ? 16 : 13} fontWeight={i === 0 ? ‘bold’ : ‘600’}
>{d}</SvgText>
);
})}
</Svg>
</Animated.View>
<View style={[StyleSheet.absoluteFill, { alignItems: ‘center’, justifyContent: ‘center’ }]}>
<Animated.View style={[{ width: COMPASS_SIZE, height: COMPASS_SIZE, position: ‘absolute’ }, kaabaStyle]}>
<Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
<Line x1={CENTER} y1={CENTER} x2={CENTER} y2={20}
stroke={C.gold} strokeWidth={3} strokeLinecap='round' />
<Path d={`M ${CENTER} 12 L ${CENTER - 8} 28 L ${CENTER + 8} 28 Z`} fill={C.gold} />
<SvgText x={CENTER} y={8} textAnchor='middle' fontSize={10} fill={C.gold}>{‘ھ’}</SvgText>
</Svg>
</Animated.View>
</View>
<View style={[styles.centerDot, { backgroundColor: C.tint }]} />
</View>
</View>
{distance !== null && qiblaBearing !== null && (
<Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.infoCard}>
<LinearGradient
colors={isDark ? [’#0d2218’, ‘#091409’] : [’#f0faf4’, ‘#e4f5ea’]}
style={StyleSheet.absoluteFill}
start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
/>
<View style={[styles.infoCardBorder, { borderColor: isAlignedState ? C.tint : C.separator }]} />
<View style={styles.infoRow}>
<Text style={styles.kaabaEmoji}>🕋</Text>
<View style={styles.infoCenter}>
<Text style={[styles.distanceValue, { color: C.tint }]}>
{Math.round(distance).toLocaleString()} km
</Text>
<Text style={[styles.distanceLabel, { color: C.textMuted, fontFamily: isAr ? ‘Amiri_400Regular’ : undefined }]}>
{isAr ? ‘إلى مكة المكرمة’ : ‘to Mecca’}
</Text>
</View>
<View style={[styles.infoDivider, { backgroundColor: C.separator }]} />
<View style={styles.infoBearing}>
<Text style={[styles.bearingValue, { color: C.text }]}>{qiblaBearing.toFixed(1)}{‘°’}</Text>
<Text style={[styles.bearingLabel, { color: C.textMuted }]}>{isAr ? ‘الاتجاه’ : ‘bearing’}</Text>
</View>
</View>
{isAlignedState && (
<Animated.View entering={FadeIn.duration(300)} style={[styles.alignedBanner, { backgroundColor: C.tint + ‘22’ }]}>
<Text style={[styles.alignedText, { color: C.tint, fontFamily: isAr ? ‘Amiri_700Bold’ : undefined }]}>
{isAr ? ‘❆ أنت تواجه القبلة ❆’ : ‘❆ Facing the Qibla ❆’}
</Text>
</Animated.View>
)}
</Animated.View>
)}
<Animated.View entering={FadeIn.delay(400)} style={styles.instruction}>
<Text style={[styles.instrText, { color: C.textSecond, fontFamily: isAr ? ‘Amiri_400Regular’ : undefined }]}>
{magnetometerAvailable ? tr.pointToMecca : tr.compassNotAvailable}
</Text>
<Text style={[styles.coordLabel, { color: C.textMuted, fontFamily: isAr ? ‘Amiri_400Regular’ : undefined }]}>
{isAr ? ‘إحداثيات الكعبة المشرفة’ : ‘Kaaba coordinates’}
</Text>
<Text style={[styles.coordText, { color: C.tint }]}>
21.42016389{‘°’}N{’   ’}39.82233056{‘°’}E
</Text>
</Animated.View>
<View style={{ paddingBottom: bottomInset + 60, alignItems: ‘center’ }}>
<Text style={[styles.dua, { color: C.textMuted, fontFamily: ‘Amiri_400Regular’ }]}>{tr.dua}</Text>
</View>
</View>
);
}

const styles = StyleSheet.create({
root: { flex: 1 },
header: { flexDirection: ‘row’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: 12 },
title: { fontSize: 26, fontWeight: ‘700’ },
badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
badgeText: { fontSize: 13, fontWeight: ‘600’ },
compassWrapper: { alignItems: ‘center’, justifyContent: ‘center’, marginVertical: 12, flex: 1 },
glow: { position: ‘absolute’, width: COMPASS_SIZE + 40, height: COMPASS_SIZE + 40, borderRadius: (COMPASS_SIZE + 40) / 2, zIndex: 0 },
compassOuter: { width: COMPASS_SIZE + 20, height: COMPASS_SIZE + 20, borderRadius: (COMPASS_SIZE + 20) / 2, borderWidth: 1, alignItems: ‘center’, justifyContent: ‘center’ },
centerDot: { position: ‘absolute’, width: 14, height: 14, borderRadius: 7, zIndex: 10 },
infoCard: { marginHorizontal: 20, borderRadius: 18, overflow: ‘hidden’, marginBottom: 12 },
infoCardBorder: { position: ‘absolute’, top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, borderWidth: 1 },
infoRow: { flexDirection: ‘row’, alignItems: ‘center’, paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
kaabaEmoji: { fontSize: 28 },
infoCenter: { flex: 1 },
distanceValue: { fontSize: 22, fontWeight: ‘800’, letterSpacing: -0.5 },
distanceLabel: { fontSize: 12, marginTop: 1 },
infoDivider: { width: 1, height: 36 },
infoBearing: { alignItems: ‘center’, minWidth: 60 },
bearingValue: { fontSize: 18, fontWeight: ‘700’ },
bearingLabel: { fontSize: 11, marginTop: 1 },
alignedBanner: { paddingVertical: 8, alignItems: ‘center’ },
alignedText: { fontSize: 14, fontWeight: ‘700’, letterSpacing: 0.5 },
instruction: { alignItems: ‘center’, paddingHorizontal: 32, marginBottom: 8, gap: 4 },
instrText: { fontSize: 15, textAlign: ‘center’, lineHeight: 22 },
coordLabel: { fontSize: 10, textAlign: ‘center’, marginTop: 4 },
coordText: { fontSize: 12, fontWeight: ‘600’, textAlign: ‘center’, letterSpacing: 0.3 },
permTitle: { fontSize: 18, fontWeight: ‘600’, textAlign: ‘center’, paddingHorizontal: 32 },
dua: { fontSize: 14 },
});