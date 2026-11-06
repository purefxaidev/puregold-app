# Changelog

## 0.9.2 — 2026-11-06
### TH
- ขัด UI แอปให้หรูขึ้น — โทนทอง / glass / glow · การ์ดและตัวอักษรคมขึ้น
- หน้าเว็บ PureGold (landing) อลังการขึ้น พร้อมปุ่มดาวน์โหลด APK 0.9.2
- คงฟีเจอร์เดิมครบ (กราฟ เทคนิค ข่าว PureFxAi แผน แชท วิดเจ็ต หน้าต่างลอย)

### EN
- Premium UI polish — gold / glass / glow · sharper cards and typography
- PureGold landing refreshed with APK 0.9.2 download
- All prior features kept (chart, techniques, news, PureFxAi, plan, chat, widget, overlay)

### ZH
- 高级金色玻璃光晕 UI · 落地页同步 · 保留全部功能

### JA
- ゴールドのガラス/グロウUI磨き · ランディング更新 · 既存機能維持



## 0.9.1 — 2026-11-06
### TH
- การ์ดข่าวแสดงข้อความสะอาด ไม่โชว์โค้ด HTML หรือ `&lt;a href=...`
- ปุ่ม **เปิดข่าว** เปิดลิงก์ต้นทาง (ใช้เบราว์เซอร์ในแอป)
- เมื่อภาษาแอปเป็นไทย/จีน/ญี่ปุ่น แสดงพาดหัวและสรุปสั้นตามภาษา (จากฟีด หรือแปลด้วย PureFxAi ถ้ามีคีย์)
- ตัดโค้ดดาวน์โหลดโมเดลในเครื่องที่ไม่ได้ใช้ — ปุ่มล้างไฟล์เก่ายังใช้ได้

### EN
- News cards no longer print raw or escaped HTML
- Clean **Open link** button for the source article (Capacitor Browser on device)
- Localized headlines + short summaries when the app language is TH/ZH/JA (feed text or PureFxAi + API key)
- Removed unused on-device model download path; leftover-pack cleanup remains

### ZH
- 新闻不再显示原始/转义 HTML · “打开原文”按钮 · 中/泰/日文标题摘要 · 移除本机模型下载

### JA
- ニュースから生HTMLを除去 · 「記事を開く」 · 日/泰/中の見出し · 端末モデルDL処理を削除


## 0.9.0 — 2026-11-06
### TH
- กราฟและเทคนิคอยู่หน้าแรก (กดเต็มหน้าได้) · น้องหมีมาสคอตในแอป
- ดึงข่าวทองล่าสุดหลายแหล่ง (แดชบอร์ด, Google News EN/TH, Yahoo GC=F, Kitco) พร้อมลิงก์ต้นทาง
- PureFxAi วิเคราะห์ข่าวและแสดงผลต่อทอง · แจ้งเตือนข่าวแรง (เคารพช่วงเวลา/ปิดเสียง)
- หน้าต่างลอยอ่านง่ายและอัปเดตราคาตามเวลา · วิดเจ็ตหน้าจอหลัก (กดค้าง → วิดเจ็ต → PUREGOLD)

### EN
- Chart + Techniques on Home (full page still available) · Nong Mee mascot in-app
- Latest gold news from multiple sources (dashboard, Google News EN/TH, Yahoo GC=F, Kitco) with source links
- PureFxAi analyzes headlines for gold impact · strong-news SMS-style alerts (honors interval/mute)
- Floating overlay stays readable and refreshes live · home-screen widget (long-press → Widgets → PUREGOLD)

### ZH
- 首页展示图表与技法 · 吉祥物小熊
- 多源最新黄金新闻（含原文链接）+ PureFxAi 分析 · 强影响新闻通知

### JA
- ホームにチャートと手法 · マスコットくまちゃん
- 複数ソースの最新ニュース（出典リンク付き）+ PureFxAi分析 · 重要ニュース通知

## 0.8.1 — 2026-11-06
### TH
- เมนูข่าวกลับมาที่แถบล่าง (หน้าแรก / แผน / ข่าว / แชท / เมนู) — กราฟย้ายไปในเมนูเพิ่ม
- เสียง PureFxAi เล่นไฟล์คลาวด์ได้จริง (ไม่เงียบแล้วไปใช้เสียงเครื่องโดยไม่บอก)
- แจ้งเตือนเคารพช่วงนาทีที่ตั้งไว้ ไม่เด้งซ้ำถี่ๆ

### EN
- News is a bottom-nav tab again (Home / Plan / News / Chat / More); Chart moved into More
- PureFxAi cloud voice actually plays (raw PCM wrapped as WAV) instead of silently falling back
- Alerts honor the Settings interval and no longer spam the same popup

