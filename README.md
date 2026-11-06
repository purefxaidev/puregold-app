# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง) และทองโลก XAUUSD พร้อมกราฟแท่งเทียน แนวรับ/แนวต้าน Order Block / FVG (Smart Money) ระบบคาดการณ์ จุดเข้า–ออก (Entry / SL / TP / Invalidation) วิเคราะห์ข่าวทอง แจ้งเตือนเป็นนาที + ราคาที่ตั้งเอง หลายภาษา (ไทย / English / 中文 / 日本語) โดเนท USDT และคู่มือสมัคร Exness

**EN:** Android app for Thai gold (Hua Seng Heng) and world gold XAUUSD: candlestick charts with S/R, Order Blocks & FVG (Smart Money), algorithmic forecast, clear entry/exit (Entry / SL / TP / Invalidation), gold news analysis, minute + custom price alerts, multi-language (TH / EN / ZH / JA), USDT donate, Exness sign-up wizard.

## Features (0.3.1)
- Production bottom-nav UI (Home / Chart / Techniques / News / More), dark gold theme
- Techniques menu (worldwide XAU): Smart Money, S/R, Pivot, Trend/MTF, Fibonacci, Session
- Languages: Thai, English, Chinese, Japanese
- Entry/Exit setup card: side, entry zone, SL, TP, invalidation, RR (educational)
- Chart overlays: S/R, entry/SL/TP/invalidation, Order Blocks & FVG (toggle)
- SMC list from gold-dashboard rules (deterministic)
- Forecast + bias from rule engine (no model names in UI)
- News cards from PUREGOLD dashboard feed (impact up/down/neutral)
- Alerts: interval minutes, voice on/off, custom price alerts, history
- On-device persistence: last analysis, levels, settings, alerts, news cache
- In-app update check against GitHub Releases (Update button → latest release)
- USDT ERC20 donate + Exness partner signup wizard (IB cookie via Capacitor Browser)

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

## Exness sign-up guide
Partner referral link (code `s2didh6p`): `https://one.toexness.com/a/s2didh6p`

## 💚 Support PureFxAi (USDT)

**Network: Ethereum (ERC20) only**

```
0x920deab53daf94ca2030ad5ceec2265bf5686941
```

⚠️ Send **only USDT via ERC20**. Other networks or tokens may be lost permanently.

Donations are voluntary support — **not an investment**, with no returns or rewards.


## Disclaimer
Education only. Not financial advice. / ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
