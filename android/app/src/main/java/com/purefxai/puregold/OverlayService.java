package com.purefxai.puregold;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
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
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Draggable SYSTEM_ALERT_WINDOW overlay: expanded gold card or a round
 * chat-head bubble with live XAU + Thai gold + short signal.
 */
public class OverlayService extends Service {
  public static final String ACTION_REFRESH = "com.purefxai.puregold.OVERLAY_REFRESH";
  private static final String CH = "pg_overlay";
  private static final long TICK_MS = 30_000L;
  private static final int HEAD_DP = 56;
  private static volatile boolean running = false;

  private WindowManager wm;
  private View card;
  private View head;
  private View trash;
  private WindowManager.LayoutParams lpCard;
  private WindowManager.LayoutParams lpHead;
  private WindowManager.LayoutParams lpTrash;
  private final Handler ui = new Handler(Looper.getMainLooper());
  private final ExecutorService net = Executors.newSingleThreadExecutor();
  private Runnable ticker;
  private ValueAnimator snapAnim;
  private long lastWorkerAt = 0L;
  private boolean fetching = false;
  private boolean minimized = false;
  private boolean trashHot = false;
  private int touchSlop;

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

  private SharedPreferences prefs() { return getSharedPreferences("pg", 0); }

  private boolean thai() { return "th".equals(prefs().getString("lang", "th")); }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (!canDraw(this)) { stopSelf(); return START_NOT_STICKY; }
    running = true;
    ensureForeground();
    if (card == null || head == null) createViews();
    else bindData();
    prefs().edit().putBoolean("overlay", true).apply();
    startTicker();
    if (intent == null || !ACTION_REFRESH.equals(intent.getAction())) {
      fetchLive(true);
    }
    return START_STICKY;
  }

  private void ensureForeground() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(
          CH, getString(R.string.overlay_channel), NotificationManager.IMPORTANCE_LOW);
      ch.setShowBadge(false);
      if (nm != null) nm.createNotificationChannel(ch);
    }
    PendingIntent pi = PendingIntent.getActivity(
        this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
    String text = minimized
        ? (thai() ? "บับเบิลราคาทอง · อัปเดตไลฟ์" : "Gold price bubble · live")
        : (thai() ? "หน้าต่างลอย · ราคาไลฟ์" : "Floating overlay · live prices");
    Notification n = new NotificationCompat.Builder(this, CH)
        .setContentTitle("PUREGOLD")
        .setContentText(text)
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
        String thaiSell = "";
        try {
          JSONArray t = new JSONArray(GoldWorker.get("https://apicheckprice.huasengheng.com/api/values/getprice/"));
          for (int i = 0; i < t.length(); i++) {
            JSONObject o = t.getJSONObject(i);
            if ("HSH".equals(o.optString("GoldType"))) {
              thaiSell = o.optString("Sell");
              break;
            }
          }
        } catch (Exception ignore) {}
        SharedPreferences.Editor e = prefs().edit();
        if (px > 0) e.putFloat("snap_price", px);
        if (thaiSell != null && !thaiSell.isEmpty()) e.putString("snap_thaiSell", thaiSell);
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

  private int overlayType() {
    return Build.VERSION.SDK_INT >= 26
        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        : WindowManager.LayoutParams.TYPE_PHONE;
  }

  private WindowManager.LayoutParams baseLp() {
    WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        overlayType(),
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT);
    lp.gravity = Gravity.TOP | Gravity.START;
    return lp;
  }

  private void createViews() {
    wm = (WindowManager) getSystemService(WINDOW_SERVICE);
    touchSlop = ViewConfiguration.get(this).getScaledTouchSlop();
    SharedPreferences p = prefs();
    minimized = p.getBoolean("ov_min", false);

    card = LayoutInflater.from(this).inflate(R.layout.overlay_float, null);
    head = LayoutInflater.from(this).inflate(R.layout.overlay_bubble, null);
    trash = LayoutInflater.from(this).inflate(R.layout.overlay_close_target, null);

    lpCard = baseLp();
    lpCard.x = p.getInt("ov_x", dp(24));
    lpCard.y = p.getInt("ov_y", dp(160));

    lpHead = baseLp();
    lpHead.x = p.getInt("ov_bx", dp(24));
    lpHead.y = p.getInt("ov_by", dp(160));

    lpTrash = new WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        overlayType(),
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT);
    lpTrash.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
    lpTrash.x = 0;
    lpTrash.y = dp(28);

    View close = card.findViewById(R.id.ov_close);
    View min = card.findViewById(R.id.ov_min);
    close.setOnClickListener(v -> closeOverlay());
    min.setOnClickListener(v -> showHead(true));

    card.setOnTouchListener(new DragTouch(card, lpCard, false));
    head.setOnTouchListener(new DragTouch(head, lpHead, true));

    bindData();
    if (minimized) {
      attach(head, lpHead);
      head.post(() -> {
        clamp(head, lpHead);
        snapHeadToEdge();
      });
    } else {
      attach(card, lpCard);
      card.post(() -> {
        clamp(card, lpCard);
        saveCardPos();
      });
    }
    ensureForeground();
  }

  private final class DragTouch implements View.OnTouchListener {
    final View target;
    final WindowManager.LayoutParams lp;
    final boolean isHead;
    float downRawX, downRawY;
    int originX, originY;
    boolean moved;

    DragTouch(View target, WindowManager.LayoutParams lp, boolean isHead) {
      this.target = target;
      this.lp = lp;
      this.isHead = isHead;
    }

    @Override public boolean onTouch(View v, MotionEvent e) {
      if (!isHead) {
        View close = card.findViewById(R.id.ov_close);
        View min = card.findViewById(R.id.ov_min);
        if ((hit(close, e) || hit(min, e)) && e.getAction() == MotionEvent.ACTION_DOWN) return false;
      }
      switch (e.getActionMasked()) {
        case MotionEvent.ACTION_DOWN:
          cancelAnim();
          downRawX = e.getRawX();
          downRawY = e.getRawY();
          originX = lp.x;
          originY = lp.y;
          moved = false;
          return true;
        case MotionEvent.ACTION_MOVE: {
          float dx = e.getRawX() - downRawX;
          float dy = e.getRawY() - downRawY;
          if (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop) moved = true;
          lp.x = originX + (int) dx;
          lp.y = originY + (int) dy;
          clamp(target, lp);
          if (isHead && moved) {
            showTrash();
            setTrashHot(overTrash(e.getRawX(), e.getRawY()));
          }
          return true;
        }
        case MotionEvent.ACTION_UP:
        case MotionEvent.ACTION_CANCEL:
          if (isHead) {
            boolean drop = moved && overTrash(e.getRawX(), e.getRawY());
            hideTrash();
            if (drop) {
              closeOverlay();
              return true;
            }
            clamp(target, lp);
            if (!moved) {
              showCard(true);
            } else {
              snapHeadToEdge();
            }
            return true;
          }
          clamp(target, lp);
          saveCardPos();
          if (!moved) {
            Intent open = new Intent(OverlayService.this, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(open);
          }
          return true;
      }
      return false;
    }
  }

  private void closeOverlay() {
    hideTrash();
    prefs().edit().putBoolean("overlay", false).apply();
    stopSelf();
  }

  private void showCard(boolean fromHead) {
    minimized = false;
    hideTrash();
    if (fromHead && head != null && lpHead != null && lpCard != null) {
      lpCard.x = lpHead.x;
      lpCard.y = lpHead.y;
    }
    detach(head);
    attach(card, lpCard);
    bindData();
    card.post(() -> {
      clamp(card, lpCard);
      saveCardPos();
    });
    prefs().edit().putBoolean("ov_min", false).apply();
    ensureForeground();
  }

  private void showHead(boolean fromCard) {
    minimized = true;
    if (fromCard && card != null && lpCard != null && lpHead != null) {
      lpHead.x = lpCard.x;
      lpHead.y = lpCard.y;
    }
    detach(card);
    attach(head, lpHead);
    bindData();
    prefs().edit().putBoolean("ov_min", true).apply();
    head.post(this::snapHeadToEdge);
    ensureForeground();
  }

  private void snapHeadToEdge() {
    if (head == null || lpHead == null || wm == null) return;
    DisplayMetrics dm = metrics();
    int w = head.getWidth() > 0 ? head.getWidth() : dp(HEAD_DP);
    int h = head.getHeight() > 0 ? head.getHeight() : dp(HEAD_DP);
    int mid = lpHead.x + w / 2;
    int margin = dp(4);
    int tx = mid < dm.widthPixels / 2
        ? margin
        : Math.max(margin, dm.widthPixels - w - margin);
    int ty = Math.max(margin, Math.min(lpHead.y, Math.max(margin, dm.heightPixels - h - margin)));
    animateTo(head, lpHead, tx, ty, this::saveHeadPos);
  }

  private void animateTo(View v, WindowManager.LayoutParams lp, int tx, int ty, Runnable end) {
    cancelAnim();
    if (v == null || v.getParent() == null) {
      lp.x = tx; lp.y = ty;
      if (end != null) end.run();
      return;
    }
    int sx = lp.x, sy = lp.y;
    if (sx == tx && sy == ty) {
      if (end != null) end.run();
      return;
    }
    snapAnim = ValueAnimator.ofFloat(0f, 1f);
    snapAnim.setDuration(200);
    snapAnim.setInterpolator(new DecelerateInterpolator());
    snapAnim.addUpdateListener(a -> {
      float f = (float) a.getAnimatedValue();
      lp.x = sx + Math.round((tx - sx) * f);
      lp.y = sy + Math.round((ty - sy) * f);
      try { wm.updateViewLayout(v, lp); } catch (Exception ignore) {}
    });
    snapAnim.addListener(new AnimatorListenerAdapter() {
      @Override public void onAnimationEnd(Animator a) {
        lp.x = tx; lp.y = ty;
        try { wm.updateViewLayout(v, lp); } catch (Exception ignore) {}
        if (end != null) end.run();
      }
    });
    snapAnim.start();
  }

  private void cancelAnim() {
    if (snapAnim != null) {
      snapAnim.cancel();
      snapAnim = null;
    }
  }

  private void showTrash() {
    if (trash == null || wm == null) return;
    TextView lab = trash.findViewById(R.id.ov_trash_label);
    if (lab != null) lab.setText(thai() ? "ปิด" : "Close");
    trash.setContentDescription(thai() ? "ปิดหน้าต่างลอย" : "Close floating window");
    if (trash.getParent() == null) {
      try { wm.addView(trash, lpTrash); } catch (Exception ignore) {}
    }
  }

  private void hideTrash() {
    setTrashHot(false);
    detach(trash);
  }

  private void setTrashHot(boolean hot) {
    if (trash == null || trashHot == hot) {
      trashHot = hot;
      return;
    }
    trashHot = hot;
    View bg = trash.findViewById(R.id.ov_trash_bg);
    TextView x = trash.findViewById(R.id.ov_trash_x);
    if (bg != null) bg.setBackgroundResource(hot ? R.drawable.overlay_trash_bg_hot : R.drawable.overlay_trash_bg);
    if (x != null) x.setTextColor(hot ? 0xFFFF5C5C : 0xFFF5D27A);
    float s = hot ? 1.12f : 1f;
    trash.setScaleX(s);
    trash.setScaleY(s);
  }

  private boolean overTrash(float rawX, float rawY) {
    if (trash == null || trash.getParent() == null) return false;
    int[] loc = new int[2];
    trash.getLocationOnScreen(loc);
    int pad = dp(18);
    return rawX >= loc[0] - pad && rawX <= loc[0] + trash.getWidth() + pad
        && rawY >= loc[1] - pad && rawY <= loc[1] + trash.getHeight() + pad;
  }

  private void attach(View v, WindowManager.LayoutParams lp) {
    if (v == null || wm == null) return;
    if (v.getParent() != null) {
      try { wm.updateViewLayout(v, lp); } catch (Exception ignore) {}
      return;
    }
    try { wm.addView(v, lp); } catch (Exception ignore) {}
  }

  private void detach(View v) {
    if (v == null || wm == null || v.getParent() == null) return;
    try { wm.removeView(v); } catch (Exception ignore) {}
  }

  private boolean hit(View v, MotionEvent e) {
    if (v == null || v.getVisibility() != View.VISIBLE) return false;
    int[] loc = new int[2];
    v.getLocationOnScreen(loc);
    float x = e.getRawX(), y = e.getRawY();
    return x >= loc[0] && x <= loc[0] + v.getWidth() && y >= loc[1] && y <= loc[1] + v.getHeight();
  }

  private void clamp(View v, WindowManager.LayoutParams lp) {
    if (v == null || lp == null || wm == null) return;
    DisplayMetrics dm = metrics();
    int margin = dp(2);
    int vw = v.getWidth() > 0 ? v.getWidth() : dp(v == head ? HEAD_DP : 200);
    int vh = v.getHeight() > 0 ? v.getHeight() : dp(v == head ? HEAD_DP : 150);
    lp.x = Math.max(margin, Math.min(lp.x, Math.max(margin, dm.widthPixels - vw - margin)));
    lp.y = Math.max(margin, Math.min(lp.y, Math.max(margin, dm.heightPixels - vh - margin)));
    if (v.getParent() != null) {
      try { wm.updateViewLayout(v, lp); } catch (Exception ignore) {}
    }
  }

  private void saveCardPos() {
    if (lpCard == null) return;
    prefs().edit().putInt("ov_x", lpCard.x).putInt("ov_y", lpCard.y).putBoolean("ov_min", false).apply();
  }

  private void saveHeadPos() {
    if (lpHead == null) return;
    prefs().edit().putInt("ov_bx", lpHead.x).putInt("ov_by", lpHead.y).putBoolean("ov_min", true).apply();
  }

  private DisplayMetrics metrics() {
    DisplayMetrics dm = new DisplayMetrics();
    try { wm.getDefaultDisplay().getRealMetrics(dm); }
    catch (Exception e) { dm = getResources().getDisplayMetrics(); }
    return dm;
  }

  private int dp(int v) {
    return Math.round(v * getResources().getDisplayMetrics().density);
  }

  private int signalColor(String side, String bias) {
    if ("BUY".equals(side) || ("up".equals(bias) && ("WAIT".equals(side) || side == null || side.isEmpty()))) {
      return 0xFF3DDC84;
    }
    if ("SELL".equals(side) || ("down".equals(bias) && ("WAIT".equals(side) || side == null || side.isEmpty()))) {
      return 0xFFFF5C5C;
    }
    return 0xFFF5D27A;
  }

  private String headPrice(float px) {
    if (px <= 0) return "—";
    if (px >= 100) return String.format(Locale.US, "%.0f", px);
    return String.format(Locale.US, "%.1f", px);
  }

  private void tintHead(int color) {
    if (head == null) return;
    View ring = head.findViewById(R.id.ov_head_ring);
    if (ring != null) {
      GradientDrawable gd = new GradientDrawable();
      gd.setShape(GradientDrawable.OVAL);
      gd.setColor(0xF21A1520);
      gd.setStroke(dp(3) / 1, color);
      ring.setBackground(gd);
    }
    View dot = head.findViewById(R.id.ov_head_dot);
    if (dot != null) {
      GradientDrawable d = new GradientDrawable();
      d.setShape(GradientDrawable.OVAL);
      d.setColor(color);
      d.setStroke(Math.max(1, dp(1)), 0xFF1A1520);
      dot.setBackground(d);
    }
  }

  private void bindData() {
    SharedPreferences p = prefs();
    float px = p.getFloat("snap_price", 0f);
    String side = p.getString("snap_side", "WAIT");
    String bias = p.getString("snap_bias", "side");
    String thaiSell = p.getString("snap_thaiSell", "");
    int conf = p.getInt("snap_conf", 0);
    float e0 = p.getFloat("snap_entry0", 0f);
    float e1 = p.getFloat("snap_entry1", 0f);
    float sl = p.getFloat("snap_sl", 0f);
    float tp = p.getFloat("snap_tp", 0f);
    long at = p.getLong("snap_at", 0L);
    boolean th = thai();
    int color = signalColor(side, bias);

    if (head != null) {
      TextView hp = head.findViewById(R.id.ov_head_price);
      if (hp != null) hp.setText(headPrice(px));
      tintHead(color);
      head.setContentDescription(th ? "ขยายหน้าต่าง PUREGOLD" : "Expand PUREGOLD window");
    }

    if (card == null) return;
    TextView minBtn = card.findViewById(R.id.ov_min);
    if (minBtn != null) {
      minBtn.setText(th ? "ย่อ" : "Min");
      minBtn.setContentDescription(th ? "ย่อเป็นบับเบิล" : "Minimize to bubble");
    }
    View close = card.findViewById(R.id.ov_close);
    if (close != null) close.setContentDescription(th ? "ปิด" : "Close");

    TextView xau = card.findViewById(R.id.ov_xau);
    TextView thaiV = card.findViewById(R.id.ov_thai);
    TextView sig = card.findViewById(R.id.ov_signal);
    TextView plan = card.findViewById(R.id.ov_plan);
    TextView upd = card.findViewById(R.id.ov_updated);
    if (xau == null) return;

    xau.setText(px > 0 ? String.format(Locale.US, "XAU $%.2f", px) : "XAU —");
    thaiV.setText(thaiSell == null || thaiSell.isEmpty()
        ? (th ? "ฮั่วเซ่งเฮง —" : "HSH —")
        : (th ? "ฮั่วเซ่งเฮง ขาย " + thaiSell : "HSH sell " + thaiSell));

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
    sig.setTextColor(color);

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
    cancelAnim();
    if (ticker != null) ui.removeCallbacks(ticker);
    hideTrash();
    detach(card);
    detach(head);
    card = null;
    head = null;
    trash = null;
    try { net.shutdownNow(); } catch (Exception ignore) {}
    super.onDestroy();
  }
}
