import WidgetKit
import SwiftUI

// MARK: - Shared data layer (duplicated from main target — widget cannot import app)

private let widgetAppGroupID = "group.com.mawaqit.app.widget"

private struct PrayerSlot: Codable {
  var name: String
  var time: String
  var timestamp: Double
}

private struct PrayerWidgetData: Codable {
  var today: [PrayerSlot]
  var tomorrow: [PrayerSlot]
  var updatedAt: Double
  var nextPrayerName: String
  var nextPrayerTime: String
  var countdown: String
  var nextPrayerName2: String
  var nextPrayerTime2: String

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

private func readWidgetData() -> PrayerWidgetData? {
  guard let defaults = UserDefaults(suiteName: widgetAppGroupID),
        let raw = defaults.data(forKey: "prayerWidgetData"),
        let decoded = try? JSONDecoder().decode(PrayerWidgetData.self, from: raw)
  else { return nil }
  return decoded
}

// MARK: - Palette
private let mawaqitGreen = Color(red: 0x22 / 255.0, green: 0xaa / 255.0, blue: 0x70 / 255.0)
private let bgDeep       = Color(red: 0x0a / 255.0, green: 0x0a / 255.0, blue: 0x0a / 255.0)
private let bgGreenTint  = Color(red: 0x0f / 255.0, green: 0x1f / 255.0, blue: 0x15 / 255.0)
private let goldAccent   = Color(red: 0xb8 / 255.0, green: 0x86 / 255.0, blue: 0x0b / 255.0)

// MARK: - Geometric decorations
private struct IslamicLattice: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let step: CGFloat = 18
    var x: CGFloat = -rect.height
    while x <= rect.width {
      p.move(to: CGPoint(x: x, y: 0))
      p.addLine(to: CGPoint(x: x + rect.height, y: rect.height))
      x += step
    }
    x = 0
    while x <= rect.width + rect.height {
      p.move(to: CGPoint(x: x, y: 0))
      p.addLine(to: CGPoint(x: x - rect.height, y: rect.height))
      x += step
    }
    return p
  }
}

private struct ArchSilhouette: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let cx      = rect.midX
    let archR   = rect.width * 0.38
    let springY = rect.height - rect.height * 0.34
    p.move(to: CGPoint(x: cx + archR, y: rect.height))
    p.addLine(to: CGPoint(x: cx + archR, y: springY))
    p.addArc(
      center: CGPoint(x: cx, y: springY),
      radius: archR,
      startAngle: .degrees(0),
      endAngle:   .degrees(180),
      clockwise:  false
    )
    p.addLine(to: CGPoint(x: cx - archR, y: rect.height))
    return p
  }
}

// MARK: - Entry
struct PrayerEntry: TimelineEntry {
  let date: Date
  let currentPrayerName: String
  let nextPrayerName: String
  let nextPrayerTime: String
  let nextPrayerDate: Date?
  let countdown: String
  let nextPrayerName2: String
  let nextPrayerTime2: String
}

// MARK: - Provider
struct PrayerProvider: TimelineProvider {

