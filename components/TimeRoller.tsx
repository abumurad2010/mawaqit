import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Platform, StyleSheet,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';

const ITEM_H = 48;
const VISIBLE = 5;
const SIDE = Math.floor(VISIBLE / 2); // 2 items above/below center

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
  const listRef = useRef<FlatList>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const ms = Platform.OS === 'android' ? 150 : 80;
    const t = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: selectedIdx * ITEM_H, animated: false });
      mounted.current = true;
    }, ms);
    return () => clearTimeout(t);
  }, []);

  const commit = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = e.nativeEvent.contentOffset.y / ITEM_H;
      const idx = Math.max(0, Math.min(Math.round(raw), data.length - 1));
      onSelect(idx);
    },
    [data.length, onSelect],
  );

  return (
    <View style={{ height: ITEM_H * VISIBLE, width: 60, overflow: 'hidden' }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate={Platform.OS === 'android' ? 0.9 : 'fast'}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={Platform.OS === 'web' ? commit : undefined}
        contentContainerStyle={{ paddingVertical: ITEM_H * SIDE }}
        getItemLayout={(_, index) => ({
          length: ITEM_H, offset: ITEM_H * index, index,
        })}
        renderItem={({ item, index }) => {
          const dist = Math.abs(index - selectedIdx);
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  {
                    color: dist === 0 ? tintColor : textColor,
                    fontSize: dist === 0 ? 32 : dist === 1 ? 24 : 18,
                    fontWeight: dist === 0 ? '700' : '400',
                    opacity: dist === 0 ? 1 : dist === 1 ? 0.5 : 0.18,
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
            top: ITEM_H * SIDE,
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
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontVariant: ['tabular-nums'] },
  colon: { fontSize: 30, fontWeight: '700', marginTop: -4, alignSelf: 'center' },
});
