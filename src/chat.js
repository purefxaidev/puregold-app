/**
 * PUREGOLD in-app chat bot (PureFxAi).
 * Rule intents for plan / Exness signup / risk; optional PureFxAi (cloud API key) for free-form.
 * Never expose underlying model names.
 */
import { EXNESS_REF } from './signup.js';
import { isMarkedReady, chatWithPureFxAi, ruleNarrative } from './ondevice.js';

const RISK = {
  th: 'คำเตือน: การลงทุนมีความเสี่ยง คุณอาจขาดทุนได้ทั้งหมด — เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน',
  en: 'Disclaimer: Investing involves risk. You can lose all capital — education only, not advice.',
  zh: '提示：投资有风险，可能导致本金全部亏损 — 仅供教育，非投资建议',
  ja: '注意：投資にはリスクがあり元本を失う可能性があります — 教育目的であり助言ではありません',
};

const RISK_SHORT = {
  th: 'การลงทุนมีความเสี่ยง',
  en: 'Investing involves risk',
  zh: '投资有风险',
  ja: '投資にはリスクがあります',
};

export function riskShort(lang) {
  return RISK_SHORT[lang] || RISK_SHORT.en;
}

export function riskLine(lang) {
  return RISK[lang] || RISK.en;
}

function f2(x) {
  if (x == null || Number.isNaN(+x)) return '-';
  return Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stripModelNames(s) {
  return String(s || '')
    .replace(/\bQwen[\w.\-]*/gi, 'PureFxAi')
    .replace(/\bGGUF\b/gi, '')
    .replace(/\b2B\b/g, '').replace(/\b0\.8B\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Quick chips shown under the composer. */
export function quickPrompts(lang) {
  if (lang === 'th') {
    return [
      { id: 'plan', label: 'แผนวันนี้' },
      { id: 'trade', label: 'แนะนำการเทรด' },
      { id: 'signup', label: 'สมัคร Exness' },
      { id: 'risk', label: 'ความเสี่ยง' },
    ];
  }
  if (lang === 'zh') {
    return [
      { id: 'plan', label: '今日计划' },
      { id: 'trade', label: '交易建议' },
      { id: 'signup', label: '注册 Exness' },
      { id: 'risk', label: '风险提示' },
    ];
  }
  return [
    { id: 'plan', label: "Today's plan" },
    { id: 'trade', label: 'Trading tips' },
    { id: 'signup', label: 'Exness signup' },
    { id: 'risk', label: 'Risk warning' },
  ];
}

export function welcomeMessage(lang) {
  if (lang === 'th') {
    return (
      'สวัสดีครับ ผม PureFxAi ผู้ช่วยในแอป PUREGOLD\n' +
      'ถามได้เลย เช่น แผนวันนี้ แนะนำการเทรด หรือวิธีสมัคร Exness\n' +
      'พิมพ์ข้อความได้ — มีปุ่มเสียงพูดทวนคำตอบได้\n\n' +
      riskLine('th')
    );
  }
  if (lang === 'zh') {
    return (
      '你好，我是 PureFxAi，PUREGOLD 应用内助手。\n' +
      '可问今日计划、交易指引或 Exness 注册步骤。\n' +
      '支持打字聊天，并可朗读回复。\n\n' +
      riskLine('zh')
    );
  }
  return (
    'Hi — I am PureFxAi, your in-app assistant in PUREGOLD.\n' +
    'Ask about today’s plan, trading guidance, or Exness signup.\n' +
    'Type freely; replies can be spoken aloud.\n\n' +
    riskLine('en')
  );
}

function detectIntent(text) {
  const s = String(text || '').toLowerCase().trim();
  if (!s) return 'empty';
  if (/^(plan|แผน|计划|今日|today'?s?\s*plan|แผนวันนี้|今日计划)$/i.test(s.trim()) ||
      /(แผนวันนี้|today'?s plan|今日计划|แผนเทรด|trading plan|setup|entry|sl|tp)/i.test(s)) {
    return 'plan';
  }
  if (/(สมัคร|sign\s*up|signup|register|exness|เปิดบัญชี|注册|开户|partner|ib)/i.test(s)) {
    return 'signup';
  }
  if (/(เสี่ยง|risk|disclaimer|คำเตือน|风险|warn)/i.test(s)) {
    return 'risk';
  }
  if (/(เทรด|trade|how to trade|แนะนำการเทรด|交易|scalp|lot|risk manage|บริหารความเสี่ยง)/i.test(s)) {
    return 'trade';
  }
  if (/(สวัสดี|hello|hi\b|hey|你好|帮帮)/i.test(s)) {
    return 'hello';
  }
  if (/(ช่วย|help|ทำอะไรได้|what can|菜单|menu)/i.test(s)) {
    return 'help';
  }
  return 'free';
}

function replyPlan(A, lang) {
  if (!A?.setup) {
    if (lang === 'th') return 'ยังไม่มีแผน — กดรีเฟรชที่หน้าแรก หรือเปิดแท็บแผนก่อน แล้วถามอีกครั้งครับ';
    if (lang === 'zh') return '暂无计划 — 请先在首页刷新或打开「计划」页后再问。';
    return 'No plan yet — refresh Home or open the Plan tab, then ask again.';
  }
  const S = A.setup;
  const b = A.bias || {};
  const side =
    S.side === 'BUY'
      ? lang === 'th' ? 'รับซื้อ' : lang === 'zh' ? '买入' : 'BUY'
      : S.side === 'SELL'
        ? lang === 'th' ? 'ขายออก' : lang === 'zh' ? '卖出' : 'SELL'
        : lang === 'th' ? 'รอ' : lang === 'zh' ? '观望' : 'WAIT';
  const bias =
    b.dir === 'up'
      ? lang === 'th' ? 'ขาขึ้น' : lang === 'zh' ? '上涨' : 'Up'
      : b.dir === 'down'
        ? lang === 'th' ? 'ขาลง' : lang === 'zh' ? '下跌' : 'Down'
        : lang === 'th' ? 'ไซด์เวย์' : lang === 'zh' ? '震荡' : 'Sideways';

  if (lang === 'th') {
    return [
      `PureFxAi · แผนวันนี้ (จากกฎเทคนิคในเครื่อง)`,
      `ราคา XAU ≈ $${f2(A.price)} · มุมมอง ${bias} (${b.conf ?? '?'}%)`,
      `ฝั่ง: ${side} · ความมั่นใจ ${S.conf ?? '?'}%`,
      `โซนเข้า: ${f2(S.entry?.[0])} – ${f2(S.entry?.[1])}`,
      `SL ${f2(S.sl)} · TP ${f2(S.tp)} · R:R 1:${S.rr ?? '-'}`,
      S.hyp ? 'สัญญาณยังไม่ชัด — ใช้เป็นสมมติฐาน รอยืนยันก่อนเปิดไม้' : 'มีสัญญาณจากกฎ — ยังต้องยืนยันด้วยตัวเอง',
      '',
      riskLine('th'),
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      `PureFxAi · 今日计划（本机规则）`,
      `XAU ≈ $${f2(A.price)} · 偏向 ${bias}（${b.conf ?? '?'}%）`,
      `方向：${side} · 信心 ${S.conf ?? '?'}%`,
      `入场：${f2(S.entry?.[0])} – ${f2(S.entry?.[1])}`,
      `止损 ${f2(S.sl)} · 止盈 ${f2(S.tp)} · 盈亏比 1:${S.rr ?? '-'}`,
      S.hyp ? '信号尚不明 — 视为假设，确认后再开仓' : '规则有信号 — 仍需自行确认',
      '',
      riskLine('zh'),
    ].join('\n');
  }
  return [
    `PureFxAi · Today's plan (on-device rules)`,
    `XAU ≈ $${f2(A.price)} · Bias ${bias} (${b.conf ?? '?'}%)`,
    `Side: ${side} · Conf ${S.conf ?? '?'}%`,
    `Entry: ${f2(S.entry?.[0])} – ${f2(S.entry?.[1])}`,
    `SL ${f2(S.sl)} · TP ${f2(S.tp)} · R:R 1:${S.rr ?? '-'}`,
    S.hyp ? 'No clear signal — hypothetical; wait for confirmation' : 'Rule signal present — still confirm yourself',
    '',
    riskLine('en'),
  ].join('\n');
}

function replyTrade(A, lang) {
  const plan = replyPlan(A, lang);
  if (lang === 'th') {
    return [
      'แนะนำการเทรด (การศึกษา):',
      '1) ดูแท็บแผน + การ์ดวันนี้ ก่อนเปิดไม้',
      '2) เสี่ยงไม่เกิน 1–2% ต่อไม้ · ตั้ง SL/TP ทุกครั้ง',
      '3) ล็อตเล็ก (เช่น 0.01) โดยเฉพาะมือใหม่ / บัญชี Cent',
      '4) เลี่ยงเปิดไม้ช่วงข่าวแรง (CPI, NFP, FOMC) 15–30 นาที',
      '5) ใช้แท็บเทคนิค / PureFxAi ประกอบ — ไม่ใช่คำสั่งซื้อขายอัตโนมัติ',
      '',
      plan,
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      '交易指引（教育用途）：',
      '1) 开仓前先看「计划」页与今日卡片',
      '2) 单笔风险不超过 1–2% · 每笔必须设止损/止盈',
      '3) 新手用小手数（如 0.01）或美分账户',
      '4) 重大数据前后 15–30 分钟避免新开仓',
      '5) 结合技法页 / PureFxAi — 非自动下单',
      '',
      plan,
    ].join('\n');
  }
  return [
    'Trading guidance (educational):',
    '1) Read the Plan tab + today’s card before any trade',
    '2) Risk ≤1–2% per trade · always set SL/TP',
    '3) Small size (e.g. 0.01), especially on Cent/Demo first',
    '4) Avoid new trades 15–30 min around major news',
    '5) Use Techniques / PureFxAi as context — not auto-execution',
    '',
    plan,
  ].join('\n');
}

function replySignup(lang) {
  if (lang === 'th') {
    return [
      'สมัคร Exness ผ่านลิงก์ partner ของ PureFxAi:',
      EXNESS_REF,
      '',
      'ขั้นตอนสั้นๆ:',
      '1) กดปุ่ม “เปิดคู่มือสมัคร” ในแชทหรือเมนู → สอนทีละขั้นในแอป',
      '2) หรือเปิดลิงก์ด้านบน → ลงทะเบียนด้วยอีเมลจริง',
      '3) ยืนยันอีเมล/เบอร์ → KYC → ลอง Demo ก่อนฝากจริง',
      '4) หา XAUUSD แล้วตั้ง SL/TP ทุกไม้',
      '',
      'ลิงก์นี้เป็นลิงก์แนะนำ (IB) — อาจมีค่าตอบแทนให้ผู้จัดทำ โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับคุณ',
      riskLine('th'),
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      '通过 PureFxAi 合作链接注册 Exness：',
      EXNESS_REF,
      '',
      '简要步骤：',
      '1) 点聊天里的“打开注册教程”或菜单中的分步教程',
      '2) 或打开上方链接，用真实邮箱注册',
      '3) 验证邮箱/手机 → KYC → 先用模拟盘',
      '4) 搜索 XAUUSD，每笔设置止损/止盈',
      '',
      '此为合作推荐链接（IB），作者可能获得佣金，您无需额外付费',
      riskLine('zh'),
    ].join('\n');
  }
  return [
    'Sign up for Exness via the PureFxAi partner link:',
    EXNESS_REF,
    '',
    'Short steps:',
    '1) Tap “Open signup guide” in chat or More → in-app tutorial',
    '2) Or open the link above and register with a real email',
    '3) Verify email/phone → KYC → practise on Demo first',
    '4) Find XAUUSD and always set SL/TP',
    '',
    'This is a partner (IB) referral link — the author may earn a commission at no extra cost to you',
    riskLine('en'),
  ].join('\n');
}

function replyHelp(lang) {
  if (lang === 'th') {
    return [
      'PureFxAi ช่วยได้:',
      '• แผนวันนี้ / จุดเข้า SL TP',
      '• แนะนำการเทรดแบบการศึกษา',
      '• สอนสมัคร Exness + ลิงก์ partner',
      '• คำเตือนความเสี่ยง',
      'พิมพ์คำถาม หรือกดปุ่มลัดด้านล่างได้เลย',
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      'PureFxAi 可以：',
      '• 今日计划 / 入场 止损 止盈',
      '• 教育向交易指引',
      '• Exness 注册教程 + 合作链接',
      '• 风险提示',
      '直接输入，或点下方快捷按钮',
    ].join('\n');
  }
  return [
    'PureFxAi can help with:',
    '• Today’s plan / entry SL TP',
    '• Educational trading guidance',
    '• Exness signup tutorial + partner link',
    '• Risk disclaimer',
    'Type a question or tap a quick chip below',
  ].join('\n');
}

function replyHello(lang) {
  return welcomeMessage(lang);
}

/**
 * @param {string} userText
 * @param {{lang:string, analysis:any, preferModel?:boolean}} ctx
 * @returns {Promise<{text:string, actions?:Array<{id:string,label:string}>, source:string}>}
 */
export async function replyTo(userText, ctx) {
  const lang = ctx.lang || 'en';
  const A = ctx.analysis;
  const intent = detectIntent(userText);

  const signupActions = () => {
    if (lang === 'th') {
      return [
        { id: 'openSignup', label: 'เปิดคู่มือสมัคร' },
        { id: 'openExness', label: 'เปิดลิงก์ Exness' },
      ];
    }
    if (lang === 'zh') {
      return [
        { id: 'openSignup', label: '打开注册教程' },
        { id: 'openExness', label: '打开 Exness 链接' },
      ];
    }
    return [
      { id: 'openSignup', label: 'Open signup guide' },
      { id: 'openExness', label: 'Open Exness link' },
    ];
  };

  if (intent === 'empty') {
    return { text: replyHelp(lang), source: 'rules' };
  }
  if (intent === 'hello') {
    return { text: replyHello(lang), source: 'rules' };
  }
  if (intent === 'help') {
    return { text: replyHelp(lang), source: 'rules' };
  }
  if (intent === 'risk') {
    return { text: riskLine(lang) + '\n\n' + (lang === 'th'
      ? 'ทอง/CFD มีเลเวอเรจ ขาดทุนได้เร็ว ใช้เฉพาะเงินที่เสียได้ และตัดสินใจด้วยตนเอง'
      : lang === 'zh'
        ? '黄金/CFD 有杠杆，可能快速亏损。只用可承受损失的资金，自行决策。'
        : 'Gold/CFDs are leveraged and can lose money quickly. Only risk capital you can afford to lose.'), source: 'rules' };
  }
  if (intent === 'signup') {
    return { text: replySignup(lang), actions: signupActions(), source: 'rules' };
  }
  if (intent === 'plan') {
    // Prefer installed PureFxAi narrative when available (no re-download from chat)
    if (isMarkedReady() && A) {
      try {
        const r = await chatWithPureFxAi(
          lang === 'th' ? 'สรุปแผนวันนี้' : lang === 'zh' ? '总结今日计划' : "Summarize today's plan",
          A,
          lang
        );
        const base = stripModelNames(r.text || ruleNarrative(A, lang));
        return { text: base + '\n\n' + riskShort(lang), source: r.source || 'model' };
      } catch {
        /* fall through */
      }
    }
    return { text: replyPlan(A, lang), source: 'rules' };
  }
  if (intent === 'trade') {
    return { text: replyTrade(A, lang), actions: signupActions(), source: 'rules' };
  }

  // Free-form: use PureFxAi only if pack already installed (never trigger install from chat)
  if (isMarkedReady() && A) {
    try {
      const r = await chatWithPureFxAi(userText, A, lang);
      const body = stripModelNames(r.text || ruleNarrative(A, lang));
      return {
        text: body + '\n\n' + riskShort(lang),
        source: r.source || 'model',
        actions: /exness|สมัคร|注册|signup|sign up/i.test(userText) ? signupActions() : undefined,
      };
    } catch {
      /* fall through */
    }
  }

  // No cloud key / offline: map free text toward plan + help
  const fallback =
    lang === 'th'
      ? `รับทราบ: “${String(userText).slice(0, 80)}”\n\n` +
        replyPlan(A, lang) +
        '\n\nพิมพ์ “สมัคร Exness” หรือ “แนะนำการเทรด” ได้เลย หรือใส่ API key ที่เมนู→ตั้งค่า เพื่อ PureFxAi เต็มรูปแบบ'
      : lang === 'zh'
        ? `已收到：“${String(userText).slice(0, 80)}”\n\n` +
          replyPlan(A, lang) +
          '\n\n可输入“注册 Exness”或“交易建议”；或在「更多→设置」添加 API 密钥以启用完整 PureFxAi'
        : `Got it: “${String(userText).slice(0, 80)}”\n\n` +
          replyPlan(A, lang) +
          '\n\nTry “Exness signup” or “trading tips”, or add an API key in More → Settings for full PureFxAi';

  return {
    text: fallback,
    source: 'rules',
    actions: /exness|สมัคร|注册|signup/i.test(userText) ? signupActions() : undefined,
  };
}
