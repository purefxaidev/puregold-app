/** Embedded release notes (offline). Keys: version without leading v. Bodies: th/en/zh (ja falls back to en). */
export const CHANGELOG = [
  {
    version: '0.8.0',
    date: '2026-11-06',
    th: [
      'แก้ PureFxAi โหลดมาๆ หายๆ — ติดตั้งแล้วคงสถานะ พร้อมตรวจ SHA-256 และดาวน์โหลดต่อได้',
      'แชทเสถียรขึ้น — ตอบจากกฎ/ PureFxAi โดยไม่กระตุ้นติดตั้งซ้ำจน UI กะพริบ',
      'แจ้งเตือนป๊อปอัปแบบ SMS (heads-up) สำหรับราคา / สัญญาณ',
      'ย่อเมนูล่างเหลือ หน้าแรก · แผน · แชท · กราฟ · เมนู (เทคนิค/ข่าวอยู่ในเมนู)',
      'เต็มจอสม่ำเสมอ + ปรับความเสถียรรวม',
    ],
    en: [
      'Stable PureFxAi pack — stays installed; SHA-256 verify + resume download',
      'More reliable chat — no install-state flicker while chatting',
      'SMS-style heads-up notifications for price / signals',
      'Simpler bottom nav: Home · Plan · Chat · Chart · More (Techniques/News under More)',
      'Consistent full-screen layout + stability polish',
    ],
    zh: [
      'PureFxAi 安装状态稳定 — 校验 SHA-256，支持断点续传',
      '聊天更稳定 — 不再因安装状态闪烁',
      '短信式抬头通知（价格 / 信号）',
      '底部菜单精简：首页 · 计划 · 聊天 · 图表 · 更多（技法/新闻在更多里）',
      '统一满屏布局 + 稳定性优化',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-11-06',
    th: [
      'แพ็ก PureFxAi บนเครื่องเล็กลง (~0.5 GB) ติดตั้งเร็วขึ้น — แบรนด์ PureFxAi เท่านั้น',
      'ลบ / ถอน PureFxAi ออกจากเครื่องได้จากเมนูแผน เพื่อคืนพื้นที่ แล้วติดตั้งใหม่ได้',
      'UI เต็มจอขึ้น — ลดขอบ/ช่องว่าง แชทและแผนใช้พื้นที่มากขึ้น',
    ],
    en: [
      'Smaller on-device PureFxAi pack (~0.5 GB) — faster install; PureFxAi branding only',
      'Delete / uninstall PureFxAi from the phone (Plan tab) to free storage; reinstall anytime',
      'Fuller-screen UI — less padding/chrome; chat and plan use more of the display',
    ],
    zh: [
      '更小的本机 PureFxAi 包（约 0.5 GB），安装更快；界面仅显示 PureFxAi',
      '可在计划页删除/卸载本机 PureFxAi 以释放空间，之后可重新安装',
      '更满屏界面 — 减少边距，聊天与计划占用更多屏幕',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-11-06',
    th: [
      'แชทบอท PureFxAi ในแอป — พิมพ์คุยได้ พูดทวนคำตอบ (TTS ไทย/อังกฤษ/จีน)',
      'แนะนำแผนเทรดจากกฎ + PureFxAi และสอนสมัคร Exness (ลิงก์ partner ในแอป)',
      'คำเตือนเล็กๆ ในแชทและ README: การลงทุนมีความเสี่ยง / Investing involves risk / 投资有风险',
    ],
    en: [
      'In-app PureFxAi chat bot — type to chat; spoken replies (TTS TH/EN/ZH)',
      'Trading guidance from rules + PureFxAi, plus Exness signup help (in-app partner link)',
      'Small risk disclaimer in chat and README: Investing involves risk',
    ],
    zh: [
      '应用内 PureFxAi 聊天机器人 — 可打字对话，并朗读回复（TTS 泰/英/中）',
      '基于规则 + PureFxAi 的交易指引，以及 Exness 注册引导（应用内合作链接）',
      '聊天与 README 中的小字风险提示：投资有风险',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-06',
    th: [
      'วิเคราะห์แผนด้วย PureFxAi ในเครื่อง (ติดตั้งอัตโนมัติครั้งแรก — แสดง “กำลังติดตั้ง” พร้อมเปอร์เซ็นต์)',
      'เมนูแผนยังใช้กฎเทคนิคเป็นฐาน แล้วเสริมด้วย PureFxAi',
      'ไม่แสดงชื่อโมเดลภายนอกใน UI — ใช้แบรนด์ PureFxAi เท่านั้น',
    ],
    en: [
      'On-device PureFxAi plan analysis (auto-install on first use — “Installing…” with progress %)',
      'Plan tab keeps the rule engine as baseline, enhanced by PureFxAi',
      'No third-party model names in the UI — branded PureFxAi only',
    ],
    zh: [
      '本机 PureFxAi 计划分析（首次自动安装 — 显示“正在安装”与进度百分比）',
      '计划页保留规则引擎为基础，并由 PureFxAi 增强',
      '界面不显示外部模型名称 — 仅使用 PureFxAi 品牌',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-06',
    th: [
      'เมนูแผนแยก — สรุปแผนวันนี้ (เข้า / SL / TP / ระดับสำคัญ) อ่านจบเร็ว',
      'แสดงรายละเอียดอัปเดตแต่ละเวอร์ชันในแอป (ออฟไลน์ + จาก GitHub)',
      'วิดเจ็ตหน้าจอหลัก — ราคาทองไทย (ฮั่วเซ่งเฮง) / XAU + สัญญาณสั้น',
      'หน้าต่างลอยทับแอปอื่น (เช่น MT5) — ราคา + สัญญาณ + แผนย่อ (ต้องอนุญาตแสดงทับแอปอื่น)',
      'ประวัติสัญญาณ Buy/Sell ในเครื่อง พร้อมผลลัพธ์โดยประมาณเทียบราคาภายหลัง',
    ],
    en: [
      'Dedicated Plan tab — today’s plan card (entry / SL / TP / key levels) in ~10 seconds',
      'In-app per-version changelog (offline notes + GitHub release body)',
      'Home-screen widget — Thai HSH gold / XAU + short signal',
      'Floating overlay over other apps (e.g. MT5) — price + signal + tiny plan (needs “Display over other apps” permission)',
      'On-device Buy/Sell signal history with best-effort outcome vs later price',
    ],
    zh: [
      '独立「计划」菜单 — 今日计划卡片（入场 / 止损 / 止盈 / 关键位）快速可读',
      '应用内按版本更新说明（离线 + GitHub）',
      '主屏小组件 — 泰国金 / XAU + 简短信号',
      '悬浮窗覆盖其他应用（如 MT5）— 价格 + 信号 + 简要计划（需「显示在其他应用上层」权限）',
      '本机 Buy/Sell 信号历史，并尽量对照后续价格标记结果',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-11-06',
    th: [
      'UI และคู่มือสมัคร Exness ครบไทย / จีน / อังกฤษ',
      'เมนูวิเคราะห์แยกตามเทคนิค',
      'ตัด DriftWatch Video ออกจากแอป',
    ],
    en: [
      'Full TH / ZH / EN UI and Exness sign-up guide',
      'Techniques analysis menu',
      'Removed DriftWatch Video from the app',
    ],
    zh: [
      '完整泰/中/英界面与 Exness 注册教程',
      '技法分析菜单',
      '从应用中移除 DriftWatch Video',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-11-05',
    th: ['เมนูเทคนิค', 'ปรับแบรนด์ DriftWatch'],
    en: ['Techniques menu', 'DriftWatch branding cleanup'],
    zh: ['技法菜单', '清理 DriftWatch 品牌'],
  },
  {
    version: '0.3.0',
    date: '2026-11-05',
    th: [
      'UI โปรดักชัน + หลายภาษา',
      'SMC Order Block / FVG',
      'จุดเข้า–ออก และแจ้งเตือนราคา',
      'ตรวจอัปเดตจาก GitHub',
    ],
    en: [
      'Production UI + multi-language',
      'SMC Order Blocks & FVG',
      'Entry/exit setup and price alerts',
      'GitHub update check',
    ],
    zh: [
      '生产级界面 + 多语言',
      'SMC 订单块与 FVG',
      '进出场与价格提醒',
      'GitHub 更新检查',
    ],
  },
];

export function notesFor(version, lang) {
  const v = String(version || '').replace(/^v/i, '');
  const row = CHANGELOG.find(x => x.version === v);
  if (!row) return [];
  return row[lang] || row.en || [];
}

export function allVersions() {
  return CHANGELOG.map(x => x.version);
}
