/**
 * On-device PureFxAi plan analysis for PUREGOLD.
 * Downloads a local GGUF pack on first use and runs inference in-app (wllama WASM).
 * UI must brand this as "PureFxAi" only — never expose pack/vendor/size labels.
 */
import { Wllama } from '@wllama/wllama';
import { Capacitor, registerPlugin } from '@capacitor/core';

const Pg = registerPlugin('PgNative');

/** Permanent public URL (GitHub Releases asset). */
export const DEVICE_MODEL_URL =
  'https://github.com/purefxaidev/puregold-purefxai/releases/download/device-pack-1/purefxai-device.gguf';
export const DEVICE_MODEL_SIZE = 1270808032;
export const DEVICE_MODEL_SHA256 =
  '0bfe35afc9f05b7fac3fa04925e051ac7939a42a8a17ea11afc99701bea826cc';

const READY_KEY = 'pg_pfx_ready';
const PATH_KEY = 'pg_pfx_path';

let wllama = null;
let loadingModel = false;
let installAbort = null;

function wasmPaths() {
  // Served from /public/wllama after vite build / Capacitor sync
  const base = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : '';
  return { default: `${base}/wllama/wllama.wasm` };
}

export function isMarkedReady() {
  try { return localStorage.getItem(READY_KEY) === '1'; } catch { return false; }
}

export function markReady(path) {
  try {
    localStorage.setItem(READY_KEY, '1');
    if (path) localStorage.setItem(PATH_KEY, path);
  } catch {}
}

export function clearReady() {
  try {
    localStorage.removeItem(READY_KEY);
    localStorage.removeItem(PATH_KEY);
  } catch {}
}

export async function nativeStatus() {
  if (!Capacitor.isNativePlatform()) {
    return { ready: isMarkedReady(), downloading: false, done: 0, total: DEVICE_MODEL_SIZE, path: null, engine: 'web' };
  }
  try {
    const s = await Pg.deviceModelStatus();
    if (s?.ready) markReady(s.path || '');
    return { ...s, engine: 'native' };
  } catch {
    return { ready: isMarkedReady(), downloading: false, done: 0, total: DEVICE_MODEL_SIZE, path: null, engine: 'native' };
  }
}

/**
 * Ensure the on-device pack is installed.
 * @param {(p:{phase:string,pct:number,done:number,total:number})=>void} onProgress
 */
export async function ensureInstalled(onProgress) {
  const emit = (phase, done, total) => {
    const t = total || DEVICE_MODEL_SIZE;
    const pct = t > 0 ? Math.min(99, Math.floor((done / t) * 100)) : 0;
    onProgress?.({ phase, pct: phase === 'ready' ? 100 : pct, done, total: t });
  };

  if (Capacitor.isNativePlatform()) {
    emit('checking', 0, DEVICE_MODEL_SIZE);
    const st = await nativeStatus();
    if (st.ready && st.path) {
      emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
      return { path: st.path, source: 'native' };
    }
    emit('installing', st.done || 0, st.total || DEVICE_MODEL_SIZE);

    return await new Promise((resolve, reject) => {
      let subProgress, subDone, subErr;
      const cleanup = () => {
        try { subProgress?.remove(); } catch {}
        try { subDone?.remove(); } catch {}
        try { subErr?.remove(); } catch {}
      };
      (async () => {
        try {
          subProgress = await Pg.addListener('deviceModelProgress', (ev) => {
            emit('installing', Number(ev.done || 0), Number(ev.total || DEVICE_MODEL_SIZE));
          });
          subDone = await Pg.addListener('deviceModelReady', (ev) => {
            cleanup();
            markReady(ev.path || '');
            emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
            resolve({ path: ev.path, source: 'native' });
          });
          subErr = await Pg.addListener('deviceModelError', (ev) => {
            cleanup();
            reject(new Error(ev?.error || 'install_failed'));
          });
          await Pg.ensureDeviceModel({
            url: DEVICE_MODEL_URL,
            sha256: DEVICE_MODEL_SHA256,
            size: DEVICE_MODEL_SIZE,
            fileName: 'purefxai-device.gguf',
          });
          // ensureDeviceModel resolves when download starts or already ready
          const again = await nativeStatus();
          if (again.ready && again.path) {
            cleanup();
            markReady(again.path);
            emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
            resolve({ path: again.path, source: 'native' });
          }
        } catch (e) {
          cleanup();
          reject(e);
        }
      })();
    });
  }

  // Web / fallback: download via wllama cache (progressCallback)
  emit('installing', 0, DEVICE_MODEL_SIZE);
  const wl = await getWllama();
  installAbort = new AbortController();
  await wl.loadModelFromUrl(DEVICE_MODEL_URL, {
    n_ctx: 512,
    n_batch: 64,
    n_threads: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)),
    useCache: true,
    signal: installAbort.signal,
    progressCallback: ({ loaded, total }) => {
      emit('installing', loaded || 0, total || DEVICE_MODEL_SIZE);
    },
  });
  markReady('');
  emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
  return { path: null, source: 'web', loaded: true };
}

