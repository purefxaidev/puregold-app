# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง) และทองโลก XAUUSD พร้อมเมนูแผนแยก, PureFxAi ในเครื่อง, วิดเจ็ต, หน้าต่างลอย, กราฟ, SMC, แจ้งเตือน และหลายภาษา

**EN:** Android app for Thai gold (Hua Seng Heng) and world gold XAUUSD: Plan tab, on-device PureFxAi, widget, overlay, charts, SMC, alerts, multi-language.

## Features (0.5.0)
- **PureFxAi** on-device plan analysis — auto-installs on first use (UI shows Installing / กำลังติดตั้ง / 正在安装 + %). Never shows third-party model names.
- Rule engine remains the baseline on the Plan tab; PureFxAi enhances the narrative
- Dedicated **Plan** tab, changelog, home widget, floating overlay, signal history
- Techniques, SMC OB/FVG, news, custom price alerts
- Languages: Thai / English / 中文 / 日本語
- Exness partner signup · IB `https://one.toexness.com/a/s2didh6p`

## On-device pack URL (permanent)
https://github.com/purefxaidev/puregold-purefxai/releases/download/device-pack-1/purefxai-device.gguf

(~1.2 GB, first install needs network + free storage; Wi‑Fi recommended)

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17 (`/opt/jdk`), Android SDK, release keystore outside the repo.

## Disclaimer
Education only. Not financial advice. / ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
