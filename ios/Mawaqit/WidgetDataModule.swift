import Foundation
import WidgetKit

@objc(WidgetDataModule)
class WidgetDataModule: NSObject {

  @objc(updateWidgetData:prayerTime:countdown:prayerName2:prayerTime2:)
  func updateWidgetData(
    _ prayerName: String,
    prayerTime: String,
    countdown: String,
    prayerName2: String,
    prayerTime2: String
  ) {
    let data = PrayerWidgetData(
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

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
