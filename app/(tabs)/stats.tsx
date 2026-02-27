import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS, { PRAYER_COLORS } from "@/constants/colors";
import { usePrayer, PRAYERS, PrayerName, PRAYER_LABELS } from "@/context/PrayerContext";

function StatCard({
  icon,
  iconColor,
  value,
  label,
  sublabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </View>
  );
}

function WeekBar({ label, count, isToday }: { label: string; count: number; isToday: boolean }) {
  const height = count === 0 ? 4 : (count / 5) * 80;
  return (
    <View style={styles.weekBarWrapper}>
      <View style={styles.weekBarContainer}>
        <View style={styles.weekBarBg}>
          <LinearGradient
            colors={isToday ? [COLORS.accent, `${COLORS.accent}60`] : [COLORS.primary, `${COLORS.primary}60`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.weekBarFill, { height }]}
          />
        </View>
      </View>
      <Text style={[styles.weekBarLabel, isToday && styles.weekBarLabelToday]}>{label}</Text>
      <Text style={styles.weekBarCount}>{count}</Text>
    </View>
  );
}

function PrayerRateBar({ prayer, rate }: { prayer: PrayerName; rate: number }) {
  const color = PRAYER_COLORS[prayer];
  return (
    <View style={styles.prayerRateRow}>
      <Text style={styles.prayerRateName}>{PRAYER_LABELS[prayer]}</Text>
      <View style={styles.prayerRateBarBg}>
        <View
          style={[
            styles.prayerRateBarFill,
            { width: `${rate}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.prayerRatePercent, { color }]}>{rate}%</Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { logs, getStreakCount, getLongestStreak, getWeeklyStats, getOverallRate, todayKey } =
    usePrayer();

  const streak = getStreakCount();
  const longest = getLongestStreak();
  const weekly = getWeeklyStats();
  const overallRate = getOverallRate();

  const prayerRates = useMemo(() => {
    const dates = Object.keys(logs);
    if (dates.length === 0) return PRAYERS.map((p) => ({ prayer: p, rate: 0 }));
    return PRAYERS.map((p) => {
      const completed = dates.filter((d) => logs[d].prayers[p]).length;
      return { prayer: p, rate: Math.round((completed / dates.length) * 100) };
    });
  }, [logs]);

  const totalDays = Object.keys(logs).length;

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
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>Your prayer journey</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="flame-outline"
            iconColor={COLORS.accent}
            value={String(streak)}
            label="Current Streak"
            sublabel={streak === 1 ? "day" : "days"}
          />
          <StatCard
            icon="trophy-outline"
            iconColor="#C8A44A"
            value={String(longest)}
            label="Best Streak"
            sublabel={longest === 1 ? "day" : "days"}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="checkmark-circle-outline"
            iconColor={COLORS.success}
            value={`${overallRate}%`}
            label="Completion Rate"
          />
          <StatCard
            icon="calendar-outline"
            iconColor={COLORS.fajr}
            value={String(totalDays)}
            label="Days Tracked"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekChart}>
            {weekly.map((w, i) => (
              <WeekBar
                key={w.date}
                label={w.label}
                count={w.count}
                isToday={w.date === todayKey}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Completion</Text>
          <View style={styles.prayerRatesCard}>
            {totalDays === 0 ? (
              <View style={styles.emptyRates}>
                <Ionicons name="stats-chart-outline" size={32} color={COLORS.textDim} />
                <Text style={styles.emptyRatesText}>
                  Complete prayers to see per-prayer stats
                </Text>
              </View>
            ) : (
              prayerRates.map(({ prayer, rate }) => (
                <PrayerRateBar key={prayer} prayer={prayer} rate={rate} />
              ))
            )}
          </View>
        </View>
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
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 30,
    color: COLORS.text,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  statSublabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: COLORS.textDim,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  weekChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  weekBarWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekBarContainer: {
    height: 88,
    justifyContent: "flex-end",
  },
  weekBarBg: {
    width: 28,
    height: 88,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weekBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  weekBarLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  weekBarLabelToday: {
    color: COLORS.accent,
  },
  weekBarCount: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: COLORS.text,
  },
  prayerRatesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  prayerRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prayerRateName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: COLORS.text,
    width: 64,
  },
  prayerRateBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  prayerRateBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  prayerRatePercent: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    width: 38,
    textAlign: "right",
  },
  emptyRates: {
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  emptyRatesText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 20,
  },
});
