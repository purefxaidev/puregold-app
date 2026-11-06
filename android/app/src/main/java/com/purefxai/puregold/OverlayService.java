package com.purefxai.puregold;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;

/** Draggable SYSTEM_ALERT_WINDOW overlay: price + signal + tiny plan over other apps. */
public class OverlayService extends Service {
  public static final String ACTION_REFRESH = "com.purefxai.puregold.OVERLAY_REFRESH";
  private static final String CH = "pg_overlay";
  private WindowManager wm;
  private View bubble;
  private WindowManager.LayoutParams lp;

  static boolean canDraw(Context c) {
    return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
  }

  static void start(Context c) {
    if (!canDraw(c)) return;
    Intent i = new Intent(c, OverlayService.class);
    if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
    else c.startService(i);
  }

  static void stop(Context c) {
    c.stopService(new Intent(c, OverlayService.class));
  }

  static void refresh(Context c) {
    if (!canDraw(c)) return;
    SharedPreferences p = c.getSharedPreferences("pg", 0);
    if (!p.getBoolean("overlay", false)) return;
    Intent i = new Intent(c, OverlayService.class);
    i.setAction(ACTION_REFRESH);
    if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
    else c.startService(i);
  }

  @Override public IBinder onBind(Intent intent) { return null; }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (!canDraw(this)) { stopSelf(); return START_NOT_STICKY; }
    ensureForeground();
    if (bubble == null) createBubble();
    else bindData();
    getSharedPreferences("pg", 0).edit().putBoolean("overlay", true).apply();
    return START_STICKY;
  }

  private void ensureForeground() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(CH, "PUREGOLD overlay", NotificationManager.IMPORTANCE_LOW);
      ch.setShowBadge(false);
      nm.createNotificationChannel(ch);
    }
    PendingIntent pi = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
    Notification n = new NotificationCompat.Builder(this, CH)
        .setContentTitle("PUREGOLD")
        .setContentText("Floating overlay on")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentIntent(pi)
        .setOngoing(true)
        .build();
    startForeground(1002, n);
  }

  private void createBubble() {
    wm = (WindowManager) getSystemService(WINDOW_SERVICE);
    bubble = LayoutInflater.from(this).inflate(R.layout.overlay_float, null);
    int type = Build.VERSION.SDK_INT >= 26
        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        : WindowManager.LayoutParams.TYPE_PHONE;
    lp = new WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        type,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT);
    lp.gravity = Gravity.TOP | Gravity.START;
    SharedPreferences p = getSharedPreferences("pg", 0);
    lp.x = p.getInt("ov_x", 40);
    lp.y = p.getInt("ov_y", 180);

    bubble.findViewById(R.id.ov_close).setOnClickListener(v -> {
      getSharedPreferences("pg", 0).edit().putBoolean("overlay", false).apply();
      stopSelf();
    });

    bubble.setOnTouchListener(new View.OnTouchListener() {
      float downRawX, downRawY;
      int originX, originY;
      boolean moved;
      @Override public boolean onTouch(View v, MotionEvent e) {
        switch (e.getAction()) {
          case MotionEvent.ACTION_DOWN:
            downRawX = e.getRawX();
            downRawY = e.getRawY();
            originX = lp.x;
            originY = lp.y;
            moved = false;
            return true;
          case MotionEvent.ACTION_MOVE: {
            float dx = e.getRawX() - downRawX;
            float dy = e.getRawY() - downRawY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
            lp.x = originX + (int) dx;
            lp.y = originY + (int) dy;
            try { wm.updateViewLayout(bubble, lp); } catch (Exception ignore) {}
            return true;
          }
          case MotionEvent.ACTION_UP:
            getSharedPreferences("pg", 0).edit().putInt("ov_x", lp.x).putInt("ov_y", lp.y).apply();
            if (!moved) {
              Intent open = new Intent(OverlayService.this, MainActivity.class);
              open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
              startActivity(open);
            }
            return true;
        }
        return false;
      }
    });

    bindData();
    wm.addView(bubble, lp);
  }

  private void bindData() {
    if (bubble == null) return;
    SharedPreferences p = getSharedPreferences("pg", 0);
    float px = p.getFloat("snap_price", 0f);
    String side = p.getString("snap_side", "WAIT");
    String thai = p.getString("snap_thaiSell", "");
    int conf = p.getInt("snap_conf", 0);
    float e0 = p.getFloat("snap_entry0", 0f);
    float e1 = p.getFloat("snap_entry1", 0f);
    float sl = p.getFloat("snap_sl", 0f);
    float tp = p.getFloat("snap_tp", 0f);
    boolean th = "th".equals(p.getString("lang", "th"));

    TextView xau = bubble.findViewById(R.id.ov_xau);
    TextView thaiV = bubble.findViewById(R.id.ov_thai);
    TextView sig = bubble.findViewById(R.id.ov_signal);
    TextView plan = bubble.findViewById(R.id.ov_plan);

    xau.setText(px > 0 ? String.format(java.util.Locale.US, "XAU $%.2f", px) : "XAU —");
    thaiV.setText(thai.isEmpty()
        ? (th ? "ฮั่วเซ่งเฮง —" : "HSH —")
        : (th ? "ฮั่วเซ่งเฮง " + thai : "HSH " + thai));

    String s = "WAIT".equals(side) ? (th ? "รอ" : "WAIT") : side;
    if (conf > 0) s += " · " + conf + "%";
    sig.setText(s);
    if ("BUY".equals(side)) sig.setTextColor(0xFF3DDC84);
    else if ("SELL".equals(side)) sig.setTextColor(0xFFFF5C5C);
    else sig.setTextColor(0xFFF5D27A);

    if (e0 > 0 && sl > 0 && tp > 0) {
      plan.setText(String.format(java.util.Locale.US, "E %.0f–%.0f  SL %.0f  TP %.0f", e0, e1, sl, tp));
      plan.setVisibility(View.VISIBLE);
    } else {
      plan.setVisibility(View.GONE);
    }
  }

  @Override public void onDestroy() {
    if (wm != null && bubble != null) {
      try { wm.removeView(bubble); } catch (Exception e) {}
    }
    bubble = null;
    getSharedPreferences("pg", 0).edit().putBoolean("overlay", false).apply();
    super.onDestroy();
  }
}
