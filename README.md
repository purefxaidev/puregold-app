# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง: ทองแท่ง, สมาคมฯ, รูปพรรณ) และทองโลก XAUUSD พร้อมแนวรับ/แนวต้าน มุมมองระยะสั้น และแผนเทรดตามกฎ (SL/TP/RR) สลับภาษาไทย/อังกฤษ รันอัตโนมัติเบื้องหลัง (WorkManager) แจ้งเตือนผ่าน notification และเสียงภาษาไทย (Android TTS) เมื่อเบรกแนวสำคัญหรือมุมมองเปลี่ยน

**EN:** Android app analyzing Thai gold (Hua Seng Heng) and world gold XAUUSD: support/resistance, short-term bias, rule-based plan (SL/TP/RR), TH/EN toggle, background auto-refresh with notification + Thai voice alerts.

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17, Android SDK (build-tools 35), and a release keystore kept OUTSIDE the repo (env `KS`, `KS_TXT`).

## Data sources
- Thai gold: apicheckprice.huasengheng.com
- Spot: api.gold-api.com/price/XAU
- Candles: Binance PAXGUSDT (XAU proxy)

## Local model (planned)
Alerts are template-based today. Planned on-device model for Thai wording: Qwen3.5-0.8B GGUF Q4_K_M (unsloth/Qwen3.5-0.8B-GGUF); optional Qwen3.5-2B Q4 on 6GB+ devices.

## Disclaimer
ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน / Education only, not financial advice.
