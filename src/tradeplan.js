/** Official desk trade plan (trade_plan.json) + live status vs the mid. */

const URLS = [
  'https://dashboard.purefxai.store/trade_plan.json',
  'https://gold.purefxai.store/data/trade_plan.json',
  'https://gold.purefxai.store/assets/trade_plan.json',
];

export function fmtPlanPx(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function planStatus(plan, px) {
  const live = Number(px);
  if (!plan) return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
  const side = plan.side || 'wait';
  const lo = Number(plan.entry_low != null ? plan.entry_low : plan.entry);
  const hi = Number(plan.entry_high != null ? plan.entry_high : plan.entry);
  const sl = Number(plan.sl);
  const tp1 = plan.tps && plan.tps[0] ? Number(plan.tps[0].price) : NaN;
  const inv = plan.invalidation != null ? Number(plan.invalidation) : sl;
  if (!Number.isFinite(live)) return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
  if (side === 'wait') {
    if (Number.isFinite(inv) && ((plan.bias === 'down' && live >= inv) || (plan.bias === 'up' && live <= inv))) {
      return { id: 'cancelled', th: 'ยกเลิก', en: 'Invalidated' };
    }
    return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
  }
  const approach = plan.approach || (side === 'sell' ? 'from_above' : 'from_below');
  const inZone = Number.isFinite(lo) && Number.isFinite(hi) && live >= Math.min(lo, hi) && live <= Math.max(lo, hi);
  if (side === 'sell') {
    if (Number.isFinite(sl) && live >= sl) return { id: 'sl', th: 'โดน SL', en: 'Stop hit' };
    if (Number.isFinite(inv) && live >= inv) return { id: 'cancelled', th: 'ยกเลิก', en: 'Invalidated' };
    const waiting = (approach === 'from_below' && !inZone && live < lo) || (approach === 'from_above' && !inZone && live > hi);
    if (waiting) return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
    if (Number.isFinite(tp1) && live <= tp1) return { id: 'tp1', th: 'ชน TP1', en: 'TP1 hit' };
    return { id: 'in', th: 'เข้าแล้ว', en: 'In trade' };
  }
  if (side === 'buy') {
    if (Number.isFinite(sl) && live <= sl) return { id: 'sl', th: 'โดน SL', en: 'Stop hit' };
    if (Number.isFinite(inv) && live <= inv) return { id: 'cancelled', th: 'ยกเลิก', en: 'Invalidated' };
    const waiting = (approach === 'from_above' && !inZone && live > hi) || (approach === 'from_below' && !inZone && live < lo);
    if (waiting) return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
    if (Number.isFinite(tp1) && live >= tp1) return { id: 'tp1', th: 'ชน TP1', en: 'TP1 hit' };
    return { id: 'in', th: 'เข้าแล้ว', en: 'In trade' };
  }
  return { id: 'wait', th: 'รอเข้า', en: 'Waiting' };
}

export function liveBiasFromLevels(px, lv) {
  if (!lv || !Number.isFinite(px)) return null;
  const pp = Number(lv.PP ?? lv.pp);
  const s1 = Number(lv.S1 ?? lv.s1);
  const r1 = Number(lv.R1 ?? lv.r1);
  if (![pp, s1, r1].some(Number.isFinite)) return null;
  let dir = 'side', th = 'ใกล้จุดพิวอต', en = 'Near the pivot';
  if (Number.isFinite(r1) && px > r1) { dir = 'up'; th = 'เอียงขึ้นเหนือ R1'; en = 'Bias up above R1'; }
  else if (Number.isFinite(pp) && px > pp + 1) { dir = 'up'; th = 'เอียงขึ้นเหนือจุดพิวอต'; en = 'Bias up above the pivot'; }
  else if (Number.isFinite(s1) && px < s1) { dir = 'down'; th = 'เอียงลงต่ำกว่า S1'; en = 'Bias down below S1'; }
  else if (Number.isFinite(pp) && px < pp - 1) { dir = 'down'; th = 'เอียงลงต่ำกว่าจุดพิวอต'; en = 'Bias down below the pivot'; }
  else { th = 'ราคายืนในกรอบ S1–R1'; en = 'Price is holding inside the S1–R1 range'; }
  return { dir, th, en, pp, s1, r1 };
}

export function tradePlanHtml(plan, px, lang, esc) {
  if (!plan) return '';
  const th = lang === 'th' || lang === 'zh' || lang === 'ja' ? lang === 'th' : false;
  const useTh = lang !== 'en';
  const st = planStatus(plan, px);
  const side = plan.side || 'wait';
  const entry = (plan.entry_low != null && plan.entry_high != null)
    ? (fmtPlanPx(plan.entry_low) + ' – ' + fmtPlanPx(plan.entry_high))
    : fmtPlanPx(plan.entry);
  const tps = (plan.tps || []).map(tp => {
    const lab = useTh ? (tp.label || '') : (tp.label_en || tp.label || '');
    const rr = tp.rr != null ? ` <small>${esc(String(tp.rr))}R</small>` : '';
    return `<div><span class="k">TP${esc(String(tp.n))}${lab ? ' ' + esc(lab) : ''}</span><span class="v">${fmtPlanPx(tp.price)}${rr}</span></div>`;
  }).join('');
  const thesis = useTh ? (plan.thesis_th || plan.title_th || '') : (plan.thesis_en || plan.title_en || '');
  const inv = useTh ? (plan.invalidation_th || '') : (plan.invalidation_en || '');
  const tf = useTh ? (plan.timeframe_th || plan.timeframe || '') : (plan.timeframe_en || plan.timeframe || '');
  const disc = useTh
    ? (plan.disclaimer_th || 'เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน ใช้ SL เสมอ')
    : (plan.disclaimer_en || 'Education only — not investment advice. Always use a stop loss.');
  const title = useTh ? 'แผนเทรด' : 'Trade plan';
  const sideLab = useTh ? (plan.side_th || 'รอ') : (plan.side_en || 'WAIT');
  const stLab = useTh ? st.th : st.en;
  const asof = useTh ? (plan.updated_th || '') : (plan.updated_en || '');
  const live = Number.isFinite(Number(px))
    ? (useTh ? 'ราคาสด ' : 'Live ') + '$' + Number(px).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  const entryK = useTh ? 'จุดเข้า' : 'Entry';
  return `<div class="tp-head">
      <div class="tp-title">${title}</div>
      <span class="tp-side ${esc(side)}">${esc(sideLab)}</span>
      <span class="tp-status ${esc(st.id)}">${esc(stLab)}</span>
    </div>
    ${thesis ? `<p class="tp-thesis">${esc(thesis)}</p>` : ''}
    <div class="tp-grid">
      <div><span class="k">${entryK}</span><span class="v">${esc(entry)}</span></div>
      <div><span class="k">SL</span><span class="v">${plan.sl != null ? fmtPlanPx(plan.sl) : '—'}</span></div>
      ${tps}
    </div>
    ${inv ? `<p class="tp-inv">${esc(inv)}</p>` : ''}
    <p class="tp-meta">${esc(tf)}${tf && live ? ' · ' : ''}${esc(live)}</p>
    ${asof ? `<p class="tp-asof">${esc(asof)}</p>` : ''}
    <p class="tp-disc">${esc(disc)}</p>`;
}

export async function fetchTradePlan() {
  for (const base of URLS) {
    try {
      const r = await fetch(base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      if (!r || !r.ok) continue;
      const j = await r.json();
      if (j && (j.side || j.entry)) return j;
    } catch (e) {}
  }
  return null;
}
