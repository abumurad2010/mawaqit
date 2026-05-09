import Foundation

let appGroupID = "group.com.mawaqit.app.widget"

struct PrayerWidgetData: Codable {
  var nextPrayerName: String
  var nextPrayerTime: String
  var countdown: String
  var nextPrayerName2: String
  var nextPrayerTime2: String
  var updatedAt: Double

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
