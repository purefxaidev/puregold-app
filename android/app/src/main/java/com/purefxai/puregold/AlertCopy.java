package com.purefxai.puregold;

import org.json.JSONObject;
import java.util.Locale;

/** Shared lead for every app notification and overlay line. */
public final class AlertCopy {
  private AlertCopy() {}

  public static String fmtPx(double px) {
    if (!(px > 0) || Double.isNaN(px)) return "—";
    return String.format(Locale.US, "%,.1f", px);
  }

  public static String lead(double px, String stance, String reason, boolean th) {
    String st = stance == null || stance.isEmpty() ? (th ? "รอ" : "waiting") : stance;
    String why = reason == null ? "" : reason;
    if (th) return "ราคาล่าสุด $" + fmtPx(px) + " · ตอนนี้ " + st + " เพราะ" + why;
    return "Latest price $" + fmtPx(px) + " · now " + st + " because " + why;
  }

  public static String wrap(String text, double px, String stance, String reason, boolean th) {
    String body = text == null ? "" : text.trim();
    if (body.startsWith("ราคาล่าสุด") || body.startsWith("Latest price")) return body;
    String head = lead(px, stance, reason, th);
    if (body.isEmpty()) return head;
    return head + " " + body;
  }

  public static String fromPlan(JSONObject plan, double px, boolean th) {
    if (plan == null) return lead(px, th ? "รอ" : "waiting", th ? "กำลังดูโครงสร้าง" : "the structure is being read", th);
    JSONObject alert = plan.optJSONObject("alert");
    String stance = "รอ";
    String reason = th ? "กำลังดูโครงสร้าง" : "the structure is being read";
    if (alert != null) {
      stance = th ? alert.optString("stance", stance) : alert.optString("stance_en", alert.optString("stance", "waiting"));
      reason = th ? alert.optString("reason_th", reason) : alert.optString("reason_en", reason);
    }
    return lead(px, stance, reason, th);
  }
}
