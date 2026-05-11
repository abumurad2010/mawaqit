package com.mawaqit.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews

class MawaqitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val prefs = context.getSharedPreferences("mawaqit_widget_prefs", Context.MODE_PRIVATE)
            val prayerName  = prefs.getString("prayerName",  "—")     ?: "—"
            val prayerTime  = prefs.getString("prayerTime",  "--:--") ?: "--:--"
            val countdown   = prefs.getString("countdown",   "")      ?: ""
            val prayerName2 = prefs.getString("prayerName2", "")      ?: ""
            val prayerTime2 = prefs.getString("prayerTime2", "")      ?: ""

            val options  = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val isMedium = minWidth >= 250

            val layoutId = if (isMedium) R.layout.mawaqit_widget_medium else R.layout.mawaqit_widget_small
            val views    = RemoteViews(context.packageName, layoutId)

            views.setTextViewText(R.id.prayer_name, prayerName)
            views.setTextViewText(R.id.prayer_time, prayerTime)
            views.setTextViewText(R.id.countdown,   countdown)

            if (isMedium) {
                views.setTextViewText(R.id.prayer_name2, prayerName2)
                views.setTextViewText(R.id.prayer_time2, prayerTime2)
            }

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun refreshAll(context: Context) {
            val manager   = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, MawaqitWidgetProvider::class.java)
            for (id in manager.getAppWidgetIds(component)) {
                updateAppWidget(context, manager, id)
            }
        }
    }
}
