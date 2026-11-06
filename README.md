# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง: ทองแท่ง, สมาคมฯ, รูปพรรณ) และทองโลก XAUUSD พร้อมกราฟแท่งเทียน แนวรับ/แนวต้านซ้อนทับ ระบบคาดการณ์ระยะสั้นจากกฎอัลกอริทึม มุมมองและแผนเทรด (SL/TP/RR) สลับภาษาไทย/อังกฤษ รันอัตโนมัติเบื้องหลัง (WorkManager) ตั้งช่วงแจ้งเตือนเป็นนาที เปิด/ปิดเสียงภาษาไทย (Android TTS) เมื่อเบรกแนวสำคัญหรือมุมมองเปลี่ยน

**EN:** Android app analyzing Thai gold (Hua Seng Heng) and world gold XAUUSD: candlestick charts with S/R overlays, short-term algorithmic forecast, bias + rule-based plan (SL/TP/RR), TH/EN toggle, background auto-refresh, alert interval in minutes, voice on/off (Android TTS) for S/R breaks and bias changes.

## Features (0.2.0)
- Interactive XAU chart (M15 / H1 / H4 / D1) via TradingView **lightweight-charts**
- Support (green) / resistance (red) / current price overlays
- Forecast card: direction, confidence %, entry zone, invalidation, short reasons (same rule engine — no on-device LLM)
- Alert settings: presets 5/10/15/30/60 min + custom minutes; voice on/off; mute; S/R + bias alerts
- Thai HSH spot cards + world XAU spot

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17, Android SDK (build-tools 35), and a release keystore kept OUTSIDE the repo (env `KS`, `KS_TXT`).

## Data sources
- Thai gold: apicheckprice.huasengheng.com
- Spot: api.gold-api.com/price/XAU
- Candles: Binance PAXGUSDT (XAU proxy) — shifted by spot−PAXG basis so chart levels match XAU spot

## Background / Doze
WorkManager schedules the next run after each success using your interval. Android Doze / battery optimizations may delay jobs; reboot-persistent exact alarms are not required for this version.

## Local model (planned, not in 0.2.0)
Alerts remain template-based + system Thai TTS. An optional on-device wording model may come later. **No model name is shown in the app UI.**

## 💚 Support PureFxAi / สนับสนุน PureFxAi (USDT)

**Network: Ethereum (ERC20) only / เครือข่าย Ethereum (ERC20) เท่านั้น**

```
0x920deab53daf94ca2030ad5ceec2265bf5686941
```

⚠️ Send **only USDT via ERC20**. Other networks or tokens may be lost permanently.
ส่งเฉพาะ **USDT ผ่าน ERC20** เท่านั้น เครือข่ายหรือเหรียญอื่นอาจสูญหายถาวร

Donations are voluntary support — **not an investment**, with no returns or rewards.
การบริจาคเป็นการสนับสนุนโดยสมัครใจ **ไม่ใช่การลงทุน** และไม่มีผลตอบแทนใด ๆ

<img src="docs/usdt-erc20-qr.png" width="200" alt="USDT ERC20 QR">

Donation page with QR: https://purefxaidev.github.io/driftwatch-video/

## Disclaimer
ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน / Education only, not financial advice.
