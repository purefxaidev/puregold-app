/** Gold news cards from PUREGOLD dashboard feed (rule/analyst curated). No model names. */
const FEED = 'https://purefxaidev.github.io/gold-dashboard/news.json';

export async function fetchNews() {
  const r = await fetch(FEED, { cache: 'no-store' });
  if (!r.ok) throw new Error('news ' + r.status);
  const d = await r.json();
  return (d.items || []).slice(0, 20).map(it => ({
    id: it.id,
    impact: it.impact || 'neutral', // bullish | bearish | neutral
    level: it.level || 'medium',
    title_th: it.title_th || '',
    title_en: it.title_en || '',
    summary_th: it.summary_th || (Array.isArray(it.article_th) ? it.article_th[0] : ''),
    summary_en: it.summary_en || (Array.isArray(it.article_en) ? it.article_en[0] : ''),
    url: it.url || it.publisher_url || '',
    source: it.source || '',
    published: it.published || it.published_ts || '',
    image: it.image || '',
  }));
}

export function titleFor(n, lang) {
  if (lang === 'th' && n.title_th) return n.title_th;
  if (lang === 'zh' && n.title_en) return n.title_en; // EN fallback for ZH/JA
  if (lang === 'ja' && n.title_en) return n.title_en;
  return n.title_en || n.title_th || '';
}

export function summaryFor(n, lang) {
  if (lang === 'th' && n.summary_th) return n.summary_th;
  return n.summary_en || n.summary_th || '';
}
