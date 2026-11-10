/**
 * XAUUSD FX spot for PUREGOLD.
 * Primary: Swissquote public BBO mid. Fallback: dashboard spot.json,
 * then gold-api.com. Movement-adjusted live tick uses gold-api change
 * since the Swissquote snapshot. Never treat PAXG/XAUT as XAUUSD.
 */
const SQ_URL = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
const GOLDAPI_URL = 'https://api.gold-api.com/price/XAU';
const DASH = 'https://dashboard.purefxai.store';

const DESK_LS = 'pg_dash_desk';
const SPOT_LS = 'pg_dash_spot';

async function gj(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`http_${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseSwissquote(data) {
  const mids = [];
  let bid = null, ask = null, ts = null;
  for (const block of data || []) {
    if (!ts && block?.ts) ts = block.ts;
    for (const p of block?.spreadProfilePrices || []) {
      const b = Number(p.bid), a = Number(p.ask);
      if (a >= b && b > 0) {
        mids.push((b + a) / 2);
        if (p.spreadProfile === 'elite' || p.spreadProfile === 'prime' || bid == null) {
          bid = b;
          ask = a;
        }
      }
    }
  }
  if (!mids.length) return null;
  return {
    price: Math.round((mids.reduce((s, x) => s + x, 0) / mids.length) * 1000) / 1000,
    bid, ask, ts,
    src: 'swissquote',
  };
}

function ageMin(iso) {
  if (!iso) return 9999;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / 60000 : 9999;
}

export async function fetchLiveSwissquote() {
  const data = await gj(SQ_URL);
  const q = parseSwissquote(data);
  if (!q) throw new Error('swissquote');
  return q;
}

export async function fetchGoldApi() {
  const j = await gj(GOLDAPI_URL);
  const price = num(j?.price);
  if (!price) throw new Error('gold-api');
  return { price, updatedAt: j.updatedAt || null, src: 'gold-api' };
}

export async function fetchDashSpot() {
  const j = await gj(`${DASH}/spot.json?t=${Date.now()}`);
  if (!j || !num(j.price)) throw new Error('dash-spot');
  try { localStorage.setItem(SPOT_LS, JSON.stringify(j)); } catch {}
  return j;
}

function cachedSpot() {
  try {
    const j = JSON.parse(localStorage.getItem(SPOT_LS) || 'null');
    return j && num(j.price) ? j : null;
  } catch { return null; }
}

/**
 * Resolve the displayed XAUUSD FX mid.
 * Mirrors gold-dashboard pollPrice() plus a live Swissquote probe.
 */
export async function resolveSpot() {
  const tasks = [
    fetchLiveSwissquote().catch(() => null),
    fetchGoldApi().catch(() => null),
    fetchDashSpot().catch(() => cachedSpot()),
  ];
  const [liveSq, ga, snap] = await Promise.all(tasks);

  const sqPx = num(liveSq?.price) || num(snap?.price);
  const gaPx = num(ga?.price);
  const gaSnap = (snap?.sources || []).find(s => s && s.name === 'gold-api' && s.ok && num(s.price));
  const basis = (gaSnap && num(snap?.price)) ? (Number(gaSnap.price) - Number(snap.price)) : null;
  const fresh = snap && num(snap.price) && !snap.stale && ageMin(snap.fetched_at || snap.updated_utc) <= 45;

  let price = null, src = 'fx', labelTh = '', labelEn = '';

  // Estimate current FX mid: Swissquote snapshot + gold-api movement since that snapshot.
  const est = (fresh && gaPx && basis != null) ? (gaPx - basis) : null;
  if (num(liveSq?.price)) {
    price = liveSq.price;
    src = 'swissquote';
    labelTh = 'สปอต FX · Swissquote';
    labelEn = 'FX spot · Swissquote';
  } else if (est && est > 0 && sqPx && Math.abs(est - sqPx) < 25) {
    price = Math.round(est * 100) / 100;
    src = 'fx-live';
    labelTh = 'สปอต FX · สด';
    labelEn = 'FX spot · live';
  }

  if (!price && num(snap?.price)) {
    price = Number(snap.price);
    src = snap.src || 'swissquote';
    labelTh = snap.src_label_th || 'สปอต FX · Swissquote';
    labelEn = snap.src_label_en || 'FX spot · Swissquote';
  }

  if (!price && gaPx) {
    price = gaPx;
    src = 'gold-api';
    labelTh = 'สปอต · gold-api.com';
    labelEn = 'Spot · gold-api.com';
  }

  if (!price) return null;
  return {
    price: Math.round(price * 100) / 100,
    src,
    labelTh,
    labelEn,
    bid: liveSq?.bid ?? snap?.bid ?? null,
    ask: liveSq?.ask ?? snap?.ask ?? null,
    at: Date.now(),
    snap,
  };
}


function firstNum(s) {
  const m = String(s ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Same EV model as gold-dashboard/build.py (RR, EV, decision, risk_free). */
export function enrichDesk(d) {
  if (!d || typeof d !== 'object') return d;
  const out = { ...d };
  if (out.price_num == null) {
    const n = firstNum(out.price);
    if (n) out.price_num = n;
  }
  if (!Array.isArray(out.res_nums) || !out.res_nums.length) {
    out.res_nums = (out.resistance || []).map(firstNum).filter(x => x != null);
  }
  if (!Array.isArray(out.sup_nums) || !out.sup_nums.length) {
    out.sup_nums = (out.support || []).map(firstNum).filter(x => x != null);
  }
  out.ev_plans = (out.ev_plans || []).map(enrichPlan);
  return out;
}

function enrichPlan(p) {
  if (!p) return p;
  const entry = Number(p.entry), sl = Number(p.sl), tp = Number(p.tp);
  if (![entry, sl, tp].every(Number.isFinite)) return p;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const buy = String(p.side || '').toLowerCase() === 'buy';
  const tiny = Math.max(0.5, 0.05 * reward);
  if ((buy && sl >= entry - tiny) || (!buy && sl <= entry + tiny)) {
    return { ...p, rr: null, ev: null, breakeven: null, risk_free: true, decision: p.decision || 'ถือ' };
  }
  if (p.decision && p.rr != null && p.ev != null) return p;
  const rr = risk ? reward / risk : 0;
  const pw = Number(p.p_win) || 0;
  const ev = pw * rr - (1 - pw);
  return {
    ...p,
    rr: Math.round(rr * 100) / 100,
    ev: Math.round(ev * 100) / 100,
    breakeven: rr ? Math.round((1 / (1 + rr)) * 1000) / 1000 : 1,
    decision: ev > 0 ? 'เข้า' : 'รอ',
  };
}

export async function fetchDashDesk() {
  let desk = null;
  for (const path of ['view.json', 'data.json']) {
    try {
      const j = await gj(`${DASH}/${path}?t=${Date.now()}`, 20000);
      if (j && (j.ev_plans || j.price_num || j.accuracy)) { desk = j; break; }
    } catch {}
  }
  let acc = desk?.accuracy || null;
  try {
    const a = await gj(`${DASH}/history/accuracy.json?t=${Date.now()}`);
    if (a && (a.acc_7d != null || a.acc_30d != null)) acc = { ...(acc || {}), ...a };
  } catch {}
  if (desk) {
    desk = enrichDesk(desk);
    if (acc) desk.accuracy = acc;
    try { localStorage.setItem(DESK_LS, JSON.stringify({ at: Date.now(), desk })); } catch {}
    return desk;
  }
  try {
    const cached = JSON.parse(localStorage.getItem(DESK_LS) || 'null');
    return cached?.desk ? enrichDesk(cached.desk) : null;
  } catch { return null; }
}

export function readCachedDesk() {
  try {
    const d = JSON.parse(localStorage.getItem(DESK_LS) || 'null')?.desk || null;
    return d ? enrichDesk(d) : null;
  } catch { return null; }
}
