import { analyze, klines, shiftBars, smcNote } from './engine.js';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { steps as signupSteps, DISC as SIGN_DISC, EXNESS_REF, EXNESS_WEB_GUIDE, signupLang } from './signup.js';
import { t as tr, LANGS, localeTag } from './i18n.js';
import { store } from './store.js';
import { fetchNews, titleFor, summaryFor, newsCacheKey, applyNewsLocale, newsNeedsLocale, sanitizeNewsItem, cleanText } from './news.js';
import { TECH_IDS, techTitle, sessionLabel, sessionHint, buildTechniques } from './techniques.js';
import { CHANGELOG, notesFor } from './changelog.js';
import { analyzeWithPureFxAi, analyzeNewsWithPureFxAi, translateNewsWithPureFxAi, nativeStatus, isMarkedReady, deleteDeviceModel, getApiKey, setApiKey, getVoiceId, setVoiceId, PUREFX_VOICES, speakWithPureFxAi, stopCloudSpeech } from './ondevice.js';
import { replyTo, welcomeMessage, quickPrompts, riskShort } from './chat.js';

const Pg = registerPlugin('PgNative');
const $ = id => document.getElementById(id);
const USDT = '0x920deab53daf94ca2030ad5ceec2265bf5686941';
const RELEASES_LATEST = 'https://github.com/purefxaidev/puregold-app/releases/latest';
const RELEASES_API = 'https://api.github.com/repos/purefxaidev/puregold-app/releases/latest';
const RELEASES_LIST = 'https://api.github.com/repos/purefxaidev/puregold-app/releases?per_page=12';
const APP_VERSION = '0.9.1';

let L = store.getLang();
let A = store.loadAnalysis();
let TG = store.loadThai()?.items || null;
function hydrateNewsItems(items) {
  return applyNewsLocale(items || [], L, store.getNewsI18n() || {});
}
let NEWS = hydrateNewsItems(store.loadNews()?.items || []);
if (!NEWS.length) NEWS = null;
let NEWS_META = store.loadNews() || { at: 0, sources: [] };
let NEWS_AI = store.loadNewsAi() || null;
let offline = false;
const t = k => tr(L, k);
const f2 = x => Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reason = r => (r && (r[L] || r.en || r.th)) || '';
const native = Capacitor.isNativePlatform();

function stamp() {
  $('upd').textContent = t('upd') + ' ' + new Date().toLocaleTimeString(localeTag(L), { timeZone: 'Asia/Bangkok' }) + ' (Bangkok)';
}

function setOffline(on) {
  offline = on;
  const b = $('offlineBanner');
  if (!b) return;
  b.classList.toggle('hidden', !on);
  b.textContent = on ? t('savedOffline') : '';
}

