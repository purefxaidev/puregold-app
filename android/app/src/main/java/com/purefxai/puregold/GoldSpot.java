package com.purefxai.puregold;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * XAUUSD FX mid: Swissquote public BBO first, then dashboard snapshot
 * (movement-adjusted with gold-api), then gold-api. Never uses PAXG as XAUUSD.
 */
public final class GoldSpot {
  public static final String SQ_URL = "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD";
  public static final String GOLDAPI_URL = "https://api.gold-api.com/price/XAU";
  public static final String DASH_SPOT = "https://dashboard.purefxai.store/spot.json";
  private static final String UA = "Mozilla/5.0 (compatible; PUREGOLD/1.0; +https://gold.purefxai.store/)";

  public static final class Quote {
    public final double price;
    public final String src;
    public Quote(double price, String src) { this.price = price; this.src = src; }
  }

  private GoldSpot() {}

  static String get(String url) throws Exception {
    HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
    h.setConnectTimeout(10000);
    h.setReadTimeout(10000);
    h.setRequestProperty("User-Agent", UA);
    h.setRequestProperty("Accept", "application/json");
    h.setUseCaches(false);
    try (BufferedReader b = new BufferedReader(new InputStreamReader(h.getInputStream(), "UTF-8"))) {
      StringBuilder s = new StringBuilder();
      String l;
      while ((l = b.readLine()) != null) s.append(l);
      return s.toString();
    } finally { h.disconnect(); }
  }

  static Double swissquoteMid(String raw) {
    try {
      JSONArray data = new JSONArray(raw);
      double sum = 0;
      int n = 0;
      for (int i = 0; i < data.length(); i++) {
        JSONObject block = data.optJSONObject(i);
        if (block == null) continue;
        JSONArray prices = block.optJSONArray("spreadProfilePrices");
        if (prices == null) continue;
        for (int j = 0; j < prices.length(); j++) {
          JSONObject p = prices.optJSONObject(j);
          if (p == null) continue;
          double b = p.optDouble("bid", 0);
          double a = p.optDouble("ask", 0);
          if (a >= b && b > 0) { sum += (b + a) / 2.0; n++; }
        }
      }
      return n > 0 ? Math.round(sum / n * 1000.0) / 1000.0 : null;
    } catch (Exception e) { return null; }
  }

  static long parseTime(String iso) {
    if (iso == null || iso.isEmpty()) return 0;
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      try {
        String s = iso.trim();
        if (s.endsWith("Z")) return java.time.Instant.parse(s).toEpochMilli();
        return java.time.OffsetDateTime.parse(s).toInstant().toEpochMilli();
      } catch (Exception ignore) {}
    }
    return 0;
  }

  /** Best-effort XAUUSD FX mid. Returns null if every source fails. */
  public static Quote resolve() {
    Double liveSq = null, gaPx = null;
    JSONObject snap = null;
    try { liveSq = swissquoteMid(get(SQ_URL)); } catch (Exception ignore) {}
    try {
      JSONObject g = new JSONObject(get(GOLDAPI_URL));
      double p = g.optDouble("price", 0);
      if (p > 0) gaPx = p;
    } catch (Exception ignore) {}
    try { snap = new JSONObject(get(DASH_SPOT + "?t=" + System.currentTimeMillis())); } catch (Exception ignore) {}

    Double snapPx = null, gaSnapPx = null;
    boolean fresh = false;
    if (snap != null) {
      double p = snap.optDouble("price", 0);
      if (p > 0) snapPx = p;
      JSONArray sources = snap.optJSONArray("sources");
      if (sources != null) {
        for (int i = 0; i < sources.length(); i++) {
          JSONObject s = sources.optJSONObject(i);
          if (s != null && "gold-api".equals(s.optString("name")) && s.optBoolean("ok", false) && s.optDouble("price", 0) > 0) {
            gaSnapPx = s.optDouble("price");
          }
        }
      }
      String when = snap.optString("fetched_at", snap.optString("updated_utc", ""));
      long t = parseTime(when);
      long ageMin = t > 0 ? (System.currentTimeMillis() - t) / 60000L : 9999;
      fresh = snapPx != null && !snap.optBoolean("stale", false) && ageMin <= 45;
    }

    if (liveSq != null && liveSq > 0) return new Quote(round2(liveSq), "swissquote");

    if (fresh && gaPx != null && gaSnapPx != null && snapPx != null) {
      double est = gaPx - (gaSnapPx - snapPx);
      if (est > 0 && Math.abs(est - snapPx) < 25) return new Quote(round2(est), "fx-live");
    }
    if (snapPx != null) return new Quote(round2(snapPx), snap.optString("src", "swissquote"));
    if (gaPx != null) return new Quote(round2(gaPx), "gold-api");
    return null;
  }

  static double round2(double x) { return Math.round(x * 100.0) / 100.0; }
}
