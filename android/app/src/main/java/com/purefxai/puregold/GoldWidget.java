package com.purefxai.puregold;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Home-screen widget: live Thai gold / XAU + short BUY/SELL/WAIT signal. */
public class GoldWidget extends AppWidgetProvider {
  @Override
  public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
    updateAll(c);
    GoldWorker.runOnce(c, false);
  }

  @Override
  public void onEnabled(Context c) {
    GoldWorker.schedule(c, true);
    GoldWorker.runOnce(c, false);
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
    float e0 = p.getFloat("snap_entry0", 0f);
    float e1 = p.getFloat("snap_entry1", 0f);
    float sl = p.getFloat("snap_sl", 0f);
    float tp = p.getFloat("snap_tp", 0f);
    long at = p.getLong("snap_at", 0L);
    String lang = p.getString("lang", "th");
    boolean th = "th".equals(lang);

    String xau = px > 0 ? String.format(Locale.US, "XAU $%.2f", px) : "XAU —";
    String hsh = (thai == null || thai.isEmpty())
        ? (th ? "ทองไทย —" : "Thai gold —")
        : (th ? "ทองไทย ขาย " + thai : "Thai gold sell " + thai);
    String sig;
    int color = 0xFFF5D27A;
    if ("BUY".equals(side)) { sig = "BUY ↑"; color = 0xFF3DDC84; }
    else if ("SELL".equals(side)) { sig = "SELL ↓"; color = 0xFFFF5C5C; }
    else {
      sig = th ? "รอ / WAIT" : "WAIT";
      if ("up".equals(bias)) { sig += th ? " · ขึ้น" : " · up"; color = 0xFF3DDC84; }
      else if ("down".equals(bias)) { sig += th ? " · ลง" : " · down"; color = 0xFFFF5C5C; }
    }
    if (conf > 0) sig += " · " + conf + "%";

    String plan = "";
    if (e0 > 0 && sl > 0 && tp > 0) {
      plan = String.format(Locale.US, "E %.0f–%.0f  SL %.0f  TP %.0f", e0, e1, sl, tp);
    }

    String updated = "";
    if (at > 0) {
      String clock = new SimpleDateFormat("HH:mm", Locale.US).format(new Date(at));
      updated = (th ? "อัปเดต " : "Updated ") + clock;
    }

    Intent open = new Intent(c, MainActivity.class);
    open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

    for (int id : ids) {
      RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.widget_gold);
      rv.setTextViewText(R.id.w_xau, xau);
      rv.setTextViewText(R.id.w_thai, hsh);
      rv.setTextViewText(R.id.w_signal, sig);
      rv.setTextColor(R.id.w_signal, color);
      rv.setTextViewText(R.id.w_plan, plan);
      rv.setTextViewText(R.id.w_updated, updated);
      rv.setOnClickPendingIntent(R.id.widget_root, pi);
      mgr.updateAppWidget(id, rv);
    }
  }
}