/* ---- Update check (GitHub releases) ---- */
function parseVer(v) {
  return String(v || '').replace(/^v/i, '').trim().split(/[.+-]/).map(x => parseInt(x, 10) || 0);
}
function isNewer(remote, local) {
  const a = parseVer(remote), b = parseVer(local);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

let lastRemoteRelease = null;
async function checkUpdate() {
  try {
    const r = await fetch(RELEASES_API, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return;
    const d = await r.json();
    lastRemoteRelease = d;
    const tag = d.tag_name || d.name || '';
    if (!isNewer(tag, APP_VERSION)) {
      const old = document.getElementById('updateBanner');
      if (old) old.remove();
      return;
    }
    let ban = document.getElementById('updateBanner');
    if (!ban) {
      ban = document.createElement('div');
      ban.id = 'updateBanner';
      ban.className = 'banner update';
      $('offlineBanner').after(ban);
    }
    ban.innerHTML = `<div class="upd-row"><span>${esc(t('updAvail') + ' ' + tag)}</span>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button type="button" class="btn upd-btn sec" id="btnUpdNotes">${esc(t('viewNotes'))}</button>
        <button type="button" class="btn upd-btn" id="btnUpdate">${esc(t('updBtn'))}</button>
      </div></div>`;
    ban.classList.remove('hidden');
    $('btnUpdNotes').onclick = () => openChangelog(tag.replace(/^v/i, ''), d.body || '');
    $('btnUpdate').onclick = async () => {
      const url = d.html_url || RELEASES_LATEST;
      try {
        if (native) await Browser.open({ url });
        else window.open(url, '_blank', 'noopener');
      } catch (e) { window.open(RELEASES_LATEST, '_blank'); }
    };
  } catch (e) { /* ignore network errors */ }
}

/* ---- Tabs ---- */
let tab = store.getTab();
function showTab(name) {
  if (!name) name = 'home';
  tab = name;
  store.setTab(name);
  document.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
  const navHighlight = (name === 'tech' || name === 'chart') ? 'home' : name;
  document.querySelectorAll('#bnav button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === navHighlight);
  });
  try {
    if (name === 'home' || name === 'chart') {
      requestAnimationFrame(() => { initChart(); if (A) loadChart(); });
    }
    if (name === 'home' || name === 'tech') renderTech();
    if (name === 'home') renderHomeNewsTeaser();
    if (name === 'news') { renderNews(); maybeAnalyzeNews(false); }
    if (name === 'plan') {
      renderPlan(); renderSignalHist(); refreshPfxStatus();
      const b=$('btnPureFxAi'); if(b){ b.textContent=t('pureFxAiBtn'); b.onclick=runPureFxAi; }
      const d=$('btnPfxCleanup'); if(d){ d.textContent=t('pureFxAiCleanup'); d.onclick=cleanupPureFxAiLeftover; }
    }
    if (name === 'chat') { renderChat(); }
    if (name === 'more') { renderChangelogBox(); renderOverlaySet(); renderWallpaperSet(); wireMoreHub(); }
  } catch (e) { console.warn('showTab', e); }
}
function wireMoreHub() {
  document.querySelectorAll('#moreHub [data-go]').forEach(btn => {
    btn.onclick = () => showTab(btn.dataset.go);
  });
}
$('bnav').querySelectorAll('button').forEach(b => {
  b.onclick = () => showTab(b.dataset.tab);
});
if ($('backMoreTech')) $('backMoreTech').onclick = () => showTab('home');
if ($('backMoreChart')) $('backMoreChart').onclick = () => showTab('home');

/* ---- Renderers ---- */
function renderThai() {
  if (!TG || !TG.length) {
    $('tg').innerHTML = `<div class="state-empty">${t('empty')}</div>`;
    return;
  }
  $('tg').innerHTML = TG.map(x => {
    const ch = +x.BuyChange || 0;
    return `<div class="c"><b>${esc(t(x.GoldType))} ${esc(x.GoldCode)}%</b>
 <div class="row"><span>${t('buy')}</span><span class="v">${esc(x.Buy)}</span></div>
 <div class="row"><span>${t('sell')}</span><span class="v">${esc(x.Sell)}</span></div>
 <div class="row"><span class="${ch > 0 ? 'up' : ch < 0 ? 'dn' : 'mut'}">${ch > 0 ? '▲ +' : ch < 0 ? '▼ ' : '• '}${ch}</span>
 <span class="mut">${esc(String(x.TimeUpdate || '').slice(11, 16))}</span></div></div>`;
  }).join('');
  $('tgSrc').textContent = t('src');
}

function renderSetup() {
  const el = $('setupHero');
  if (!A?.setup) {
    el.innerHTML = `<div class="skel">${t('load')}</div>`;
    return;
  }
  const S = A.setup;
  const sideClass = S.side === 'BUY' ? 'BUY' : S.side === 'SELL' ? 'SELL' : 'WAIT';
  const sideLabel = S.side === 'BUY' ? t('sideBuy') : S.side === 'SELL' ? t('sideSell') : t('sideWait');
  el.innerHTML = `<div class="row" style="margin:0;align-items:flex-start">
    <div><div class="mut s" style="margin:0 0 6px">${t('setupTitle')}</div>
      <span class="side-pill ${sideClass}">${sideLabel}</span>
      <span class="mut" style="margin-left:8px">${t('conf')} ${S.conf}%</span></div>
    <div class="big" style="font-size:22px">$${f2(A.price)}</div>
  </div>
  <div class="levels">
    <div class="lv"><div class="k">${t('entry')}</div><div class="n">${f2(S.entry[0])} – ${f2(S.entry[1])}</div></div>
    <div class="lv"><div class="k">${t('sl')}</div><div class="n dn">${f2(S.sl)}</div></div>
    <div class="lv"><div class="k">${t('tp')}</div><div class="n up">${f2(S.tp)}</div></div>
    <div class="lv"><div class="k">${t('invalid')}</div><div class="n dn">${f2(S.invalid)}</div></div>
  </div>
  <div class="row"><span>${t('rr')}</span><span class="v">1 : ${S.rr}</span></div>
  ${S.hyp ? `<div class="mut s">${t('waitHint')}</div>` : ''}
  <div class="edu">${t('setupEdu')}</div>
  <img class="hero-mee" src="/nong-mee.jpg" alt="${esc(t('nongMee'))}">`;
}

function renderA() {
  if (!A) {
    ['xau', 'sr', 'bias', 'fc', 'smcList'].forEach(id => {
      if ($(id)) $(id).innerHTML = `<div class="state-empty">${t('empty')}</div>`;
    });
    renderSetup();
    return;
  }
  const p = A.price;
  $('xau').innerHTML = `<div class="big">$${f2(p)}</div>
 <div class="${A.ch >= 0 ? 'up' : 'dn'}">${t('ch24')}: ${A.ch >= 0 ? '+' : ''}${f2(A.ch)} (${A.chp.toFixed(2)}%)</div>
 <div class="mut s">gold-api.com spot · Binance PAXG proxy</div>`;
  const row = (l, c) => `<div class="row"><span class="${c}">${l[0].toFixed(2)}</span>
 <span class="mut">${l[0] > p ? '+' : ''}${(l[0] - p).toFixed(2)} · ×${l[1]}</span></div>`;
  $('sr').innerHTML = `<div class="grid"><div class="c"><b>${t('res')}</b>${A.res.slice().reverse().map(l => row(l, 'dn')).join('') || '-'}
 </div><div class="c"><b>${t('sup')}</b>${A.sup.map(l => row(l, 'up')).join('') || '-'}</div></div>`;
  const b = A.bias;
  $('bias').innerHTML = `<span class="tag ${b.dir === 'up' ? 'up' : b.dir === 'down' ? 'dn' : ''}">${t(b.dir)}</span>
 <span class="mut">${t('conf')} ${b.conf}%</span><ul>${b.reasons.map(r => `<li>${esc(reason(r))}</li>`).join('')}</ul>`;
  renderFc();
  renderSmcList();
  renderSetup();
}

function renderFc() {
  if (!A?.forecast) return;
  const F = A.forecast;
  const hz = F.horizon[L] || F.horizon.en;
  $('fc').innerHTML = `<span class="tag ${F.dir === 'up' ? 'up' : F.dir === 'down' ? 'dn' : ''}">${t(F.dir)}</span>
 <span class="mut">${t('conf')} ${F.conf}%</span>
 <div class="row"><span>${t('horizon')}</span><span class="v">${esc(hz)}</span></div>
 <div class="row"><span>${t('entry')}</span><span class="v">${f2(F.entry[0])} – ${f2(F.entry[1])}</span></div>
 <div class="row"><span>${t('invalid')}</span><span class="v dn">${f2(F.invalid)}</span></div>
 ${F.target != null ? `<div class="row"><span>${t('target')}</span><span class="v up">${f2(F.target)}</span></div>` : ''}
 <ul>${F.reasons.map(r => `<li>${esc(reason(r))}</li>`).join('')}</ul>
 <div class="mut s">${t('fcNote')}</div>`;
}

function renderSmcList() {
  const el = $('smcList');
  const note = $('smcNote');
  if (!A?.smc) {
    el.innerHTML = `<div class="state-empty">${t('empty')}</div>`;
    note.textContent = '';
    return;
  }
  const smc = A.smc;
  note.textContent = typeof A.smcNote === 'function' ? A.smcNote(smc, L) : smcNote(smc, L);
  const items = [];
  (smc.order_blocks || []).forEach(o => {
    items.push(`<div class="smc-item ${o.type}"><div><div class="t">${t('ob')} · ${o.type === 'bullish' ? t('bullish') : t('bearish')}</div>
      <div class="m">${o.mitigated ? t('mitigated') : t('untested')}</div></div>
      <div class="r">${f2(o.bottom)} – ${f2(o.top)}</div></div>`);
  });
  (smc.fvg || []).forEach(o => {
    items.push(`<div class="smc-item fvg ${o.type}"><div><div class="t">${t('fvg')} · ${o.type === 'bullish' ? t('bullish') : t('bearish')}</div>
      <div class="m">${o.filled ? t('filled') : t('openGap')}</div></div>
      <div class="r">${f2(o.bottom)} – ${f2(o.top)}</div></div>`);
  });
  if (smc.zone) {
    items.push(`<div class="smc-item"><div><div class="t">${t('zone')}</div>
      <div class="m">${t(smc.zone.name)} · ${smc.zone.pos_pct}%</div></div>
      <div class="r">${f2(smc.zone.lo)} – ${f2(smc.zone.hi)}</div></div>`);
  }
  if (smc.last_event) {
    items.push(`<div class="smc-item"><div><div class="t">${t('structure')}</div>
      <div class="m">${esc(smc.last_event)}</div></div>
      <div class="r">${smc.bos ? f2(smc.bos.level) : smc.choch ? f2(smc.choch.level) : '-'}</div></div>`);
  }
  el.innerHTML = items.length ? `<div class="smc-card">${items.join('')}</div>` : `<div class="state-empty">${t('empty')}</div>`;
}

/* ---- Chart ---- */
const TF_OPTS = [
  { id: '15m', label: 'M15', n: 180 },
  { id: '1h', label: 'H1', n: 180 },
  { id: '4h', label: 'H4', n: 180 },
  { id: '1d', label: 'D1', n: 120 },
];
let chartTf = store.getTf();
let chartViews = [];
let smcOn = store.getSmcOn();
const chartReady = () => chartViews.some(el => el._pgSeries);

function makeChart(el, height) {
  if (!el) return;
  if (el._pg) {
    el._pg.applyOptions({ width: el.clientWidth, height: el.clientHeight || height });
    return;
  }
  const c = createChart(el, {
    layout: { background: { color: '#0a0b12' }, textColor: '#9a8f73' },
    grid: { vertLines: { color: '#161822' }, horzLines: { color: '#161822' } },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#2a2618' },
    timeScale: { borderColor: '#2a2618', timeVisible: true, secondsVisible: false },
    localization: { locale: localeTag(L) },
  });
  const series = c.addCandlestickSeries({
    upColor: '#3ddc84', downColor: '#ff5c5c',
    borderUpColor: '#3ddc84', borderDownColor: '#ff5c5c',
    wickUpColor: '#3ddc84', wickDownColor: '#ff5c5c',
  });
  el._pg = c;
  el._pgSeries = series;
  el._pgLines = [];
  new ResizeObserver(() => {
    c.applyOptions({ width: el.clientWidth, height: el.clientHeight || height });
  }).observe(el);
  c.applyOptions({ width: el.clientWidth, height });
  if (!chartViews.includes(el)) chartViews.push(el);
}

function initChart() {
  makeChart($('homeChart'), 200);
  makeChart($('chart'), 300);
}

function clearPriceLines() {
  chartViews.forEach(el => {
    (el._pgLines || []).forEach(l => { try { el._pgSeries.removePriceLine(l); } catch (e) {} });
    el._pgLines = [];
  });
}

function addLine(price, color, title, style = 2, width = 1) {
  if (price == null || !Number.isFinite(+price)) return;
  chartViews.forEach(el => {
    if (!el._pgSeries) return;
    el._pgLines.push(el._pgSeries.createPriceLine({
      price: +price, color, lineWidth: width, lineStyle: style,
      axisLabelVisible: true, title,
    }));
  });
}

function applyOverlays() {
  if (!chartReady() || !A) return;
  clearPriceLines();
  A.sup?.slice(0, 3).forEach(l => addLine(l[0], '#3ddc84', t('ovS')));
  A.res?.slice(0, 3).forEach(l => addLine(l[0], '#ff5c5c', t('ovR')));
  addLine(A.price, '#f5d27a', t('ovPx'), 0, 1);

  const S = A.setup;
  if (S) {
    addLine(S.entry?.[0], '#f5d27a88', t('overlayEntry'), 2);
    addLine(S.entry?.[1], '#f5d27a88', t('overlayEntry'), 2);
    addLine(S.sl, '#ff5c5c', t('overlaySL'), 0, 2);
    addLine(S.tp, '#3ddc84', t('overlayTP'), 0, 2);
    addLine(S.invalid, '#c9a227', t('overlayInv'), 1, 1);
  }

  if (smcOn && A.smc) {
    (A.smc.order_blocks || []).slice(0, 3).forEach(o => {
      const col = o.type === 'bullish' ? '#22e39a' : '#ff3d9a';
      const tag = (o.type === 'bullish' ? 'OB+' : 'OB-') + (o.mitigated ? '*' : '');
      addLine(o.top, col, tag, 2);
      addLine(o.bottom, col, tag, 2);
    });
    (A.smc.fvg || []).slice(0, 3).forEach(o => {
      const col = o.type === 'bullish' ? '#36e2ff' : '#ffaa3c';
      const tag = o.type === 'bullish' ? 'FVG+' : 'FVG-';
      addLine(o.top, col, tag, 3);
      addLine(o.bottom, col, tag, 3);
    });
  }
}

async function loadChart() {
  initChart();
  const note = t('chartNote');
  if ($('chartNote')) $('chartNote').textContent = note;
  if ($('homeChartNote')) $('homeChartNote').textContent = note;
  const opt = TF_OPTS.find(x => x.id === chartTf) || TF_OPTS[1];
  try {
    const raw = await klines(opt.id, opt.n);
    const basis = A?.basis || 0;
    const bars = shiftBars(raw, basis);
    chartViews.forEach(el => {
      if (!el._pgSeries) return;
      el._pgSeries.setData(bars);
      el._pg.timeScale().fitContent();
    });
    applyOverlays();
  } catch (e) {
    if ($('chartNote')) $('chartNote').textContent = t('err');
    if ($('homeChartNote')) $('homeChartNote').textContent = t('err');
  }
}

function renderTf() {
  const fill = (id) => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = TF_OPTS.map(o =>
      `<button type="button" data-tf="${o.id}" class="${o.id === chartTf ? 'on' : ''}">${o.label}</button>`
    ).join('');
    el.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        chartTf = b.dataset.tf;
        store.setTf(chartTf);
        renderTf();
        loadChart();
      };
    });
  };
  fill('tf');
  fill('homeTf');
  const tog = $('smcToggle');
  if (tog) {
    tog.checked = smcOn;
    tog.onchange = () => {
      smcOn = tog.checked;
      store.setSmcOn(smcOn);
      applyOverlays();
      renderSmcList();
    };
  }
}

/* ---- Settings ---- */
const DEF = { auto: true, interval: 10, voice: true, mute: false, alertSR: true, alertBias: true, alertStrongNews: true, overlay: false };
let S = store.getSettings(DEF);

