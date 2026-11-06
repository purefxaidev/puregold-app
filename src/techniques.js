/** Per-technique world-gold (XAU) analysis — rule-based, educational, no model names. */
const r2 = x => Math.round(x * 100) / 100;

function L(lang, map) {
  return map[lang] || map.en || '';
}

function classicPivots(bars, basis = 0) {
  if (!bars || bars.length < 2) return null;
  const prev = bars[bars.length - 2];
  const H = prev.h + basis, Lo = prev.l + basis, C = prev.c + basis;
  const P = (H + Lo + C) / 3;
  return {
    P: r2(P),
    R1: r2(2 * P - Lo), R2: r2(P + (H - Lo)), R3: r2(H + 2 * (P - Lo)),
    S1: r2(2 * P - H), S2: r2(P - (H - Lo)), S3: r2(Lo - 2 * (H - P)),
  };
}

function fibFromSwing(bars, basis = 0) {
  if (!bars || bars.length < 20) return null;
  const seg = bars.slice(-80).map(b => ({ h: b.h + basis, l: b.l + basis, c: b.c + basis }));
  let hi = -Infinity, lo = Infinity, hiI = 0, loI = 0;
  seg.forEach((b, i) => {
    if (b.h >= hi) { hi = b.h; hiI = i; }
    if (b.l <= lo) { lo = b.l; loI = i; }
  });
  const up = hiI > loI; // bounce from low to high
  const range = hi - lo;
  if (range < 1e-6) return null;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(r => ({
    r,
    price: r2(up ? hi - range * r : lo + range * r),
  }));
  return { swingHigh: r2(hi), swingLow: r2(lo), direction: up ? 'retracement_down' : 'retracement_up', levels };
}

function sessionInfo(now = new Date()) {
  // Approximate FX sessions in UTC hours
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  let id = 'asia';
  if (h >= 7 && h < 12) id = 'london';
  else if (h >= 12 && h < 16) id = 'overlap';
  else if (h >= 16 && h < 21) id = 'ny';
  else if (h >= 21 || h < 0.5) id = 'thin';
  return { id, utcHour: Math.floor(h) };
}

/**
 * Build technique cards from analyze() context.
 * @param {{price,basis,atr15,res,sup,bias,smc,plan,setup}} A
 * @param {Array} h1Bars raw or OHLC with h,l,c (pre-basis)
 */
export function buildTechniques(A, h1Bars = null) {
  if (!A) return null;
  const price = A.price;
  const basis = A.basis || 0;
  const piv = classicPivots(h1Bars, basis);
  const fib = fibFromSwing(h1Bars, basis);
  const sess = sessionInfo();
  const near = (lv) => lv != null ? r2(lv - price) : null;

  // Pivot bias vs price
  let pivotBias = 'side';
  if (piv) {
    if (price > piv.R1) pivotBias = 'up';
    else if (price < piv.S1) pivotBias = 'down';
    else if (price >= piv.P) pivotBias = 'up';
    else pivotBias = 'down';
  }

  // Fib nearest level
  let fibNear = null;
  if (fib) {
    fibNear = fib.levels.slice().sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))[0];
  }

  return {
    smc: {
      id: 'smc',
      dir: A.smc?.last_event?.includes('bull') ? 'up' : A.smc?.last_event?.includes('bear') ? 'down' : A.bias?.dir || 'side',
      conf: A.bias?.conf || 50,
      zone: A.smc?.zone || null,
      ob: (A.smc?.order_blocks || []).filter(o => !o.mitigated).slice(0, 3),
      fvg: (A.smc?.fvg || []).slice(0, 3),
      bos: A.smc?.bos || null,
      choch: A.smc?.choch || null,
      last_event: A.smc?.last_event || null,
    },
    sr: {
      id: 'sr',
      dir: A.bias?.dir || 'side',
      conf: A.bias?.conf || 50,
      res: (A.res || []).slice(0, 3),
      sup: (A.sup || []).slice(0, 3),
      nearestSup: A.sup?.[0] || null,
      nearestRes: A.res?.[0] || null,
      distSup: A.sup?.[0] ? near(A.sup[0][0]) : null,
      distRes: A.res?.[0] ? near(A.res[0][0]) : null,
    },
    pivot: {
      id: 'pivot',
      dir: pivotBias,
      conf: piv ? 55 : 0,
      levels: piv,
      vsP: piv ? near(piv.P) : null,
    },
    trend: {
      id: 'trend',
      dir: A.bias?.dir || 'side',
      conf: A.bias?.conf || 50,
      reasons: A.bias?.reasons || [],
      setup: A.setup || null,
    },
    fib: {
      id: 'fib',
      dir: fib ? (fib.direction === 'retracement_up' ? 'up' : 'down') : 'side',
      conf: fib ? 52 : 0,
      swingHigh: fib?.swingHigh,
      swingLow: fib?.swingLow,
      levels: fib?.levels || [],
      nearest: fibNear,
    },
    session: {
      id: 'session',
      dir: A.bias?.dir || 'side',
      conf: 45,
      session: sess.id,
      utcHour: sess.utcHour,
      noteKey: sess.id,
    },
    price,
  };
}

