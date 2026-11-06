/** Latest gold news: dashboard JSON + live public RSS. CORS-friendly fallbacks. */
const DASHBOARD = 'https://purefxaidev.github.io/gold-dashboard/news.json';
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const NEWS_SOURCES = [
  {
    id: 'dashboard',
    name: 'PUREGOLD feed',
    type: 'json',
    url: DASHBOARD,
  },
  {
    id: 'gn-en',
    name: 'Google News',
    type: 'rss',
    lang: 'en',
    url: 'https://news.google.com/rss/search?q=gold+price+OR+XAUUSD&hl=en-US&gl=US&ceid=US:en',
  },
  {
    id: 'gn-th',
    name: 'Google News',
    type: 'rss',
    lang: 'th',
    url: 'https://news.google.com/rss/search?q=%E0%B8%97%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B3+OR+%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%97%E0%B8%AD%E0%B8%87&hl=th&gl=TH&ceid=TH:th',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    type: 'rss',
    lang: 'en',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US',
  },
  {
    id: 'kitco',
    name: 'Kitco',
    type: 'rss',
    lang: 'en',
    url: 'https://news.google.com/rss/search?q=site:kitco.com+gold&hl=en-US&gl=US&ceid=US:en',
    note: 'Official Kitco category RSS currently serves HTML; Google News Kitco gold search is the live CORS-reachable feed.',
  },
];

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashId(s) {
  let h = 2166136261;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function parseTime(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v < 1e12 ? v * 1000 : v;
  }
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

const UP = /\b(surge|surges|soar|soars|rally|rallies|jumps?|climb|gains?|record high|safe[- ]haven|bullish|rises?|rose|hits high)\b|พุ่ง|ทะยาน|ทำสถิติ|หนุนราคา|ขาขึ้น/;
const DN = /\b(slump|tumble|tumbles|falls?|fell|drops?|slides?|plunge|sell[- ]off|bearish|sinks?|declines?)\b|ร่วง|ดิ่ง|กดดัน|ขาลง|หลุด/;
const HI = /\b(fed|fomc|war|crisis|sanction|rate hike|rate cut|emergency|record|hormuz|invasion|cpi|nfp)\b|เฟด|สงคราม|วิกฤต|ฮอร์มุซ|ขึ้นดอกเบี้ย|ลดดอกเบี้ย/;

export function guessImpact(title, summary = '') {
  const t = `${title || ''} ${summary || ''}`;
  const up = UP.test(t);
  const dn = DN.test(t);
  if (up && !dn) return 'bullish';
  if (dn && !up) return 'bearish';
  return 'neutral';
}

export function guessLevel(title, summary = '') {
  return HI.test(`${title || ''} ${summary || ''}`) ? 'high' : 'medium';
}

function normalizeTitle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f\u4e00-\u9fff]+/g, ' ').trim();
}

function mapDashboardItem(it) {
  return {
    id: it.id || it.key || ('dash_' + hashId(it.url || it.title_en || it.title_th)),
    impact: it.impact || 'neutral',
    level: it.level || 'medium',
    title_th: it.title_th || '',
    title_en: it.title_en || '',
    title_zh: it.title_zh || it.title_cn || '',
    title_ja: it.title_ja || '',
    summary_th: it.summary_th || (Array.isArray(it.article_th) ? it.article_th[0] : ''),
    summary_en: it.summary_en || (Array.isArray(it.article_en) ? it.article_en[0] : ''),
    summary_zh: it.summary_zh || it.summary_cn || '',
    summary_ja: it.summary_ja || '',
    url: it.url || it.publisher_url || it.gn_url || '',
    source: it.source || 'PUREGOLD feed',
    published: it.published || it.published_ts || it.added || '',
    published_ts: parseTime(it.published_ts || it.published || it.added),
    image: it.image || '',
    origin: 'dashboard',
  };
}

function mapRssItem(it, src) {
  const title = stripHtml(it.title || '');
  const summary = stripHtml(it.description || it.content || it.summary || '').slice(0, 400);
  const url = it.link || it.url || it.guid || '';
  const srcName = it.source || src.name;
  const published = it.pubDate || it.published || it.isoDate || '';
  const impact = guessImpact(title, summary);
  const item = {
    id: (src.id + '_' + hashId(url || title)),
    impact,
    level: guessLevel(title, summary),
    title_th: src.lang === 'th' ? title : '',
    title_en: src.lang === 'th' ? '' : title,
    title_zh: '',
    title_ja: '',
    summary_th: src.lang === 'th' ? summary : '',
    summary_en: src.lang === 'th' ? '' : summary,
    summary_zh: '',
    summary_ja: '',
    url,
    source: srcName,
    published,
    published_ts: parseTime(published),
    image: (it.thumbnail || it.enclosure?.link || ''),
    origin: src.id,
  };
  return item;
}

