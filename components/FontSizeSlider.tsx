import React, { useRef, useEffect } from 'react';
import { View, Animated, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

export const FONT_STEPS = ['small', 'medium', 'large', 'xlarge'] as const;
export type FontSizeStep = typeof FONT_STEPS[number];

const THUMB_D = 24;
const TRACK_H = 3;

interface Props {
  value: FontSizeStep;
  onChange: (v: FontSizeStep) => void;
  tint: string;
  track: string;
}

export default function FontSizeSlider({ value, onChange, tint, track }: Props) {
  const trackW = useRef(0);
  const stepRef = useRef(FONT_STEPS.indexOf(value));
  const isDragging = useRef(false);
  const isSyncing = useRef(false);
  const gestureStartThumbX = useRef(0);
  const thumbX = useRef(new Animated.Value(0)).current;

  const pxForIdx = (idx: number, w: number) =>
    (idx / (FONT_STEPS.length - 1)) * Math.max(0, w - THUMB_D);

  const snapTo = (idx: number, w: number) => {
    isSyncing.current = true;
    Animated.spring(thumbX, {
      toValue: pxForIdx(idx, w),
      useNativeDriver: false,
      tension: 160,
      friction: 9,
    }).start(() => { isSyncing.current = false; });
  };

  useEffect(() => {
    const idx = FONT_STEPS.indexOf(value);
    if (idx < 0) return;
    stepRef.current = idx;
    if (!isDragging.current && !isSyncing.current && trackW.current > 0) {
      snapTo(idx, trackW.current);
    }
  }, [value]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: () => {
        isDragging.current = true;
        gestureStartThumbX.current = pxForIdx(stepRef.current, trackW.current);
      },

      onPanResponderMove: (_, gs) => {
        const w = trackW.current;
        if (!w) return;
        const tx = Math.max(0, Math.min(w - THUMB_D, gestureStartThumbX.current + gs.dx));
        thumbX.setValue(tx);
      },

      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        const w = trackW.current;
        if (!w) return;
        const tx = Math.max(0, Math.min(w - THUMB_D, gestureStartThumbX.current + gs.dx));
        const ratio = w > THUMB_D ? tx / (w - THUMB_D) : 0;
        const next = Math.max(0, Math.min(FONT_STEPS.length - 1, Math.round(ratio * (FONT_STEPS.length - 1))));
        snapTo(next, w);
        if (next !== stepRef.current) {
          Haptics.selectionAsync();
          onChange(FONT_STEPS[next]);
        }
        stepRef.current = next;
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        if (trackW.current > 0) snapTo(stepRef.current, trackW.current);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w === trackW.current) return;
    trackW.current = w;
    thumbX.setValue(pxForIdx(stepRef.current, w));
  };

  return (
    <View style={styles.wrap} onLayout={onLayout} {...pan.panHandlers}>
      <View style={[styles.trackBg, { backgroundColor: track }]} />
      <Animated.View style={[styles.trackFill, { width: thumbX, backgroundColor: tint }]} />
      <Animated.View
        style={[styles.thumb, { backgroundColor: tint, transform: [{ translateX: thumbX }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: THUMB_D + 10,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute', left: THUMB_D / 2, right: THUMB_D / 2,
    height: TRACK_H, borderRadius: TRACK_H / 2,
  },
  trackFill: {
    position: 'absolute', left: THUMB_D / 2,
    height: TRACK_H, borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute', left: 0,
    width: THUMB_D, height: THUMB_D, borderRadius: THUMB_D / 2,
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
