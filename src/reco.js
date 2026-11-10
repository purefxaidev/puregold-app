/**
 * Dashboard "Recommendation now" card — same computation as gold-dashboard renderReco().
 */
const TIP = {
  th: {
    SL: 'SL = ตัดขาดทุน: ถ้าราคาไปผิดทางถึงจุดนี้ ระบบปิดไม้ให้อัตโนมัติ เพื่อไม่ให้ขาดทุนหนัก',
    TP: 'TP = รับกำไร: ถ้าราคาไปถูกทางถึงจุดนี้ ระบบปิดเก็บกำไรให้อัตโนมัติ',
    RR: 'RR = กำไรเทียบความเสี่ยง เช่น 1.6 แปลว่า ถ้าแพ้เสีย 1 ส่วน ถ้าชนะได้ 1.6 ส่วน',
    EV: 'EV = ผลตอบแทนคาดหวังต่อไม้ (หน่วย R) ถ้าเป็นบวก แปลว่าทำซ้ำหลายครั้งแล้วน่าจะคุ้ม',
  },
  en: {
    SL: 'SL = stop loss: if price moves against you to this level, the position closes automatically to limit the loss',
    TP: 'TP = take profit: if price reaches this level, the position closes automatically to lock in profit',
    RR: 'RR = reward vs. risk, e.g. 1.6 means you risk 1 part to make 1.6',
    EV: 'EV = expected return per trade (in R). Positive means it should pay off over many trades',
  },
  zh: {
    SL: 'SL = 止损：价格逆向到达此位时自动平仓，以限制亏损',
    TP: 'TP = 止盈：价格到达此位时自动平仓锁定利润',
    RR: 'RR = 盈亏比，例如 1.6 表示亏 1 份、赢可得 1.6 份',
    EV: 'EV = 每笔交易的期望收益（以 R 计）。正值表示多次重复后应划算',
  },
  ja: {
    SL: 'SL = 損切り：逆行してこの水準に達すると自動で決済し、損失を抑えます',
    TP: 'TP = 利確：この水準に達すると自動で決済して利益を確定します',
    RR: 'RR = リスクリワード。例: 1.6 は負けると1、勝つと1.6',
    EV: 'EV = 1取引あたりの期待リターン（R）。プラスなら繰り返しで見合う目安',
  },
};

