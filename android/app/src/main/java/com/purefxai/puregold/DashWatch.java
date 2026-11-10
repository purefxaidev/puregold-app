package com.purefxai.puregold;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Official dashboard S1–S3 / R1–R3 watches and pre-news (~15 min) for high-impact USD events. */
final class DashWatch {
  static final String DASH = "https://dashboard.purefxai.store";
  static final String LAND_LEVELS = "https://gold.purefxai.store/assets/levels.json";
  static final String FF = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
  static final String[] LV_NAMES = {"R3","R2","R1","S1","S2","S3"};

  private DashWatch() {}

  static String get(String url) throws Exception {
    java.net.HttpURLConnection h = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
    h.setConnectTimeout(10000);
    h.setReadTimeout(10000);
    h.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; PUREGOLD/0.9.5; +https://gold.purefxai.store/)");
    h.setRequestProperty("Accept", "application/json");
    h.setUseCaches(false);
    int code = h.getResponseCode();
    if (code < 200 || code >= 300) { h.disconnect(); throw new Exception("http "+code); }
    try (java.io.BufferedReader b = new java.io.BufferedReader(new java.io.InputStreamReader(h.getInputStream(), "UTF-8"))) {
      StringBuilder s = new StringBuilder();
      String l; while ((l = b.readLine()) != null) s.append(l);
      return s.toString();
    } finally { h.disconnect(); }
  }

