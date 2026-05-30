#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetDataModule, NSObject)

RCT_EXTERN_METHOD(
  updateWidgetData:(NSString *)prayerName
  prayerTime:(NSString *)prayerTime
  countdown:(NSString *)countdown
  prayerName2:(NSString *)prayerName2
  prayerTime2:(NSString *)prayerTime2
)

RCT_EXTERN_METHOD(
  updateWidgetTimeline:(NSString *)todayJson
  tomorrowJson:(NSString *)tomorrowJson
  nextPrayerName:(NSString *)nextPrayerName
  nextPrayerTime:(NSString *)nextPrayerTime
  countdown:(NSString *)countdown
  nextPrayerName2:(NSString *)nextPrayerName2
  nextPrayerTime2:(NSString *)nextPrayerTime2
)

RCT_EXTERN_METHOD(reloadAllTimelines)

@end