async function saveSet() {
  store.setSettings(S);
  if (native) {
    try {
      await Pg.setSettings({
        ...S, lang: L, overlay: !!S.overlay,
        priceAlerts: JSON.stringify(store.getPriceAlerts().filter(a => a.active)),
      });
    } catch (e) {}
  }
}

async function renderSet() {
  const ck = (k, label) =>
    `<label class="row"><span>${label}</span><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}></label>`;
  let last = '';
  if (native) try {
    const r = await Pg.getLast();
    if (r.text) last = `<div class="mut s">${t('last')}: ${esc(r.text)}</div>`;
  } catch (e) {}
  const presets = [5, 10, 15, 30, 60];
  const isPreset = presets.includes(+S.interval);
  const key = await getApiKey();
  const masked = key ? (key.slice(0, 4) + '…' + key.slice(-4)) : '';
  const voiceOpts = PUREFX_VOICES.map(v => {
    const lab = (v.label && (v.label[L] || v.label.en)) || v.id;
    return `<option value="${v.id}" ${getVoiceId() === v.id ? 'selected' : ''}>PureFxAi · ${esc(lab)}</option>`;
  }).join('');
  $('set').innerHTML =
    `<div class="mut s" style="margin-bottom:6px">${t('apiKeyHint')}</div>
    <label class="row" style="flex-wrap:wrap;gap:8px"><span>${t('apiKey')}</span></label>
    <input type="password" id="apiKeyInput" autocomplete="off" placeholder="${masked || t('apiKeyPh')}" style="width:100%;margin-top:4px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button type="button" class="btn" id="apiKeySave" style="margin:0">${t('apiKeySave')}</button>
      <button type="button" class="btn sec danger" id="apiKeyClear" style="margin:0">${t('apiKeyClear')}</button>
    </div>
    <div id="apiKeyStatus" class="mut s" style="margin:6px 0 12px">${key ? t('pureFxAiReady') : t('pureFxAiNeedKey')}</div>
    <label class="row"><span>${t('voicePick')}</span>
      <select id="voicePickSet">${voiceOpts}</select></label>
    <button type="button" class="btn sec" id="voiceTestSet" style="margin:8px 0">${t('voiceTest')}</button>
    <div class="mut s" style="margin-bottom:10px">${t('voicePickHint')}</div>` +
    ck('auto', t('auto')) +
    `<label class="row"><span>${t('iv')}</span>
      <select id="iv">${presets.map(v => `<option value="${v}" ${v == S.interval ? 'selected' : ''}>${v}</option>`).join('')}
      <option value="custom" ${!isPreset ? 'selected' : ''}>${t('custom')}</option></select></label>
    <label class="row" id="ivCustomWrap" style="${isPreset ? 'display:none' : ''}"><span>${t('custom')}</span>
      <input type="number" id="ivCustom" min="1" max="180" step="1" value="${S.interval}"></label>` +
    ck('voice', t('voice')) +
    ck('mute', t('mute')) +
    ck('alertSR', t('aSR')) +
    ck('alertBias', t('aBias')) +
    ck('alertStrongNews', t('alertStrongNews')) +
    `<div class="mut s" style="margin:-4px 0 8px">${t('alertStrongNewsHint')}</div>` +
    (native ? `<button id="test" class="btn">${t('test')}</button>` : `<div class="mut s">${t('androidOnly')}</div>`) +
    last;
  $('set').querySelectorAll('input[type=checkbox]').forEach(i => {
    i.onchange = () => { S[i.dataset.k] = i.checked; saveSet(); };
  });
  const syncIv = () => {
    const sel = $('iv').value;
    if (sel === 'custom') {
      $('ivCustomWrap').style.display = '';
      const n = Math.max(1, Math.min(180, +$('ivCustom').value || 10));
      S.interval = n;
    } else {
      $('ivCustomWrap').style.display = 'none';
      S.interval = +sel;
    }
    saveSet();
  };
  $('iv').onchange = syncIv;
  if ($('ivCustom')) $('ivCustom').onchange = syncIv;
  if ($('test')) $('test').onclick = () => Pg.runNow({ force: true });
  const saveBtn = $('apiKeySave');
  if (saveBtn) saveBtn.onclick = async () => {
    const v = $('apiKeyInput')?.value || '';
    await setApiKey(v.trim());
    $('apiKeyInput').value = '';
    const st = $('apiKeyStatus');
    if (st) st.textContent = (await getApiKey()) ? t('apiKeySaved') : t('pureFxAiNeedKey');
    refreshPfxStatus();
  };
  const clr = $('apiKeyClear');
  if (clr) clr.onclick = async () => {
    await setApiKey('');
    if ($('apiKeyInput')) $('apiKeyInput').value = '';
    const st = $('apiKeyStatus');
    if (st) st.textContent = t('pureFxAiNeedKey');
    refreshPfxStatus();
  };
  const vp = $('voicePickSet');
  if (vp) vp.onchange = () => {
    setVoiceId(vp.value);
    syncChatVoicePick();
  };
  if ($('voiceTestSet')) $('voiceTestSet').onclick = () => testPureFxAiVoice();
}

function renderLang() {
  $('langPick').innerHTML = LANGS.map(x =>
    `<button type="button" class="chip ${x.id === L ? 'on' : ''}" data-l="${x.id}">${x.label}</button>`
  ).join('');
  $('langPick').querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      L = b.dataset.l;
      store.setLang(L);
      document.documentElement.lang = L;
      if (NEWS) NEWS = hydrateNewsItems(NEWS);
      renderAll();
      saveSet();
      localizeNewsHeadlines(L).then(() => renderNews());
    };
  });
}

function renderPriceAlerts() {
  const list = store.getPriceAlerts();
  const cur = A?.price ? f2(A.price) : '';
  $('priceAlerts').innerHTML = `
    <div class="mut s">${t('alertPrice')}${cur ? ` · XAU ≈ $${cur}` : ''}</div>
    <div class="alert-form">
      <input type="number" id="paPrice" step="0.01" min="1" placeholder="${cur || '2650.00'}">
      <button type="button" class="btn" id="paAdd" style="margin:0;width:auto;padding:8px 14px">${t('addAlert')}</button>
    </div>
    <select id="paDir" style="width:100%;margin-top:8px">
      <option value="cross">${t('alertCross')}</option>
      <option value="above">${t('alertAbove')}</option>
      <option value="below">${t('alertBelow')}</option>
    </select>
    <div id="paList">${list.length ? list.map(a => `
      <div class="alert-item">
        <div><div class="px">$${f2(a.price)}</div>
          <div class="mut s" style="margin:0">${a.dir} · ${a.active ? t('alertActive') : t('alertHit')}</div></div>
        <button type="button" class="btn sec danger" data-rm="${a.id}">${t('remove')}</button>
      </div>`).join('') : `<div class="state-empty">${t('noAlerts')}</div>`}</div>`;
  $('paAdd').onclick = () => {
    const price = +$('paPrice').value;
    if (!price || price < 1) return;
    store.addPriceAlert(price, $('paDir').value);
    renderPriceAlerts();
    saveSet();
    checkCustomAlerts(A?.price);
  };
  $('paList').querySelectorAll('[data-rm]').forEach(b => {
    b.onclick = () => {
      store.removePriceAlert(b.dataset.rm);
      renderPriceAlerts();
      saveSet();
    };
  });
}

function renderAlertHist() {
  const h = store.getAlertHist();
  $('alertHist').innerHTML = h.length
    ? h.slice(0, 12).map(x => `<div>${esc(new Date(x.at).toLocaleString(localeTag(L), { timeZone: 'Asia/Bangkok' }))} · ${esc(x.text)}</div>`).join('')
    : t('noHist');
}

function renderDon() {
  $('don').innerHTML = `<div class="mut">${t('donNet')}</div>
 <div class="addr" id="addr">${USDT}</div>
 <div class="don-actions" style="grid-template-columns:1fr">
   <button class="btn" id="copyAddr">${t('copy')}</button>
 </div>
 <img class="qr" id="donQr" src="/usdt-erc20-qr.png" alt="USDT ERC20 QR" onerror="this.style.display='none'">
 <div class="warn">${t('donWarn')}</div>
 <div class="mut s">${t('donNote')}</div>`;
  $('copyAddr').onclick = async () => {
    try {
      await navigator.clipboard.writeText(USDT);
      $('copyAddr').textContent = t('copied');
      setTimeout(() => { $('copyAddr').textContent = t('copy'); }, 1500);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = USDT; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (x) {}
      document.body.removeChild(ta);
      $('copyAddr').textContent = t('copied');
      setTimeout(() => { $('copyAddr').textContent = t('copy'); }, 1500);
    }
  };
}

function impactLabel(imp) {
  return imp === 'bullish' ? t('impactUp') : imp === 'bearish' ? t('impactDn') : t('impactFlat');
}

function openExt(url) {
  return async e => {
    e.preventDefault();
    try {
      if (native) await Browser.open({ url });
      else window.open(url, '_blank', 'noopener');
    } catch (x) { window.open(url, '_blank'); }
  };
}

