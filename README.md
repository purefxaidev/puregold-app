# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง) และทองโลก XAUUSD พร้อมเมนูแผนแยก วิดเจ็ต หน้าต่างลอยทับแอปอื่น กราฟ แนวรับ/แนวต้าน Order Block / FVG แจ้งเตือน และหลายภาษา

**EN:** Android app for Thai gold (Hua Seng Heng) and world gold XAUUSD: dedicated Plan tab, home widget, floating overlay, charts, S/R, Order Blocks & FVG, alerts, multi-language.

## Features (0.4.0)
- Dedicated **Plan** tab — today’s plan card (entry / SL / TP / key levels) + signal history
- In-app **per-version changelog** (offline notes + GitHub release body; shown after update)
- **Home-screen widget** — Thai HSH / XAU + short BUY/SELL/WAIT signal
- **Floating overlay** over other apps (e.g. MT5) — needs “Display over other apps” permission; draggable, dismissible, toggle in Settings
- On-device Buy/Sell **signal history** with best-effort outcome vs later price
- Techniques menu, SMC OB/FVG, news analysis, custom price alerts
- Languages: Thai / English / 中文 / 日本語
- Exness partner signup wizard · IB `https://one.toexness.com/a/s2didh6p`
- GitHub Releases update check

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17, Android SDK (build-tools 35), and a release keystore kept OUTSIDE the repo (env `KS`, `KS_TXT`).

## Data sources
- Thai gold: apicheckprice.huasengheng.com
- Spot: api.gold-api.com/price/XAU
- Candles: Binance PAXGUSDT (XAU proxy) — shifted by spot−PAXG basis
- News: https://purefxaidev.github.io/gold-dashboard/news.json
- Updates: GitHub Releases API for purefxaidev/puregold-app

## Widget / overlay notes
- Widget refresh: Android may limit automatic widget updates (~30 min); the app and background worker push fresher data when they run.
- Overlay requires the user to grant SYSTEM_ALERT_WINDOW (“Display over other apps”).

## Disclaimer
Education only. Not financial advice. / ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
