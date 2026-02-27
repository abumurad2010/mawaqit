import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYERS: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const PRAYER_TIMES: Record<PrayerName, string> = {
  fajr: "Dawn",
  dhuhr: "Midday",
  asr: "Afternoon",
  maghrib: "Sunset",
  isha: "Night",
};

export type DayLog = {
  date: string;
  prayers: Record<PrayerName, boolean>;
};

type PrayerContextValue = {
  logs: Record<string, DayLog>;
  todayKey: string;
  todayLog: DayLog;
  togglePrayer: (prayer: PrayerName) => void;
  getStreakCount: () => number;
  getLongestStreak: () => number;
  getWeeklyStats: () => { date: string; count: number; label: string }[];
  getOverallRate: () => number;
  isLoading: boolean;
};

const STORAGE_KEY = "prayer_logs_v1";

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyDay(date: string): DayLog {
  return {
    date,
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
  };
}

const PrayerContext = createContext<PrayerContextValue | null>(null);

export function PrayerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  const todayKey = todayDateKey();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, DayLog>;
          if (!parsed[todayKey]) {
            parsed[todayKey] = emptyDay(todayKey);
          }
          setLogs(parsed);
        } catch {
          const initial: Record<string, DayLog> = { [todayKey]: emptyDay(todayKey) };
          setLogs(initial);
        }
      } else {
        setLogs({ [todayKey]: emptyDay(todayKey) });
      }
      setIsLoading(false);
    });
  }, []);

  const saveLogs = async (updated: Record<string, DayLog>) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const togglePrayer = (prayer: PrayerName) => {
    setLogs((prev) => {
      const day = prev[todayKey] ?? emptyDay(todayKey);
      const updated: Record<string, DayLog> = {
        ...prev,
        [todayKey]: {
          ...day,
          prayers: {
            ...day.prayers,
            [prayer]: !day.prayers[prayer],
          },
        },
      };
      saveLogs(updated);
      return updated;
    });
  };

  const todayLog = logs[todayKey] ?? emptyDay(todayKey);

  const getSortedDates = () =>
    Object.keys(logs).sort((a, b) => (a < b ? -1 : 1));

  const getStreakCount = (): number => {
    const dates = getSortedDates().reverse();
    let streak = 0;
    for (const date of dates) {
      const log = logs[date];
      const completedAll = PRAYERS.every((p) => log.prayers[p]);
      if (completedAll) {
        streak++;
      } else if (date !== todayKey) {
        break;
      }
    }
    return streak;
  };

  const getLongestStreak = (): number => {
    const dates = getSortedDates();
    let longest = 0;
    let current = 0;
    for (const date of dates) {
      const log = logs[date];
      const completedAll = PRAYERS.every((p) => log.prayers[p]);
      if (completedAll) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return longest;
  };

  const getWeeklyStats = () => {
    const result: { date: string; count: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const log = logs[key];
      const count = log ? PRAYERS.filter((p) => log.prayers[p]).length : 0;
      result.push({ date: key, count, label: labels[d.getDay()] });
    }
    return result;
  };

  const getOverallRate = (): number => {
    const dates = getSortedDates();
    if (dates.length === 0) return 0;
    const total = dates.length * 5;
    const completed = dates.reduce((acc, date) => {
      return acc + PRAYERS.filter((p) => logs[date].prayers[p]).length;
    }, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const value = useMemo(
    () => ({
      logs,
      todayKey,
      todayLog,
      togglePrayer,
      getStreakCount,
      getLongestStreak,
      getWeeklyStats,
      getOverallRate,
      isLoading,
    }),
    [logs, isLoading]
  );

  return <PrayerContext.Provider value={value}>{children}</PrayerContext.Provider>;
}

export function usePrayer() {
  const ctx = useContext(PrayerContext);
  if (!ctx) throw new Error("usePrayer must be used within PrayerProvider");
  return ctx;
}
