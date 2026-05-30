import Foundation

let appGroupID = "group.com.mawaqit.app.widget"

/// Single fardh-prayer entry written by the JS side. `timestamp` is seconds
/// since epoch and identifies the exact wall-clock moment the prayer fires
/// — the Swift timeline uses these to build per-prayer entries.
struct PrayerSlot: Codable {
  var name: String       // localized abbreviation (FJR / DHR / ASR / MGB / ISH)
  var time: String       // "HH:MM" local time
  var timestamp: Double  // seconds since 1970, local clock
}

/// Full payload written by `WidgetDataModule.updateWidgetTimeline`.
/// Holds today + tomorrow's five fardh prayers so WidgetKit can build a
/// 48-hour timeline that flips automatically at each prayer.
struct PrayerWidgetData: Codable {
  // ---- New timeline fields ------------------------------------------------
  var today: [PrayerSlot]
  var tomorrow: [PrayerSlot]
  var updatedAt: Double

  // ---- Legacy fields (kept for backward-compat decoding) -----------------
  var nextPrayerName: String
  var nextPrayerTime: String
  var countdown: String
  var nextPrayerName2: String
  var nextPrayerTime2: String

  init(
    today: [PrayerSlot],
    tomorrow: [PrayerSlot],
    nextPrayerName: String,
    nextPrayerTime: String,
    countdown: String,
    nextPrayerName2: String,
    nextPrayerTime2: String,
    updatedAt: Double
  ) {
    self.today = today
    self.tomorrow = tomorrow
    self.nextPrayerName  = nextPrayerName
    self.nextPrayerTime  = nextPrayerTime
    self.countdown       = countdown
    self.nextPrayerName2 = nextPrayerName2
    self.nextPrayerTime2 = nextPrayerTime2
    self.updatedAt       = updatedAt
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    today           = (try? c.decode([PrayerSlot].self, forKey: .today)) ?? []
    tomorrow        = (try? c.decode([PrayerSlot].self, forKey: .tomorrow)) ?? []
    nextPrayerName  = try c.decode(String.self, forKey: .nextPrayerName)
    nextPrayerTime  = try c.decode(String.self, forKey: .nextPrayerTime)
    countdown       = try c.decode(String.self, forKey: .countdown)
    nextPrayerName2 = try c.decodeIfPresent(String.self, forKey: .nextPrayerName2) ?? ""
    nextPrayerTime2 = try c.decodeIfPresent(String.self, forKey: .nextPrayerTime2) ?? ""
    updatedAt       = try c.decode(Double.self, forKey: .updatedAt)
  }
}

func writePrayerWidgetData(_ data: PrayerWidgetData) {
  guard let defaults = UserDefaults(suiteName: appGroupID),
        let encoded = try? JSONEncoder().encode(data) else { return }
  defaults.set(encoded, forKey: "prayerWidgetData")
}

func readPrayerWidgetData() -> PrayerWidgetData? {
  guard let defaults = UserDefaults(suiteName: appGroupID),
        let raw = defaults.data(forKey: "prayerWidgetData"),
        let decoded = try? JSONDecoder().decode(PrayerWidgetData.self, from: raw)
  else { return nil }
  return decoded
}
