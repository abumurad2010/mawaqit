import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text } from 'react-native';
import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import { setPreviousTab } from '@/lib/prev-tab';

const SETTINGS_BLUE = '#4A90D9';

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
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
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
      initialRouteName="index"
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
      screenListeners={({ navigation, route }) => ({
        tabPress: () => {
          if (route.name === 'settings') {
            const state = navigation.getState();
            const currentName = state.routes[state.index]?.name;
            if (currentName && currentName !== 'settings') {
              setPreviousTab(currentName);
            }
          }
        },
      })}
    >
      {isRtl ? [...screens].reverse() : screens}
      <Tabs.Screen
        key="settings"
        name="settings"
        options={{
          title: tr.settings,
          tabBarItemStyle: Platform.OS === 'web' ? { marginLeft: 24 } : { marginLeft: 24 },
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={focused ? SETTINGS_BLUE : '#5BA4CF'}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? SETTINGS_BLUE : '#5BA4CF',
                fontSize: 10,
                fontFamily: 'Inter_400Regular',
                marginBottom: Platform.OS === 'ios' ? 0 : 2,
              }}
            >
              {tr.settings}
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
