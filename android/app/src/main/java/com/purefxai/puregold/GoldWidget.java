package com.purefxai.puregold;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Home-screen widget: Thai HSH / XAU + short BUY/SELL/WAIT signal. */
public class GoldWidget extends AppWidgetProvider {
  @Override
  public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
    updateAll(c);
  }

  @Override
  public void onEnabled(Context c) {
    GoldWorker.schedule(c, false);
  }

  static void updateAll(Context c) {
    AppWidgetManager mgr = AppWidgetManager.getInstance(c);
    int[] ids = mgr.getAppWidgetIds(new ComponentName(c, GoldWidget.class));
    if (ids == null || ids.length == 0) return;
    SharedPreferences p = c.getSharedPreferences("pg", 0);
    float px = p.getFloat("snap_price", 0f);
    String side = p.getString("snap_side", "WAIT");
    String thai = p.getString("snap_thaiSell", "");
    int conf = p.getInt("snap_conf", 0);
    String bias = p.getString("snap_bias", "side");
    String lang = p.getString("lang", "th");
    boolean th = "th".equals(lang);

    String xau = px > 0 ? String.format(java.util.Locale.US, "XAU $%.2f", px) : "XAU —";
    String hsh = thai.isEmpty()
        ? (th ? "ฮั่วเซ่งเฮง —" : "HSH —")
        : (th ? "ฮั่วเซ่งเฮง ขาย " + thai : "HSH sell " + thai);
    String sig;
    if ("BUY".equals(side)) sig = th ? "BUY ↑" : "BUY ↑";
    else if ("SELL".equals(side)) sig = th ? "SELL ↓" : "SELL ↓";
    else sig = th ? "รอ / WAIT" : "WAIT";
    if (conf > 0) sig += " · " + conf + "%";
    if (!"side".equals(bias) && "WAIT".equals(side)) {
      sig += th ? (" · " + ("up".equals(bias) ? "ขึ้น" : "ลง")) : (" · " + bias);
    }

    Intent open = new Intent(c, MainActivity.class);
    PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

    for (int id : ids) {
      RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.widget_gold);
      rv.setTextViewText(R.id.w_xau, xau);
      rv.setTextViewText(R.id.w_thai, hsh);
      rv.setTextViewText(R.id.w_signal, sig);
      rv.setOnClickPendingIntent(R.id.widget_root, pi);
      mgr.updateAppWidget(id, rv);
    }
  }
}
