import WidgetKit
import SwiftUI

// MARK: - Shared data layer (duplicated from main target — widget cannot import app)

private let widgetAppGroupID = "group.com.mawaqit.app.widget"

private struct PrayerWidgetData: Codable {
  var nextPrayerName: String
  var nextPrayerTime: String
  var countdown: String
  var nextPrayerName2: String
  var nextPrayerTime2: String
  var updatedAt: Double

  // Graceful decode for data written before name2/time2 were added.
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

private func readWidgetData() -> PrayerWidgetData? {
  guard let defaults = UserDefaults(suiteName: widgetAppGroupID),
        let raw = defaults.data(forKey: "prayerWidgetData"),
        let decoded = try? JSONDecoder().decode(PrayerWidgetData.self, from: raw)
  else { return nil }
  return decoded
}

// MARK: - Palette
private let mawaqitGreen = Color(red: 0x1a / 255.0, green: 0x8c / 255.0, blue: 0x5b / 255.0)

// MARK: - Entry
struct PrayerEntry: TimelineEntry {
  let date: Date
  let nextPrayerName: String
  let nextPrayerTime: String
  let countdown: String
  let nextPrayerName2: String
  let nextPrayerTime2: String
}

// MARK: - Provider
struct PrayerProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(
      date: .now,
      nextPrayerName: "Asr", nextPrayerTime: "15:45", countdown: "in 43 min",
      nextPrayerName2: "Maghrib", nextPrayerTime2: "18:12"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(makeEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let entry = makeEntry()
    let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }

  private func makeEntry() -> PrayerEntry {
    if let d = readWidgetData() {
      return PrayerEntry(
        date: .now,
        nextPrayerName: d.nextPrayerName,
        nextPrayerTime: d.nextPrayerTime,
        countdown: d.countdown,
        nextPrayerName2: d.nextPrayerName2,
        nextPrayerTime2: d.nextPrayerTime2
      )
    }
    return PrayerEntry(
      date: .now,
      nextPrayerName: "—", nextPrayerTime: "—:—", countdown: "—",
      nextPrayerName2: "", nextPrayerTime2: ""
    )
  }
}

// MARK: - Small view
struct SmallWidgetView: View {
  let entry: PrayerEntry

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      VStack(spacing: 4) {
        Text(entry.nextPrayerName)
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(mawaqitGreen)
        Text(entry.nextPrayerTime)
          .font(.system(size: 28, weight: .semibold, design: .monospaced))
          .foregroundColor(.white)
        Text(entry.countdown)
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.white.opacity(0.65))
      }
    }
  }
}

// MARK: - Medium view
struct MediumWidgetView: View {
  let entry: PrayerEntry

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      HStack(spacing: 0) {
        // Left: next prayer
        VStack(spacing: 4) {
          Text(entry.nextPrayerName)
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(mawaqitGreen)
          Text(entry.nextPrayerTime)
            .font(.system(size: 28, weight: .semibold, design: .monospaced))
            .foregroundColor(.white)
          Text(entry.countdown)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity)

        Rectangle()
          .fill(Color.white.opacity(0.12))
          .frame(width: 1)
          .padding(.vertical, 14)

        // Right: next 2 upcoming prayers
        VStack(alignment: .leading, spacing: 10) {
          Text("Coming up")
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(.white.opacity(0.4))
          if !entry.nextPrayerName2.isEmpty {
            prayerRow(entry.nextPrayerName2, entry.nextPrayerTime2)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.leading, 14)
      }
      .padding(.horizontal, 16)
    }
  }

  @ViewBuilder
  private func prayerRow(_ name: String, _ time: String) -> some View {
    HStack {
      Text(name)
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(.white.opacity(0.8))
      Spacer()
      Text(time)
        .font(.system(size: 14, weight: .regular, design: .monospaced))
        .foregroundColor(.white.opacity(0.55))
    }
  }
}

// MARK: - Entry view (routes by family)
struct MawaqitWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: PrayerEntry

  var body: some View {
    switch family {
    case .systemMedium: MediumWidgetView(entry: entry)
    default:            SmallWidgetView(entry: entry)
    }
  }
}

// MARK: - Widget
struct MawaqitPrayerWidget: Widget {
  let kind = "MawaqitPrayerWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
      if #available(iOSApplicationExtension 17.0, *) {
        MawaqitWidgetEntryView(entry: entry)
          .containerBackground(.black, for: .widget)
      } else {
        MawaqitWidgetEntryView(entry: entry)
          .background(Color.black)
      }
    }
    .configurationDisplayName("Mawaqit")
    .description("Next prayer time at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Bundle
@main
struct MawaqitWidgetBundle: WidgetBundle {
  var body: some Widget {
    MawaqitPrayerWidget()
  }
}