### ZH
- 新闻重新出现在底部菜单（首页 / 计划 / 新闻 / 聊天 / 更多）；图表移入“更多”
- PureFxAi 云端语音可正常播放（不再悄悄改用系统语音）
- 通知遵守设置中的间隔，不再频繁重复弹出


## 0.8.0 — 2026-11-06
### TH
- PureFxAi ใช้ API key ฟรีในตั้งค่า — ไม่โหลดแพ็กโมเดลในเครื่อง (แก้แฮง)
- แชท + แผนออนไลน์ · เลือกเสียง PureFxAi หลายแบบ
- ประวัติสัญญาณ + % ความแม่นยำ · แจ้งเตือนแบบ SMS
- ย่อเมนู · เต็มจอสม่ำเสมอ · ไอคอน bull/bear ใหม่

### EN
- PureFxAi via free API key (Settings) — no on-device pack
- Online chat/plan · multi voice options · accuracy % · SMS popups
- Simpler nav · fullscreen · new icon

### ZH
- PureFxAi 免费 API 密钥 — 无本机模型包
- 在线聊天/计划 · 多语音 · 准确率% · 短信式通知 · 新图标

## 0.7.0 — 2026-11-06
### TH
- แพ็ก PureFxAi บนเครื่องเล็กลง (~0.5 GB) — ติดตั้งอัตโนมัติ แสดง “กำลังติดตั้ง”
- ลบ PureFxAi ออกจากเครื่องได้ (เมนูแผน) เพื่อคืนพื้นที่
- UI เต็มจอขึ้น ลดขอบว่าง แชท/แผนกว้างขึ้น

### EN
- Smaller on-device PureFxAi pack (~0.5 GB) — auto-install with Installing…
- Delete PureFxAi pack from device (Plan tab) to free storage
- Fuller-screen UI (less padding; larger chat/plan)

### ZH
- 更小的本机 PureFxAi（约 0.5 GB）— 自动安装并显示“正在安装”
- 可在计划页删除本机 PureFxAi 释放空间
- 更满屏界面（减少边距；聊天/计划更大）


## 0.6.0 — 2026-11-06
### TH
- แชทบอท PureFxAi — พิมพ์คุยได้ + เสียงพูด (TTS)
- แนะนำแผนเทรด / สมัคร Exness (ลิงก์ partner)
- คำเตือนเล็กๆ: การลงทุนมีความเสี่ยง

### EN
- PureFxAi in-app chat + spoken replies (TTS)
- Trading guidance + Exness signup help (partner link)
- Small disclaimer: Investing involves risk

### ZH
- PureFxAi 应用内聊天 + 语音朗读
- 交易指引 + Exness 注册引导
- 小字提示：投资有风险


## 0.5.0 — 2026-11-06
### TH
- วิเคราะห์แผนด้วย PureFxAi ในเครื่อง + ติดตั้งอัตโนมัติ (กำลังติดตั้ง + %)
- กฎเทคนิคเป็นฐาน เสริมด้วย PureFxAi — ไม่โชว์ชื่อโมเดลภายนอกใน UI

### EN
- On-device PureFxAi plan analysis with auto-install (Installing… + %)
- Rule engine baseline + PureFxAi enhancement; no third-party model names in UI

### ZH
- 本机 PureFxAi 计划分析，首次自动安装（正在安装 + %）
- 规则引擎为基础并由 PureFxAi 增强；界面不显示外部模型名

## 0.4.0 — 2026-11-06
### TH
- เมนูแผนแยก — สรุปแผนวันนี้ (เข้า / SL / TP / ระดับสำคัญ)
- แสดงรายละเอียดอัปเดตแต่ละเวอร์ชันในแอป
- วิดเจ็ตหน้าจอหลัก — ทองไทย HSH / XAU + สัญญาณสั้น
- หน้าต่างลอยทับแอปอื่น (เช่น MT5) — ต้องอนุญาตแสดงทับแอปอื่น
- ประวัติสัญญาณ Buy/Sell ในเครื่อง + ผลโดยประมาณ

### EN
- Dedicated Plan tab with today’s plan summary card
- In-app per-version changelog (offline + GitHub)
- Home-screen widget (Thai HSH / XAU + short signal)
- Floating overlay over other apps (SYSTEM_ALERT_WINDOW permission)
- On-device Buy/Sell signal history with best-effort outcome

## 0.3.2 — 2026-11-06
- Full TH/ZH/EN UI and Exness guide; techniques menu; remove DriftWatch Video

## 0.3.1 — 2026-11-05
- Techniques menu; DriftWatch branding cleanup

## 0.3.0 — 2026-11-05
- Production UI, multi-lang, SMC OB/FVG, entry/exit, price alerts, GitHub update check