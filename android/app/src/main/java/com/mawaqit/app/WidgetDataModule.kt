package com.mawaqit.app

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetDataModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetDataModule"

    @ReactMethod
    fun updateWidgetData(
        prayerName: String,
        prayerTime: String,
        countdown: String,
        prayerName2: String,
        prayerTime2: String,
    ) {
        reactContext
            .getSharedPreferences("mawaqit_widget_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("prayerName",  prayerName)
            .putString("prayerTime",  prayerTime)
            .putString("countdown",   countdown)
            .putString("prayerName2", prayerName2)
            .putString("prayerTime2", prayerTime2)
            .apply()

        MawaqitWidgetProvider.refreshAll(reactContext)
    }
}
