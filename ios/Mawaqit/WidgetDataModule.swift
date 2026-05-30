import Foundation
import WidgetKit

@objc(WidgetDataModule)
class WidgetDataModule: NSObject {

  // Legacy single-shot update kept so existing callers still compile and the
  // small "next prayer" cells in the widget can fall back to it.
  @objc(updateWidgetData:prayerTime:countdown:prayerName2:prayerTime2:)
  func updateWidgetData(
    _ prayerName: String,
    prayerTime: String,
    countdown: String,
    prayerName2: String,
    prayerTime2: String
  ) {
    // Merge into existing data so we don't blow away today/tomorrow.
    let existing = readPrayerWidgetData()
    let data = PrayerWidgetData(
      today: existing?.today ?? [],
      tomorrow: existing?.tomorrow ?? [],
      nextPrayerName: prayerName,
      nextPrayerTime: prayerTime,
      countdown: countdown,
      nextPrayerName2: prayerName2,
      nextPrayerTime2: prayerTime2,
      updatedAt: Date().timeIntervalSince1970
    )
    writePrayerWidgetData(data)
    WidgetCenter.shared.reloadAllTimelines()
  }

  /// Full-timeline payload: accepts JSON-encoded arrays of today and tomorrow's
  /// fardh prayers (each {name, time, timestamp}). WidgetKit then builds a
  /// TimelineEntry per prayer transition.
  @objc(updateWidgetTimeline:tomorrowJson:nextPrayerName:nextPrayerTime:countdown:nextPrayerName2:nextPrayerTime2:)
  func updateWidgetTimeline(
    _ todayJson: String,
    tomorrowJson: String,
    nextPrayerName: String,
    nextPrayerTime: String,
    countdown: String,
    nextPrayerName2: String,
    nextPrayerTime2: String
  ) {
    let dec = JSONDecoder()
    let today    = (try? dec.decode([PrayerSlot].self, from: Data(todayJson.utf8))) ?? []
    let tomorrow = (try? dec.decode([PrayerSlot].self, from: Data(tomorrowJson.utf8))) ?? []
    let data = PrayerWidgetData(
      today: today,
      tomorrow: tomorrow,
      nextPrayerName: nextPrayerName,
      nextPrayerTime: nextPrayerTime,
      countdown: countdown,
      nextPrayerName2: nextPrayerName2,
      nextPrayerTime2: nextPrayerTime2,
      updatedAt: Date().timeIntervalSince1970
    )
    writePrayerWidgetData(data)
    WidgetCenter.shared.reloadAllTimelines()
  }

  /// Trigger only — JS can force a widget refresh without rewriting data.
  @objc(reloadAllTimelines)
  func reloadAllTimelines() {
    WidgetCenter.shared.reloadAllTimelines()
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
