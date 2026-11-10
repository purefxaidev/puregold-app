# PUREGOLD (PureFxAi)

[![Release](https://img.shields.io/github/v/release/purefxaidev/puregold-app?color=c9a227&label=release)](https://github.com/purefxaidev/puregold-app/releases/latest)
[![License](https://img.shields.io/badge/education-not%20financial%20advice-1a1a22)](#disclaimer--คำเตือน--风险提示)
[![Whitepaper](https://img.shields.io/badge/landing-gold.purefxai.store-c9a227)](https://gold.purefxai.store/)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง) และทองโลก XAUUSD พร้อมแชทบอท PureFxAi, เมนูแผน, วิดเจ็ต, หน้าต่างลอย, กราฟ, SMC, ข่าวล่าสุด และการวิเคราะห์ข่าว

**EN:** Android app for Thai gold (Hua Seng Heng) and world gold XAUUSD: PureFxAi chat, Plan tab, widget, overlay, charts, SMC, latest news analysis.

**ZH:** 泰国金与国际金（XAUUSD）分析应用：PureFxAi 聊天、计划页、小组件、悬浮窗、图表与新闻分析。

Landing (APK download): https://gold.purefxai.store/  
Fallback while DNS propagates: https://purefxaidev.github.io/puregold-whitepaper/

## Features (0.9.3)
- **Home** shows a live **chart** and **techniques** (full pages still available)
- **Latest gold news** from multiple sources, each with a clean “Open link / เปิดข่าว” button (no raw HTML)
- Headlines localize to Thai / 中文 / 日本語 when the app language is set (uses feed text or PureFxAi + API key)
- **PureFxAi** analyzes those headlines for gold-market impact (Nong Mee / น้องหมี)
- Strong-impact news can send an SMS-style alert (toggle in Settings)
- Home-screen **widget** and floating **overlay** with live XAU + Thai gold + short signal — minimize the overlay to a round gold bubble (drag, snap to the edge, tap to expand)
- PureFxAi chat, plan, and news analysis work out of the box — branded PureFxAi only
- Languages: Thai / English / 中文 / 日本語

## Home-screen widget
**TH:** กดค้างพื้นที่ว่างบนหน้าจอหลัก → วิดเจ็ต → เลือก **PUREGOLD**  
**EN:** Long-press an empty area on the home screen → Widgets → **PUREGOLD**  
The widget shows live XAU, Hua Seng Heng Thai gold, and the short signal. Tap it to open the app.

## API key
PureFxAi works out of the box. You may optionally paste your own key in **More → Settings** for cloud voices or as an override. Stored on this phone only.

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17 (`/opt/jdk` or `/home/box/jdk/current`), Android SDK, release keystore outside the repo.

## Support / การสนับสนุน

ถ้า PUREGOLD มีประโยชน์ สามารถสนับสนุนทีมได้ตามสบาย — ไม่บังคับ และไม่มีผลตอบแทนการลงทุน

<p align="center">
  <img src="public/nong-mee.jpg" alt="น้องหมี Nong Mee" width="120" />
</p>

<p align="center">
  <a href="https://one.toexness.com/a/s2didh6p"><img src="https://img.shields.io/badge/Exness%20IB-s2didh6p-c9a227?style=for-the-badge" alt="Exness IB" /></a>
  <img src="https://img.shields.io/badge/USDT-ERC20-3ddc84?style=for-the-badge" alt="USDT ERC20" />
</p>

### USDT (ERC20 only / เครือข่าย Ethereum เท่านั้น)

| | |
| --- | --- |
| **Network** | Ethereum (ERC20) |
| **Asset** | USDT |
| **Address** | `0x920deab53daf94ca2030ad5ceec2265bf5686941` |

<p align="center">
  <img src="public/usdt-erc20-qr.png" alt="USDT ERC20 QR" width="180" />
</p>

ส่งเฉพาะ USDT ผ่าน ERC20 เท่านั้น — เครือข่ายหรือเหรียญอื่นอาจสูญหายถาวร  
Send only USDT on ERC20. Other networks or tokens may be lost permanently.

การบริจาคเป็นการสนับสนุนโดยสมัครใจ ไม่ใช่การลงทุน และไม่มีผลตอบแทน  
Donations are voluntary support — not an investment, with no returns.

### Exness IB (ลิงก์แนะนำ / partner)

เปิดบัญชีผ่านลิงก์พันธมิตรของทีม: **[one.toexness.com/a/s2didh6p](https://one.toexness.com/a/s2didh6p)**  
รหัสแนะนำ / referral code: `s2didh6p`

<p align="center">
  <img src="public/exness-qr.png" alt="Exness partner QR" width="160" />
</p>

Landing: [gold.purefxai.store](https://gold.purefxai.store/) · fallback [GitHub Pages](https://purefxaidev.github.io/puregold-whitepaper/)

## Disclaimer / คำเตือน / 风险提示
**TH:** การลงทุนมีความเสี่ยง · ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน  
**EN:** Investing involves risk. Education only. Not financial advice.  
**ZH:** 投资有风险。仅供教育，非投资建议。
