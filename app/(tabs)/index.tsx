import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import COLORS, { PRAYER_COLORS } from "@/constants/colors";
import {
  usePrayer,
  PRAYERS,
  PrayerName,
  PRAYER_LABELS,
  PRAYER_TIMES,
} from "@/context/PrayerContext";
import { LinearGradient } from "expo-linear-gradient";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const PRAYER_ICONS: Record<PrayerName, { name: string; icon: keyof typeof Ionicons.glyphMap }> = {
  fajr: { name: "Fajr", icon: "partly-sunny-outline" },
  dhuhr: { name: "Dhuhr", icon: "sunny-outline" },
  asr: { name: "Asr", icon: "cloud-sun-outline" },
  maghrib: { name: "Maghrib", icon: "sunset-outline" },
  isha: { name: "Isha", icon: "moon-outline" },
};

function PrayerCard({ prayer, completed }: { prayer: PrayerName; completed: boolean }) {
  const { togglePrayer } = usePrayer();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(completed ? 1 : 0);

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
    }
    scale.value = withSequence(withSpring(0.95), withSpring(1, { damping: 12 }));
    if (!completed) {
      checkScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    } else {
      checkScale.value = withSpring(0);
    }
    togglePrayer(prayer);
  }, [prayer, completed]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const color = PRAYER_COLORS[prayer];
  const icon = PRAYER_ICONS[prayer].icon;

  return (
    <Animated.View style={[cardStyle]}>
      <Pressable onPress={handlePress} style={styles.prayerCardWrapper}>
        <View
          style={[
            styles.prayerCard,
            completed && styles.prayerCardCompleted,
          ]}
        >
          <LinearGradient
            colors={completed ? [`${color}20`, `${color}08`] : ["transparent", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[styles.prayerIconContainer, { backgroundColor: `${color}22` }]}
          >
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{PRAYER_LABELS[prayer]}</Text>
            <Text style={styles.prayerTime}>{PRAYER_TIMES[prayer]}</Text>
          </View>
          <Animated.View
            style={[
              styles.checkCircle,
              completed && { backgroundColor: `${color}30`, borderColor: color },
              checkStyle,
            ]}
          >
            {completed && <Ionicons name="checkmark" size={18} color={color} />}
          </Animated.View>
          {!completed && (
            <View style={styles.emptyCircle}>
              <View style={styles.emptyCircleInner} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { todayLog, todayKey } = usePrayer();

  const completedCount = PRAYERS.filter((p) => todayLog.prayers[p]).length;
  const progress = completedCount / 5;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 120 }]}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{formatDate(todayKey)}</Text>
        </View>

        <View style={styles.progressCard}>
          <LinearGradient
            colors={["#1A3322", "#0F2018"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressCount}>
                {completedCount}
                <Text style={styles.progressTotal}>/5</Text>
              </Text>
              <Text style={styles.progressLabel}>prayers completed</Text>
            </View>
            {completedCount === 5 && (
              <View style={styles.allDoneBadge}>
                <Ionicons name="star" size={14} color={COLORS.accent} />
                <Text style={styles.allDoneText}>All done!</Text>
              </View>
            )}
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Daily Prayers</Text>

        {PRAYERS.map((prayer) => (
          <PrayerCard
            key={prayer}
            prayer={prayer}
            completed={!!todayLog.prayers[prayer]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 12,
    marginBottom: 24,
  },
  greeting: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  dateText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  progressCount: {
    fontFamily: "Outfit_700Bold",
    fontSize: 48,
    color: COLORS.text,
    lineHeight: 52,
  },
  progressTotal: {
    fontFamily: "Outfit_400Regular",
    fontSize: 28,
    color: COLORS.textSecondary,
  },
  progressLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  allDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  allDoneText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: COLORS.accent,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  prayerCardWrapper: {
    marginBottom: 10,
  },
  prayerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    gap: 14,
  },
  prayerCardCompleted: {
    borderColor: "transparent",
  },
  prayerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 17,
    color: COLORS.text,
  },
  prayerTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
});
