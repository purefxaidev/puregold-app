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
    title_zh: it.title_zh || it.title_cn || '',
    title_ja: it.title_ja || '',
    summary_th: it.summary_th || (Array.isArray(it.article_th) ? it.article_th[0] : ''),
    summary_en: it.summary_en || (Array.isArray(it.article_en) ? it.article_en[0] : ''),
    summary_zh: it.summary_zh || it.summary_cn || '',
    summary_ja: it.summary_ja || '',
    url: it.url || it.publisher_url || '',
    source: it.source || '',
    published: it.published || it.published_ts || '',
    image: it.image || '',
  }));
}

export function titleFor(n, lang) {
  if (lang === 'th' && n.title_th) return n.title_th;
  if (lang === 'zh' && n.title_zh) return n.title_zh;
  if (lang === 'ja' && n.title_ja) return n.title_ja;
  // ZH/JA UI is full; feed body may still be EN until zh fields exist
  return n.title_en || n.title_th || n.title_zh || '';
}

export function summaryFor(n, lang) {
  if (lang === 'th' && n.summary_th) return n.summary_th;
  if (lang === 'zh' && n.summary_zh) return n.summary_zh;
  if (lang === 'ja' && n.summary_ja) return n.summary_ja;
  return n.summary_en || n.summary_th || n.summary_zh || '';
}
