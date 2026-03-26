import React from 'react';
import { Widget } from 'expo-widgets';
import { Text, HStack, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';

export interface MawaqitWidgetProps {
  nextPrayerName: string;
  nextPrayerTime: string;
  countdown: string;
  upcomingPrayers: Array<{ name: string; time: string }>;
}

function WidgetLayout(
  { nextPrayerName, nextPrayerTime, countdown, upcomingPrayers }: MawaqitWidgetProps,
  environment: { widgetFamily: string },
) {
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#8a7a60')]}>
          مواقيت
        </Text>
        <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle('#c9a84c')]}>
          {nextPrayerName}
        </Text>
        <Text modifiers={[font({ size: 28, weight: 'bold' }), foregroundStyle('#ffffff')]}>
          {nextPrayerTime}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8a7a60')]}>
          {countdown}
        </Text>
      </VStack>
    );
  }

  return (
    <HStack>
      <VStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#8a7a60')]}>
          مواقيت · Next
        </Text>
        <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle('#c9a84c')]}>
          {nextPrayerName}
        </Text>
        <Text modifiers={[font({ size: 26, weight: 'bold' }), foregroundStyle('#ffffff')]}>
          {nextPrayerTime}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#8a7a60')]}>
          {countdown}
        </Text>
      </VStack>
      <VStack>
        {upcomingPrayers.map((prayer, i) => (
          <HStack key={i}>
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#c8bca8')]}>
              {prayer.name}
            </Text>
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle('#ffffff')]}>
              {prayer.time}
            </Text>
          </HStack>
        ))}
      </VStack>
    </HStack>
  );
}

let mawaqitWidget: Widget<MawaqitWidgetProps> | null = null;
try {
  mawaqitWidget = new Widget<MawaqitWidgetProps>('MawaqitWidget', WidgetLayout);
} catch {
  // expo-widgets not available on this platform (web, unsupported OS)
}

export { mawaqitWidget };