export const TECH_IDS = ['smc', 'sr', 'pivot', 'trend', 'fib', 'session'];

export function techTitle(id, lang) {
  const map = {
    smc: { en: 'Smart Money (OB / FVG)', th: 'Smart Money (OB / FVG)', zh: 'Smart Money (订单块/FVG)', ja: 'Smart Money (OB/FVG)' },
    sr: { en: 'Support / Resistance', th: 'แนวรับ / แนวต้าน', zh: '支撑 / 阻力', ja: 'サポート / レジスタンス' },
    pivot: { en: 'Pivot Points', th: 'จุด Pivot', zh: '枢轴点', ja: 'ピボット' },
    trend: { en: 'Trend / Multi-TF', th: 'เทรนด์ / หลายไทม์เฟรม', zh: '趋势 / 多周期', ja: 'トレンド / 複数足' },
    fib: { en: 'Fibonacci', th: 'ฟีโบนัชชี', zh: '斐波那契', ja: 'フィボナッチ' },
    session: { en: 'Session (world)', th: 'เซสชันทั่วโลก', zh: '交易时段', ja: 'セッション' },
  };
  return L(lang, map[id] || { en: id });
}

export function sessionLabel(id, lang) {
  const map = {
    asia: { en: 'Asia session', th: 'เซสชันเอเชีย', zh: '亚洲时段', ja: 'アジア時間' },
    london: { en: 'London session', th: 'เซสชันลอนดอน', zh: '伦敦时段', ja: 'ロンドン時間' },
    overlap: { en: 'London–NY overlap', th: 'ช่วงซ้อนลอนดอน–นิวยอร์ก', zh: '伦敦–纽约重叠', ja: 'ロンドン–NY重複' },
    ny: { en: 'New York session', th: 'เซสชันนิวยอร์ก', zh: '纽约时段', ja: 'ニューヨーク時間' },
    thin: { en: 'Thin / late hours', th: 'ช่วงสภาพคล่องต่ำ', zh: '流动性偏低', ja: '薄商い' },
  };
  return L(lang, map[id] || map.asia);
}

export function sessionHint(id, lang) {
  const map = {
    asia: {
      en: 'Often range-bound for XAU; watch Asia highs/lows as liquidity.',
      th: 'ทองมักไซด์เวย์ในเอเชีย ใช้ไฮ/โลว์เอเชียเป็นโซนสภาพคล่อง',
      zh: '亚盘黄金常震荡，留意亚盘高低点作流动性。',
      ja: 'アジア時間はレンジになりやすい。高安を流動性として意識。',
    },
    london: {
      en: 'Volatility often expands; breaks of Asia range are common.',
      th: 'ความผันผวนมักเพิ่ม เบรกกรอบเอเชียบ่อย',
      zh: '波动常放大，突破亚盘区间较常见。',
      ja: 'ボラ拡大しやすい。アジアレンジのブレイクに注意。',
    },
    overlap: {
      en: 'Highest liquidity window — stronger moves possible.',
      th: 'สภาพคล่องสูงสุด อาจเกิดแรงเคลื่อนแรง',
      zh: '流动性最高，可能出现更强走势。',
      ja: '流動性が最も高い時間帯。大きな動きが出やすい。',
    },
    ny: {
      en: 'US data / risk tone can dominate; fade late-session spikes carefully.',
      th: 'ข้อมูลสหรัฐ/ความเสี่ยงตลาดมีผล ระวังสไปก์ท้ายเซสชัน',
      zh: '美国数据与风险情绪主导，慎追尾盘尖刺。',
      ja: '米指標・リスク選好が支配。終盤の急騰急落に注意。',
    },
    thin: {
      en: 'Spreads can widen; prefer waiting for a clearer session.',
      th: 'สเปรดอาจกว้าง ควรรอเซสชันที่ชัดกว่า',
      zh: '点差可能扩大，宁可等待更清晰的时段。',
      ja: 'スプレッドが広がりやすい。明確な時間帯を待つ方が無難。',
    },
  };
  return L(lang, map[id] || map.asia);
}