function fmtNewsTime(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString(localeTag(L), { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

function newsAiFor(id) {
  return NEWS_AI?.items?.[id] || null;
}

function renderNewsAiBox() {
  const box = $('newsAiBox');
  if (!box) return;
  const body = NEWS_AI?.summary
    ? `<div class="pfx-news-body">${esc(NEWS_AI.summary)}</div>`
    : newsAiBusy
      ? `<div class="mut s">${t('newsAnalyzing')}</div>`
      : `<div class="mut s">${t('newsAiNeedKey')}</div>`;
  box.innerHTML = `<div class="pfx-news">
    <div class="pfx-news-head">
      <img class="mee-avatar" src="/nong-mee.jpg" alt="${esc(t('nongMee'))}">
      <div class="grow">
        <b>PureFxAi</b> · ${esc(t('nongMee'))}
        <div class="mut s" style="margin:2px 0 0">${t('newsAiTitle')}</div>
      </div>
      <button type="button" class="btn sec" id="btnNewsAnalyze">${esc(t('newsAnalyze'))}</button>
    </div>
    ${body}
  </div>`;
  const btn = $('btnNewsAnalyze');
  if (btn) btn.onclick = () => maybeAnalyzeNews(true);
}

function bindNewsLinks(root) {
  if (!root) return;
  root.querySelectorAll('a[data-ext]').forEach(a => { a.onclick = openExt(a.dataset.ext); });
}

function newsOpenHtml(n) {
  if (!n.url) return n.source ? `<span class="mut s">${esc(n.source)}</span>` : '';
  return `<a class="news-open" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer" data-ext="${esc(n.url)}">${esc(t('openNews'))}${n.source ? ' · ' + esc(n.source) : ''}</a>`;
}

function newsCardHtml(n) {
  const ai = newsAiFor(n.id);
  const imp = ai?.bias || n.impact || 'neutral';
  const sum = summaryFor(n, L);
  const aiLine = ai?.text ? `<div class="news-ai-line"><div class="who"><img src="/nong-mee.jpg" alt="">PureFxAi</div>${esc(ai.text)}</div>` : '';
  return `<article class="news-card ${imp}">
      <span class="im ${imp}">${esc(impactLabel(imp))}</span>
      <h3>${esc(titleFor(n, L))}</h3>
      ${sum ? `<p>${esc(sum)}</p>` : ''}
      ${aiLine}
      ${newsOpenHtml(n)}
    </article>`;
}

function renderNews() {
  const el = $('newsList');
  if (!el) return;
  const meta = $('newsMeta');
  if (meta) {
    const when = NEWS_META?.at ? t('newsUpdated').replace('{t}', fmtNewsTime(NEWS_META.at) + ' (Bangkok)') : '';
    const srcs = (NEWS_META?.sources || []).length ? t('newsSources').replace('{s}', NEWS_META.sources.join(' · ')) : '';
    const err = NEWS_META?.failed?.length ? t('newsErr') : '';
    const loc = NEWS_META?.needKeyForLocale ? t('newsNeedTranslateKey') : '';
    meta.textContent = [when, srcs, err, loc].filter(Boolean).join(' · ');
  }
  renderNewsAiBox();
  const latest = $('btnNewsLatest');
  if (latest) {
    latest.textContent = t('newsLatest');
    latest.onclick = () => loadNews({ forceAnalyze: true });
  }
  if (!NEWS || !NEWS.length) {
    el.innerHTML = `<div class="state-empty">${t('emptyNews')}</div>`;
    renderHomeNewsTeaser();
    return;
  }
  el.innerHTML = NEWS.map(newsCardHtml).join('');
  bindNewsLinks(el);
  renderHomeNewsTeaser();
}

function renderHomeNewsTeaser() {
  const el = $('homeNewsTeaser');
  if (!el) return;
  if (!NEWS || !NEWS.length) {
    el.innerHTML = `<div class="state-empty">${t('emptyNews')}</div>`;
    return;
  }
  const head = NEWS_AI?.summary
    ? `<div class="pfx-news" style="margin-bottom:8px">
        <div class="pfx-news-head">
          <img class="mee-avatar" src="/nong-mee.jpg" alt="${esc(t('nongMee'))}">
          <div class="grow"><b>PureFxAi</b> · ${esc(t('nongMee'))}
            <div class="pfx-news-body" style="margin-top:6px">${esc(NEWS_AI.summary)}</div>
          </div>
        </div>
      </div>` : '';
  el.innerHTML = head + NEWS.slice(0, 2).map(n => {
    const imp = newsAiFor(n.id)?.bias || n.impact || 'neutral';
    return `<div class="news-teaser-card">
      <span class="im ${imp}" style="display:inline-block;font-size:11px;font-weight:800;margin-bottom:4px">${esc(impactLabel(imp))}</span>
      <h3>${esc(titleFor(n, L))}</h3>
      ${newsOpenHtml(n)}
    </div>`;
  }).join('');
  bindNewsLinks(el);
}

let newsAiBusy = false;
async function maybeAnalyzeNews(force) {
  if (!NEWS || !NEWS.length) { renderNews(); return; }
  const key = newsCacheKey(NEWS, L);
  if (!force && NEWS_AI?.key === key && NEWS_AI?.summary) {
    renderNews();
    maybeAlertStrongNews();
    return;
  }
  const apiKey = await getApiKey();
  if (!apiKey) {
    NEWS_AI = { key, summary: '', items: {}, source: 'none', error: 'need_key', at: Date.now() };
    store.saveNewsAi(NEWS_AI);
    renderNews();
    maybeAlertStrongNews();
    return;
  }
  if (newsAiBusy) return;
  newsAiBusy = true;
  renderNewsAiBox();
  try {
    const res = await analyzeNewsWithPureFxAi(NEWS, L);
    NEWS_AI = { ...res, key, at: Date.now() };
    store.saveNewsAi(NEWS_AI);
  } catch (e) {
    NEWS_AI = { key, summary: '', items: {}, source: 'none', error: String(e?.message || e), at: Date.now() };
  } finally {
    newsAiBusy = false;
    renderNews();
    maybeAlertStrongNews();
  }
}

function isStrongNews(n, ai) {
  const bias = ai?.bias || n.impact;
  const strong = n.level === 'high' || ai?.strength === 'high';
  return strong && (bias === 'bullish' || bias === 'bearish');
}

function maybeAlertStrongNews() {
  if (S.alertStrongNews === false) return;
  if (!NEWS || !NEWS.length) return;
  const fresh = NEWS.filter(n => isStrongNews(n, newsAiFor(n.id)) && !store.wasNewsAlerted(n.id));
  if (!fresh.length) return;
  const n = fresh[0];
  const ai = newsAiFor(n.id);
  const dir = impactLabel(ai?.bias || n.impact);
  const title = titleFor(n, L);
  const text = t('newsAlertTpl').replace('{dir}', dir).replace('{title}', title).slice(0, 220);
  store.markNewsAlerted(fresh.map(x => x.id));
  store.pushAlertHist({ text, kind: 'news' });
  if (!canNotifyPopup()) return;
  markNotified();
  notifyPopup('PUREGOLD', text, 'news');
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('PUREGOLD', { body: text }); } catch (e) {}
  }
}




/* ---- PureFxAi (cloud via user API key) ---- */
let pfxBusy = false;

async function refreshPfxStatus() {
  const st = $('pfxStatus');
  const del = $('btnPfxCleanup');
  if (!st) return;
  if (pfxBusy) return;
  try {
    const key = await getApiKey();
    if (key) st.textContent = t('pureFxAiReady');
    else st.textContent = t('pureFxAiNeedKey');
    if (del) {
      // Show cleanup only if native (may have leftover pack from older builds)
      del.classList.toggle('hidden', !native);
      del.textContent = t('pureFxAiCleanup');
      del.onclick = cleanupPureFxAiLeftover;
    }
  } catch {
    st.textContent = t('pureFxAiNeedKey');
  }
}

async function cleanupPureFxAiLeftover() {
  if (!confirm(t('pureFxAiCleanupConfirm'))) return;
  const st = $('pfxStatus');
  try {
    await deleteDeviceModel();
    if (st) st.textContent = t('pureFxAiCleaned');
  } catch (e) {
    if (st) st.textContent = t('err');
  } finally {
    refreshPfxStatus();
  }
}

async function runPureFxAi() {
  if (pfxBusy) return;
  const out = $('pfxOut');
  const btn = $('btnPureFxAi');
  if (!A?.setup) {
    if (out) { out.classList.remove('hidden'); out.textContent = t('empty'); }
    return;
  }
  const key = await getApiKey();
  if (!key) {
    if (out) { out.classList.remove('hidden'); out.textContent = t('pureFxAiNeedKey'); }
    showTab('more');
    return;
  }
  pfxBusy = true;
  if (btn) { btn.disabled = true; btn.textContent = t('pureFxAiRunning'); }
  const st = $('pfxStatus');
  if (st) st.textContent = t('pureFxAiRunning');
  try {
    const res = await analyzeWithPureFxAi(A, L, null);
    if (out) {
      out.classList.remove('hidden');
      const tag = res.source === 'model' ? t('pureFxAiModel') : t('pureFxAiRules');
      out.textContent = `${tag}\n\n${res.text}`;
      if (res.error === 'need_key') out.textContent = t('pureFxAiNeedKey');
      else if (res.source === 'rules' && res.error) {
        if (st) st.textContent = t('pureFxAiFail');
      }
    }
  } catch (e) {
    if (out) { out.classList.remove('hidden'); out.textContent = t('pureFxAiFail'); }
  } finally {
    pfxBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = t('pureFxAiBtn'); }
    refreshPfxStatus();
  }
}