  /// Static placeholder shown while WidgetKit warms up — never reads disk.
  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(
      date: .now,
      currentPrayerName: "DHR",
      nextPrayerName: "ASR",
      nextPrayerTime: "15:45",
      nextPrayerDate: nil,
      countdown: "in 43 min",
      nextPrayerName2: "MGB",
      nextPrayerTime2: "18:12"
    )
  }

  /// Snapshot reflects the *current* moment using real data when present.
  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(makeEntry(for: .now))
  }

  /// Timeline: one entry per upcoming prayer transition across today + tomorrow.
  /// Refresh policy `.atEnd` so iOS re-asks for a new timeline after the last entry,
  /// ensuring the widget keeps stepping through prayers without manual reloads.
  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    guard let data = readWidgetData() else {
      // No data yet — surface a single placeholder and ask iOS to retry in 30 min.
      let entry = PrayerEntry(
        date: .now,
        currentPrayerName: "",
        nextPrayerName: "—",
        nextPrayerTime: "—:—",
        nextPrayerDate: nil,
        countdown: "—",
        nextPrayerName2: "",
        nextPrayerTime2: ""
      )
      let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
      completion(Timeline(entries: [entry], policy: .after(refresh)))
      return
    }

    // Build the full ordered prayer list across today + tomorrow.
    let all = data.today + data.tomorrow

    // Anchor: "now" plus a small backoff so an entry exactly at the current
    // minute is still considered upcoming.
    let now = Date()
    let anchorTs = now.timeIntervalSince1970 - 30

    // Index of the first prayer still in the future. Everything earlier is "current".
    var firstUpcomingIdx: Int? = nil
    for (i, slot) in all.enumerated() {
      if slot.timestamp > anchorTs { firstUpcomingIdx = i; break }
    }

    var entries: [PrayerEntry] = []

    // ── Entry for "now" — covers the period until the first future prayer ──
    let currentName: String = {
      if let i = firstUpcomingIdx, i > 0 { return all[i - 1].name }
      if firstUpcomingIdx == nil, let last = all.last { return last.name }
      return ""
    }()

    if let i = firstUpcomingIdx {
      let upcoming = all[i]
      let next2 = (i + 1 < all.count) ? all[i + 1] : nil
      let upcomingDate = Date(timeIntervalSince1970: upcoming.timestamp)
      entries.append(PrayerEntry(
        date: now,
        currentPrayerName: currentName,
        nextPrayerName: upcoming.name,
        nextPrayerTime: upcoming.time,
        nextPrayerDate: upcomingDate,
        countdown: formatCountdown(from: now, to: upcomingDate),
        nextPrayerName2: next2?.name ?? "",
        nextPrayerTime2: next2?.time ?? ""
      ))

      // ── One entry per remaining prayer transition ─────────────────────────
      for j in i..<all.count {
        let pivot = all[j]
        let pivotDate = Date(timeIntervalSince1970: pivot.timestamp)
        // After `pivot` fires, `pivot` becomes the current prayer and the next
        // one in the list becomes the upcoming target.
        let nextIdx = j + 1
        guard nextIdx < all.count else { break }
        let nxt = all[nextIdx]
        let nxtDate = Date(timeIntervalSince1970: nxt.timestamp)
        let next2 = (nextIdx + 1 < all.count) ? all[nextIdx + 1] : nil

        entries.append(PrayerEntry(
          date: pivotDate,
          currentPrayerName: pivot.name,
          nextPrayerName: nxt.name,
          nextPrayerTime: nxt.time,
          nextPrayerDate: nxtDate,
          countdown: formatCountdown(from: pivotDate, to: nxtDate),
          nextPrayerName2: next2?.name ?? "",
          nextPrayerTime2: next2?.time ?? ""
        ))
      }
    } else {
      // All known prayers have already passed. Surface the last-known one and
      // let iOS retry in 30 minutes — by then the app will have written tomorrow.
      entries.append(PrayerEntry(
        date: now,
        currentPrayerName: currentName,
        nextPrayerName: data.nextPrayerName,
        nextPrayerTime: data.nextPrayerTime,
        nextPrayerDate: nil,
        countdown: data.countdown,
        nextPrayerName2: data.nextPrayerName2,
        nextPrayerTime2: data.nextPrayerTime2
      ))
    }

    completion(Timeline(entries: entries, policy: .atEnd))
  }

  /// Build a single entry reflecting the current moment — used by getSnapshot.
  private func makeEntry(for now: Date) -> PrayerEntry {
    guard let data = readWidgetData() else {
      return PrayerEntry(
        date: now,
        currentPrayerName: "",
        nextPrayerName: "—",
        nextPrayerTime: "—:—",
        nextPrayerDate: nil,
        countdown: "—",
        nextPrayerName2: "",
        nextPrayerTime2: ""
      )
    }

    let all = data.today + data.tomorrow
    let anchorTs = now.timeIntervalSince1970 - 30
    var firstUpcomingIdx: Int? = nil
    for (i, slot) in all.enumerated() {
      if slot.timestamp > anchorTs { firstUpcomingIdx = i; break }
    }

    let currentName: String = {
      if let i = firstUpcomingIdx, i > 0 { return all[i - 1].name }
      if firstUpcomingIdx == nil, let last = all.last { return last.name }
      return ""
    }()

    if let i = firstUpcomingIdx {
      let upcoming = all[i]
      let next2 = (i + 1 < all.count) ? all[i + 1] : nil
      let upcomingDate = Date(timeIntervalSince1970: upcoming.timestamp)
      return PrayerEntry(
        date: now,
        currentPrayerName: currentName,
        nextPrayerName: upcoming.name,
        nextPrayerTime: upcoming.time,
        nextPrayerDate: upcomingDate,
        countdown: formatCountdown(from: now, to: upcomingDate),
        nextPrayerName2: next2?.name ?? "",
        nextPrayerTime2: next2?.time ?? ""
      )
    }

    return PrayerEntry(
      date: now,
      currentPrayerName: currentName,
      nextPrayerName: data.nextPrayerName,
      nextPrayerTime: data.nextPrayerTime,
      nextPrayerDate: nil,
      countdown: data.countdown,
      nextPrayerName2: data.nextPrayerName2,
      nextPrayerTime2: data.nextPrayerTime2
    )
  }

  private func formatCountdown(from start: Date, to end: Date) -> String {
    let diffMin = Int(end.timeIntervalSince(start) / 60.0)
    if diffMin <= 0 { return "now" }
    if diffMin < 60 { return "in \(diffMin) min" }
    let h = diffMin / 60
    let m = diffMin % 60
    return m == 0 ? "in \(h)h" : "in \(h)h \(m)m"
  }
}

