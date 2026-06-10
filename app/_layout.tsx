import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { playAthan } from '@/lib/audio';
import { calculatePrayerTimes, type CalcMethod, type AsrMethod } from '@/lib/prayer-times';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

SplashScreen.preventAutoHideAsync();

/**
 * In-app rating prompt gating.
 *
 * Increments the app-open counter on every launch and, once all of the
 * following are true, shows the native store-review dialog exactly once:
 *   • opened 5 or more times
 *   • 3 or more days since first install
 *   • the prompt has not already been shown
 *   • the current time is NOT within ±5 minutes of any fardh prayer
 *
 * Wrapped in try/catch so it can never crash the app.
 */
async function maybePromptForRating(params: {
  effectiveLocation: { lat: number; lng: number } | null;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
}): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    // 1. Increment the per-launch open counter.
    const countStr = await AsyncStorage.getItem('app_open_count');
    const openCount = (countStr ? parseInt(countStr, 10) : 0) + 1;
    await AsyncStorage.setItem('app_open_count', String(openCount));

    // 2. Record the first-install date once.
    let firstInstall = await AsyncStorage.getItem('first_install_date');
    if (!firstInstall) {
      firstInstall = String(Date.now());
      await AsyncStorage.setItem('first_install_date', firstInstall);
    }

    // 3. Never prompt more than once.
    if ((await AsyncStorage.getItem('rating_prompt_shown')) === 'true') return;

    // 4. Require at least 5 opens.
    if (openCount < 5) return;

    // 5. Require at least 3 days since first install.
    const daysSinceInstall = (Date.now() - parseInt(firstInstall, 10)) / (1000 * 60 * 60 * 24);
    if (daysSinceInstall < 3) return;

    // 6. Avoid prompting within ±5 minutes of any prayer time.
    if (params.effectiveLocation) {
      const now = new Date();
      const times = calculatePrayerTimes({
        lat: params.effectiveLocation.lat,
        lng: params.effectiveLocation.lng,
        date: now,
        method: params.calcMethod,
        asrMethod: params.asrMethod,
        maghribOffset: params.maghribOffset,
      });
      const FIVE_MIN_MS = 5 * 60 * 1000;
      const nearPrayer = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha].some(
        d => Math.abs(now.getTime() - d.getTime()) <= FIVE_MIN_MS,
      );
      if (nearPrayer) return;
    }

    // All conditions met — attempt the native review dialog, then mark as shown.
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      }
    } finally {
      await AsyncStorage.setItem('rating_prompt_shown', 'true');
    }
  } catch {
    // Rating prompt must never crash the app.
  }
}

function RootLayoutNav() {
  const {
    defaultTab,
    selectedAdhan,
    location,
    locationMode,
    manualLocation,
    calcMethod,
    asrMethod,
    maghribOffset,
  } = useApp();
  const appState = useRef(AppState.currentState);
  const hasRedirected = useRef(false);
  const ratingChecked = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    if (!defaultTab || defaultTab === 'index') {
      hasRedirected.current = true;
      return;
    }
    hasRedirected.current = true;
    const timeout = setTimeout(() => {
      router.replace(`/(tabs)/${defaultTab}` as any);
    }, 150);
    return () => clearTimeout(timeout);
  }, [defaultTab]);

  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // FIX 1 — Re-check notification permission each time the app returns to foreground.
  // This ensures that if the user granted permission in iOS Settings and comes back,
  // the permission state is fresh for the next toggle tap.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        await Notifications.getPermissionsAsync();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Rating prompt: evaluate once a few seconds after launch, by which point
  // the GPS location has usually resolved (so the prayer-time guard can run).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => {
      if (ratingChecked.current) return;
      ratingChecked.current = true;
      const effectiveLocation =
        locationMode === 'manual' && manualLocation ? manualLocation : location;
      maybePromptForRating({ effectiveLocation, calcMethod, asrMethod, maghribOffset });
    }, 4000);
    return () => clearTimeout(timer);
  }, [location, locationMode, manualLocation, calcMethod, asrMethod, maghribOffset]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
      // iOS: adhan audio is handled by the .caf notification sound — no JS playback needed
      if (Platform.OS !== 'ios') {
        const data = notification.request.content.data;
        if (data?.playAthan) playAthan(data.athanType === 'abbreviated' ? 'abbreviated' : 'full', undefined, (data.athanVoice as string | undefined) ?? selectedAdhan);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      // iOS: adhan audio is handled by the .caf notification sound — no JS playback needed
      if (Platform.OS !== 'ios') {
        const data = response.notification.request.content.data;
        if (data?.playAthan) playAthan(data.athanType === 'abbreviated' ? 'abbreviated' : 'full', undefined, (data.athanVoice as string | undefined) ?? selectedAdhan);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, [selectedAdhan]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="surah/[number]" options={{ headerShown: false, presentation: 'card' }} />

      <Stack.Screen name="about" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="quran-toc" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="bookmarks" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="search" options={{ headerShown: false, presentation: 'modal' }} />
      {/* TEST-28: edge-swipe-back disabled on the reader so it can't bypass the
          chrome's back action (which always routes to the ToC, never history). */}
      <Stack.Screen
        name="quran-reader"
        options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    'KFGQPCHafs': require('../assets/fonts/UthmanicHafs-v18.ttf'),
    'ScheherazadeNew': require('../assets/fonts/ScheherazadeNew-Regular.ttf'),
    'AmiriRegular': require('../assets/fonts/Amiri-Regular.ttf'),
    'AmiriQuran': require('../assets/fonts/AmiriQuran-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

