package com.purefxai.puregold;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;
import org.json.JSONArray;

/** Mini XAU candles/sparkline painted from already-fetched H1 bars. */
public class OverlaySparkView extends View {
  private final Paint wick = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint body = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint grid = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final RectF rect = new RectF();
  private final Path spark = new Path();
  private float[] o = new float[0], h = new float[0], l = new float[0], c = new float[0];

  public OverlaySparkView(Context context) { this(context, null); }
  public OverlaySparkView(Context context, AttributeSet attrs) { this(context, attrs, 0); }
  public OverlaySparkView(Context context, AttributeSet attrs, int defStyleAttr) {
    super(context, attrs, defStyleAttr);
    wick.setStrokeWidth(1.4f);
    wick.setStyle(Paint.Style.STROKE);
    wick.setStrokeCap(Paint.Cap.ROUND);
    body.setStyle(Paint.Style.FILL);
    line.setStyle(Paint.Style.STROKE);
    line.setStrokeWidth(1.8f);
    line.setColor(0xE6F5D27A);
    line.setStrokeJoin(Paint.Join.ROUND);
    line.setStrokeCap(Paint.Cap.ROUND);
    grid.setStyle(Paint.Style.STROKE);
    grid.setStrokeWidth(1f);
    grid.setColor(0x33C9A227);
    bg.setColor(0x661A1520);
    setWillNotDraw(false);
  }

  /** Accepts a JSON array of [open, high, low, close] or a flat list of closes. */
  public void setBars(String json) {
    try {
      JSONArray arr = new JSONArray(json == null ? "[]" : json);
      int n = arr.length();
      if (n <= 1) {
        o = h = l = c = new float[0];
        invalidate();
        return;
      }
      int from = Math.max(0, n - 48);
      int m = n - from;
      o = new float[m];
      h = new float[m];
      l = new float[m];
      c = new float[m];
      boolean ohlc = arr.optJSONArray(from) != null;
      for (int i = 0; i < m; i++) {
        if (ohlc) {
          JSONArray b = arr.getJSONArray(from + i);
          o[i] = (float) b.optDouble(0, 0);
          h[i] = (float) b.optDouble(1, o[i]);
          l[i] = (float) b.optDouble(2, o[i]);
          c[i] = (float) b.optDouble(3, o[i]);
        } else {
          float v = (float) arr.optDouble(from + i, 0);
          o[i] = h[i] = l[i] = c[i] = v;
        }
      }
    } catch (Exception e) {
      o = h = l = c = new float[0];
    }
    invalidate();
  }

  @Override protected void onDraw(Canvas canvas) {
    int w = getWidth(), ht = getHeight();
    if (w <= 0 || ht <= 0) return;
    float d = getResources().getDisplayMetrics().density;
    float r = 8 * d;
    rect.set(0, 0, w, ht);
    canvas.drawRoundRect(rect, r, r, bg);
    canvas.drawRoundRect(rect, r, r, grid);
    if (c.length < 2) return;

    float min = l[0], max = h[0];
    for (int i = 0; i < c.length; i++) {
      if (l[i] < min) min = l[i];
      if (h[i] > max) max = h[i];
    }
    if (max <= min) { max = min + 1f; }
    float pad = 4 * d;
    float left = pad, top = pad, right = w - pad, bottom = ht - pad;
    float innerW = Math.max(1f, right - left);
    float innerH = Math.max(1f, bottom - top);
    float slot = innerW / c.length;
    boolean candles = slot >= 3.2f * d;

    if (candles) {
      float cw = Math.max(2f * d, Math.min(6f * d, slot * 0.62f));
      for (int i = 0; i < c.length; i++) {
        float cx = left + slot * i + slot / 2f;
        float yH = top + (max - h[i]) / (max - min) * innerH;
        float yL = top + (max - l[i]) / (max - min) * innerH;
        float yO = top + (max - o[i]) / (max - min) * innerH;
        float yC = top + (max - c[i]) / (max - min) * innerH;
        boolean up = c[i] >= o[i];
        int col = up ? 0xFFF5D27A : 0xFFFF5C5C;
        wick.setColor(col);
        body.setColor(up ? 0xE6F5D27A : 0xE6FF5C5C);
        canvas.drawLine(cx, yH, cx, yL, wick);
        float topB = Math.min(yO, yC);
        float botB = Math.max(yO, yC);
        if (botB - topB < 1.5f * d) botB = topB + 1.5f * d;
        rect.set(cx - cw / 2f, topB, cx + cw / 2f, botB);
        canvas.drawRect(rect, body);
      }
    } else {
      spark.reset();
      for (int i = 0; i < c.length; i++) {
        float x = left + slot * i + slot / 2f;
        float y = top + (max - c[i]) / (max - min) * innerH;
        if (i == 0) spark.moveTo(x, y);
        else spark.lineTo(x, y);
      }
      canvas.drawPath(spark, line);
    }
  }
}
