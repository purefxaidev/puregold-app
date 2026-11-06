# PUREGOLD (PureFxAi)

**TH:** แอป Android วิเคราะห์ราคาทองไทย (ฮั่วเซ่งเฮง) และทองโลก XAUUSD พร้อมแชทบอท PureFxAi, เมนูแผน, วิดเจ็ต, หน้าต่างลอย, กราฟ, SMC, แจ้งเตือน และหลายภาษา

**EN:** Android app for Thai gold (Hua Seng Heng) and world gold XAUUSD: PureFxAi chat, Plan tab, widget, overlay, charts, SMC, alerts, multi-language.

**ZH:** 泰国金与国际金（XAUUSD）分析应用：PureFxAi 聊天、计划页、小组件、悬浮窗、图表等。

## Features (0.8.1)
- **PureFxAi** chat + plan analysis via your free API key (Settings) — no on-device model download
- Multiple **PureFxAi voices** (cloud when key present; device TTS fallback) · test-voice button
- Signal history with **accuracy %**, SMS-style heads-up alerts, widget, overlay
- Bottom nav: Home / Plan / News / Chat / More · Techniques + Chart under More
- Alerts honor the interval set in Settings (no spam popups)
- Exness partner signup
- Languages: Thai / English / 中文 / 日本語
- UI never shows third-party model/vendor names — branded PureFxAi only

## API key
Paste a free key from Google AI Studio in **More → Settings**. Stored on-device only (app private storage).

## Build
```
npm i && ./build-apk.sh   # output: dist/PUREGOLD.apk
```
Requires JDK 17 (`/opt/jdk`), Android SDK, release keystore outside the repo.

## Disclaimer / คำเตือน / 风险提示
**TH:** การลงทุนมีความเสี่ยง · ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน  
**EN:** Investing involves risk. Education only. Not financial advice.  
**ZH:** 投资有风险。仅供教育，非投资建议。
