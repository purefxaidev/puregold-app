package com.purefxai.puregold;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

/** Gold-glass opacity slider, 40–100%. */
public class OverlayOpacityBar extends View {
  public interface Listener { void onOpacity(int percent, boolean done); }

  static final int MIN = 40, MAX = 100;
  private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint thumb = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint rim = new Paint(Paint.ANTI_ALIAS_FLAG);
  private int percent = MAX;
  private Listener listener;

  public OverlayOpacityBar(Context context) { this(context, null); }
  public OverlayOpacityBar(Context context, AttributeSet attrs) { this(context, attrs, 0); }
  public OverlayOpacityBar(Context context, AttributeSet attrs, int defStyleAttr) {
    super(context, attrs, defStyleAttr);
    track.setColor(0x66C9A227);
    track.setStyle(Paint.Style.STROKE);
    track.setStrokeCap(Paint.Cap.ROUND);
    fill.setColor(0xFFF5D27A);
    fill.setStyle(Paint.Style.STROKE);
    fill.setStrokeCap(Paint.Cap.ROUND);
    thumb.setColor(0xEE1A1520);
    thumb.setStyle(Paint.Style.FILL);
    rim.setColor(0xFFF5D27A);
    rim.setStyle(Paint.Style.STROKE);
    setClickable(true);
    setFocusable(true);
    setWillNotDraw(false);
  }

  public void setListener(Listener l) { listener = l; }

  public void setPercent(int p) {
    int n = clamp(p);
    if (n == percent) return;
    percent = n;
    invalidate();
  }

  public int getPercent() { return percent; }

  private static int clamp(int p) {
    if (p < MIN) return MIN;
    if (p > MAX) return MAX;
    return p;
  }

  private void applyTouch(float x, boolean done) {
    float d = getResources().getDisplayMetrics().density;
    float pad = 8 * d;
    float w = Math.max(1f, getWidth() - pad * 2);
    int p = MIN + Math.round((x - pad) / w * (MAX - MIN));
    p = clamp(p);
    if (p != percent || done) {
      percent = p;
      invalidate();
      if (listener != null) listener.onOpacity(percent, done);
    }
  }

  @Override public boolean onTouchEvent(MotionEvent e) {
    switch (e.getActionMasked()) {
      case MotionEvent.ACTION_DOWN:
        getParent().requestDisallowInterceptTouchEvent(true);
        applyTouch(e.getX(), false);
        return true;
      case MotionEvent.ACTION_MOVE:
        applyTouch(e.getX(), false);
        return true;
      case MotionEvent.ACTION_UP:
      case MotionEvent.ACTION_CANCEL:
        applyTouch(e.getX(), true);
        return true;
    }
    return super.onTouchEvent(e);
  }

  @Override protected void onDraw(Canvas canvas) {
    float d = getResources().getDisplayMetrics().density;
    float pad = 8 * d;
    float cy = getHeight() / 2f;
    float left = pad, right = getWidth() - pad;
    float stroke = 3 * d;
    track.setStrokeWidth(stroke);
    fill.setStrokeWidth(stroke);
    canvas.drawLine(left, cy, right, cy, track);
    float t = (percent - MIN) / (float) (MAX - MIN);
    float tx = left + t * (right - left);
    canvas.drawLine(left, cy, tx, cy, fill);
    float r = 6 * d;
    rim.setStrokeWidth(1.4f * d);
    canvas.drawCircle(tx, cy, r, thumb);
    canvas.drawCircle(tx, cy, r, rim);
  }
}