function parseRssXml(xml, src) {
  const items = [];
  const blocks = String(xml).split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0] || '';
    const tag = (name) => {
      const m = block.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>|<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = tag('title');
    if (!title) continue;
    let source = tag('source');
    items.push(mapRssItem({
      title,
      description: tag('description'),
      link: tag('link') || (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1],
      pubDate: tag('pubDate') || tag('updated'),
      source: source || src.name,
    }, src));
  }
  return items;
}

async function fetchOk(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!r.ok) throw new Error('http_' + r.status);
    const text = await r.text();
    return { text, ctype: r.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeRss(text, ctype) {
  const t = String(text || '');
  return /xml|rss|atom/i.test(ctype) || /<rss[\s>]|<feed[\s>]/i.test(t);
}

async function fetchRss(src) {
  try {
    const { text, ctype } = await fetchOk(src.url);
    if (looksLikeRss(text, ctype)) return parseRssXml(text, src);
  } catch (e) { /* try proxy */ }
  try {
    const { text } = await fetchOk(RSS2JSON + encodeURIComponent(src.url));
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.items)) return [];
    return d.items.map(it => mapRssItem({
      title: it.title,
      description: it.description || it.content,
      link: it.link,
      pubDate: it.pubDate,
      source: it.author || src.name,
      thumbnail: it.thumbnail,
      enclosure: it.enclosure,
    }, src));
  } catch (e) {
    return [];
  }
}

async function fetchDashboard() {
  const { text } = await fetchOk(DASHBOARD);
  const d = JSON.parse(text);
  return (d.items || []).map(mapDashboardItem);
}

function mergeNews(groups) {
  const out = [];
  const seenUrl = new Set();
  const seenTitle = new Set();
  for (const item of groups) {
    if (!item) continue;
    const urlKey = String(item.url || '').split('?')[0].replace(/\/+$/, '');
    const titleKey = normalizeTitle(item.title_en || item.title_th);
    if (urlKey && seenUrl.has(urlKey)) continue;
    if (titleKey && seenTitle.has(titleKey)) continue;
    if (urlKey) seenUrl.add(urlKey);
    if (titleKey) seenTitle.add(titleKey);
    out.push(item);
  }
  out.sort((a, b) => (b.published_ts || 0) - (a.published_ts || 0));
  return out.slice(0, 24);
}

/** Fetch latest gold headlines from all sources; never throws. */
export async function fetchNews() {
  const used = [];
  const failed = [];
  const piles = [];

  const tasks = NEWS_SOURCES.map(async (src) => {
    try {
      const items = src.type === 'json' ? await fetchDashboard() : await fetchRss(src);
      if (items && items.length) {
        used.push(src.name);
        piles.push(...items);
        return items.length;
      }
      failed.push(src.name);
      return 0;
    } catch (e) {
      failed.push(src.name);
      return 0;
    }
  });

  await Promise.all(tasks);
  const items = mergeNews(piles);
  const uniqUsed = [...new Set(used)];
  const uniqFailed = [...new Set(failed)].filter(n => !uniqUsed.includes(n));
  return {
    items,
    at: Date.now(),
    sources: uniqUsed,
    failed: uniqFailed,
  };
}

export function titleFor(n, lang) {
  if (lang === 'th' && n.title_th) return n.title_th;
  if (lang === 'zh' && n.title_zh) return n.title_zh;
  if (lang === 'ja' && n.title_ja) return n.title_ja;
  return n.title_en || n.title_th || n.title_zh || '';
}

export function summaryFor(n, lang) {
  if (lang === 'th' && n.summary_th) return n.summary_th;
  if (lang === 'zh' && n.summary_zh) return n.summary_zh;
  if (lang === 'ja' && n.summary_ja) return n.summary_ja;
  return n.summary_en || n.summary_th || n.summary_zh || '';
}

export function newsCacheKey(items, lang) {
  return `${lang || 'en'}::${(items || []).map(n => n.id).join('|')}`;
}
