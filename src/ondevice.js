/**
 * On-device PureFxAi plan analysis for PUREGOLD.
 * Downloads a local GGUF pack on first use and runs inference in-app (wllama WASM).
 * UI must brand this as "PureFxAi" only — never expose pack/vendor/size labels.
 */
import { Wllama } from '@wllama/wllama';
import { Capacitor, registerPlugin } from '@capacitor/core';

const Pg = registerPlugin('PgNative');

/** Permanent public URL (GitHub Releases asset) — device-pack-2 (~0.8B). */
export const DEVICE_MODEL_URL =
  'https://github.com/purefxaidev/puregold-purefxai/releases/download/device-pack-2/purefxai-device.gguf';
export const DEVICE_MODEL_SIZE = 532517120;
export const DEVICE_MODEL_SHA256 =
  'bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517';

const READY_KEY = 'pg_pfx_ready';
const PATH_KEY = 'pg_pfx_path';
const VER_KEY = 'pg_pfx_sha';

let wllama = null;
let loadingModel = false;
let installAbort = null;
/** In-memory session: once true, UI must not flicker to "installing". */
let sessionReady = false;
let sessionPath = '';
/** Single-flight install promise. */
let installPromise = null;
/** Single-flight load promise. */
let loadPromise = null;

function wasmPaths() {
  const base = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : '';
  return { default: `${base}/wllama/wllama.wasm` };
}

export function isMarkedReady() {
  if (sessionReady) return true;
  try {
    return localStorage.getItem(READY_KEY) === '1' &&
      localStorage.getItem(VER_KEY) === DEVICE_MODEL_SHA256;
  } catch { return false; }
}

export function markReady(path) {
  sessionReady = true;
  if (path) sessionPath = path;
  try {
    localStorage.setItem(READY_KEY, '1');
    localStorage.setItem(VER_KEY, DEVICE_MODEL_SHA256);
    if (path) localStorage.setItem(PATH_KEY, path);
  } catch {}
}

export function clearReady() {
  sessionReady = false;
  sessionPath = '';
  try {
    localStorage.removeItem(READY_KEY);
    localStorage.removeItem(PATH_KEY);
    localStorage.removeItem(VER_KEY);
  } catch {}
}

function storedPath() {
  if (sessionPath) return sessionPath;
  try { return localStorage.getItem(PATH_KEY) || ''; } catch { return ''; }
}

/**
 * Read install status WITHOUT clearing the ready flag on transient misses.
 * Only clearReady when native confirms the file is gone (and we are not downloading).
 */
export async function nativeStatus() {
  if (!Capacitor.isNativePlatform()) {
    return {
      ready: isMarkedReady(),
      downloading: false,
      done: isMarkedReady() ? DEVICE_MODEL_SIZE : 0,
      total: DEVICE_MODEL_SIZE,
      path: storedPath() || null,
      engine: 'web',
    };
  }
  try {
    const s = await Pg.deviceModelStatus({
      size: DEVICE_MODEL_SIZE,
      fileName: 'purefxai-device.gguf',
      sha256: DEVICE_MODEL_SHA256,
    });
    if (s?.ready) {
      markReady(s.path || storedPath());
      return { ...s, ready: true, engine: 'native' };
    }
    // Keep local ready sticky while a download is in progress or file is verifying —
    // never clearReady() here (that caused install UI flicker).
    if (s?.downloading) {
      return { ...s, ready: false, engine: 'native' };
    }
    // File missing: clear only if we previously thought it was ready.
    if (isMarkedReady() && s && s.ready === false && !s.downloading && !(s.done > 0)) {
      // Still keep sticky mark if path exists in prefs — native may be mid-check.
      if (!s.path) {
        // Soft: do not clear; wait for explicit deleteDeviceModel.
      }
    }
    // Prefer sticky session/localStorage so UI stays "ready" after a good install.
    if (isMarkedReady()) {
      return {
        ...s,
        ready: true,
        path: s.path || storedPath(),
        done: DEVICE_MODEL_SIZE,
        total: DEVICE_MODEL_SIZE,
        engine: 'native',
        sticky: true,
      };
    }
    return { ...s, engine: 'native' };
  } catch {
    return {
      ready: isMarkedReady(),
      downloading: false,
      done: isMarkedReady() ? DEVICE_MODEL_SIZE : 0,
      total: DEVICE_MODEL_SIZE,
      path: storedPath() || null,
      engine: 'native',
    };
  }
}

