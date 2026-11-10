/** Device persistence via localStorage (+ optional native SharedPreferences sync). */
const KEYS = {
  lang: 'pg_lang',
  set: 'pg_set',
  tf: 'pg_tf',
  tab: 'pg_tab',
  smc: 'pg_smc_on',
  analysis: 'pg_last_analysis',
  thai: 'pg_last_thai',
  levels: 'pg_levels',
  alertHist: 'pg_alert_hist',
  priceAlerts: 'pg_price_alerts',
  newsCache: 'pg_news_cache',
  newsAi: 'pg_news_ai',
  newsAlerted: 'pg_news_alerted',
  newsI18n: 'pg_news_i18n',
  techId: 'pg_tech_id',
  signalHist: 'pg_signal_hist',
  seenVer: 'pg_seen_version',
  lastSignalKey: 'pg_last_signal_key',
  srCooldown: 'pg_sr_cd',
  eventAlerted: 'pg_event_alerted',
  dashLevels: 'pg_dash_levels',
  spdrCache: 'pg_spdr',
};

function read(k, fallback) {
  try {
    const v = localStorage.getItem(k);
    if (v == null) return fallback;
    return JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

export const store = {
  getLang: () => localStorage.getItem(KEYS.lang) || 'th',
  setLang: (L) => localStorage.setItem(KEYS.lang, L),

  getSettings: (def) => Object.assign({}, def, read(KEYS.set, {})),
  setSettings: (S) => write(KEYS.set, S),

  getTf: () => localStorage.getItem(KEYS.tf) || '1h',
  setTf: (tf) => localStorage.setItem(KEYS.tf, tf),

  getTab: () => localStorage.getItem(KEYS.tab) || 'home',
  setTab: (t) => localStorage.setItem(KEYS.tab, t),

  getSmcOn: () => localStorage.getItem(KEYS.smc) !== '0',
  setSmcOn: (on) => localStorage.setItem(KEYS.smc, on ? '1' : '0'),

  saveAnalysis: (A) => {
    if (!A) return;
    const slim = {
      at: Date.now(),
      price: A.price, basis: A.basis, ch: A.ch, chp: A.chp,
      bias: A.bias, plan: A.plan, forecast: A.forecast, setup: A.setup,
      res: A.res, sup: A.sup, atr15: A.atr15,
      smc: A.smc ? {
        order_blocks: A.smc.order_blocks, fvg: A.smc.fvg,
        bos: A.smc.bos, choch: A.smc.choch, zone: A.smc.zone,
        last_event: A.smc.last_event, liquidity: A.smc.liquidity,
      } : null,
      techniques: A.techniques || null,
    };
    write(KEYS.analysis, slim);
    write(KEYS.levels, {
      at: Date.now(),
      res: A.res, sup: A.sup,
      ob: A.smc?.order_blocks || [],
      fvg: A.smc?.fvg || [],
      setup: A.setup,
    });
  },
  loadAnalysis: () => read(KEYS.analysis, null),
  loadLevels: () => read(KEYS.levels, null),

  saveThai: (TG) => write(KEYS.thai, { at: Date.now(), items: TG }),
  loadThai: () => read(KEYS.thai, null),

  pushAlertHist: (item) => {
    const h = read(KEYS.alertHist, []);
    h.unshift({ ...item, at: item.at || Date.now() });
    write(KEYS.alertHist, h.slice(0, 40));
  },
  getAlertHist: () => read(KEYS.alertHist, []),

  getPriceAlerts: () => read(KEYS.priceAlerts, []),
  setPriceAlerts: (list) => write(KEYS.priceAlerts, list),
  addPriceAlert: (price, dir = 'cross') => {
    const list = read(KEYS.priceAlerts, []);
    const id = 'pa_' + Date.now().toString(36);
    list.push({ id, price: +price, dir, active: true, created: Date.now(), hitAt: null });
    write(KEYS.priceAlerts, list);
    return list;
  },
  removePriceAlert: (id) => {
    const list = read(KEYS.priceAlerts, []).filter(x => x.id !== id);
    write(KEYS.priceAlerts, list);
    return list;
  },
  markPriceAlertHit: (id) => {
    const list = read(KEYS.priceAlerts, []).map(x =>
      x.id === id ? { ...x, hitAt: Date.now(), active: false } : x);
    write(KEYS.priceAlerts, list);
    return list;
  },

  saveNews: (payload) => {
    if (Array.isArray(payload)) write(KEYS.newsCache, { at: Date.now(), items: payload });
    else write(KEYS.newsCache, payload);
  },
  loadNews: () => read(KEYS.newsCache, null),

  saveNewsAi: (obj) => write(KEYS.newsAi, obj),
  loadNewsAi: () => read(KEYS.newsAi, null),

  getNewsI18n: () => read(KEYS.newsI18n, {}),
  saveNewsI18n: (obj) => {
    const src = obj || {};
    const keys = Object.keys(src);
    const trimmed = keys.length > 240
      ? Object.fromEntries(keys.slice(-240).map(k => [k, src[k]]))
      : src;
    write(KEYS.newsI18n, trimmed);
  },

  wasNewsAlerted: (id) => read(KEYS.newsAlerted, []).includes(id),
  markNewsAlerted: (ids) => {
    const h = read(KEYS.newsAlerted, []);
    (ids || []).forEach(id => { if (id && !h.includes(id)) h.unshift(id); });
    write(KEYS.newsAlerted, h.slice(0, 160));
  },

  getTechId: () => localStorage.getItem(KEYS.techId) || 'smc',
  setTechId: (id) => localStorage.setItem(KEYS.techId, id),

  getSeenVersion: () => localStorage.getItem(KEYS.seenVer) || '',
  setSeenVersion: (v) => localStorage.setItem(KEYS.seenVer, v),

  /** Record BUY/SELL setups; skip WAIT and duplicates within same side+rounded entry. */
  recordSignal: (A) => {
    if (!A?.setup) return null;
    const S = A.setup;
    if (S.side !== 'BUY' && S.side !== 'SELL') return null;
    const entryMid = S.entry ? (S.entry[0] + S.entry[1]) / 2 : S.e1;
    const key = `${S.side}_${Math.round(entryMid)}_${Math.round(S.sl)}_${Math.round(S.tp)}`;
    if (localStorage.getItem(KEYS.lastSignalKey) === key) return null;
    localStorage.setItem(KEYS.lastSignalKey, key);
    const item = {
      id: 'sg_' + Date.now().toString(36),
      at: Date.now(),
      side: S.side,
      entry: S.entry ? [...S.entry] : [S.e1, S.e2],
      sl: S.sl,
      tp: S.tp,
      invalid: S.invalid,
      conf: S.conf,
      priceAt: A.price,
      outcome: null,
      outcomeAt: null,
      outcomePx: null,
    };
    const h = read(KEYS.signalHist, []);
    h.unshift(item);
    write(KEYS.signalHist, h.slice(0, 80));
    return item;
  },
  getSignalHist: () => read(KEYS.signalHist, []),
  /** Best-effort: mark open signals vs current price (hit TP / SL / or MFE after 30m). */
  updateSignalOutcomes: (price) => {
    if (!price) return;
    const h = read(KEYS.signalHist, []);
    let changed = false;
    const now = Date.now();
    h.forEach(s => {
      if (s.outcome) return;
      const age = now - s.at;
      if (age < 5 * 60 * 1000) return; // wait 5 min
      const buy = s.side === 'BUY';
      if (buy) {
        if (price <= s.sl) { s.outcome = 'sl'; s.outcomePx = price; s.outcomeAt = now; changed = true; }
        else if (price >= s.tp) { s.outcome = 'tp'; s.outcomePx = price; s.outcomeAt = now; changed = true; }
        else if (age > 6 * 60 * 60 * 1000) {
          const mid = (s.entry[0] + s.entry[1]) / 2;
          s.outcome = price > mid ? 'up' : price < mid ? 'dn' : 'flat';
          s.outcomePx = price; s.outcomeAt = now; changed = true;
        }
      } else {
        if (price >= s.sl) { s.outcome = 'sl'; s.outcomePx = price; s.outcomeAt = now; changed = true; }
        else if (price <= s.tp) { s.outcome = 'tp'; s.outcomePx = price; s.outcomeAt = now; changed = true; }
        else if (age > 6 * 60 * 60 * 1000) {
          const mid = (s.entry[0] + s.entry[1]) / 2;
          s.outcome = price < mid ? 'up' : price > mid ? 'dn' : 'flat';
          s.outcomePx = price; s.outcomeAt = now; changed = true;
        }
      }
    });
    if (changed) write(KEYS.signalHist, h);
  },
  clearSignalHist: () => write(KEYS.signalHist, []),

  /** Win rate from closed signals: TP/up = win, SL/dn = loss. */
  signalAccuracy: () => {
    const h = read(KEYS.signalHist, []);
    let wins = 0, losses = 0;
    h.forEach(s => {
      if (s.outcome === 'tp' || s.outcome === 'up') wins++;
      else if (s.outcome === 'sl' || s.outcome === 'dn') losses++;
    });
    const closed = wins + losses;
    return {
      wins, losses, closed, open: h.filter(s => !s.outcome || s.outcome === 'flat').length,
      total: h.length,
      pct: closed > 0 ? Math.round((wins / closed) * 1000) / 10 : null,
    };
  },

  saveDashLevels: (lv) => write(KEYS.dashLevels, lv),
  loadDashLevels: () => read(KEYS.dashLevels, null),
  srCooldownOk: (name, ms) => {
    const m = read(KEYS.srCooldown, {}) || {};
    const last = +m[name] || 0;
    return Date.now() - last >= ms;
  },
  markSrAlert: (name) => {
    const m = read(KEYS.srCooldown, {}) || {};
    m[name] = Date.now();
    write(KEYS.srCooldown, m);
  },
  wasEventAlerted: (id) => read(KEYS.eventAlerted, []).includes(id),
  markEventAlerted: (id) => {
    const h = read(KEYS.eventAlerted, []);
    if (!h.includes(id)) h.push(id);
    write(KEYS.eventAlerted, h.slice(-200));
  },
  saveSpdr: (j) => write(KEYS.spdrCache, { at: Date.now(), data: j }),
  loadSpdr: () => read(KEYS.spdrCache, null),
};

