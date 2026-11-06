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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Draggable SYSTEM_ALERT_WINDOW overlay: live XAU + Thai gold + short signal/plan. */
public class OverlayService extends Service {
  public static final String ACTION_REFRESH = "com.purefxai.puregold.OVERLAY_REFRESH";
  private static final String CH = "pg_overlay";
  private static final long TICK_MS = 30_000L;
  private static volatile boolean running = false;

  private WindowManager wm;
  private View bubble;
  private WindowManager.LayoutParams lp;
  private final Handler ui = new Handler(Looper.getMainLooper());
  private final ExecutorService net = Executors.newSingleThreadExecutor();
  private Runnable ticker;
  private long lastWorkerAt = 0L;
  private boolean fetching = false;

  static boolean isRunning() { return running; }

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
    if (!canDraw(c) || !running) return;
    Intent i = new Intent(c, OverlayService.class);
    i.setAction(ACTION_REFRESH);
    if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
    else c.startService(i);
  }

  @Override public IBinder onBind(Intent intent) { return null; }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (!canDraw(this)) { stopSelf(); return START_NOT_STICKY; }
    running = true;
    ensureForeground();
    if (bubble == null) createBubble();
    else bindData();
    getSharedPreferences("pg", 0).edit().putBoolean("overlay", true).apply();
    startTicker();
    if (intent == null || !ACTION_REFRESH.equals(intent.getAction())) {
      fetchLive(true);
    }
    return START_STICKY;
  }

  private void ensureForeground() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(CH, "PUREGOLD overlay", NotificationManager.IMPORTANCE_LOW);
      ch.setShowBadge(false);
      if (nm != null) nm.createNotificationChannel(ch);
    }
    PendingIntent pi = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
    Notification n = new NotificationCompat.Builder(this, CH)
        .setContentTitle("PUREGOLD")
        .setContentText("Floating overlay · live prices")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentIntent(pi)
        .setOngoing(true)
        .build();
    startForeground(1002, n);
  }

  private void startTicker() {
    if (ticker == null) {
      ticker = () -> {
        bindData();
        fetchLive(false);
        ui.postDelayed(ticker, TICK_MS);
      };
    }
    ui.removeCallbacks(ticker);
    ui.postDelayed(ticker, TICK_MS);
  }

  private void fetchLive(boolean alsoWorker) {
    if (fetching) return;
    fetching = true;
    net.execute(() -> {
      try {
        float px = 0f;
        try {
          JSONObject g = new JSONObject(GoldWorker.get("https://api.gold-api.com/price/XAU"));
          px = (float) g.getDouble("price");
        } catch (Exception ignore) {}
        String thai = "";
        try {
          JSONArray t = new JSONArray(GoldWorker.get("https://apicheckprice.huasengheng.com/api/values/getprice/"));
          for (int i = 0; i < t.length(); i++) {
            JSONObject o = t.getJSONObject(i);
            if ("HSH".equals(o.optString("GoldType"))) {
              thai = o.optString("Sell");
              break;
            }
          }
        } catch (Exception ignore) {}
        SharedPreferences.Editor e = getSharedPreferences("pg", 0).edit();
        if (px > 0) e.putFloat("snap_price", px);
        if (thai != null && !thai.isEmpty()) e.putString("snap_thaiSell", thai);
        e.putLong("snap_at", System.currentTimeMillis());
        e.apply();
        ui.post(() -> {
          bindData();
          try { GoldWidget.updateAll(OverlayService.this); } catch (Exception ignore) {}
        });
        long now = System.currentTimeMillis();
        if (alsoWorker || now - lastWorkerAt > 60_000L) {
          lastWorkerAt = now;
          GoldWorker.runOnce(OverlayService.this, false);
        }
      } catch (Exception ignore) {
      } finally {
        fetching = false;
      }
    });
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
    lp.x = p.getInt("ov_x", 24);
    lp.y = p.getInt("ov_y", 160);

    View close = bubble.findViewById(R.id.ov_close);
    close.setOnClickListener(v -> {
      getSharedPreferences("pg", 0).edit().putBoolean("overlay", false).apply();
      stopSelf();
    });

    bubble.setOnTouchListener(new View.OnTouchListener() {
      float downRawX, downRawY;
      int originX, originY;
      boolean moved;
      @Override public boolean onTouch(View v, MotionEvent e) {
        if (hit(close, e) && e.getAction() == MotionEvent.ACTION_DOWN) return false;
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
            clampToScreen();
            try { wm.updateViewLayout(bubble, lp); } catch (Exception ignore) {}
            return true;
          }
          case MotionEvent.ACTION_UP:
            clampToScreen();
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
    bubble.post(this::clampToScreen);
  }

  private boolean hit(View v, MotionEvent e) {
    if (v == null) return false;
    int[] loc = new int[2];
    v.getLocationOnScreen(loc);
    float x = e.getRawX(), y = e.getRawY();
    return x >= loc[0] && x <= loc[0] + v.getWidth() && y >= loc[1] && y <= loc[1] + v.getHeight();
  }

  private void clampToScreen() {
    if (bubble == null || lp == null || wm == null) return;
    DisplayMetrics dm = new DisplayMetrics();
    try { wm.getDefaultDisplay().getRealMetrics(dm); }
    catch (Exception e) { getResources().getDisplayMetrics(); dm = getResources().getDisplayMetrics(); }
    int vw = bubble.getWidth() > 0 ? bubble.getWidth() : (int) (200 * dm.density);
    int vh = bubble.getHeight() > 0 ? bubble.getHeight() : (int) (150 * dm.density);
    lp.x = Math.max(0, Math.min(lp.x, Math.max(0, dm.widthPixels - vw)));
    lp.y = Math.max(0, Math.min(lp.y, Math.max(0, dm.heightPixels - vh)));
    try { wm.updateViewLayout(bubble, lp); } catch (Exception ignore) {}
  }

  private void bindData() {
    if (bubble == null) return;
    SharedPreferences p = getSharedPreferences("pg", 0);
    float px = p.getFloat("snap_price", 0f);
    String side = p.getString("snap_side", "WAIT");
    String bias = p.getString("snap_bias", "side");
    String thai = p.getString("snap_thaiSell", "");
    int conf = p.getInt("snap_conf", 0);
    float e0 = p.getFloat("snap_entry0", 0f);
    float e1 = p.getFloat("snap_entry1", 0f);
    float sl = p.getFloat("snap_sl", 0f);
    float tp = p.getFloat("snap_tp", 0f);
    long at = p.getLong("snap_at", 0L);
    boolean th = "th".equals(p.getString("lang", "th"));

    TextView xau = bubble.findViewById(R.id.ov_xau);
    TextView thaiV = bubble.findViewById(R.id.ov_thai);
    TextView sig = bubble.findViewById(R.id.ov_signal);
    TextView plan = bubble.findViewById(R.id.ov_plan);
    TextView upd = bubble.findViewById(R.id.ov_updated);

    xau.setText(px > 0 ? String.format(Locale.US, "XAU $%.2f", px) : "XAU —");
    thaiV.setText(thai == null || thai.isEmpty()
        ? (th ? "ฮั่วเซ่งเฮง —" : "HSH —")
        : (th ? "ฮั่วเซ่งเฮง ขาย " + thai : "HSH sell " + thai));

    String s;
    if ("BUY".equals(side)) s = "BUY";
    else if ("SELL".equals(side)) s = "SELL";
    else s = th ? "รอ" : "WAIT";
    if (conf > 0) s += " · " + conf + "%";
    if ("WAIT".equals(side) || side == null || side.isEmpty()) {
      if ("up".equals(bias)) s += th ? " · ขึ้น" : " · up";
      else if ("down".equals(bias)) s += th ? " · ลง" : " · down";
    }
    sig.setText(s);
    if ("BUY".equals(side) || "up".equals(bias) && "WAIT".equals(side)) sig.setTextColor(0xFF3DDC84);
    else if ("SELL".equals(side) || "down".equals(bias) && "WAIT".equals(side)) sig.setTextColor(0xFFFF5C5C);
    else sig.setTextColor(0xFFF5D27A);

    if (e0 > 0 && sl > 0 && tp > 0) {
      plan.setText(String.format(Locale.US, "E %.0f–%.0f  SL %.0f  TP %.0f", e0, e1, sl, tp));
      plan.setVisibility(View.VISIBLE);
    } else {
      plan.setVisibility(View.GONE);
    }

    if (upd != null) {
      if (at > 0) {
        String clock = new SimpleDateFormat("HH:mm:ss", Locale.US).format(new Date(at));
        upd.setText((th ? "อัปเดต " : "Updated ") + clock);
      } else {
        upd.setText(th ? "รอข้อมูล…" : "Waiting…");
      }
    }
  }

  @Override public void onDestroy() {
    running = false;
    if (ticker != null) ui.removeCallbacks(ticker);
    if (wm != null && bubble != null) {
      try { wm.removeView(bubble); } catch (Exception e) {}
    }
    bubble = null;
    try { net.shutdownNow(); } catch (Exception ignore) {}
    getSharedPreferences("pg", 0).edit().putBoolean("overlay", false).apply();
    super.onDestroy();
  }
}
