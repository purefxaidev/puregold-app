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

  saveNews: (items) => write(KEYS.newsCache, { at: Date.now(), items }),
  loadNews: () => read(KEYS.newsCache, null),
};