export function glossaryText(key, lang) {
  const pack = TIP[lang] || TIP.en;
  return pack[key] || TIP.en[key] || '';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function noEmo(s) {
  return String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

function lf(obj, key, lang) {
  if (!obj) return '';
  if (lang !== 'th' && obj[`${key}_en`] != null && obj[`${key}_en`] !== '') return obj[`${key}_en`];
  return obj[key] ?? '';
}

export function fmtPx(n, d = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function tip(k, lang) {
  const meaning = lang === 'th' ? 'คำนี้แปลว่า: ' : 'Meaning: ';
  return `<abbr class="tip reco-tip" tabindex="0" data-tip="${esc(k)}" title="${esc(meaning + glossaryText(k, lang))}">${k}</abbr>`;
}

function isEn(lang) { return lang !== 'th'; }

function planSentence(p, px, lang) {
  const sell = p.side === 'sell';
  const above = p.entry >= px;
  const near = Math.abs(px - p.entry) <= 3;
  const st = noEmo(lf(p, 'status', lang === 'th' ? 'th' : 'en'));
  let cond, act;
  if (lang === 'th') {
    act = sell ? 'ขาย' : 'ซื้อ';
    cond = near
      ? `ราคาอยู่แถว ${fmtPx(p.entry)} แล้ว`
      : `ถ้าราคา${above ? 'ขึ้น' : 'ลง'}ถึง ${fmtPx(p.entry)}${!sell && !above ? 'แล้วเด้ง' : sell && above ? '' : 'แล้วยืนได้'}`;
  } else {
    act = sell ? 'SELL' : 'BUY';
    cond = near
      ? `Price is around ${fmtPx(p.entry)} now`
      : `If price ${above ? 'rises' : 'drops'} to ${fmtPx(p.entry)}${!sell && !above ? ' and bounces' : sell && above ? '' : ' and holds'}`;
  }
  const evCol = p.ev > 0 ? 'var(--up)' : 'var(--dn)';
  const evTxt = `${p.ev > 0 ? '+' : ''}${p.ev}R`;
  const win = Math.round((p.p_win || 0) * 100);
  const mid = p.risk_free
    ? (lang === 'th' ? 'ไม่มีความเสี่ยงแล้ว (กันหน้าไม้)' : 'Risk-free (breakeven SL)')
    : `${tip('RR', lang)} ${p.rr} · ${tip('EV', lang)} <b style="color:${evCol}">${evTxt}</b> · ${
        lang === 'th' ? `โอกาสชนะ ~${win}%` : `win chance ~${win}%`
      }${st ? ' · ' + esc(st) : ''}`;
  const slLab = lang === 'th' ? `ตัดขาดทุน (${tip('SL', lang)})` : `Stop loss (${tip('SL', lang)})`;
  const tpLab = lang === 'th' ? `รับกำไร (${tip('TP', lang)})` : `Take profit (${tip('TP', lang)})`;
  return `<div class="ps" style="border-left:4px solid ${sell ? 'var(--dn)' : 'var(--up)'}">${esc(cond).replace(/&/g,'&')} → <b style="color:${sell ? 'var(--dn)' : 'var(--up)'}">${act}</b>
   <span>| ${slLab} <b style="color:var(--dn)">${fmtPx(p.sl)}</b></span> <span>| ${tpLab} <b style="color:var(--up)">${fmtPx(p.tp)}</b></span>
   <div class="psm">${mid}</div></div>`;
}

function autoPill(D, lang) {
  const AT = D.auto_trade || {};
  const on = !!AT.enabled;
  let extra = '';
  if (on) {
    const mins = /(\d+)/.exec(AT.interval || '30') ? +/(\d+)/.exec(AT.interval || '30')[1] : 30;
    const nx = new Date(Date.now() + 7 * 36e5);
    const m = nx.getUTCHours() * 60 + nx.getUTCMinutes();
    let nm = Math.floor((m - 15) / mins) * mins + 15 + mins;
    nm = ((nm % 1440) + 1440) % 1440;
    const clock = `${String(Math.floor(nm / 60)).padStart(2, '0')}:${String(nm % 60).padStart(2, '0')}`;
    const iv = lf(AT, 'interval', lang === 'th' ? 'th' : 'en') || (lang === 'th' ? '30 นาที' : '30 min');
    extra = lang === 'th'
      ? ` · ไม้ละ ${AT.lot ?? 0.1} ล็อต · ทุก ${esc(iv)} · เช็กถัดไป ~${clock} น.`
      : ` · ${AT.lot ?? 0.1} lot per trade · every ${esc(iv)} · next check ~${clock}`;
  }
  const label = lang === 'th'
    ? `เทรดอัตโนมัติ: ${on ? 'เปิด' : 'ปิด'}`
    : `Auto-trading: ${on ? 'ON' : 'OFF'}`;
  return `<div class="atp ${on ? 'on' : ''}"><span class="dotp"></span>${label}${extra}</div>`;
}

function accuracyLine(acc, lang) {
  if (!acc || (acc.acc_7d == null && acc.acc_30d == null)) return '';
  const a7 = acc.acc_7d != null ? Number(acc.acc_7d).toFixed(1) : '—';
  const a30 = acc.acc_30d != null ? Number(acc.acc_30d).toFixed(1) : '—';
  const n7 = acc.n_7d != null ? ` (${acc.n_7d})` : '';
  const n30 = acc.n_30d != null ? ` (${acc.n_30d})` : '';
  const lab = lang === 'th' ? (acc.label_th || '') : (acc.label_en || acc.label_th || '');
  const main = lang === 'th'
    ? `ความแม่นยำ AI 7 วัน ${a7}%${n7} · 30 วัน ${a30}%${n30}`
    : `AI accuracy 7d ${a7}%${n7} · 30d ${a30}%${n30}`;
  return `<div class="reco-acc">${esc(main)}${lab ? ` · ${esc(lab)}` : ''}</div>`;
}

/** Build inner HTML for the Home recommendation card. */
export function renderRecoHtml(D, livePx, lang = 'th') {
  if (!D) return `<div class="mut s">${lang === 'th' ? 'กำลังโหลดคำแนะนำ…' : 'Loading recommendation…'}</div>`;
  const px = Number(livePx) || Number(D.price_num) || null;
  if (!px) return `<div class="mut s">${lang === 'th' ? 'รอราคาเพื่อแสดงคำแนะนำ' : 'Waiting for a price to show the recommendation'}</div>`;

  const ps = (D.ev_plans || []).filter(p => p.decision === 'เข้า').sort((a, b) => Math.abs(a.entry - px) - Math.abs(b.entry - px));
  const at = ps.find(p => Math.abs(px - p.entry) <= 3);
  const act = at ? (at.side === 'buy' ? (lang === 'th' ? 'ซื้อ' : 'BUY') : (lang === 'th' ? 'ขาย' : 'SELL')) : (lang === 'th' ? 'รอ' : 'WAIT');
  const col = at ? (at.side === 'buy' ? 'var(--up)' : 'var(--dn)') : 'var(--gold)';
  const reason = at
    ? (lang === 'th' ? 'ราคาอยู่ที่จุดเข้าตามแผน' : 'Price is at the plan entry')
    : (lang === 'th' ? 'ราคาอยู่กลางกรอบ ยังไม่คุ้มเข้า รอให้ถึงจุดด้านล่าง' : 'Price is mid-range — not worth entering yet. Wait for the levels below');

  const buys = ps.filter(p => p.side === 'buy').map(p => p.entry);
  const sells = ps.filter(p => p.side === 'sell').map(p => p.entry);
  const lo = Math.min(...(buys.length ? buys : D.sup_nums || [px - 20]), px) - 5;
  const hi = Math.max(...(sells.length ? sells : D.res_nums || [px + 20]), px) + 5;
  const pos = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
  const buyLab = lang === 'th' ? 'โซนซื้อ' : 'Buy zone';
  const sellLab = lang === 'th' ? 'โซนขาย' : 'Sell zone';
  const nowLab = lang === 'th' ? 'ตอนนี้' : 'Now';
  const bar = `<div class="zbar"><div class="zb" style="left:0;width:${buys.length ? pos(Math.max(...buys)) : 0}%"></div><div class="zs" style="left:${sells.length ? pos(Math.min(...sells)) : 100}%;right:0"></div>
    <div class="zp" style="left:${pos(px)}%"><span>${nowLab} ${fmtPx(px)}</span></div></div>
    <div class="zl"><span class="up">← ${buyLab} ${buys.length ? fmtPx(Math.max(...buys)) : ''}</span><span class="dn">${sells.length ? fmtPx(Math.min(...sells)) : ''} ${sellLab} →</span></div>`;

  const empty = lang === 'th'
    ? 'ยังไม่มีแผนที่คุ้มเสี่ยง (EV ไม่เป็นบวก) — รอดูก่อน'
    : 'No plan with a positive EV yet — wait';
  const foot = lang === 'th'
    ? `อัปเดตเมื่อ ${esc(lf(D, 'updated', 'th') || '')} · แตะคำ SL/TP/RR/EV เพื่อดูความหมาย · ไม่ใช่การรับประกันกำไร`
    : `Updated ${esc(lf(D, 'updated', 'en') || '')} · tap SL/TP/RR/EV for meanings · no profit guarantee`;
  const title = lang === 'th' ? 'คำแนะนำตอนนี้' : 'Recommendation now';
  const nowPref = lang === 'th' ? 'ตอนนี้: ' : 'Now: ';
  const aiLine = lang === 'th'
    ? `AI มองขึ้น <b class="up">${D.ai_up_pct ?? '—'}%</b> · ลง <b class="dn">${D.ai_down_pct ?? '—'}%</b>`
    : `AI sees up <b class="up">${D.ai_up_pct ?? '—'}%</b> · down <b class="dn">${D.ai_down_pct ?? '—'}%</b>`;

  return `${autoPill(D, lang)}
    <div class="reco-head">
      <div>
        <small>${esc(title)}</small>
        <div class="act" style="color:${col}">${nowPref}${act}</div>
        <div class="reco-reason">${esc(reason)}</div>
      </div>
      <div class="reco-ai">${aiLine}</div>
    </div>
    ${bar}
    ${ps.map(p => planSentence(p, px, lang === 'th' ? 'th' : 'en')).join('') || `<div class="ps">${esc(empty)}</div>`}
    ${accuracyLine(D.accuracy, lang)}
    <div class="reco-foot">${foot}</div>`;
}

export function recoAccent(D, livePx) {
  if (!D) return 'var(--gold)';
  const px = Number(livePx) || Number(D.price_num);
  if (!px) return 'var(--gold)';
  const ps = (D.ev_plans || []).filter(p => p.decision === 'เข้า');
  const at = ps.find(p => Math.abs(px - p.entry) <= 3);
  if (!at) return 'var(--gold)';
  return at.side === 'buy' ? 'var(--up)' : 'var(--dn)';
}

export function bindRecoTips(root, lang, onShow) {
  if (!root) return;
  root.querySelectorAll('.reco-tip').forEach(el => {
    const show = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const k = el.getAttribute('data-tip') || el.textContent.trim();
      const text = el.getAttribute('title') || ((lang === 'th' ? 'คำนี้แปลว่า: ' : 'Meaning: ') + glossaryText(k, lang));
      if (onShow) onShow(k, text);
      else {
        try { alert(text); } catch {}
      }
    };
    el.addEventListener('click', show);
    el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') show(ev); });
  });
}