async function getWllama() {
  if (wllama) return wllama;
  wllama = new Wllama(wasmPaths(), { allowOffline: true, parallelDownloads: 2 });
  return wllama;
}

async function ensureModelLoaded(pathHint) {
  if (loadingModel) {
    while (loadingModel) await new Promise(r => setTimeout(r, 200));
    if (wllama?.isModelLoaded?.()) return wllama;
  }
  loadingModel = true;
  try {
    const wl = await getWllama();
    if (wl.isModelLoaded()) return wl;

    let url = DEVICE_MODEL_URL;
    if (pathHint && Capacitor.isNativePlatform()) {
      try {
        const converted = Capacitor.convertFileSrc(pathHint);
        if (converted) url = converted;
      } catch {}
    } else if (Capacitor.isNativePlatform()) {
      const st = await nativeStatus();
      if (st.path) {
        try {
          const converted = Capacitor.convertFileSrc(st.path);
          if (converted) url = converted;
        } catch {}
      }
    }

    await wl.loadModelFromUrl(url, {
      n_ctx: 512,
      n_batch: 64,
      n_threads: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)),
      useCache: true,
    });
    return wl;
  } finally {
    loadingModel = false;
  }
}

function buildPrompt(A, lang) {
  const S = A?.setup || {};
  const b = A?.bias || {};
  const side = S.side || 'WAIT';
  const reasons = (b.reasons || []).map(r => (r && (r[lang] || r.en || r.th)) || '').filter(Boolean).slice(0, 4);
  const langName = { th: 'Thai', en: 'English', zh: 'Simplified Chinese', ja: 'Japanese' }[lang] || 'English';
  return {
    system:
      `You are PureFxAi, an on-device gold (XAUUSD) trading education assistant inside the PUREGOLD app. ` +
      `Reply ONLY in ${langName}. Be concise (max 8 short lines). ` +
      `Never claim to be financial advice. Never invent prices that contradict the numbers given. ` +
      `Structure: 1) bias summary 2) plan (entry/SL/TP) 3) one risk note.`,
    user:
      `Live context (rule engine):\n` +
      `- Price: ${A?.price}\n` +
      `- Bias: ${b.dir || 'side'} conf ${b.conf ?? '?'}%\n` +
      `- Setup: ${side} entry ${S.entry?.[0]}-${S.entry?.[1]} SL ${S.sl} TP ${S.tp} RR 1:${S.rr} conf ${S.conf}%\n` +
      `- Hypothetical: ${S.hyp ? 'yes' : 'no'}\n` +
      `- Reasons: ${reasons.join(' | ') || 'n/a'}\n` +
      `Write the PureFxAi plan card for the trader.`,
  };
}

