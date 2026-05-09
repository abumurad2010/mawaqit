#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(WidgetDataModule, NSObject)

RCT_EXTERN_METHOD(
  updateWidgetData:(NSString *)prayerName
  prayerTime:(NSString *)prayerTime
  countdown:(NSString *)countdown
  prayerName2:(NSString *)prayerName2
  prayerTime2:(NSString *)prayerTime2
)