/**
 * Ensure the on-device pack is installed (single-flight).
 * @param {(p:{phase:string,pct:number,done:number,total:number})=>void} onProgress
 */
export async function ensureInstalled(onProgress) {
  const emit = (phase, done, total) => {
    const t = total || DEVICE_MODEL_SIZE;
    const pct = t > 0 ? Math.min(99, Math.floor((done / t) * 100)) : 0;
    onProgress?.({ phase, pct: phase === 'ready' ? 100 : pct, done, total: t });
  };

  if (isMarkedReady() && !Capacitor.isNativePlatform()) {
    emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
    return { path: null, source: 'web' };
  }

  if (installPromise) {
    const r = await installPromise;
    emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
    return r;
  }

  installPromise = (async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        emit('checking', 0, DEVICE_MODEL_SIZE);
        const st = await nativeStatus();
        if (st.ready && (st.path || storedPath())) {
          const path = st.path || storedPath();
          markReady(path);
          emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
          return { path, source: 'native' };
        }
        emit('installing', st.done || 0, st.total || DEVICE_MODEL_SIZE);

        return await new Promise((resolve, reject) => {
          let subProgress, subDone, subErr;
          let settled = false;
          const cleanup = () => {
            try { subProgress?.remove(); } catch {}
            try { subDone?.remove(); } catch {}
            try { subErr?.remove(); } catch {}
          };
          const finishOk = (path) => {
            if (settled) return;
            settled = true;
            cleanup();
            markReady(path || '');
            emit('ready', DEVICE_MODEL_SIZE, DEVICE_MODEL_SIZE);
            resolve({ path: path || storedPath(), source: 'native' });
          };
          const finishErr = (e) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(e instanceof Error ? e : new Error(String(e?.message || e || 'install_failed')));
          };
          (async () => {
            try {
              subProgress = await Pg.addListener('deviceModelProgress', (ev) => {
                const phase = ev?.phase === 'verifying' ? 'installing' : 'installing';
                emit(phase, Number(ev.done || 0), Number(ev.total || DEVICE_MODEL_SIZE));
              });
              subDone = await Pg.addListener('deviceModelReady', (ev) => {
                finishOk(ev.path || '');
              });
              subErr = await Pg.addListener('deviceModelError', (ev) => {
                finishErr(new Error(ev?.error || 'install_failed'));
              });
              await Pg.ensureDeviceModel({
                url: DEVICE_MODEL_URL,
                sha256: DEVICE_MODEL_SHA256,
                size: DEVICE_MODEL_SIZE,
                fileName: 'purefxai-device.gguf',
              });
              // Poll until ready (handles already-ready + in-flight download)
              for (let i = 0; i < 600 && !settled; i++) {
                await new Promise(r => setTimeout(r, 500));
                const again = await Pg.deviceModelStatus({
                  size: DEVICE_MODEL_SIZE,
                  fileName: 'purefxai-device.gguf',
                  sha256: DEVICE_MODEL_SHA256,
                });
                if (again?.ready && again.path) {
                  finishOk(again.path);
                  return;
                }
                if (again?.downloading) {
                  emit('installing', Number(again.done || 0), Number(again.total || DEVICE_MODEL_SIZE));
                }
              }
              if (!settled) finishErr(new Error('install_timeout'));
            } catch (e) {
              finishErr(e);
            }
          })();
        });
      }

      // Web / fallback
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
    } finally {
      // Keep promise result for concurrent waiters; clear after microtask so retries can run later.
      const done = installPromise;
      setTimeout(() => { if (installPromise === done) installPromise = null; }, 0);
    }
  })();

  return installPromise;
}

async function getWllama() {
  if (wllama) return wllama;
  wllama = new Wllama(wasmPaths(), { allowOffline: true, parallelDownloads: 2 });
  return wllama;
}