  static JSONObject fetchJson(String url) {
    try {
      String raw = get(url + (url.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis());
      if (raw == null || raw.length() < 2 || raw.trim().startsWith("<")) return null;
      raw = raw.trim();
      if (raw.startsWith("[")) return new JSONObject().put("events", new JSONArray(raw));
      return new JSONObject(raw);
    } catch (Exception e) { return null; }
  }

  static Double d(JSONObject o, String k) {
    if (o == null || !o.has(k) || o.isNull(k)) return null;
    try {
      double v = o.optDouble(k, Double.NaN);
      if (!Double.isNaN(v) && v > 0) return v;
      String s = o.optString(k, "").replace(",", "");
      if (s.isEmpty()) return null;
      v = Double.parseDouble(s.replaceAll("[^0-9.+-]", ""));
      return v > 0 ? v : null;
    } catch (Exception e) { return null; }
  }

  static JSONObject dailyOf(JSONObject j) {
    if (j == null) return null;
    if (j.has("s1") || j.has("S1") || j.has("r1") || j.has("R1")) return j;
    JSONObject d = j.optJSONObject("daily");
    if (d != null) return d;
    JSONObject lv = j.optJSONObject("levels");
    if (lv != null) {
      if (lv.has("s1") || lv.has("r1")) return lv;
      JSONObject dd = lv.optJSONObject("daily");
      if (dd != null) return dd;
    }
    return null;
  }

  static JSONObject levelsFrom(JSONObject j) {
    JSONObject daily = dailyOf(j);
    JSONObject out = new JSONObject();
    try {
      if (daily != null) {
        String[] keys = {"s1","s2","s3","r1","r2","r3"};
        for (String k : keys) {
          Double v = d(daily, k);
          if (v == null) v = d(daily, k.toUpperCase(Locale.US));
          if (v != null) out.put(k.toUpperCase(Locale.US), v);
        }
      }
      if (!out.has("S1") && !out.has("R1") && j != null) {
        JSONArray sup = j.optJSONArray("sup_nums");
        JSONArray res = j.optJSONArray("res_nums");
        if (sup != null) {
          if (sup.length() > 0) out.put("S1", sup.getDouble(0));
          if (sup.length() > 1) out.put("S2", sup.getDouble(1));
          if (sup.length() > 2) out.put("S3", sup.getDouble(2));
        }
        if (res != null) {
          if (res.length() > 0) out.put("R1", res.getDouble(0));
          if (res.length() > 1) out.put("R2", res.getDouble(1));
          if (res.length() > 2) out.put("R3", res.getDouble(2));
        }
      }
    } catch (Exception ignore) {}
    return (out.has("S1") || out.has("R1")) ? out : null;
  }

  static JSONObject loadLevels() {
    for (String u : new String[]{ DASH + "/levels.json", LAND_LEVELS, DASH + "/view.json" }) {
      JSONObject j = fetchJson(u);
      JSONObject lv = levelsFrom(j);
      if (lv != null) return lv;
    }
    return null;
  }

  static boolean cooldownOk(SharedPreferences p, String key, long ms) {
    return System.currentTimeMillis() - p.getLong(key, 0) >= ms;
  }

  static void markCd(SharedPreferences p, String key) {
    p.edit().putLong(key, System.currentTimeMillis()).apply();
  }

  /** @return true if official levels were available (caller may skip legacy S/R). */
  static boolean runSr(Context c, SharedPreferences p, double spot, boolean th) {
    if (!p.getBoolean("alertSR", true) || spot <= 0) return false;
    JSONObject lv = loadLevels();
    if (lv == null) return false;
    double prev = p.getFloat("px", 0f);
    long cd = Math.max(1, p.getInt("srCooldownHrs", 4)) * 3600_000L;
    double tol = Math.max(0.8, spot * 0.0002);
    boolean any = false;
    for (String name : LV_NAMES) {
      double px = lv.optDouble(name, 0);
      if (px <= 0) continue;
      boolean touched = Math.abs(spot - px) <= tol;
      boolean broke = false;
      if (prev > 0 && Math.abs(prev - px) > tol) {
        double a = prev - px, b = spot - px;
        if (a != 0 && b != 0 && Math.signum(a) != Math.signum(b)) broke = true;
      }
      if (!touched && !broke) continue;
      if (prev <= 0) continue; // skip first sample
      String ck = "srcd_" + name;
      if (!cooldownOk(p, ck, cd)) continue;
      String text = formatSr(name, px, spot, broke, th, p.getString("lang", "th"));
      markCd(p, ck);
      GoldWorker.alert(c, text, p, true);
      any = true;
    }
    return true;
  }

  static String formatSr(String name, double px, double spot, boolean broke, boolean th, String lang) {
    if (th || "th".equals(lang)) {
      String side = name.charAt(0) == 'R' ? "แนวต้าน" : "แนวรับ";
      String act = broke ? "เบรก" : "แตะ";
      return "XAUUSD " + act + side + " " + name + " ที่ " + String.format(Locale.US, "%.1f", px)
          + " · ราคา " + String.format(Locale.US, "%.1f", spot);
    }
    if ("zh".equals(lang)) {
      String side = name.charAt(0) == 'R' ? "阻力" : "支撑";
      String act = broke ? "突破" : "触及";
      return "XAUUSD " + act + side + " " + name + "（" + String.format(Locale.US, "%.1f", px)
          + "）· 现价 " + String.format(Locale.US, "%.1f", spot);
    }
    if ("ja".equals(lang)) {
      String side = name.charAt(0) == 'R' ? "レジスタンス" : "サポート";
      String act = broke ? "ブレイク" : "タッチ";
      return "XAUUSD が" + side + " " + name + "（" + String.format(Locale.US, "%.1f", px)
          + "）を" + act + " · 現在 " + String.format(Locale.US, "%.1f", spot);
    }
    String side = name.charAt(0) == 'R' ? "resistance" : "support";
    String act = broke ? "broke" : "touched";
    return "XAUUSD " + act + " " + side + " " + name + " at " + String.format(Locale.US, "%.1f", px)
        + " · spot " + String.format(Locale.US, "%.1f", spot);
  }

  static boolean high(String v) {
    String s = v == null ? "" : v.toLowerCase(Locale.US);
    return s.equals("high") || s.equals("high impact") || s.equals("red") || s.equals("3") || s.equals("xxx");
  }
  static boolean usd(String v) {
    String s = v == null ? "" : v.toUpperCase(Locale.US);
    return s.equals("USD") || s.equals("UNITED STATES") || s.equals("US");
  }
  static long whenMs(JSONObject ev) {
    String[] keys = {"date","datetime","time","at","when","ts","start"};
    for (String k : keys) {
      if (!ev.has(k) || ev.isNull(k)) continue;
      Object v = ev.opt(k);
      if (v instanceof Number) {
        long n = ((Number) v).longValue();
        return n < 1_000_000_000_000L ? n * 1000L : n;
      }
      String s = String.valueOf(v);
      if (s.isEmpty()) continue;
      if (android.os.Build.VERSION.SDK_INT >= 26) {
        try {
          if (s.endsWith("Z")) return java.time.Instant.parse(s).toEpochMilli();
          return java.time.OffsetDateTime.parse(s).toInstant().toEpochMilli();
        } catch (Exception ignore) {}
        try { return java.time.LocalDateTime.parse(s).toInstant(java.time.ZoneOffset.UTC).toEpochMilli(); }
        catch (Exception ignore) {}
      }
    }
    return 0;
  }
  static String evId(JSONObject ev) {
    String id = ev.optString("id", ev.optString("uid", ""));
    if (!id.isEmpty()) return id;
    return ev.optString("title", ev.optString("event", ev.optString("name", "ev")))
        + "|" + ev.optString("date", ev.optString("datetime", ev.optString("time", ev.optString("at", ""))));
  }
  static String evTitle(JSONObject ev) {
    String t = ev.optString("title", ev.optString("event", ev.optString("name", ev.optString("headline", ""))));
    return t == null || t.isEmpty() ? "USD event" : t;
  }
  static String evCountry(JSONObject ev) {
    return ev.optString("country", ev.optString("currency", ev.optString("ccy", ev.optString("cur", ev.optString("fx", "")))));
  }
  static String evImpact(JSONObject ev) {
    return ev.optString("impact", ev.optString("importance", ev.optString("level", ev.optString("vol", ""))));
  }

  static JSONArray eventArray(JSONObject j) {
    if (j == null) return new JSONArray();
    if (j.has("events")) return j.optJSONArray("events");
    if (j.has("items")) return j.optJSONArray("items");
    if (j.has("usd_high")) return j.optJSONArray("usd_high");
    return new JSONArray();
  }

  static void runNews(Context c, SharedPreferences p, boolean th) {
    if (!p.getBoolean("alertPreNews", true)) return;
    JSONObject j = fetchJson(DASH + "/events.json");
    if (j == null) j = fetchJson(FF);
    JSONArray arr = eventArray(j);
    long now = System.currentTimeMillis();
    long window = 16 * 60_000L;
    String seen = p.getString("eventAlerted", "");
    List<String> keep = new ArrayList<>();
    for (String s : seen.split("\n")) if (!s.isEmpty()) keep.add(s);
    boolean changed = false;
    for (int i = 0; i < arr.length(); i++) {
      JSONObject ev = arr.optJSONObject(i);
      if (ev == null) continue;
      if (!usd(evCountry(ev)) || !high(evImpact(ev))) continue;
      long at = whenMs(ev);
      if (at <= 0) continue;
      long eta = at - now;
      if (eta <= 0 || eta > window) continue;
      String id = evId(ev);
      if (keep.contains(id)) continue;
      int mins = Math.max(1, (int) Math.round(eta / 60000.0));
      String title = evTitle(ev);
      String lang = p.getString("lang", "th");
      String text;
      if (th || "th".equals(lang)) text = "อีก " + mins + " นาที · ข่าว USD ผลกระทบสูง: " + title;
      else if ("zh".equals(lang)) text = mins + " 分钟后 · 高影响美元事件：" + title;
      else if ("ja".equals(lang)) text = "あと" + mins + "分 · 米ドル重要指標: " + title;
      else text = "In " + mins + " min · high-impact USD: " + title;
      keep.add(id);
      changed = true;
      GoldWorker.alert(c, text, p, true);
    }
    if (changed) {
      while (keep.size() > 200) keep.remove(0);
      StringBuilder sb = new StringBuilder();
      for (String s : keep) { if (sb.length() > 0) sb.append('\n'); sb.append(s); }
      p.edit().putString("eventAlerted", sb.toString()).apply();
    }
  }
}