// MARK: - Small view
struct SmallWidgetView: View {
  let entry: PrayerEntry

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [bgDeep, bgGreenTint],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      RadialGradient(
        colors: [goldAccent.opacity(0.22), .clear],
        center: .bottomLeading,
        startRadius: 0,
        endRadius: 88
      )
      .ignoresSafeArea()

      IslamicLattice()
        .stroke(Color.white, lineWidth: 0.5)
        .opacity(0.07)
        .ignoresSafeArea()

      ArchSilhouette()
        .stroke(Color.white, lineWidth: 0.85)
        .opacity(0.09)
        .frame(width: 66, height: 72)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .offset(x: 14, y: 10)

      VStack(alignment: .leading, spacing: 0) {
        Text("مواقيت  Mawaqit")
          .font(.system(size: 7.5, weight: .medium))
          .foregroundColor(.white.opacity(0.22))

        Spacer()

        Text(entry.nextPrayerName)
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(mawaqitGreen)
          .tracking(1.6)

        Text(entry.nextPrayerTime)
          .font(.system(size: 30, weight: .heavy, design: .monospaced))
          .foregroundColor(.white)
          .minimumScaleFactor(0.72)
          .lineLimit(1)
          .padding(.top, 1)

        // Live countdown — uses Date math so each entry naturally re-renders.
        if let target = entry.nextPrayerDate {
          Text(target, style: .relative)
            .font(.system(size: 10.5, weight: .regular))
            .italic()
            .foregroundColor(.white.opacity(0.58))
            .padding(.top, 3)
        } else {
          Text(entry.countdown)
            .font(.system(size: 10.5, weight: .regular))
            .italic()
            .foregroundColor(.white.opacity(0.58))
            .padding(.top, 3)
        }
      }
      .padding(14)
    }
  }
}

// MARK: - Medium view
struct MediumWidgetView: View {
  let entry: PrayerEntry

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [bgDeep, bgGreenTint],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      RadialGradient(
        colors: [goldAccent.opacity(0.20), .clear],
        center: .bottomLeading,
        startRadius: 0,
        endRadius: 110
      )
      .ignoresSafeArea()

      IslamicLattice()
        .stroke(Color.white, lineWidth: 0.5)
        .opacity(0.07)
        .ignoresSafeArea()

