import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';

function NativeTabLayout() {
  const { isRtl, lang } = useApp();
  const tr = t(lang);

  const triggers = [
    <NativeTabs.Trigger key="index" name="index">
      <Icon sf={{ default: 'moon.stars', selected: 'moon.stars.fill' }} />
      <Label>{tr.prayers}</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="calendar" name="calendar">
      <Icon sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }} />
      <Label>{tr.today}</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="qibla" name="qibla">
      <Icon sf={{ default: 'location.circle', selected: 'location.circle.fill' }} />
      <Label>{tr.qibla}</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="athkar" name="athkar">
      <Icon sf={{ default: 'moon', selected: 'moon.fill' }} />
      <Label>الأذكار</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="quran" name="quran">
      <Icon sf={{ default: 'book', selected: 'book.fill' }} />
      <Label>{tr.quran}</Label>
    </NativeTabs.Trigger>,
  ];

  return (
    <NativeTabs>
      {isRtl ? [...triggers].reverse() : triggers}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isDark, lang, colors, isRtl } = useApp();
  const C = colors;
  const tr = t(lang);

  const screens = [
    <Tabs.Screen
      key="index"
      name="index"
      options={{
        title: tr.prayers,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="moon-outline" size={size} color={color} />
        ),
      }}
    />,
    <Tabs.Screen
      key="calendar"
      name="calendar"
      options={{
        title: tr.today,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="calendar-outline" size={size} color={color} />
        ),
      }}
    />,
    <Tabs.Screen
      key="qibla"
      name="qibla"
      options={{
        title: tr.qibla,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="compass-outline" size={size} color={color} />
        ),
      }}
    />,
    <Tabs.Screen
      key="athkar"
      name="athkar"
      options={{
        title: 'الأذكار',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="moon-outline" size={size} color={color} />
        ),
      }}
    />,
    <Tabs.Screen
      key="quran"
      name="quran"
      options={{
        title: tr.quran,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={size} color={color} />
        ),
      }}
    />,
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.select({
            ios: 'transparent',
            android: isDark ? '#1C1C1E' : '#FFFFFF',
            web: isDark ? '#1C1C1E' : '#F2F2F7',
          }),
          borderTopWidth: 1,
          borderTopColor: C.separator,
          elevation: 0,
          height: Platform.OS === 'web' ? 84 : undefined,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={90}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {isRtl ? [...screens].reverse() : screens}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
