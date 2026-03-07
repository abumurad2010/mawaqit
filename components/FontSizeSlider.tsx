import React, { useRef, useEffect } from 'react';
import { View, Animated, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

export const FONT_STEPS = ['small', 'medium', 'large', 'xlarge'] as const;
export type FontSizeStep = typeof FONT_STEPS[number];

const THUMB_D = 22;
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
  const thumbX = useRef(new Animated.Value(0)).current;

  const px = (idx: number, w: number) =>
    (idx / (FONT_STEPS.length - 1)) * Math.max(0, w - THUMB_D);

  useEffect(() => {
    const idx = FONT_STEPS.indexOf(value);
    if (idx < 0) return;
    stepRef.current = idx;
    if (!isDragging.current && trackW.current > 0) {
      Animated.spring(thumbX, {
        toValue: px(idx, trackW.current),
        useNativeDriver: false, tension: 130, friction: 7,
      }).start();
    }
  }, [value]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { isDragging.current = true; },
      onPanResponderMove: (_, gs) => {
        const w = trackW.current;
        if (!w) return;
        const base = px(stepRef.current, w);
        thumbX.setValue(Math.max(0, Math.min(w - THUMB_D, base + gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        const w = trackW.current;
        if (!w) return;
        const base = px(stepRef.current, w);
        const cur = Math.max(0, Math.min(w - THUMB_D, base + gs.dx));
        const ratio = w > THUMB_D ? cur / (w - THUMB_D) : 0;
        const next = Math.max(0, Math.min(FONT_STEPS.length - 1, Math.round(ratio * (FONT_STEPS.length - 1))));
        Animated.spring(thumbX, {
          toValue: px(next, w),
          useNativeDriver: false, tension: 150, friction: 8,
        }).start();
        if (next !== stepRef.current) {
          Haptics.selectionAsync();
          onChange(FONT_STEPS[next]);
        }
        stepRef.current = next;
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w === trackW.current) return;
    trackW.current = w;
    thumbX.setValue(px(stepRef.current, w));
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={[styles.trackBg, { backgroundColor: track }]} />
      <Animated.View style={[styles.trackFill, { width: thumbX, backgroundColor: tint }]} />
      <Animated.View
        style={[styles.thumb, { left: thumbX, backgroundColor: tint }]}
        {...pan.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: THUMB_D, justifyContent: 'center' },
  trackBg: {
    position: 'absolute', left: THUMB_D / 2, right: THUMB_D / 2,
    height: TRACK_H, borderRadius: TRACK_H / 2,
  },
  trackFill: {
    position: 'absolute', left: THUMB_D / 2,
    height: TRACK_H, borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute', width: THUMB_D, height: THUMB_D, borderRadius: THUMB_D / 2,
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
});
