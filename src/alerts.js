/** Dashboard S1–S3 / R1–R3 watches and pre-news (USD high-impact) alerts. */
const DASH = 'https://dashboard.purefxai.store';
const LAND = 'https://gold.purefxai.store';
const FF = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const UA = { 'Accept': 'application/json' };

async function getJson(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
      cache: 'no-store', headers: UA, signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('html')) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally { clearTimeout(t); }
}

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function fromDaily(d) {
  if (!d || typeof d !== 'object') return null;
  const out = {};
  for (const k of ['s1', 's2', 's3', 'r1', 'r2', 'r3', 'pp']) {
    const v = num(d[k] ?? d[k.toUpperCase()]);
    if (v != null) out[k.toUpperCase() === 'PP' ? 'PP' : k.toUpperCase()] = v;
  }
  return (out.S1 || out.R1) ? out : null;
}

function fromViewNums(j) {
  const sup = Array.isArray(j.sup_nums) ? j.sup_nums.map(num).filter(x => x != null) : [];
  const res = Array.isArray(j.res_nums) ? j.res_nums.map(num).filter(x => x != null) : [];
  if (!sup.length && !res.length) return null;
  const out = {};
  if (sup[0] != null) out.S1 = sup[0];
  if (sup[1] != null) out.S2 = sup[1];
  if (sup[2] != null) out.S3 = sup[2];
  if (res[0] != null) out.R1 = res[0];
  if (res[1] != null) out.R2 = res[1];
  if (res[2] != null) out.R3 = res[2];
  return out;
}

export async function loadDashLevels() {
  const urls = [
    DASH + '/levels.json',
    LAND + '/assets/levels.json',
    DASH + '/view.json',
  ];
  for (const u of urls) {
    const j = await getJson(u);
    if (!j) continue;
    const lv = fromDaily(j.daily) || fromDaily(j.levels && j.levels.daily) || fromDaily(j) || fromViewNums(j);
    if (lv) return { ...lv, src: u, at: Date.now(), raw: j.daily || j };
  }
  return null;
}

/** Touch band ~ $0.80 or 0.02%. Break = crossed since previous sample. */
export function detectSrHits(spot, prev, levels) {
  if (!levels || !Number.isFinite(spot) || spot <= 0) return [];
  const tol = Math.max(0.8, spot * 0.0002);
  const names = ['R3', 'R2', 'R1', 'S1', 'S2', 'S3'];
  const hits = [];
  for (const name of names) {
    const px = levels[name];
    if (px == null || !Number.isFinite(px)) continue;
    const nowD = spot - px;
    const touched = Math.abs(nowD) <= tol;
    let broke = false;
    if (prev != null && prev > 0 && Math.abs(prev - px) > tol) {
      const prevD = prev - px;
      if (prevD !== 0 && nowD !== 0 && Math.sign(prevD) !== Math.sign(nowD)) broke = true;
    }
    if (touched || broke) {
      const side = name.charAt(0) === 'R' ? 'res' : 'sup';
      hits.push({ name, price: px, kind: broke ? 'break' : 'touch', side });
    }
  }
  return hits;
}

function impactIsHigh(v) {
  const s = String(v || '').toLowerCase();
  return s === 'high' || s === 'high impact' || s === 'red' || s === '3' || s === 'xxx';
}
function isUsd(v) {
  const s = String(v || '').toUpperCase();
  return s === 'USD' || s === 'UNITED STATES' || s === 'US';
}
function parseWhen(ev) {
  const raw = ev.date || ev.datetime || ev.time || ev.at || ev.when || ev.ts || ev.start;
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}
function eventId(ev) {
  if (ev.id || ev.uid) return String(ev.id || ev.uid);
  return (ev.title || ev.event || ev.name || 'ev') + '|' + (ev.date || ev.datetime || ev.time || ev.at || '');
}

function normalizeEvents(payload) {
  let arr = [];
  if (Array.isArray(payload)) arr = payload;
  else if (payload && Array.isArray(payload.events)) arr = payload.events;
  else if (payload && Array.isArray(payload.items)) arr = payload.items;
  else if (payload && Array.isArray(payload.usd_high)) arr = payload.usd_high;
  return arr.map(ev => {
    if (!ev || typeof ev !== 'object') return null;
    const country = ev.country || ev.currency || ev.ccy || ev.cur || ev.fx || ev.unit;
    const impact = ev.impact || ev.importance || ev.level || ev.vol;
    const title = ev.title || ev.event || ev.name || ev.headline || '';
    const at = parseWhen(ev);
    return { id: eventId(ev), title, country, impact, at, usd: isUsd(country), high: impactIsHigh(impact) };
  }).filter(Boolean);
}

export async function loadUsdHighEvents() {
  let j = await getJson(DASH + '/events.json');
  if (!j) j = await getJson(FF);
  const all = normalizeEvents(j);
  return all.filter(e => e.usd && e.high && e.at > 0);
}

/** Events in the next `windowMin` minutes (default ~15). */
export function duePreNews(events, windowMin = 16) {
  const now = Date.now();
  const hi = windowMin * 60 * 1000;
  return (events || []).filter(e => {
    const eta = e.at - now;
    return eta > 0 && eta <= hi;
  });
}

export function formatSrAlert(hit, spot, lang) {
  const n = hit.name, px = hit.price;
  const kind = hit.kind;
  if (lang === 'th') {
    const side = n.charAt(0) === 'R' ? 'แนวต้าน' : 'แนวรับ';
    const act = kind === 'break' ? 'เบรก' : 'แตะ';
    return `XAUUSD ${act}${side} ${n} ที่ ${px.toFixed(1)} · ราคา ${spot.toFixed(1)}`;
  }
  if (lang === 'zh') {
    const side = n.charAt(0) === 'R' ? '阻力' : '支撑';
    const act = kind === 'break' ? '突破' : '触及';
    return `XAUUSD ${act}${side} ${n}（${px.toFixed(1)}）· 现价 ${spot.toFixed(1)}`;
  }
  if (lang === 'ja') {
    const side = n.charAt(0) === 'R' ? 'レジスタンス' : 'サポート';
    const act = kind === 'break' ? 'ブレイク' : 'タッチ';
    return `XAUUSD が${side} ${n}（${px.toFixed(1)}）を${act} · 現在 ${spot.toFixed(1)}`;
  }
  const side = n.charAt(0) === 'R' ? 'resistance' : 'support';
  const act = kind === 'break' ? 'broke' : 'touched';
  return `XAUUSD ${act} ${side} ${n} at ${px.toFixed(1)} · spot ${spot.toFixed(1)}`;
}

export function formatPreNews(ev, lang) {
  const mins = Math.max(1, Math.round((ev.at - Date.now()) / 60000));
  const title = ev.title || 'USD event';
  if (lang === 'th') return `อีก ${mins} นาที · ข่าว USD ผลกระทบสูง: ${title}`;
  if (lang === 'zh') return `${mins} 分钟后 · 高影响美元事件：${title}`;
  if (lang === 'ja') return `あと${mins}分 · 米ドル重要指標: ${title}`;
  return `In ${mins} min · high-impact USD: ${title}`;
}

export async function loadSpdr() {
  const j = await getJson(DASH + '/spdr.json');
  return j && j.tonnes != null ? j : null;
}
