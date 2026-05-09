import Foundation

let appGroupID = "group.com.mawaqit.app.widget"

struct PrayerWidgetData: Codable {
  var nextPrayerName: String
  var nextPrayerTime: String
  var countdown: String
  var nextPrayerName2: String
  var nextPrayerTime2: String
  var updatedAt: Double

  // Explicit memberwise init — required because the custom Decodable init below
  // would otherwise suppress the compiler-synthesised one.
  init(
    nextPrayerName: String,
    nextPrayerTime: String,
    countdown: String,
    nextPrayerName2: String,
    nextPrayerTime2: String,
    updatedAt: Double
  ) {
    self.nextPrayerName  = nextPrayerName
    self.nextPrayerTime  = nextPrayerTime
    self.countdown       = countdown
    self.nextPrayerName2 = nextPrayerName2
    self.nextPrayerTime2 = nextPrayerTime2
    self.updatedAt       = updatedAt
  }

  // Custom decoder so old JSON (without name2/time2) still decodes cleanly.
  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
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
