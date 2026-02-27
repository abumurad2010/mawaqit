import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'moon.stars', selected: 'moon.stars.fill' }} />
        <Label>Prayers</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <Icon sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }} />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="qibla">
        <Icon sf={{ default: 'location.circle', selected: 'location.circle.fill' }} />
        <Label>Qibla</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quran">
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <Label>Quran</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isDark, lang } = useApp();
  const C = isDark ? Colors.dark : Colors.light;

  const labels: Record<string, string> = {
    index:    lang === 'ar' ? 'الصلاة'    : 'Prayers',
    calendar: lang === 'ar' ? 'التقويم'   : 'Calendar',
    qibla:    lang === 'ar' ? 'القبلة'    : 'Qibla',
    quran:    lang === 'ar' ? 'القرآن'    : 'Quran',
  };

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
            android: isDark ? '#0d1f13' : '#f8fdf9',
            web: isDark ? '#0d1f13' : '#f8fdf9',
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
      <Tabs.Screen
        name="index"
        options={{
          title: labels.index,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: labels.calendar,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: labels.qibla,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: labels.quran,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