/** Rule-based PureFxAi narrative if WASM inference fails after install. */
export function ruleNarrative(A, lang) {
  const S = A?.setup || {};
  const b = A?.bias || {};
  const side = S.side || 'WAIT';
  const f = (x) => (x == null ? '-' : Number(x).toFixed(2));
  if (lang === 'th') {
    return [
      `PureFxAi · มุมมอง: ${b.dir === 'up' ? 'ขาขึ้น' : b.dir === 'down' ? 'ขาลง' : 'ไซด์เวย์'} (${b.conf ?? '?'}%)`,
      `แผน: ${side === 'BUY' ? 'รับซื้อ' : side === 'SELL' ? 'ขายออก' : 'รอ'} · เข้า ${f(S.entry?.[0])}–${f(S.entry?.[1])}`,
      `SL ${f(S.sl)} · TP ${f(S.tp)} · R:R 1:${S.rr ?? '-'}`,
      S.hyp ? 'สัญญาณยังไม่ชัด — ใช้เป็นสมมติฐาน รอยืนยัน' : 'อิงกฎเทคนิคในเครื่อง + PureFxAi',
      'เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน',
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      `PureFxAi · 偏向：${b.dir === 'up' ? '上涨' : b.dir === 'down' ? '下跌' : '震荡'}（${b.conf ?? '?'}%）`,
      `计划：${side === 'BUY' ? '买入' : side === 'SELL' ? '卖出' : '观望'} · 入场 ${f(S.entry?.[0])}–${f(S.entry?.[1])}`,
      `止损 ${f(S.sl)} · 止盈 ${f(S.tp)} · 盈亏比 1:${S.rr ?? '-'}`,
      S.hyp ? '信号尚不明确 — 视为假设，等待确认' : '基于本机规则引擎 + PureFxAi',
      '仅供教育，非投资建议',
    ].join('\n');
  }
  return [
    `PureFxAi · Bias: ${b.dir || 'side'} (${b.conf ?? '?'}%)`,
    `Plan: ${side} · Entry ${f(S.entry?.[0])}–${f(S.entry?.[1])}`,
    `SL ${f(S.sl)} · TP ${f(S.tp)} · R:R 1:${S.rr ?? '-'}`,
    S.hyp ? 'No clear signal — hypothetical; wait for confirmation' : 'Based on on-device rules + PureFxAi',
    'Education only. Not financial advice.',
  ].join('\n');
}

/**
 * Run PureFxAi analysis. Installs pack on first use.
 * @returns {{text:string, source:'model'|'rules', install?:object}}
 */
export async function analyzeWithPureFxAi(A, lang, onProgress) {
  let path = null;
  try {
    const inst = await ensureInstalled(onProgress);
    path = inst.path;
    onProgress?.({ phase: 'loading', pct: 100, done: DEVICE_MODEL_SIZE, total: DEVICE_MODEL_SIZE });
    const wl = await ensureModelLoaded(path);
    const { system, user } = buildPrompt(A, lang);
    onProgress?.({ phase: 'analyzing', pct: 100, done: DEVICE_MODEL_SIZE, total: DEVICE_MODEL_SIZE });
    const resp = await wl.createChatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      max_tokens: 280,
      temperature: 0.4,
      top_p: 0.9,
      top_k: 40,
    });
    const text = (resp?.choices?.[0]?.message?.content || resp?.content || '').trim();
    if (!text) throw new Error('empty');
    // Strip any accidental vendor tokens if a model echoes them (defensive)
    const cleaned = text
      .replace(/\bQwen[\w.\-]*/gi, 'PureFxAi')
      .replace(/\b2B\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { text: cleaned, source: 'model' };
  } catch (e) {
    // Installed or partially installed: still give PureFxAi card from rules
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: String(e?.message || e),
    };
  }
}

export function cancelInstall() {
  try { installAbort?.abort(); } catch {}
  if (Capacitor.isNativePlatform()) {
    try { Pg.cancelDeviceModel?.(); } catch {}
  }
}