async function ensureModelLoaded(pathHint) {
  if (wllama?.isModelLoaded?.()) return wllama;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    loadingModel = true;
    try {
      const wl = await getWllama();
      if (wl.isModelLoaded()) return wl;

      let url = DEVICE_MODEL_URL;
      const hint = pathHint || storedPath();
      if (hint && Capacitor.isNativePlatform()) {
        try {
          const converted = Capacitor.convertFileSrc(hint);
          if (converted) url = converted;
        } catch {}
      } else if (Capacitor.isNativePlatform()) {
        try {
          const st = await Pg.deviceModelStatus({
            size: DEVICE_MODEL_SIZE,
            fileName: 'purefxai-device.gguf',
            sha256: DEVICE_MODEL_SHA256,
          });
          if (st.path) {
            markReady(st.path);
            try {
              const converted = Capacitor.convertFileSrc(st.path);
              if (converted) url = converted;
            } catch {}
          }
        } catch {}
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
      const done = loadPromise;
      setTimeout(() => { if (loadPromise === done) loadPromise = null; }, 0);
    }
  })();

  return loadPromise;
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

function buildChatPrompt(userText, A, lang) {
  const S = A?.setup || {};
  const b = A?.bias || {};
  const langName = { th: 'Thai', en: 'English', zh: 'Simplified Chinese', ja: 'Japanese' }[lang] || 'English';
  return {
    system:
      `You are PureFxAi inside PUREGOLD. Reply ONLY in ${langName}. Max 6 short lines. ` +
      `Education only, not financial advice. Brand yourself as PureFxAi only.`,
    user:
      `Trader asked: ${String(userText || '').slice(0, 240)}\n` +
      `Context: XAU≈${A?.price} bias=${b.dir || 'side'} setup=${S.side || 'WAIT'} ` +
      `entry ${S.entry?.[0]}-${S.entry?.[1]} SL ${S.sl} TP ${S.tp}\n` +
      `Answer helpfully about gold trading / this plan / Exness signup education.`,
  };
}

function scrub(text) {
  return String(text || '')
    .replace(/\bQwen[\w.\-]*/gi, 'PureFxAi')
    .replace(/\bGGUF\b/gi, '')
    .replace(/\b2B\b/g, '').replace(/\b0\.8B\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

async function runCompletion(messages) {
  const path = storedPath();
  const wl = await ensureModelLoaded(path);
  const resp = await wl.createChatCompletion({
    messages,
    stream: false,
    max_tokens: 280,
    temperature: 0.4,
    top_p: 0.9,
    top_k: 40,
  });
  const text = scrub(resp?.choices?.[0]?.message?.content || resp?.content || '');
  if (!text) throw new Error('empty');
  return text;
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
    const { system, user } = buildPrompt(A, lang);
    onProgress?.({ phase: 'analyzing', pct: 100, done: DEVICE_MODEL_SIZE, total: DEVICE_MODEL_SIZE });
    const text = await runCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: String(e?.message || e),
    };
  }
}

/**
 * Chat completion using already-installed pack. Does NOT start a new download
 * unless pack is missing — avoids install-state flicker in the chat UI.
 */
export async function chatWithPureFxAi(userText, A, lang) {
  try {
    if (!isMarkedReady()) {
      // Soft check once — if native says ready, stick it; else rules fallback (no download from chat).
      try {
        const st = await nativeStatus();
        if (!st.ready) {
          return { text: ruleNarrative(A, lang), source: 'rules', skippedInstall: true };
        }
      } catch {
        return { text: ruleNarrative(A, lang), source: 'rules', skippedInstall: true };
      }
    }
    const { system, user } = buildChatPrompt(userText, A, lang);
    const text = await runCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: String(e?.message || e),
    };
  }
}

/** Unload in-memory model so a reinstall can load a fresh pack. */
export async function unloadModel() {
  try {
    if (wllama?.isModelLoaded?.()) await wllama.exit?.();
  } catch {}
  wllama = null;
  loadingModel = false;
  loadPromise = null;
}

/**
 * Delete the on-device PureFxAi pack from the phone to free storage.
 */
export async function deleteDeviceModel() {
  await unloadModel();
  clearReady();
  installPromise = null;
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await Pg.deleteDeviceModel();
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      for (const k of keys) {
        if (/wllama|gguf|purefxai|device/i.test(k)) await caches.delete(k);
      }
    }
  } catch {}
  return { ok: true, engine: 'web' };
}

export function cancelInstall() {
  try { installAbort?.abort(); } catch {}
  if (Capacitor.isNativePlatform()) {
    try { Pg.cancelDeviceModel?.(); } catch {}
  }
}
