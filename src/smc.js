/** Smart Money Concepts — port of gold-dashboard/smc.py (deterministic, education only). */
const r2 = x => Math.round(x * 100) / 100;

function atr(bars, n = 14) {
  let a = null;
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].h - bars[i].l,
      Math.abs(bars[i].h - bars[i - 1].c),
      Math.abs(bars[i].l - bars[i - 1].c),
    );
    a = a == null ? tr : (a * (n - 1) + tr) / n;
  }
  return a || 1e-9;
}

function swings(bars, w = 2) {
  const hs = [], ls = [];
  for (let i = w; i < bars.length - w; i++) {
    let H = true, Lo = true;
    for (let j = i - w; j <= i + w; j++) {
      if (bars[j].h > bars[i].h) H = false;
      if (bars[j].l < bars[i].l) Lo = false;
    }
    if (H) hs.push([i, bars[i].h]);
    if (Lo) ls.push([i, bars[i].l]);
  }
  return { hs, ls };
}

/**
 * @param {Array<{t?:number,h:number,l:number,c:number,o?:number}>} bars
 * @param {number} basis  shift onto spot (XAU) if candles are PAXG
 */
export function analyseSmc(bars, basis = 0) {
  if (!bars || bars.length < 30) {
    return { order_blocks: [], fvg: [], bos: null, choch: null, liquidity: [], zone: null, last_event: null, price: null };
  }
  const r = bars.slice(-120).map(b => ({
    t: b.t || b.time || 0,
    o: (b.o ?? b.open ?? b.c) + basis,
    h: b.h + basis,
    l: b.l + basis,
    c: b.c + basis,
  }));
  const A = atr(r);
  const { hs, ls } = swings(r);
  const events = [];
  const obs = [];
  let lastdir = null, hi_i = null, lo_i = null, used_h = -1, used_l = -1;
  const hmap = Object.fromEntries(hs);
  const lmap = Object.fromEntries(ls);

  for (let i = 0; i < r.length; i++) {
    if (i - 2 in hmap) hi_i = i - 2;
    if (i - 2 in lmap) lo_i = i - 2;
    const c = r[i].c;
    for (const [dirn, si, used] of [['bull', hi_i, used_h], ['bear', lo_i, used_l]]) {
      if (si == null || si === used) continue;
      const lvl = dirn === 'bull' ? r[si].h : r[si].l;
      if ((dirn === 'bull' && c > lvl) || (dirn === 'bear' && c < lvl)) {
        const kind = lastdir && lastdir !== dirn ? 'choch' : 'bos';
        lastdir = dirn;
        events.push({ kind, dir: dirn, level: r2(lvl), t: r[i].t, i });
        if (dirn === 'bull') used_h = si; else used_l = si;
        for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
          const { o, h, l, c: cl } = r[j];
          if ((dirn === 'bull' && cl < o) || (dirn === 'bear' && cl > o)) {
            const later = r.slice(i + 1);
            const mit = dirn === 'bull'
              ? later.some(x => x.l <= h)
              : later.some(x => x.h >= l);
            obs.push({
              type: dirn === 'bull' ? 'bullish' : 'bearish',
              top: r2(h), bottom: r2(l), mitigated: mit, t: r[j].t,
            });
            break;
          }
        }
      }
    }
  }

  const fv = [];
  for (let i = 2; i < r.length; i++) {
    if (r[i].l > r[i - 2].h && r[i].l - r[i - 2].h > 0.1 * A) {
      const top = r[i].l, bot = r[i - 2].h;
      const later = r.slice(i + 1);
      fv.push({
        type: 'bullish', top: r2(top), bottom: r2(bot),
        filled: later.some(x => x.l <= bot), t: r[i - 1].t,
      });
    }
    if (r[i].h < r[i - 2].l && r[i - 2].l - r[i].h > 0.1 * A) {
      const top = r[i - 2].l, bot = r[i].h;
      const later = r.slice(i + 1);
      fv.push({
        type: 'bearish', top: r2(top), bottom: r2(bot),
        filled: later.some(x => x.h >= top), t: r[i - 1].t,
      });
    }
  }

  const liq = [];
  const H = hs.slice(-12).map(x => x[1]);
  const L = ls.slice(-12).map(x => x[1]);
  for (const [arr, nm] of [[H, 'equal_highs'], [L, 'equal_lows']]) {
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        if (Math.abs(arr[a] - arr[b]) <= 0.1 * A
          && !liq.some(x => x.type === nm && Math.abs(x.level - arr[b]) <= 0.1 * A)) {
          liq.push({ type: nm, level: r2((arr[a] + arr[b]) / 2) });
        }
      }
    }
  }
  if (hs.length) liq.push({ type: 'swing_high', level: r2(hs[hs.length - 1][1]) });
  if (ls.length) liq.push({ type: 'swing_low', level: r2(ls[ls.length - 1][1]) });

  const seg = r.slice(-60);
  const hi = Math.max(...seg.map(x => x.h));
  const lo = Math.min(...seg.map(x => x.l));
  const eq = (hi + lo) / 2;
  const px = r[r.length - 1].c;
  const pos = hi > lo ? Math.round((px - lo) / (hi - lo) * 100) : 50;
  const zone = {
    name: pos > 55 ? 'premium' : pos < 45 ? 'discount' : 'equilibrium',
    pos_pct: pos, eq: r2(eq), hi: r2(hi), lo: r2(lo),
  };

  const bos = [...events].reverse().find(e => e.kind === 'bos');
  const ch = [...events].reverse().find(e => e.kind === 'choch');
  const untested = obs.filter(o => !o.mitigated).slice(-3);
  const tested = obs.filter(o => o.mitigated).slice(-1);
  const obs_keep = untested.concat(tested);
  const fvg_keep = fv.filter(f => !f.filled).slice(-3);
  const last = events[events.length - 1];

  return {
    order_blocks: obs_keep,
    fvg: fvg_keep,
    bos: bos ? { dir: bos.dir, level: bos.level, t: bos.t } : null,
    choch: ch ? { dir: ch.dir, level: ch.level, t: ch.t } : null,
    liquidity: liq.slice(-5),
    zone,
    last_event: last ? `${last.kind}_${last.dir}` : null,
    price: r2(px),
  };
}

