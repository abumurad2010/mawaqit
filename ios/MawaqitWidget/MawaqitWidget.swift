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
private let mawaqitGreen = Color(red: 0x22 / 255.0, green: 0xaa / 255.0, blue: 0x70 / 255.0) // slightly brighter on dark bg
private let bgDeep       = Color(red: 0x0a / 255.0, green: 0x0a / 255.0, blue: 0x0a / 255.0)
private let bgGreenTint  = Color(red: 0x0f / 255.0, green: 0x1f / 255.0, blue: 0x15 / 255.0)
private let goldAccent   = Color(red: 0xb8 / 255.0, green: 0x86 / 255.0, blue: 0x0b / 255.0)

// MARK: - Geometric decorations

/// Two families of 45° diagonal lines that cross to form a diamond lattice.
private struct IslamicLattice: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let step: CGFloat = 18
    // NW→SE family
    var x: CGFloat = -rect.height
    while x <= rect.width {
      p.move(to: CGPoint(x: x, y: 0))
      p.addLine(to: CGPoint(x: x + rect.height, y: rect.height))
      x += step
    }
    // NE→SW family
    x = 0
    while x <= rect.width + rect.height {
      p.move(to: CGPoint(x: x, y: 0))
      p.addLine(to: CGPoint(x: x - rect.height, y: rect.height))
      x += step
    }
    return p
  }
}

/// Simple mosque arch outline — two vertical stems joined by a semicircular arch at the top.
private struct ArchSilhouette: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let cx      = rect.midX
    let archR   = rect.width * 0.38
    let springY = rect.height - rect.height * 0.34   // Y of the arch spring line

    p.move(to: CGPoint(x: cx + archR, y: rect.height))
    p.addLine(to: CGPoint(x: cx + archR, y: springY))
    // Counterclockwise in screen coords (Y-down) → arc goes upward over the top
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
      nextPrayerName: "ASR", nextPrayerTime: "15:45", countdown: "in 43 min",
      nextPrayerName2: "MGB", nextPrayerTime2: "18:12"
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
      // ── Background layers ──────────────────────────────────────────
      LinearGradient(
        colors: [bgDeep, bgGreenTint],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      // Copper-gold glow in the bottom-leading corner
      RadialGradient(
        colors: [goldAccent.opacity(0.22), .clear],
        center: .bottomLeading,
        startRadius: 0,
        endRadius: 88
      )
      .ignoresSafeArea()

      // ── Geometric overlay ──────────────────────────────────────────
      IslamicLattice()
        .stroke(Color.white, lineWidth: 0.5)
        .opacity(0.07)
        .ignoresSafeArea()

      // Partial arch peeking from the bottom-trailing corner
      ArchSilhouette()
        .stroke(Color.white, lineWidth: 0.85)
        .opacity(0.09)
        .frame(width: 66, height: 72)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .offset(x: 14, y: 10)

      // ── Content ────────────────────────────────────────────────────
      VStack(alignment: .leading, spacing: 0) {
        // Wordmark
        Text("مواقيت  Mawaqit")
          .font(.system(size: 7.5, weight: .medium))
          .foregroundColor(.white.opacity(0.22))

        Spacer()

        // Prayer name
        Text(entry.nextPrayerName)
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(mawaqitGreen)
          .tracking(1.6)

        // Prayer time
        Text(entry.nextPrayerTime)
          .font(.system(size: 30, weight: .heavy, design: .monospaced))
          .foregroundColor(.white)
          .minimumScaleFactor(0.72)
          .lineLimit(1)
          .padding(.top, 1)

        // Countdown
        Text(entry.countdown)
          .font(.system(size: 10.5, weight: .regular))
          .italic()
          .foregroundColor(.white.opacity(0.58))
          .padding(.top, 3)
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
      // ── Background layers ──────────────────────────────────────────
      LinearGradient(
        colors: [bgDeep, bgGreenTint],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      // Gold glow — anchored to the bottom-leading corner
      RadialGradient(
        colors: [goldAccent.opacity(0.20), .clear],
        center: .bottomLeading,
        startRadius: 0,
        endRadius: 110
      )
      .ignoresSafeArea()

      // ── Geometric overlay ──────────────────────────────────────────
      IslamicLattice()
        .stroke(Color.white, lineWidth: 0.5)
        .opacity(0.07)
        .ignoresSafeArea()

      // ── Content ────────────────────────────────────────────────────
      VStack(alignment: .leading, spacing: 0) {
        // Wordmark strip
        Text("مواقيت  Mawaqit")
          .font(.system(size: 7.5, weight: .medium))
          .foregroundColor(.white.opacity(0.22))
          .padding(.bottom, 6)

        HStack(spacing: 0) {
          // ── Left: next prayer ──────────────────────────────────────
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

            Text(entry.countdown)
              .font(.system(size: 10.5, weight: .regular))
              .italic()
              .foregroundColor(.white.opacity(0.58))
              .padding(.top, 3)
          }
          .frame(maxWidth: .infinity, alignment: .leading)

          // ── Divider ────────────────────────────────────────────────
          Rectangle()
            .fill(LinearGradient(
              colors: [.clear, Color.white.opacity(0.16), .clear],
              startPoint: .top,
              endPoint: .bottom
            ))
            .frame(width: 1)
            .padding(.vertical, 4)
            .padding(.horizontal, 12)

          // ── Right: upcoming prayers ────────────────────────────────
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
      Text(entry.countdown)
        .font(.system(size: 12, weight: .medium))
        .opacity(0.7)
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