/* ---- Plan tab + signal history ---- */
function renderPlan() {
  const el = $('planToday');
  if (!el) return;
  if (!A?.setup) {
    el.innerHTML = `<div class="skel">${t('load')}</div>`;
    if ($('planBias')) $('planBias').innerHTML = `<div class="state-empty">${t('empty')}</div>`;
    if ($('planLevels')) $('planLevels').innerHTML = `<div class="state-empty">${t('empty')}</div>`;
    return;
  }
  const S = A.setup;
  const sideClass = S.side === 'BUY' ? 'BUY' : S.side === 'SELL' ? 'SELL' : 'WAIT';
  const sideLabel = S.side === 'BUY' ? t('sideBuy') : S.side === 'SELL' ? t('sideSell') : t('sideWait');
  el.innerHTML = `<div class="row" style="margin:0;align-items:flex-start">
    <div><div class="mut s" style="margin:0 0 6px">${t('planToday')}</div>
      <span class="side-pill ${sideClass}">${sideLabel}</span>
      <span class="mut" style="margin-left:8px">${t('conf')} ${S.conf}%</span></div>
    <div class="big" style="font-size:22px">$${f2(A.price)}</div>
  </div>
  <div class="levels">
    <div class="lv"><div class="k">${t('entry')}</div><div class="n">${f2(S.entry[0])} – ${f2(S.entry[1])}</div></div>
    <div class="lv"><div class="k">${t('sl')}</div><div class="n dn">${f2(S.sl)}</div></div>
    <div class="lv"><div class="k">${t('tp')}</div><div class="n up">${f2(S.tp)}</div></div>
    <div class="lv"><div class="k">${t('invalid')}</div><div class="n dn">${f2(S.invalid)}</div></div>
  </div>
  <div class="row"><span>${t('rr')}</span><span class="v">1 : ${S.rr}</span></div>
  ${S.hyp ? `<div class="mut s">${t('waitHint')}</div>` : ''}
  <div class="edu">${t('planCardHint')}</div>`;

  const b = A.bias;
  if ($('planBias') && b) {
    $('planBias').innerHTML = `<span class="tag ${b.dir === 'up' ? 'up' : b.dir === 'down' ? 'dn' : ''}">${t(b.dir)}</span>
      <span class="mut">${t('conf')} ${b.conf}%</span>
      <ul>${(b.reasons || []).map(r => `<li>${esc(reason(r))}</li>`).join('')}</ul>`;
  }
  if ($('planLevels')) {
    const row = (l, c) => `<div class="row"><span class="${c}">${f2(l[0])}</span>
      <span class="mut">${l[0] > A.price ? '+' : ''}${(l[0] - A.price).toFixed(2)} · ×${l[1]}</span></div>`;
    $('planLevels').innerHTML = `<div class="grid"><div class="c"><b>${t('res')}</b>${(A.res || []).slice().reverse().slice(0, 3).map(l => row(l, 'dn')).join('') || '-'}
      </div><div class="c"><b>${t('sup')}</b>${(A.sup || []).slice(0, 3).map(l => row(l, 'up')).join('') || '-'}</div></div>`;
  }
}

function outcomeLabel(o) {
  if (!o) return t('outcomeOpen');
  return ({ tp: t('outcomeTp'), sl: t('outcomeSl'), up: t('outcomeUp'), dn: t('outcomeDn'), flat: t('outcomeFlat') })[o] || o;
}

