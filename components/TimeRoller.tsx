import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, Platform, StyleSheet,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_H = 36;
const VISIBLE = 5;
const SIDE = Math.floor(VISIBLE / 2); // 2 items above/below center
const COPIES = 3; // prev, current, next cycle for infinite wrapping
const CONTAINER_PADDING_V = 6; // must match paddingVertical in styles.container

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

interface WheelProps {
  data: string[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  tintColor: string;
  textColor: string;
}

function Wheel({ data, selectedIdx, onSelect, tintColor, textColor }: WheelProps) {
  const N = data.length;

  // Extend data COPIES times for infinite scroll illusion
  const extended = useMemo(
    () => Array.from({ length: N * COPIES }, (_, i) => data[i % N]!),
    [data, N],
  );

  const listRef = useRef<FlatList>(null);
  // displayRawIdx tracks our position in the extended array; starts at middle copy
  const [displayRawIdx, setDisplayRawIdx] = useState(N + selectedIdx);
  // Track last item index that triggered haptic so we only fire once per item
  const lastHapticIdxRef = useRef(N + selectedIdx);

  useEffect(() => {
    const ms = Platform.OS === 'android' ? 150 : 50;
    const t = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: (N + selectedIdx) * ITEM_H,
        animated: false,
      });
    }, ms);
    return () => clearTimeout(t);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === 'web') return;
      const rawY = e.nativeEvent.contentOffset.y;
      const rawIdx = Math.max(0, Math.min(Math.round(rawY / ITEM_H), extended.length - 1));
      if (rawIdx !== lastHapticIdxRef.current) {
        lastHapticIdxRef.current = rawIdx;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [extended.length],
  );

  const commit = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawY = e.nativeEvent.contentOffset.y;
      const rawIdx = Math.max(0, Math.min(Math.round(rawY / ITEM_H), extended.length - 1));

      // Actual value index within original data (wraps correctly)
      const actualIdx = rawIdx % N;

      // Re-center to middle copy so both directions remain scrollable
      const centeredRawIdx = N + actualIdx;
      if (rawIdx !== centeredRawIdx) {
        listRef.current?.scrollToOffset({
          offset: centeredRawIdx * ITEM_H,
          animated: false,
        });
      }

      // Update highlight instantly — no parent round-trip delay
      setDisplayRawIdx(centeredRawIdx);
      lastHapticIdxRef.current = centeredRawIdx;
      onSelect(actualIdx);
    },
    [N, extended.length, onSelect],
  );

  return (
    <View style={{ height: ITEM_H * VISIBLE, width: 52, overflow: 'hidden' }}>
      <FlatList
        ref={listRef}
        data={extended}
        keyExtractor={(_, index) => `${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={Platform.OS === 'web' ? commit : undefined}
        contentContainerStyle={{ paddingVertical: ITEM_H * SIDE }}
        getItemLayout={(_, index) => ({
          length: ITEM_H, offset: ITEM_H * index, index,
        })}
        windowSize={11}
        initialNumToRender={VISIBLE + 4}
        renderItem={({ index }) => {
          const dist = Math.abs(index - displayRawIdx);
          const item = data[index % N]!;
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  {
                    color: dist === 0 ? tintColor : textColor,
                    fontSize: dist === 0 ? 20 : dist === 1 ? 16 : 12,
                    fontWeight: dist === 0 ? '700' : '400',
                    opacity: dist === 0 ? 1 : dist === 1 ? 0.55 : 0.2,
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

interface TimeRollerProps {
  value: string;  // "HH:MM"
  onChange: (value: string) => void;
  tintColor: string;
  textColor: string;
  bgColor: string;
}

export default function TimeRoller({
  value,
  onChange,
  tintColor,
  textColor,
  bgColor,
}: TimeRollerProps) {
  const parts = value.split(':');
  const hIdx = Math.min(23, Math.max(0, parseInt(parts[0] ?? '7', 10)));
  const mIdx = Math.min(59, Math.max(0, parseInt(parts[1] ?? '0', 10)));

  const onHour = useCallback(
    (idx: number) => onChange(`${HOURS[idx]}:${MINUTES[mIdx]}`),
    [mIdx, onChange],
  );
  const onMin = useCallback(
    (idx: number) => onChange(`${HOURS[hIdx]}:${MINUTES[idx]}`),
    [hIdx, onChange],
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Selection highlight band — centered at ITEM_H * SIDE from top */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            top: ITEM_H * SIDE + CONTAINER_PADDING_V,
            height: ITEM_H,
            borderColor: tintColor + '50',
            backgroundColor: tintColor + '14',
          },
        ]}
      />
      <Wheel data={HOURS} selectedIdx={hIdx} onSelect={onHour} tintColor={tintColor} textColor={textColor} />
      <Text style={[styles.colon, { color: tintColor }]}>:</Text>
      <Wheel data={MINUTES} selectedIdx={mIdx} onSelect={onMin} tintColor={tintColor} textColor={textColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
    maxWidth: 280,
  },
  highlight: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontVariant: ['tabular-nums'] },
  colon: { fontSize: 20, fontWeight: '700', marginTop: -4, alignSelf: 'center' },
});
