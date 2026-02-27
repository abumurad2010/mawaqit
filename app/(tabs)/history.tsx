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

function formatDateLabel(dateKey: string): { day: string; month: string; weekday: string } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    day: String(d),
    month: months[m - 1],
    weekday: days[date.getDay()],
  };
}

function isToday(dateKey: string): boolean {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return key === dateKey;
}

function PrayerDot({ prayer, completed }: { prayer: PrayerName; completed: boolean }) {
  const color = PRAYER_COLORS[prayer];
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: completed ? color : COLORS.border },
      ]}
    />
  );
}

function DayCard({ dateKey, log }: { dateKey: string; log: { prayers: Record<PrayerName, boolean> } }) {
  const { day, month, weekday } = formatDateLabel(dateKey);
  const completed = PRAYERS.filter((p) => log.prayers[p]).length;
  const isTodayFlag = isToday(dateKey);
  const allDone = completed === 5;

  return (
    <View style={[styles.dayCard, isTodayFlag && styles.dayCardToday]}>
      {allDone && (
        <LinearGradient
          colors={[`${COLORS.accent}18`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.dayLeft}>
        <Text style={[styles.dayWeekday, isTodayFlag && styles.todayLabel]}>
          {isTodayFlag ? "Today" : weekday}
        </Text>
        <Text style={styles.dayNum}>{day}</Text>
        <Text style={styles.dayMonth}>{month}</Text>
      </View>
      <View style={styles.dayCenter}>
        <View style={styles.dotsRow}>
          {PRAYERS.map((p) => (
            <PrayerDot key={p} prayer={p} completed={!!log.prayers[p]} />
          ))}
        </View>
        <View style={styles.prayerLabelsRow}>
          {PRAYERS.map((p) => (
            <Text key={p} style={styles.dotLabel}>
              {PRAYER_LABELS[p][0]}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.dayRight}>
        {allDone ? (
          <View style={styles.allBadge}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
          </View>
        ) : (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{completed}</Text>
            <Text style={styles.countOf}>/5</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { logs } = usePrayer();

  const sortedDates = useMemo(() => {
    return Object.keys(logs).sort((a, b) => (a > b ? -1 : 1));
  }, [logs]);

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
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>{sortedDates.length} days tracked</Text>
        </View>

        {sortedDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textDim} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Start tracking your daily prayers to see them here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedDates.map((dateKey) => (
              <DayCard key={dateKey} dateKey={dateKey} log={logs[dateKey]} />
            ))}
          </View>
        )}
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 20,
    color: COLORS.text,
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  dayCard: {
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
  dayCardToday: {
    borderColor: `${COLORS.primary}60`,
  },
  dayLeft: {
    width: 52,
    alignItems: "center",
  },
  dayWeekday: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  todayLabel: {
    color: COLORS.primaryLight,
  },
  dayNum: {
    fontFamily: "Outfit_700Bold",
    fontSize: 26,
    color: COLORS.text,
    lineHeight: 30,
  },
  dayMonth: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dayCenter: {
    flex: 1,
    gap: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  prayerLabelsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dotLabel: {
    width: 28,
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: COLORS.textDim,
    textAlign: "center",
  },
  dayRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
  },
  allBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  countText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: COLORS.text,
  },
  countOf: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
