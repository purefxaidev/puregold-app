// Rule-based analysis (adapted from PUREGOLD engine + gold-dashboard SMC).
// Data: Binance PAXGUSDT for OHLC shape only, shifted onto XAUUSD FX spot.
// Displayed price is never raw PAXG. Education only.
import { analyseSmc, smcNote } from './smc.js';
import { buildTechniques } from './techniques.js';
import { resolveSpot } from './spot.js';

const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];

async function gj(u) {
  const r = await fetch(u, { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

async function bn(p) {
  let e;
  for (const h of HOSTS) {
    try { return await gj(h + p); } catch (x) { e = x; }
  }
  throw e;
}

/** Full OHLC bars for charting (time in unix seconds). */
export async function klines(tf, n = 200) {
  const rows = await bn(`/api/v3/klines?symbol=PAXGUSDT&interval=${tf}&limit=${n}`);
  return rows.map(r => ({
    time: Math.floor(r[0] / 1000),
    open: +r[1], high: +r[2], low: +r[3], close: +r[4],
    t: Math.floor(r[0] / 1000), o: +r[1], h: +r[2], l: +r[3], c: +r[4],
  }));
}

const kl = async (tf, n) => (await klines(tf, n)).map(b => ({ t: b.time, o: b.open, h: b.high, l: b.low, c: b.close }));

function ema(a, n) {
  const k = 2 / (n + 1);
  let e = a[0];
  return a.map(x => (e = x * k + e * (1 - k)));
}

function rsi(c, n = 14) {
  let g = 0, l = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i] - c[i - 1], u = Math.max(d, 0), w = Math.max(-d, 0);
    if (i <= n) { g += u / n; l += w / n; }
    else { g = (g * (n - 1) + u) / n; l = (l * (n - 1) + w) / n; }
  }
  return l ? 100 - 100 / (1 + g / l) : 100;
}

function atr(k, n = 14) {
  let a = null;
  for (let i = 1; i < k.length; i++) {
    const tr = Math.max(k[i].h - k[i].l, Math.abs(k[i].h - k[i - 1].c), Math.abs(k[i].l - k[i - 1].c));
    a = a == null ? tr : (a * (n - 1) + tr) / n;
  }
  return a;
}

function piv(k, w = 3) {
  const o = [];
  for (let i = w; i < k.length - w; i++) {
    let H = 1, Lo = 1;
    for (let j = i - w; j <= i + w; j++) {
      if (k[j].h > k[i].h) H = 0;
      if (k[j].l < k[i].l) Lo = 0;
    }
    if (H) o.push(k[i].h);
    if (Lo) o.push(k[i].l);
  }
  return o;
}

function clu(v, tol) {
  const o = [];
  v.sort((a, b) => a - b).forEach(x => {
    const q = o[o.length - 1];
    if (q && Math.abs(x - q[0] / q[1]) <= tol) { q[0] += x; q[1]++; }
    else o.push([x, 1]);
  });
  return o.map(([s, n]) => [s / n, n]);
}

const r2 = x => Math.round(x * 100) / 100;

function forecast(bias, price, res, sup, a15, r1) {
  const dir = bias.dir;
  const conf = Math.min(92, Math.max(40, bias.conf + (Math.abs(r1 - 50) > 15 ? 4 : 0)));
  const sn = dir === 'up' ? 1 : dir === 'down' ? -1 : 0;
  let entryLo, entryHi, invalid;
  if (dir === 'up') {
    entryLo = r2(price - 0.4 * a15);
    entryHi = r2(price + 0.15 * a15);
    invalid = r2(sup[0] ? Math.min(sup[0][0], price - 1.2 * a15) : price - 1.5 * a15);
  } else if (dir === 'down') {
    entryLo = r2(price - 0.15 * a15);
    entryHi = r2(price + 0.4 * a15);
    invalid = r2(res[0] ? Math.max(res[0][0], price + 1.2 * a15) : price + 1.5 * a15);
  } else {
    entryLo = r2(price - 0.5 * a15);
    entryHi = r2(price + 0.5 * a15);
    invalid = r2(price - 1.8 * a15);
  }
  const horizon = {
    th: 'ไม่กี่ชั่วโมงถึงสิ้นเซสชัน', en: 'Next few hours / session',
    zh: '数小时至本交易时段', ja: '数時間〜セッション終了',
  };
  const reasons = bias.reasons.slice(0, 3);
  if (sup[0] && dir === 'up') reasons.push({
    th: `ใกล้แนวรับ ${r2(sup[0][0])} เป็นโซนรับแรง`,
    en: `Near support ${r2(sup[0][0])} as demand zone`,
    zh: `靠近支撑 ${r2(sup[0][0])}`, ja: `サポート ${r2(sup[0][0])} 付近`,
  });
  if (res[0] && dir === 'down') reasons.push({
    th: `ใกล้แนวต้าน ${r2(res[0][0])} เป็นโซนขาย`,
    en: `Near resistance ${r2(res[0][0])} as supply zone`,
    zh: `靠近阻力 ${r2(res[0][0])}`, ja: `レジスタンス ${r2(res[0][0])} 付近`,
  });
  return {
    dir, conf, horizon,
    entry: [entryLo, entryHi],
    invalid,
    target: sn ? r2(price + sn * 1.6 * a15) : null,
    reasons: reasons.slice(0, 3),
  };
}

/** Clear entry/exit recommendation for UI + chart overlays. */
function buildSetup(bias, price, res, sup, a15, plan, fc) {
  const hyp = bias.dir === 'side';
  const side = hyp ? 'WAIT' : plan.side;
  const sn = side === 'BUY' ? 1 : side === 'SELL' ? -1 : 0;
  const entry = [plan.e1, plan.e2];
  const sl = plan.sl;
  const tp = plan.tp;
  let invalid = fc?.invalid;
  if (invalid == null) {
    if (side === 'BUY') invalid = r2(sup[0] ? Math.min(sup[0][0], price - 1.2 * a15) : price - 1.5 * a15);
    else if (side === 'SELL') invalid = r2(res[0] ? Math.max(res[0][0], price + 1.2 * a15) : price + 1.5 * a15);
    else invalid = r2(price - 1.8 * a15);
  }
  return {
    side, hyp,
    entry, entryMid: r2((entry[0] + entry[1]) / 2),
    sl, tp, invalid,
    rr: plan.rr,
    conf: bias.conf,
  };
}

export async function analyze() {
  const [m15, h1, tk] = await Promise.all([
    kl('15m', 300),
    kl('1h', 300),
    bn('/api/v3/ticker/24hr?symbol=PAXGUSDT'),
  ]);
  const px = m15.at(-1).c;
  let spot = null, spotMeta = null;
  try { spotMeta = await resolveSpot(); spot = spotMeta?.price ?? null; } catch (e) {}
  // Never fall back to raw PAXG as the displayed XAUUSD price.
  const basis = spot ? spot - px : 0;
  const price = spot || null;
  if (!price) throw new Error('no_fx_spot');
  const c1 = h1.map(x => x.c), c15 = m15.map(x => x.c);
  const e20 = ema(c1, 20).at(-1), e50 = ema(c1, 50).at(-1);
  const e20m = ema(c15, 20).at(-1), e50m = ema(c15, 50).at(-1);
  const r1 = rsi(c1), a1 = atr(h1), a15 = atr(m15);
  const lv = clu(piv(h1.slice(-200)).concat(piv(m15.slice(-200))), a1 * 0.5)
    .map(([x, n]) => [x + basis, n]);
  const res = lv.filter(x => x[0] > price).sort((a, b) => a[0] - b[0]).slice(0, 3);
  const sup = lv.filter(x => x[0] < price).sort((a, b) => b[0] - a[0]).slice(0, 3);
  let s = 0;
  const R = [];
  const tH = (e20 - e50) / a1;
  s += Math.max(-1, Math.min(1, tH)) * 0.4;
  R.push(tH > 0
    ? { th: 'H1: EMA20 อยู่เหนือ EMA50 แนวโน้มขึ้น', en: 'H1: EMA20 above EMA50, uptrend', zh: 'H1: EMA20高于EMA50，偏多', ja: 'H1: EMA20がEMA50上、上昇傾向' }
    : { th: 'H1: EMA20 อยู่ใต้ EMA50 แนวโน้มลง', en: 'H1: EMA20 below EMA50, downtrend', zh: 'H1: EMA20低于EMA50，偏空', ja: 'H1: EMA20がEMA50下、下落傾向' });
  const tM = (e20m - e50m) / a15;
  s += Math.max(-1, Math.min(1, tM)) * 0.3;
  R.push({
    th: `M15: ${tM > 0 ? 'โมเมนตัมขึ้น' : 'โมเมนตัมลง'}`,
    en: `M15: momentum ${tM > 0 ? 'up' : 'down'}`,
    zh: `M15: 动量${tM > 0 ? '向上' : '向下'}`,
    ja: `M15: モメンタム${tM > 0 ? '上' : '下'}`,
  });
  s += Math.max(-1, Math.min(1, (r1 - 50) / 20)) * 0.3;
  R.push({
    th: `RSI H1 ${r1.toFixed(0)}${r1 > 70 ? ' ซื้อมากเกิน ระวังย่อ' : r1 < 30 ? ' ขายมากเกิน ระวังเด้ง' : ''}`,
    en: `RSI H1 ${r1.toFixed(0)}${r1 > 70 ? ' overbought, watch pullback' : r1 < 30 ? ' oversold, watch bounce' : ''}`,
    zh: `RSI H1 ${r1.toFixed(0)}${r1 > 70 ? ' 超买' : r1 < 30 ? ' 超卖' : ''}`,
    ja: `RSI H1 ${r1.toFixed(0)}${r1 > 70 ? ' 買われすぎ' : r1 < 30 ? ' 売られすぎ' : ''}`,
  });
  const conf = Math.round(Math.min(90, 50 + Math.abs(s) * 45));
  const dir = s > 0.2 ? 'up' : s < -0.2 ? 'down' : 'side';
  const side = s >= 0 ? 'BUY' : 'SELL', sn = side === 'BUY' ? 1 : -1;
  const ref = side === 'BUY' ? sup[0] : res[0];
  let sl = 1.5 * a15;
  if (ref && Math.abs(price - ref[0]) < 2.5 * a15) sl = Math.max(sl, Math.abs(price - ref[0]) + 0.3 * a15);
  sl = Math.min(sl, 3 * a15);
  const bias = { dir, conf, reasons: R };
  const plan = {
    side, hyp: dir === 'side',
    e1: r2(price - sn * 0.25 * a15),
    e2: r2(price),
    sl: r2(price - sn * sl),
    tp: r2(price + sn * sl * 2),
    rr: 2,
  };
  const fc = forecast(bias, price, res, sup, a15, r1);
  const setup = buildSetup(bias, price, res, sup, a15, plan, fc);
  const smc = analyseSmc(h1, basis);
  const techniques = buildTechniques({
    price: r2(price), basis: r2(basis), atr15: a15,
    res, sup, bias, smc, plan, setup,
  }, h1);
  return {
    price: r2(price),
    basis: r2(basis),
    // Dollar change from the FX spot; % from the gold proxy move (not a raw PAXG print).
    ch: r2(price * ((+tk.priceChangePercent || 0) / 100)),
    chp: +tk.priceChangePercent || 0,
    spotSrc: spotMeta?.src || '',
    spotLabelTh: spotMeta?.labelTh || '',
    spotLabelEn: spotMeta?.labelEn || '',
    res, sup, bias,
    atr15: a15,
    plan,
    forecast: fc,
    setup,
    smc,
    smcNote,
    techniques,
  };
}

/** Map Binance candles onto spot (XAU) by adding basis so overlays match UI price. */
export function shiftBars(bars, basis) {
  if (!basis) return bars;
  return bars.map(b => ({
    time: b.time,
    open: r2(b.open + basis),
    high: r2(b.high + basis),
    low: r2(b.low + basis),
    close: r2(b.close + basis),
  }));
}

export { analyseSmc, smcNote };