function renderSignalHist() {
  const el = $('signalHist');
  const acc = $('signalAcc');
  const stats = store.signalAccuracy();
  if (acc) {
    if (stats.pct == null) acc.textContent = t('signalAccEmpty');
    else acc.textContent = t('signalAcc').replace('{p}', String(stats.pct)).replace('{w}', String(stats.wins)).replace('{n}', String(stats.closed));
  }
  if (!el) return;
  const list = store.getSignalHist();
  if (!list.length) {
    el.innerHTML = `<div class="state-empty">${t('signalEmpty')}</div>`;
  } else {
    el.innerHTML = list.slice(0, 40).map(s => {
      const mid = s.entry ? (s.entry[0] + s.entry[1]) / 2 : s.priceAt;
      const when = new Date(s.at).toLocaleString(localeTag(L), { timeZone: 'Asia/Bangkok', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `<div class="signal-item">
        <div><div class="side ${esc(s.side)}">${esc(s.side)} <span class="mut s">${esc(when)} (Bangkok)</span></div>
          <div class="mut s" style="margin:2px 0 0">$${f2(mid)} · SL ${f2(s.sl)} · TP ${f2(s.tp)}${s.conf != null ? ` · ${s.conf}%` : ''}</div>
        </div>
        <span class="out ${s.outcome || 'open'}">${esc(outcomeLabel(s.outcome))}</span>
      </div>`;
    }).join('');
  }
  const btn = $('clearSignals');
  if (btn) {
    btn.textContent = t('clearSignals');
    btn.onclick = () => { store.clearSignalHist(); renderSignalHist(); };
  }
}

/* ---- Changelog / What's new ---- */
function openChangelog(focusVer, remoteBody) {
  const modal = $('clModal');
  if (!modal) return;
  $('clTitle').textContent = focusVer ? `${t('whatsNew')} · ${focusVer}` : t('changelog');
  $('clOk').textContent = t('dismiss');
  let html = '';
  const list = focusVer
    ? CHANGELOG.filter(x => x.version === String(focusVer).replace(/^v/i, '')).concat(
        CHANGELOG.filter(x => x.version !== String(focusVer).replace(/^v/i, ''))
      )
    : CHANGELOG;
  const seen = new Set();
  list.forEach(row => {
    if (seen.has(row.version)) return;
    seen.add(row.version);
    const notes = row[L] || row.en || [];
    html += `<div class="cl-ver">v${esc(row.version)} <span class="mut" style="font-weight:500">· ${esc(row.date || '')}</span></div>`;
    if (!notes.length) html += `<div class="mut s">${t('changelogEmpty')}</div>`;
    else html += `<ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
  });
  if (remoteBody) {
    html += `<div class="cl-remote">${esc(remoteBody)}</div>`;
  }
  $('clBody').innerHTML = html || `<div class="mut">${t('changelogEmpty')}</div>`;
  modal.classList.remove('hidden');
}

function closeChangelog() {
  $('clModal')?.classList.add('hidden');
  store.setSeenVersion(APP_VERSION);
}

function renderChangelogBox() {
  const el = $('changelogBox');
  if (!el) return;
  el.innerHTML = CHANGELOG.slice(0, 6).map(row => {
    const notes = (row[L] || row.en || []).slice(0, 2);
    return `<div class="signal-item" style="cursor:pointer" data-ver="${esc(row.version)}">
      <div><div class="v">v${esc(row.version)}</div>
        <div class="mut s" style="margin:2px 0 0">${esc(notes[0] || '')}</div></div>
      <span class="mut s">${esc(row.date || '')}</span>
    </div>`;
  }).join('') + `<button type="button" class="btn sec" id="btnOpenCl" style="margin-top:10px">${t('changelog')}</button>`;
  el.querySelectorAll('[data-ver]').forEach(n => {
    n.onclick = () => openChangelog(n.dataset.ver);
  });
  const b = $('btnOpenCl');
  if (b) b.onclick = () => openChangelog();
}

function maybeShowWhatsNew() {
  if (store.getSeenVersion() === APP_VERSION) return;
  openChangelog(APP_VERSION);
}

/* ---- Overlay + native snapshot (widget / overlay) ---- */
async function pushNativeSnapshot() {
  if (!native || !A) return;
  try {
    const S = A.setup || {};
    let thaiSell = '', thaiBuy = '';
    if (TG && TG.length) {
      const h = TG.find(x => x.GoldType === 'HSH') || TG[0];
      thaiSell = String(h.Sell || '');
      thaiBuy = String(h.Buy || '');
    }
    await Pg.pushSnapshot({
      price: A.price,
      bias: A.bias?.dir || 'side',
      side: S.side || 'WAIT',
      conf: S.conf || 0,
      entry0: S.entry ? S.entry[0] : 0,
      entry1: S.entry ? S.entry[1] : 0,
      sl: S.sl || 0,
      tp: S.tp || 0,
      thaiSell, thaiBuy,
      lang: L,
    });
  } catch (e) {}
}

async function notifyPopup(title, text, kind) {
  if (!native || !text) return;
  try {
    await Pg.notifyPopup({ title: title || 'PUREGOLD', text: String(text).slice(0, 240), kind: kind || 'alert' });
  } catch (e) {}
}

async function ensureNotifPerm() {
  if (!native) return;
  try { await Pg.requestNotifPermission?.(); } catch (e) {}
}

async function renderOverlaySet() {
  const el = $('overlaySet');
  if (!el) return;
  if (!native) {
    el.innerHTML = `<div class="mut s">${t('androidOnly')}</div><div class="mut s">${t('overlayHint')}</div>`;
    return;
  }
  let on = !!S.overlay;
  let can = false;
  try {
    const r = await Pg.overlayStatus();
    can = !!r.canDraw;
    on = !!r.enabled;
    S.overlay = on;
  } catch (e) {}
  el.innerHTML = `<div class="mut s">${t('overlayHint')}</div>
    <label class="row"><span>${t('overlayOn')}</span>
      <input type="checkbox" id="ovToggle" ${on ? 'checked' : ''}></label>
    ${!can ? `<button type="button" class="btn sec" id="ovPerm">${t('overlayPerm')}</button>
      <div class="mut s">${t('overlayNeedPerm')}</div>` : ''}`;
  const tog = $('ovToggle');
  if (tog) tog.onchange = async () => {
    S.overlay = tog.checked;
    await saveSet();
    try {
      if (tog.checked) {
        const st = await Pg.overlayStatus();
        if (!st.canDraw) {
          await Pg.requestOverlayPermission();
          tog.checked = false;
          S.overlay = false;
          await saveSet();
          renderOverlaySet();
          return;
        }
        await Pg.setOverlay({ enabled: true });
        await pushNativeSnapshot();
      } else {
        await Pg.setOverlay({ enabled: false });
      }
    } catch (e) { renderOverlaySet(); }
  };
  const bp = $('ovPerm');
  if (bp) bp.onclick = async () => { try { await Pg.requestOverlayPermission(); } catch (e) {} };
}


async function renderWallpaperSet() {
  const el = $('wallpaperSet');
  if (!el) return;
  el.innerHTML = `<div class="mut s">${t('wallpaperHint')}</div>
    <img src="/wallpaper.jpg" alt="PureGold wallpaper" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid var(--line2);margin:8px 0;display:block">
    <div class="mut s">${t('wallpaperPreview')}</div>
    <button type="button" class="btn" id="btnSaveWp">${t('wallpaperSave')}</button>
    <div id="wpStatus" class="mut s"></div>`;
  const btn = $('btnSaveWp');
  if (btn) btn.onclick = async () => {
    const st = $('wpStatus');
    try {
      const r = await fetch('/wallpaper.jpg');
      const blob = await r.blob();
      const file = new File([blob], 'PureGold-by-PureFxAi-wallpaper.jpg', { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'PureGold by PureFxAi' });
        if (st) st.textContent = t('wallpaperSaved');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'PureGold-by-PureFxAi-wallpaper.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      if (st) st.textContent = t('wallpaperSaved');
    } catch (e) {
      if (st) st.textContent = t('wallpaperFail');
    }
  };
}

/* ---- Techniques menu (worldwide XAU) ---- */
let techId = store.getTechId();

function ensureTechniques() {
  if (!A) return null;
  if (A.techniques) return A.techniques;
  A.techniques = buildTechniques(A, null);
  return A.techniques;
}

function renderTech() {
  paintTech($('techPick'), $('techDetail'), false);
  paintTech($('homeTechPick'), $('homeTechDetail'), true);
}

function paintTech(pick, detail, compact) {
  if (!pick || !detail) return;
  pick.innerHTML = TECH_IDS.map(id =>
    `<button type="button" class="chip ${id === techId ? 'on' : ''}" data-tech="${id}">${esc(techTitle(id, L))}</button>`
  ).join('');
  pick.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      techId = b.dataset.tech;
      store.setTechId(techId);
      renderTech();
    };
  });
  const T = ensureTechniques();
  if (!T || !T[techId]) {
    detail.innerHTML = `<div class="state-empty">${t('techEmpty')}</div>`;
    return;
  }
  const d = T[techId];
  const dirTag = `<span class="tag ${d.dir === 'up' ? 'up' : d.dir === 'down' ? 'dn' : ''}">${t(d.dir || 'side')}</span>`;
  const conf = d.conf != null ? `<span class="mut">${t('conf')} ${d.conf}%</span>` : '';
  let hintKey = { smc: 'techSmcHint', sr: 'techSrHint', pivot: 'techPivotHint', trend: 'techTrendHint', fib: 'techFibHint', session: 'techSessionHint' }[techId];
  let body = '';

  if (techId === 'smc') {
    const items = [];
    (d.ob || []).forEach(o => {
      items.push(`<div class="smc-item ${o.type}"><div><div class="t">${t('ob')} · ${o.type === 'bullish' ? t('bullish') : t('bearish')}</div>
        <div class="m">${o.mitigated ? t('mitigated') : t('untested')}</div></div>
        <div class="r">${f2(o.bottom)} – ${f2(o.top)}</div></div>`);
    });
    (d.fvg || []).forEach(o => {
      items.push(`<div class="smc-item fvg ${o.type}"><div><div class="t">${t('fvg')} · ${o.type === 'bullish' ? t('bullish') : t('bearish')}</div>
        <div class="m">${o.filled ? t('filled') : t('openGap')}</div></div>
        <div class="r">${f2(o.bottom)} – ${f2(o.top)}</div></div>`);
    });
    if (d.zone) {
      items.push(`<div class="smc-item"><div><div class="t">${t('zone')}</div>
        <div class="m">${t(d.zone.name)} · ${d.zone.pos_pct}%</div></div>
        <div class="r">${f2(d.zone.lo)} – ${f2(d.zone.hi)}</div></div>`);
    }
    if (d.last_event) {
      items.push(`<div class="smc-item"><div><div class="t">${t('structure')}</div>
        <div class="m">${esc(d.last_event)}</div></div>
        <div class="r">${d.bos ? f2(d.bos.level) : d.choch ? f2(d.choch.level) : '-'}</div></div>`);
    }
    body = items.length ? `<div class="smc-card">${items.join('')}</div>` : `<div class="state-empty">${t('empty')}</div>`;
  } else if (techId === 'sr') {
    const row = (l, c) => `<div class="row"><span class="${c}">${f2(l[0])}</span>
      <span class="mut">×${l[1]} · ${l[0] > T.price ? '+' : ''}${f2(l[0] - T.price)}</span></div>`;
    body = `<div class="grid"><div class="c"><b>${t('res')}</b>${(d.res || []).slice().reverse().map(l => row(l, 'dn')).join('') || '-'}
      </div><div class="c"><b>${t('sup')}</b>${(d.sup || []).map(l => row(l, 'up')).join('') || '-'}</div></div>
      ${d.nearestSup ? `<div class="row"><span>${t('nearest')} ${t('sup')}</span><span class="v up">${f2(d.nearestSup[0])}</span></div>` : ''}
      ${d.nearestRes ? `<div class="row"><span>${t('nearest')} ${t('res')}</span><span class="v dn">${f2(d.nearestRes[0])}</span></div>` : ''}`;
  } else if (techId === 'pivot' && d.levels) {
    const lv = d.levels;
    const mk = (k, c) => `<div class="row"><span>${k}</span><span class="v ${c || ''}">${f2(lv[k])}</span></div>`;
    body = mk('R3', 'dn') + mk('R2', 'dn') + mk('R1', 'dn') + mk('P') + mk('S1', 'up') + mk('S2', 'up') + mk('S3', 'up') +
      (d.vsP != null ? `<div class="row"><span>${t('vsPivot')}</span><span class="v">${d.vsP > 0 ? '+' : ''}${f2(d.vsP)}</span></div>` : '');
  } else if (techId === 'trend') {
    const S = d.setup;
    body = `<ul>${(d.reasons || []).map(r => `<li>${esc(reason(r))}</li>`).join('')}</ul>`;
    if (S) {
      body += `<div class="levels" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        <div class="lv" style="background:#0d0f17;border:1px solid var(--line2);border-radius:12px;padding:10px"><div class="k" style="font-size:11px;color:var(--gold-dim)">${t('entry')}</div><div class="n" style="font-weight:700">${f2(S.entry[0])} – ${f2(S.entry[1])}</div></div>
        <div class="lv" style="background:#0d0f17;border:1px solid var(--line2);border-radius:12px;padding:10px"><div class="k" style="font-size:11px;color:var(--gold-dim)">${t('sl')}</div><div class="n dn" style="font-weight:700">${f2(S.sl)}</div></div>
        <div class="lv" style="background:#0d0f17;border:1px solid var(--line2);border-radius:12px;padding:10px"><div class="k" style="font-size:11px;color:var(--gold-dim)">${t('tp')}</div><div class="n up" style="font-weight:700">${f2(S.tp)}</div></div>
        <div class="lv" style="background:#0d0f17;border:1px solid var(--line2);border-radius:12px;padding:10px"><div class="k" style="font-size:11px;color:var(--gold-dim)">${t('invalid')}</div><div class="n dn" style="font-weight:700">${f2(S.invalid)}</div></div>
      </div>`;
    }
  } else if (techId === 'fib') {
    if (!(d.levels || []).length) body = `<div class="state-empty">${t('empty')}</div>`;
    else {
      body = `<div class="row"><span>${t('swing')} H</span><span class="v dn">${f2(d.swingHigh)}</span></div>
        <div class="row"><span>${t('swing')} L</span><span class="v up">${f2(d.swingLow)}</span></div>
        <div class="mut s" style="margin:8px 0 4px">${t('levels')}</div>` +
        d.levels.map(lv => {
          const near = d.nearest && d.nearest.r === lv.r;
          return `<div class="row"><span>${(lv.r * 100).toFixed(1)}%${near ? ' · ' + t('nearest') : ''}</span>
            <span class="v ${near ? 'up' : ''}">${f2(lv.price)}</span></div>`;
        }).join('');
    }
  } else if (techId === 'session') {
    body = `<div class="row"><span>${sessionLabel(d.session, L)}</span><span class="v">UTC ${d.utcHour}:00</span></div>
      <div class="tip">${esc(sessionHint(d.session, L))}</div>
      <div class="mut s">${t('techSessionHint')}</div>`;
  }

  detail.innerHTML = `<div class="sec-head" style="margin-bottom:10px"><h2 style="margin:0">${esc(techTitle(techId, L))}</h2>
    <div>${dirTag} ${conf}</div></div>
    <div class="mut s" style="margin-bottom:10px">${t(hintKey)}</div>
    <div class="big" style="font-size:20px;margin-bottom:8px">$${f2(T.price)}</div>
    ${body}
    ${compact ? '' : `<div class="edu" style="margin-top:12px;font-size:11px;color:var(--muted)">${t('setupEdu')}</div>`}`;
}

function renderAll() {
  document.documentElement.lang = L;
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $('disc').textContent = t('disc');
  $('aboutVer').textContent = `${t('version')} ${APP_VERSION} · PureFxAi`;
  renderLang();
  renderThai();
  renderA();
  renderPlan();
  renderSignalHist();
  refreshPfxStatus();
  { const b=$('btnPureFxAi'); if(b){ b.textContent=t('pureFxAiBtn'); b.onclick=runPureFxAi; } const d=$('btnPfxCleanup'); if(d){ d.textContent=t('pureFxAiCleanup'); d.onclick=cleanupPureFxAiLeftover; } }
  renderTf();
  renderSet();
  renderOverlaySet();
  renderWallpaperSet();
  renderPriceAlerts();
  renderAlertHist();
  renderChangelogBox();
  renderDon();
  renderNews();
  renderTech();
  renderSignTeaser();
  wireMoreHub();
  renderChat(false);
  stamp();
  chartViews.forEach(el => { try { el._pg?.applyOptions({ localization: { locale: localeTag(L) } }); } catch (e) {} });
  applyOverlays();
  if (!$('view-signup').classList.contains('hidden')) renderSignup();
}

/* ---- Custom price alerts (foreground) ---- */
function checkCustomAlerts(price) {
  if (!price) return;
  const list = store.getPriceAlerts().filter(a => a.active);
  const last = +(localStorage.getItem('pg_last_px') || 0);
  list.forEach(a => {
    let hit = false;
    if (a.dir === 'above') hit = price >= a.price && (last < a.price || !last);
    else if (a.dir === 'below') hit = price <= a.price && (last > a.price || !last);
    else hit = last && ((last < a.price && price >= a.price) || (last > a.price && price <= a.price));
    if (hit) {
      const text = t('alertHitTpl')
        .replace('{p}', String(Math.round(a.price)))
        .replace('{n}', String(Math.round(price)));
      store.markPriceAlertHit(a.id);
      store.pushAlertHist({ text, kind: 'price' });
      if (canNotifyPopup()) {
        markNotified();
        if (native) {
          try { Pg.runNow({ force: true, customText: text }); } catch (e) {}
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('PUREGOLD', { body: text }); } catch (e) {}
        }
      }
      saveSet();
    }
  });
  localStorage.setItem('pg_last_px', String(price));
  renderPriceAlerts();
  renderAlertHist();
}

/* ---- Data load ---- */
async function loadThai() {
  try {
    const r = await fetch('https://apicheckprice.huasengheng.com/api/values/getprice/', { cache: 'no-store' });
    TG = await r.json();
    store.saveThai(TG);
    renderThai();
    await pushNativeSnapshot();
  } catch (e) {
    if (!TG) $('tgSrc').textContent = t('err');
    else setOffline(true);
  }
}

async function loadA() {
  try {
    A = await analyze();
    store.saveAnalysis(A);
    (() => {
      const sg = store.recordSignal(A);
      if (sg && canNotifyPopup()) {
        markNotified();
        notifyPopup('PUREGOLD', `${sg.side} · $${Number(A.price).toFixed(0)}`, 'signal');
      }
      return sg;
    })();
    store.updateSignalOutcomes(A.price);
    setOffline(false);
    renderA();
    renderPlan();
    renderSignalHist();
    checkCustomAlerts(A.price);
    await pushNativeSnapshot();
    if (tab === 'chart' || tab === 'home' || chartReady()) await loadChart();
  } catch (e) {
    if (!A) {
      $('xau').innerHTML = `<div class="state-err">${t('err')}</div>`;
      $('setupHero').innerHTML = `<div class="state-err">${t('err')}</div>`;
    } else setOffline(true);
  }
}

async function localizeNewsHeadlines(lang) {
  if (!NEWS || !NEWS.length || !lang || lang === 'en') {
    if (NEWS_META) NEWS_META.needKeyForLocale = false;
    return;
  }
  NEWS = applyNewsLocale(NEWS, lang, store.getNewsI18n() || {});
  const pending = NEWS.filter(n => newsNeedsLocale(n, lang));
  if (!pending.length) {
    NEWS_META.needKeyForLocale = false;
    return;
  }
  const apiKey = await getApiKey();
  if (!apiKey) {
    NEWS_META.needKeyForLocale = true;
    return;
  }
  NEWS_META.needKeyForLocale = false;
  const BATCH = 8;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const res = await translateNewsWithPureFxAi(slice, lang);
    if (res.error === 'need_key') {
      NEWS_META.needKeyForLocale = true;
      break;
    }
    const cache = store.getNewsI18n() || {};
    Object.entries(res.items || {}).forEach(([id, v]) => {
      cache[`${lang}:${id}`] = { title: cleanText(v.title), summary: cleanText(v.summary || '') };
    });
    store.saveNewsI18n(cache);
    NEWS = applyNewsLocale(NEWS, lang, cache);
    store.saveNews({ at: NEWS_META.at, items: NEWS, sources: NEWS_META.sources, failed: NEWS_META.failed, needKeyForLocale: NEWS_META.needKeyForLocale });
    renderNews();
  }
}

async function loadNews(opts = {}) {
  try {
    const pack = await fetchNews();
    NEWS = hydrateNewsItems(pack.items || []);
    NEWS_META = { at: pack.at || Date.now(), sources: pack.sources || [], failed: pack.failed || [] };
    store.saveNews({ at: NEWS_META.at, items: NEWS, sources: NEWS_META.sources, failed: NEWS_META.failed });
    renderNews();
    await localizeNewsHeadlines(L);
    store.saveNews({ at: NEWS_META.at, items: NEWS, sources: NEWS_META.sources, failed: NEWS_META.failed, needKeyForLocale: NEWS_META.needKeyForLocale });
    renderNews();
    await maybeAnalyzeNews(!!opts.forceAnalyze);
  } catch (e) {
    if (!NEWS) renderNews();
  }
}

async function refresh() {
  await Promise.all([loadThai(), loadA(), loadNews(), checkUpdate()]);
  stamp();
}

$('ref').onclick = refresh;

let y0 = null;
addEventListener('touchstart', e => { y0 = scrollY === 0 ? e.touches[0].clientY : null; }, { passive: true });
addEventListener('touchend', e => {
  if (y0 != null && e.changedTouches[0].clientY - y0 > 90) refresh();
  y0 = null;
}, { passive: true });


/* ---- Chat bot (PureFxAi) ---- */
let chatMsgs = [];
let chatBusy = false;
let chatVoiceOn = localStorage.getItem('pg_chat_voice') !== '0';
let chatBooted = false;

function ttsLocale(lang) {
  return { th: 'th-TH', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP' }[lang] || 'en-US';
}

function stopSpeak() {
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  try { stopCloudSpeech(); } catch (e) {}
}

const ALERT_AT_KEY = 'pg_last_alert_at';
function alertIntervalMs() {
  return Math.max(1, +S.interval || 10) * 60 * 1000;
}
function canNotifyPopup() {
  const last = +localStorage.getItem(ALERT_AT_KEY) || 0;
  return Date.now() - last >= alertIntervalMs();
}
function markNotified() {
  localStorage.setItem(ALERT_AT_KEY, String(Date.now()));
}

function showVoiceFallbackStatus() {
  const msg = t('voiceCloudFail');
  const el = $('chatVoiceStatus');
  if (el) {
    el.textContent = msg;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4500);
  }
}

async function testPureFxAiVoice() {
  const sample = t('voiceTestSample');
  stopSpeak();
  try { stopCloudSpeech(); } catch (e) {}
  try {
    const r = await speakWithPureFxAi(sample, L);
    if (r === 'played') return;
    if (r === 'failed') showVoiceFallbackStatus();
  } catch (e) { showVoiceFallbackStatus(); }
  if (native) {
    try { await Pg.speak({ text: sample, lang: L }); return; } catch (e) {}
  }
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(sample);
    u.lang = ttsLocale(L);
    speechSynthesis.speak(u);
  } catch (e) {}
}

async function speakText(text) {
  if (!text || !chatVoiceOn) return;
  if (S.mute) return;
  const plain = String(text).replace(/\n+/g, '. ').slice(0, 600);
  stopSpeak();
  try { stopCloudSpeech(); } catch (e) {}
  // Prefer PureFxAi cloud voice when key + non-device voice
  try {
    const used = await speakWithPureFxAi(plain, L);
    if (used === 'played' || used === true) return;
    if (used === 'failed') showVoiceFallbackStatus();
  } catch (e) { showVoiceFallbackStatus(); }
  if (native) {
    try {
      await Pg.speak({ text: plain, lang: L });
      return;
    } catch (e) { /* fall through to web TTS */ }
  }
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(plain);
    u.lang = ttsLocale(L);
    u.rate = L === 'th' ? 1.05 : 1;
    speechSynthesis.speak(u);
  } catch (e) {}
}

function syncChatVoicePick() {
  const sel = $('chatVoicePick');
  if (!sel) return;
  const cur = getVoiceId();
  sel.innerHTML = PUREFX_VOICES.map(v => {
    const lab = (v.label && (v.label[L] || v.label.en)) || v.id;
    return `<option value="${v.id}" ${cur === v.id ? 'selected' : ''}>PureFxAi · ${esc(lab)}</option>`;
  }).join('');
  sel.onchange = () => {
    setVoiceId(sel.value);
    const setSel = $('voicePickSet');
    if (setSel) setSel.value = sel.value;
  };
}

function appendBubble(role, text, opts = {}) {
  chatMsgs.push({ role, text, actions: opts.actions || null, at: Date.now() });
  if (chatMsgs.length > 80) chatMsgs = chatMsgs.slice(-60);
  paintChatLog();
}

function paintChatLog() {
  const log = $('chatLog');
  if (!log) return;
  log.innerHTML = chatMsgs.map((m, idx) => {
    const actions = (m.actions || []).map(a =>
      `<button type="button" class="btn sec" data-chat-act="${esc(a.id)}" data-idx="${idx}">${esc(a.label)}</button>`
    ).join('');
    const speakBtn = m.role === 'bot'
      ? `<button type="button" class="btn sec" data-chat-speak="${idx}" style="margin:0;width:auto;padding:4px 8px;font-size:11px">${esc(t('chatSpeak'))}</button>`
      : '';
    if (m.role === 'bot') {
      return `<div class="chat-bubble bot">
        <img class="mee-chat" src="/nong-mee.jpg" alt="${esc(t('nongMee'))}">
        <div class="chat-main">${esc(m.text)}
          <span class="chat-meta">PureFxAi · ${esc(t('nongMee'))}</span>
          ${speakBtn || actions ? `<div class="chat-actions">${speakBtn}${actions}</div>` : ''}
        </div>
      </div>`;
    }
    return `<div class="chat-bubble user">${esc(m.text)}</div>`;
  }).join('');
  log.querySelectorAll('[data-chat-act]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.chatAct;
      if (id === 'openSignup') showSignup(true);
      if (id === 'openExness') openExness();
    };
  });
  log.querySelectorAll('[data-chat-speak]').forEach(b => {
    b.onclick = () => {
      const m = chatMsgs[+b.dataset.chatSpeak];
      if (m) speakText(m.text);
    };
  });
  log.scrollTop = log.scrollHeight;
}

function renderChat(resetWelcome = true) {
  const risk = $('chatRisk');
  if (risk) risk.textContent = '⚠ ' + (t('chatRiskShort') || riskShort(L));
  const inp = $('chatInput');
  if (inp) inp.placeholder = t('chatPlaceholder');
  const send = $('chatSend');
  if (send) send.textContent = t('chatSend');
  const voice = $('chatVoice');
  if (voice) {
    voice.checked = chatVoiceOn;
    voice.onchange = () => {
      chatVoiceOn = !!voice.checked;
      localStorage.setItem('pg_chat_voice', chatVoiceOn ? '1' : '0');
      if (!chatVoiceOn) { stopSpeak(); try { stopCloudSpeech(); } catch (e) {} }
    };
  }
  syncChatVoicePick();
  const vt = $('btnVoiceTest');
  if (vt) { vt.textContent = t('voiceTest'); vt.onclick = () => testPureFxAiVoice(); }
  const chips = $('chatChips');
  if (chips) {
    chips.innerHTML = quickPrompts(L).map(q =>
      `<button type="button" class="chip" data-q="${esc(q.id)}">${esc(q.label)}</button>`
    ).join('');
    chips.querySelectorAll('button').forEach(b => {
      b.onclick = () => sendChat(b.textContent || b.dataset.q);
    });
  }
  if (!chatBooted || (resetWelcome && chatMsgs.length === 0)) {
    chatMsgs = [{ role: 'bot', text: welcomeMessage(L), at: Date.now() }];
    chatBooted = true;
  } else if (resetWelcome === false && chatMsgs.length && chatMsgs[0]?.role === 'bot') {
    // language change: refresh welcome if only welcome present
    if (chatMsgs.length === 1) chatMsgs[0].text = welcomeMessage(L);
  }
  paintChatLog();
}

async function sendChat(raw) {
  const text = String(raw || '').trim();
  if (!text || chatBusy) return;
  const inp = $('chatInput');
  if (inp) inp.value = '';
  appendBubble('user', text);
  chatBusy = true;
  appendBubble('bot', t('chatTyping'));
  const typingIdx = chatMsgs.length - 1;
  try {
    const res = await replyTo(text, { lang: L, analysis: A });
    chatMsgs[typingIdx] = {
      role: 'bot',
      text: res.text,
      actions: res.actions || null,
      at: Date.now(),
    };
    paintChatLog();
    await speakText(res.text);
  } catch (e) {
    chatMsgs[typingIdx] = {
      role: 'bot',
      text: t('err'),
      at: Date.now(),
    };
    paintChatLog();
  } finally {
    chatBusy = false;
  }
}

if ($('chatForm')) {
  $('chatForm').onsubmit = e => {
    e.preventDefault();
    sendChat($('chatInput')?.value || '');
  };
}

/* ---- Exness signup ---- */
let signI = Math.min(+(localStorage.getItem('ex_step') || 0), 7);
let signDone = JSON.parse(localStorage.getItem('ex_chk') || '{}');
let warmed = false;

async function openExness() {
  try {
    if (native) await Browser.open({ url: EXNESS_REF, presentationStyle: 'fullscreen' });
    else window.open(EXNESS_REF, '_blank', 'noopener');
  } catch (e) { window.open(EXNESS_REF, '_blank'); }
}

async function openWebGuide() {
  const u = EXNESS_WEB_GUIDE + (signupLang(L) === 'th' ? '?lang=th' : '?lang=en');
  try {
    if (native) await Browser.open({ url: u });
    else window.open(u, '_blank', 'noopener');
  } catch (e) { window.open(u, '_blank'); }
}

async function warmPartnerOnce() {
  if (warmed) return;
  warmed = true;
  if (!native) return;
  try { await Pg.warmPartner({ url: EXNESS_REF }); } catch (e) {}
}

function stepDone(k, Steps) {
  return Steps[k].c.every((_, j) => signDone[k + '_' + j]);
}

function showSignup(on) {
  $('view-main').classList.toggle('hidden', on);
  $('view-signup').classList.toggle('hidden', !on);
  if (on) { warmPartnerOnce(); renderSignup(); scrollTo(0, 0); }
}

function renderSignup() {
  const lang = signupLang(L);
  const Steps = signupSteps(lang);
  if (signI > Steps.length - 1) signI = Steps.length - 1;
  const s = Steps[signI];
  localStorage.setItem('ex_step', signI);
  $('bar').style.width = ((signI + 1) / Steps.length * 100) + '%';
  $('pt').textContent = t('stepOf') + ' ' + (signI + 1) + ' ' + t('of') + ' ' + Steps.length;
  $('pc').textContent = Steps.filter((_, k) => stepDone(k, Steps)).length + ' ' + t('stepsDone');
  $('dots').innerHTML = Steps.map((_, k) =>
    `<button type="button" class="${k === signI ? 'on' : stepDone(k, Steps) ? 'done' : ''}" data-k="${k}">${k + 1}</button>`
  ).join('');
  $('stage').innerHTML = `<div class="card-s"><div class="n">${t('stepOf')} ${signI + 1}</div><h1>${s.t}</h1>${s.b}
   <div style="margin-top:12px;font-size:13px;color:#8a8473">${t('tickDone')}</div>
   ${s.c.map((c, j) => `<label class="chk"><input type="checkbox" data-c="${signI}_${j}" ${signDone[signI + '_' + j] ? 'checked' : ''}><span>${c}</span></label>`).join('')}
   <div class="nav"><button type="button" id="prev" ${signI === 0 ? 'disabled' : ''}>${t('prev')}</button>
   <button type="button" class="pri" id="next">${signI === Steps.length - 1 ? t('finish') : t('next')}</button></div></div>`;
  $('signDisc').innerHTML = SIGN_DISC[lang] || SIGN_DISC.en;
  $('webGuide').textContent = t('webGuide') + ' · purefxaidev.github.io/gold-dashboard/signup.html';
  $('prev').onclick = () => { if (signI > 0) { signI--; renderSignup(); scrollTo(0, 0); } };
  $('next').onclick = () => {
    if (signI < Steps.length - 1) { signI++; renderSignup(); scrollTo(0, 0); }
    else showSignup(false);
  };
  $('stage').querySelectorAll('[data-ex-open]').forEach(b => b.onclick = openExness);
  $('stage').querySelectorAll('input[data-c]').forEach(inp => {
    inp.onchange = () => {
      signDone[inp.dataset.c] = inp.checked;
      localStorage.setItem('ex_chk', JSON.stringify(signDone));
      renderSignup();
    };
  });
  $('dots').querySelectorAll('button').forEach(b => {
    b.onclick = () => { signI = +b.dataset.k; renderSignup(); };
  });
}

function renderSignTeaser() {
  $('signTeaser').innerHTML = `<div class="mut s">${t('signTeaser')}</div>
 <button type="button" class="btn" id="openSign">${t('signOpen')}</button>
 <button type="button" class="btn sec" id="openExDirect">${t('openEx')}</button>`;
  $('openSign').onclick = () => showSignup(true);
  $('openExDirect').onclick = openExness;
}

$('backMain').onclick = () => showSignup(false);
$('webGuide').onclick = e => { e.preventDefault(); openWebGuide(); };

/* boot */
if ($('clClose')) $('clClose').onclick = closeChangelog;
if ($('clOk')) $('clOk').onclick = closeChangelog;
if ($('btnChangelog')) $('btnChangelog').onclick = () => openChangelog();
$('clModal')?.addEventListener('click', e => { if (e.target === $('clModal')) closeChangelog(); });

// Chart + techniques also live on Home; full panels remain available
if (tab === 'tech' || tab === 'chart') { /* keep */ }
else if (!['home','plan','news','chat','more'].includes(tab)) tab = 'home';


if ($('homeChartFull')) $('homeChartFull').onclick = () => showTab('chart');
if ($('homeTechFull')) $('homeTechFull').onclick = () => showTab('tech');
if ($('homeNewsMore')) $('homeNewsMore').onclick = () => showTab('news');
if ($('btnNewsLatest')) $('btnNewsLatest').onclick = () => loadNews({ forceAnalyze: true });

showTab(tab);
renderAll();
saveSet();
ensureNotifPerm();
refresh().then(() => maybeShowWhatsNew());
setInterval(loadThai, 30000);
setInterval(loadA, 60000);
setInterval(loadNews, 5 * 60 * 1000);
setInterval(checkUpdate, 30 * 60 * 1000);