export function smcNote(smc, lang = 'en') {
  if (!smc || !smc.zone) return '';
  const zmap = {
    premium: { th: 'โซนแพง (premium) ระวังไล่ซื้อ', en: 'premium zone, avoid chasing buys', zh: '溢价区，慎追多', ja: 'プレミアム帯・追いかけ買いに注意' },
    discount: { th: 'โซนถูก (discount) ระวังไล่ขาย', en: 'discount zone, avoid chasing sells', zh: '折扣区，慎追空', ja: 'ディスカウント帯・追いかけ売りに注意' },
    equilibrium: { th: 'กลางกรอบ', en: 'mid-range', zh: '均衡区', ja: '均衡帯' },
  };
  const emap = {
    bos_bull: { th: 'ทะลุโครงสร้างขึ้น (BOS)', en: 'bullish BOS', zh: '向上BOS', ja: '強気BOS' },
    bos_bear: { th: 'หลุดโครงสร้างลง (BOS)', en: 'bearish BOS', zh: '向下BOS', ja: '弱気BOS' },
    choch_bull: { th: 'เปลี่ยนโครงสร้างเป็นขึ้น (CHoCH)', en: 'CHoCH to bullish', zh: '转多CHoCH', ja: '強気CHoCH' },
    choch_bear: { th: 'เปลี่ยนโครงสร้างเป็นลง (CHoCH)', en: 'CHoCH to bearish', zh: '转空CHoCH', ja: '弱気CHoCH' },
  };
  const z = zmap[smc.zone.name] || zmap.equilibrium;
  const e = emap[smc.last_event] || { th: 'ยังไม่มีสัญญาณโครงสร้าง', en: 'no structure signal yet', zh: '暂无结构信号', ja: '構造シグナルなし' };
  const L = ['th', 'en', 'zh', 'ja'].includes(lang) ? lang : 'en';
  const ob = [...(smc.order_blocks || [])].reverse().find(o => !o.mitigated);
  const obt = ob
    ? (L === 'th'
      ? ` · OB ${ob.type === 'bullish' ? 'ฝั่งซื้อ' : 'ฝั่งขาย'} ${ob.bottom}-${ob.top}`
      : L === 'zh'
        ? ` · 未测OB ${ob.type === 'bullish' ? '多' : '空'} ${ob.bottom}-${ob.top}`
        : L === 'ja'
          ? ` · 未テストOB ${ob.type === 'bullish' ? '買い' : '売り'} ${ob.bottom}-${ob.top}`
          : ` · untested ${ob.type} OB ${ob.bottom}-${ob.top}`)
    : '';
  const fvgN = (smc.fvg || []).length;
  if (L === 'th') return `H1: ${e.th} · ราคาอยู่${z.th} (${smc.zone.pos_pct}% ของกรอบ)${obt} · FVG ค้าง ${fvgN} จุด`;
  if (L === 'zh') return `H1: ${e.zh} · 价格在${z.zh} (${smc.zone.pos_pct}%)${obt} · 未填FVG ${fvgN}`;
  if (L === 'ja') return `H1: ${e.ja} · 価格は${z.ja} (${smc.zone.pos_pct}%)${obt} · 未埋めFVG ${fvgN}`;
  return `H1: ${e.en} · price in ${z.en} (${smc.zone.pos_pct}% of range)${obt} · ${fvgN} open FVG`;
}