      VStack(alignment: .leading, spacing: 0) {
        HStack {
          Text("مواقيت  Mawaqit")
            .font(.system(size: 7.5, weight: .medium))
            .foregroundColor(.white.opacity(0.22))
          Spacer()
          if !entry.currentPrayerName.isEmpty {
            Text("· \(entry.currentPrayerName)")
              .font(.system(size: 7.5, weight: .medium))
              .foregroundColor(mawaqitGreen.opacity(0.55))
          }
        }
        .padding(.bottom, 6)

        HStack(spacing: 0) {
          VStack(alignment: .leading, spacing: 2) {
            Text(entry.nextPrayerName)
              .font(.system(size: 13, weight: .bold))
              .foregroundColor(mawaqitGreen)
              .tracking(1.6)

            Text(entry.nextPrayerTime)
              .font(.system(size: 28, weight: .heavy, design: .monospaced))
              .foregroundColor(.white)
              .minimumScaleFactor(0.72)
              .lineLimit(1)
              .padding(.top, 1)

            if let target = entry.nextPrayerDate {
              Text(target, style: .relative)
                .font(.system(size: 10.5, weight: .regular))
                .italic()
                .foregroundColor(.white.opacity(0.58))
                .padding(.top, 3)
            } else {
              Text(entry.countdown)
                .font(.system(size: 10.5, weight: .regular))
                .italic()
                .foregroundColor(.white.opacity(0.58))
                .padding(.top, 3)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)

          Rectangle()
            .fill(LinearGradient(
              colors: [.clear, Color.white.opacity(0.16), .clear],
              startPoint: .top,
              endPoint: .bottom
            ))
            .frame(width: 1)
            .padding(.vertical, 4)
            .padding(.horizontal, 12)

          VStack(alignment: .leading, spacing: 10) {
            Text("NEXT")
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(.white.opacity(0.35))
              .tracking(1.4)

            if !entry.nextPrayerName2.isEmpty {
              upcomingRow(entry.nextPrayerName2, entry.nextPrayerTime2)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
    }
  }

  @ViewBuilder
  private func upcomingRow(_ name: String, _ time: String) -> some View {
    HStack(alignment: .center, spacing: 6) {
      Text(name)
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(mawaqitGreen.opacity(0.88))
        .tracking(0.8)
      Text("·")
        .font(.system(size: 11))
        .foregroundColor(.white.opacity(0.28))
      Text(time)
        .font(.system(size: 13, weight: .regular, design: .monospaced))
        .foregroundColor(.white.opacity(0.68))
    }
  }
}

// MARK: - Accessory Rectangular view (lock screen wide, iOS 16+)
@available(iOSApplicationExtension 16.0, *)
struct AccessoryRectangularView: View {
  let entry: PrayerEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(entry.nextPrayerName)
        .font(.system(size: 14, weight: .semibold))
        .widgetAccentable()
      Text(entry.nextPrayerTime)
        .font(.system(size: 17, weight: .bold, design: .monospaced))
      if let target = entry.nextPrayerDate {
        Text(target, style: .relative)
          .font(.system(size: 12, weight: .medium))
          .opacity(0.7)
      } else {
        Text(entry.countdown)
          .font(.system(size: 12, weight: .medium))
          .opacity(0.7)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - Accessory Circular view (lock screen badge, iOS 16+)
@available(iOSApplicationExtension 16.0, *)
struct AccessoryCircularView: View {
  let entry: PrayerEntry

  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 1) {
        Text(entry.nextPrayerName)
          .font(.system(size: 12, weight: .bold))
          .widgetAccentable()
          .minimumScaleFactor(0.7)
          .lineLimit(1)
        Text(entry.nextPrayerTime)
          .font(.system(size: 11, weight: .semibold, design: .monospaced))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
    }
  }
}

// MARK: - Accessory Inline view (lock screen single-line, iOS 16+)
@available(iOSApplicationExtension 16.0, *)
struct AccessoryInlineView: View {
  let entry: PrayerEntry

  var body: some View {
    Label {
      Text("Mawaqit · \(entry.nextPrayerName) \(entry.nextPrayerTime)")
    } icon: {
      Image(systemName: "moon.stars.fill")
    }
  }
}

// MARK: - Entry view (routes by family)
struct MawaqitWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: PrayerEntry

  var body: some View {
    if #available(iOSApplicationExtension 16.0, *) {
      switch family {
      case .systemMedium:         MediumWidgetView(entry: entry)
      case .accessoryRectangular: AccessoryRectangularView(entry: entry)
      case .accessoryCircular:    AccessoryCircularView(entry: entry)
      case .accessoryInline:      AccessoryInlineView(entry: entry)
      default:                    SmallWidgetView(entry: entry)
      }
    } else {
      switch family {
      case .systemMedium: MediumWidgetView(entry: entry)
      default:            SmallWidgetView(entry: entry)
      }
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
          .containerBackground(for: .widget) {
            LinearGradient(
              colors: [bgDeep, bgGreenTint],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          }
      } else {
        MawaqitWidgetEntryView(entry: entry)
          .background(bgDeep)
      }
    }
    .configurationDisplayName("Mawaqit")
    .description("Next prayer time at a glance.")
    .supportedFamilies(supportedFamilies)
  }

  private var supportedFamilies: [WidgetFamily] {
    if #available(iOSApplicationExtension 16.0, *) {
      return [
        .systemSmall, .systemMedium,
        .accessoryRectangular, .accessoryCircular, .accessoryInline,
      ]
    }
    return [.systemSmall, .systemMedium]
  }
}

// MARK: - Bundle
@main
struct MawaqitWidgetBundle: WidgetBundle {
  var body: some Widget {
    MawaqitPrayerWidget()
  }
}
