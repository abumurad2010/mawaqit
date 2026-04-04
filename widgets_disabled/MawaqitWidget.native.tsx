import React from 'react';

let Widget: any = null;
let Text: any = null;
let HStack: any = null;
let VStack: any = null;
let font: any = null;
let foregroundStyle: any = null;

try {
  Widget = require('expo-widgets').Widget;
  const swiftUi = require('@expo/ui/swift-ui');
  Text = swiftUi.Text;
  HStack = swiftUi.HStack;
  VStack = swiftUi.VStack;
  const modifiers = require('@expo/ui/swift-ui/modifiers');
  font = modifiers.font;
  foregroundStyle = modifiers.foregroundStyle;
} catch {
  // expo-widgets and @expo/ui not available in Expo Go — widgets work only in production builds
}

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

let mawaqitWidget: any = null;
if (Widget) {
  try {
    mawaqitWidget = new Widget<MawaqitWidgetProps>('MawaqitWidget', WidgetLayout);
  } catch {
    // Widget instantiation failed — silently ignore
  }
}

export { mawaqitWidget };
