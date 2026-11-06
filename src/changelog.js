/** Embedded release notes (offline). Keys: version without leading v. Bodies: th/en/zh (ja falls back to en). */
export const CHANGELOG = [
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
