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

export function entryZoneLabel(side, lang) {
  const s = String(side || 'wait').toLowerCase();
  const th = lang !== 'en';
  if (s === 'buy') return th ? 'โซนซื้อ · BUY' : 'Buy zone · BUY';
  if (s === 'sell') return th ? 'โซนขาย · SELL' : 'Sell zone · SELL';
  return th ? 'รอ · WAIT' : 'Wait · WAIT';
}

export function fmtPlanRange(z) {
  if (!z || z.low == null || z.high == null) return "—";
  const a = Number(z.low), b = Number(z.high);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  const f = n => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return f(Math.min(a, b)) + "–" + f(Math.max(a, b));
}
export function aiActivity(plan, px) {
  const hm = new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
  const empty = { id: "scan", th: "กำลังสแกนโครงสร้าง H1/H4", en: "Scanning H1/H4 structure", next_th: "รอโครงสร้างหรือโซนที่ชัดขึ้น", next_en: "Waiting for a clearer structure or zone", checked_hm: hm };
  if (!plan) return empty;
  const st = planStatus(plan, px);
  const live = Number(px);
  const side = plan.side || "wait";
  const lo = Number(plan.entry_low != null ? plan.entry_low : plan.entry);
  const hi = Number(plan.entry_high != null ? plan.entry_high : plan.entry);
  const sl = Number(plan.sl);
  const tp1 = plan.tps && plan.tps[0] ? Number(plan.tps[0].price) : NaN;
  const trig = plan.trigger_zone;
  const demand = plan.demand_zone, supply = plan.supply_zone;
  const watchZ = trig === "demand" ? demand : trig === "supply" ? supply : (Number.isFinite(lo) && Number.isFinite(hi) ? { low: Math.min(lo, hi), high: Math.max(lo, hi) } : null);
  const watchName = trig === "demand" ? "Demand Zone" : trig === "supply" ? "Supply Zone" : "โซนเข้า";
  const watchNameEn = trig === "demand" ? "Demand Zone" : trig === "supply" ? "Supply Zone" : "the entry zone";
  const mid = watchZ ? (Number(watchZ.low) + Number(watchZ.high)) / 2 : NaN;
  const gap = Number.isFinite(live) && Number.isFinite(mid) ? Math.abs(live - mid) : null;
  const inWatch = watchZ && Number.isFinite(live) && live >= Number(watchZ.low) && live <= Number(watchZ.high);
  const act = side === "buy" ? "BUY" : side === "sell" ? "SELL" : "WAIT";
  const fmtN = n => Number(n).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (st.id === "sl" || st.id === "cancelled") {
    const whyTh = st.id === "sl" ? ("โดน SL ที่ " + fmtN(sl)) : (plan.invalidation_th || st.th);
    const whyEn = st.id === "sl" ? ("the stop was hit at " + fmtN(sl)) : (plan.invalidation_en || st.en);
    return { id: st.id, th: "แผนยกเลิกเพราะ" + whyTh, en: "Plan cancelled because " + whyEn, next_th: "รอแผนใหม่จากโครงสร้างล่าสุด", next_en: "Wait for a new plan from the latest structure", checked_hm: hm };
  }
  if (st.id === "tp1") {
    const n2 = plan.tps && plan.tps[1] ? fmtN(plan.tps[1].price) : null;
    return { id: "manage", th: "TP1 ถึงแล้ว เลื่อน SL มาจุดเข้า", en: "TP1 reached — move the stop to entry", next_th: n2 ? ("ถือส่วนที่เหลือไป TP2 " + n2) : "จัดการออเดอร์ที่เหลือตามแผน", next_en: n2 ? ("Hold the remainder toward TP2 " + n2) : "Manage the remaining position as planned", checked_hm: hm };
  }
  if (st.id === "in") {
    const traveledOk = (() => {
      if (!inWatch || !Number.isFinite(tp1) || !Number.isFinite(mid)) return true;
      const traveled = side === "sell" ? (mid - live) : (live - mid);
      const path = side === "sell" ? (mid - tp1) : (tp1 - mid);
      return !(path > 0 && traveled < 0.25 * path);
    })();
    if (!traveledOk) {
      return { id: "confirm", th: "รอแท่ง H1 ปิดยืนยัน", en: "Waiting for the H1 candle to close as confirmation", next_th: "ถ้าแท่งชั่วโมงปิดในโซน จึงพิจารณาเข้า " + act, next_en: "If the hourly candle closes in the zone, then consider " + act, checked_hm: hm };
    }
    const toTp = Number.isFinite(tp1) ? fmtN(Math.abs(live - tp1)) : "—";
    const toSl = Number.isFinite(sl) ? fmtN(Math.abs(live - sl)) : "—";
    return { id: "in", th: "สัญญาณ " + act + " ทำงานแล้ว ถืออยู่ ห่าง TP1 " + toTp + " จุด / SL " + toSl + " จุด", en: act + " is active — " + toTp + " pts to TP1 / " + toSl + " pts to the stop", next_th: "ถ้าถึง TP1 ให้ปิดบางส่วนแล้วเลื่อน SL มาจุดเข้า", next_en: "If TP1 is reached, close a portion and move the stop to entry", checked_hm: hm };
  }
  if (watchZ && Number.isFinite(gap)) {
    return { id: "watch", th: "เฝ้าราคาเข้า " + watchName + " " + fmtPlanRange(watchZ) + " (ห่าง " + fmtN(gap) + " จุด)", en: "Watching for " + watchNameEn + " " + fmtPlanRange(watchZ) + " (" + fmtN(gap) + " pts away)", next_th: "รอราคาเข้าโซน แล้วค่อยพิจารณา " + (act === "WAIT" ? "ตามสัญญาณ" : act), next_en: "Wait for price to enter the zone, then consider " + (act === "WAIT" ? "the signal" : act), checked_hm: hm };
  }
  return empty;
}
export function planGuideHtml(plan, px, lang, esc, opts) {
  if (!plan) return "";
  esc = esc || (s => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"));
  const th = lang !== "en";
  const compact = opts && opts.compact;
  const demand = plan.demand_zone, supply = plan.supply_zone;
  const act = aiActivity(plan, px);
  const conf = plan.confidence || {};
  const why = th ? (plan.why_th || plan.thesis_th || "") : (plan.why_en || plan.thesis_en || "");
  const trigger = th ? (plan.trigger_th || "") : (plan.trigger_en || "");
  const steps = (th ? plan.steps_th : plan.steps_en) || [];
  const pos = plan.position;
  const revs = plan.reversal || [];
  const aiBox = `<div class="tp-ai" data-ai="${esc(act.id)}">
    <div class="tp-ai-k">${th ? "AI กำลังทำอะไรอยู่" : "What the AI is doing"}</div>
    <div class="tp-ai-v">${esc(th ? act.th : act.en)}</div>
    <div class="tp-ai-next">${th ? "ขั้นถัดไป" : "Next"}: ${esc(th ? act.next_th : act.next_en)} · ${th ? "เช็กล่าสุด" : "Last check"} ${esc(act.checked_hm)}</div>
  </div>`;
  const zones = `<div class="tp-ds">
    <div class="tp-ds-item demand"><span class="k">Demand Zone</span><span class="v">${esc(fmtPlanRange(demand))}</span>${demand && demand.source_th ? `<small>${esc(th ? demand.source_th : (demand.source_en || ""))}</small>` : ""}</div>
    <div class="tp-ds-item supply"><span class="k">Supply Zone</span><span class="v">${esc(fmtPlanRange(supply))}</span>${supply && supply.source_th ? `<small>${esc(th ? supply.source_th : (supply.source_en || ""))}</small>` : ""}</div>
  </div>`;
  if (compact) {
    return zones + (trigger ? `<p class="tp-trigger">${esc(trigger)}</p>` : "") + aiBox + (conf.text_th ? `<p class="tp-conf">${th ? "ความมั่นใจ" : "Confidence"} ${esc(th ? conf.text_th : conf.text_en)}</p>` : "");
  }
  const stepOl = steps.length ? `<ol class="tp-steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
  let lots = "";
  if (pos && Array.isArray(pos.rows) && pos.rows.length && plan.sl != null) {
    const rows = pos.rows.filter(r => r.risk_pct === 1 || r.risk_pct === 2);
    lots = `<table class="tp-lots"><caption>${th ? "ตัวอย่างขนาดล็อต (ความเสี่ยง 1–2%)" : "Example lot size (1–2% risk)"}</caption>
      <thead><tr><th>${th ? "ทุน (บาท)" : "Capital (THB)"}</th><th>1%</th><th>2%</th></tr></thead><tbody>` +
      [10000, 50000, 100000].map(cap => {
        const a = rows.find(r => r.capital_thb === cap && r.risk_pct === 1);
        const b = rows.find(r => r.capital_thb === cap && r.risk_pct === 2);
        const f = r => r && r.lots != null ? String(r.lots) : "—";
        return `<tr><td>${cap.toLocaleString("en-US")}</td><td>${f(a)}</td><td>${f(b)}</td></tr>`;
      }).join("") + `</tbody></table>` +
      (pos.note_th ? `<p class="tp-lots-note">${esc(th ? pos.note_th : pos.note_en)}</p>` : "");
  }
  const rev = revs.length ? `<div class="tp-rev"><span class="k">${th ? "จุดกลับตัว" : "Reversal"}</span>${revs.map(r => `<div>${esc(th ? r.label_th : r.label_en)}</div>`).join("")}</div>` : "";
  const confLine = conf.text_th ? `<p class="tp-conf">${th ? "ความมั่นใจ" : "Confidence"} ${esc(th ? conf.text_th : conf.text_en)}${conf.note_th ? ` — <small>${esc(th ? conf.note_th : conf.note_en)}</small>` : ""}</p>` : "";
  return zones +
    (trigger ? `<p class="tp-trigger">${esc(trigger)}</p>` : "") +
    (why ? `<p class="tp-why">${esc(why)}</p>` : "") +
    aiBox + stepOl + lots + rev + confLine;
}
export function formatPlanAlert(plan, px, lang) {
  const th = lang !== "en";
  const act = aiActivity(plan, px);
  const st = planStatus(plan, px);
  const lines = [];
  lines.push(th ? (plan.trigger_th || entryZoneLabel(plan.side, "th")) : (plan.trigger_en || entryZoneLabel(plan.side, "en")));
  lines.push((th ? "Demand Zone " : "Demand Zone ") + fmtPlanRange(plan.demand_zone));
  lines.push((th ? "Supply Zone " : "Supply Zone ") + fmtPlanRange(plan.supply_zone));
  if (plan.entry_low != null) lines.push((th ? "เข้า " : "Entry ") + fmtPlanRange({ low: plan.entry_low, high: plan.entry_high }));
  else if (plan.entry != null) lines.push((th ? "เข้า " : "Entry ") + Number(plan.entry).toFixed(1));
  if (plan.sl != null) lines.push("SL " + Number(plan.sl).toFixed(1));
  (plan.tps || []).forEach(tp => lines.push("TP" + tp.n + " " + Number(tp.price).toFixed(1) + (tp.rr != null ? " (" + tp.rr + "R)" : "")));
  (plan.reversal || []).slice(0, 2).forEach(r => lines.push(th ? r.label_th : r.label_en));
  if (plan.confidence) lines.push((th ? "ความมั่นใจ " : "Confidence ") + (th ? plan.confidence.text_th : plan.confidence.text_en));
  lines.push((th ? act.th : act.en) + " · " + (th ? "เช็กล่าสุด " : "Last check ") + act.checked_hm);
  const full = lines.filter(Boolean).join("\n");
  const short = (th ? act.th : act.en) + (plan.trigger_th ? " · " + (th ? plan.trigger_th : plan.trigger_en) : "") + (Number.isFinite(Number(px)) ? " · $" + Number(px).toFixed(1) : "");
  return { full, short, activityId: act.id, statusId: st.id };
}

export function zoneHint(plan, price, lang) {
  if (!plan || !Number.isFinite(Number(price))) return '';
  const p = Number(price);
  const near = (z) => z && z.low != null && p >= Number(z.low) - 8 && p <= Number(z.high) + 8;
  if (near(plan.demand_zone)) return ' · Demand Zone ' + fmtPlanRange(plan.demand_zone);
  if (near(plan.supply_zone)) return ' · Supply Zone ' + fmtPlanRange(plan.supply_zone);
  return '';
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
  const sideLab = entryZoneLabel(side, useTh ? 'th' : 'en');
  const stLab = useTh ? st.th : st.en;
  const asof = useTh ? (plan.updated_th || '') : (plan.updated_en || '');
  const live = Number.isFinite(Number(px))
    ? (useTh ? 'ราคาสด ' : 'Live ') + '$' + Number(px).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  const entryK = entryZoneLabel(side, useTh ? 'th' : 'en');
  return `<div class="tp-head">
      <div class="tp-title">${title}</div>
      <span class="tp-side ${esc(side)}">${esc(sideLab)}</span>
      <span class="tp-status ${esc(st.id)}">${esc(stLab)}</span>
    </div>
    ${thesis ? `<p class="tp-thesis">${esc(thesis)}</p>` : ''}
    <div class="tp-grid">
      <div class="tp-zone-cell ${esc(side)}"><span class="k">${esc(entryK)}</span><span class="v">${esc(entry)}</span></div>
      <div><span class="k">SL</span><span class="v">${plan.sl != null ? fmtPlanPx(plan.sl) : '—'}</span></div>
      ${tps}
    </div>
    ${inv ? `<p class="tp-inv">${esc(inv)}</p>` : ''}
    ${planGuideHtml(plan, px, lang, esc)}
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
