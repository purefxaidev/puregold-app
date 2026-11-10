/**
 * PureFxAi cloud analysis + speech for PUREGOLD.
 * Cloud text uses a built-in default provider (Vite-injected at build time)
 * with an optional user key override stored on-device. Cloud TTS requires
 * the optional user key. UI must brand as "PureFxAi" only — never expose
 * vendor/model names in user-facing strings.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const Pg = registerPlugin('PgNative');

/** Internal endpoints only — never show these IDs in the UI. */
const TEXT_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];
const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-tts',
];

const KEY_LS = 'pg_pfx_api_key';
const VOICE_LS = 'pg_pfx_voice';

/** Branded PureFxAi voices → internal prebuilt voice ids */
export const PUREFX_VOICES = [
  { id: 'soft', label: { th: 'นุ่ม', en: 'Soft', zh: '柔和', ja: 'ソフト' }, voice: 'Kore' },
  { id: 'clear', label: { th: 'ชัด', en: 'Clear', zh: '清晰', ja: 'クリア' }, voice: 'Puck' },
  { id: 'deep', label: { th: 'ทุ้ม', en: 'Deep', zh: '低沉', ja: '低め' }, voice: 'Charon' },
  { id: 'bold', label: { th: 'หนัก', en: 'Bold', zh: '有力', ja: '力強い' }, voice: 'Fenrir' },
  { id: 'bright', label: { th: 'สดใส', en: 'Bright', zh: '明亮', ja: '明るい' }, voice: 'Aoede' },
  { id: 'device', label: { th: 'เสียงเครื่อง', en: 'Device', zh: '本机', ja: '端末' }, voice: null },
];

let memKey = null;
let lastAudio = null;

function scrub(text) {
  return String(text || '')
    .replace(/\bGemini[\w.\-]*/gi, 'PureFxAi')
    .replace(/\bGoogle\b/gi, 'PureFxAi')
    .replace(/\bQwen[\w.\-]*/gi, 'PureFxAi')
    .replace(/\bNemotron[\w.\-]*/gi, 'PureFxAi')
    .replace(/\bOpenRouter\b/gi, 'PureFxAi')
    .replace(/\bOpenAI\b/gi, 'PureFxAi')
    .replace(/\bNVIDIA\b/gi, 'PureFxAi')
    .replace(/\bGGUF\b/gi, '')
    .replace(/\b2B\b/g, '')
    .replace(/\b0\.8B\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free';
const OR_REFERER = import.meta.env.VITE_OPENROUTER_REFERER || 'https://gold.purefxai.store';
const OR_TITLE = import.meta.env.VITE_OPENROUTER_TITLE || 'PUREGOLD';

function builtinOpenRouterKey() {
  return String(import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
}

function isGeminiKey(key) {
  return /^AIza[0-9A-Za-z_\-]{10,}/.test(String(key || '').trim());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryAfterMs(res) {
  const h = res?.headers?.get?.('retry-after') || res?.headers?.get?.('Retry-After');
  if (!h) return 0;
  const n = Number(h);
  if (Number.isFinite(n)) return Math.min(20000, Math.max(500, n >= 100 ? n : n * 1000));
  const t = Date.parse(h);
  if (!Number.isNaN(t)) return Math.min(20000, Math.max(500, t - Date.now()));
  return 0;
}

function httpError(status, message, extra = {}) {
  const err = new Error(message || `http_${status}`);
  err.status = status;
  if (status === 429) err.code = 'rate_limit';
  Object.assign(err, extra);
  return err;
}

/** Optional user-supplied override (Settings). Empty unless the user pasted a key. */
export async function getUserApiKey() {
  return getApiKey();
}

/** True when the optional Settings key can drive cloud TTS / Gemini text. */
export async function hasGeminiOverride() {
  return isGeminiKey(await getApiKey());
}

function hasBuiltinAi() {
  return !!builtinOpenRouterKey();
}

/** Credentials for chat / plan / news text. Built-in default, or Gemini if the user pasted one. */
async function textAuth() {
  const user = String(await getApiKey() || '').trim();
  if (isGeminiKey(user)) return { provider: 'gemini', key: user };
  if (hasBuiltinAi()) return { provider: 'openrouter', key: builtinOpenRouterKey() };
  if (user) return { provider: 'openrouter', key: user };
  return null;
}

export async function getApiKey() {
  if (memKey) return memKey;
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await Pg.getSecret({ name: 'pfx_api_key' });
      if (r?.value) { memKey = r.value; return memKey; }
    } catch {}
  }
  try {
    const v = localStorage.getItem(KEY_LS) || '';
    memKey = v;
    return v;
  } catch { return ''; }
}

export async function setApiKey(key) {
  const v = String(key || '').trim();
  memKey = v;
  if (Capacitor.isNativePlatform()) {
    try {
      if (v) await Pg.setSecret({ name: 'pfx_api_key', value: v });
      else await Pg.clearSecret({ name: 'pfx_api_key' });
    } catch {}
  }
  try {
    if (v) localStorage.setItem(KEY_LS, v);
    else localStorage.removeItem(KEY_LS);
  } catch {}
}

export function getVoiceId() {
  try { return localStorage.getItem(VOICE_LS) || 'soft'; } catch { return 'soft'; }
}

export function setVoiceId(id) {
  const ok = PUREFX_VOICES.some(v => v.id === id);
  try { localStorage.setItem(VOICE_LS, ok ? id : 'soft'); } catch {}
}

export function voiceMeta(id) {
  return PUREFX_VOICES.find(v => v.id === (id || getVoiceId())) || PUREFX_VOICES[0];
}

/** True when PureFxAi text is available (built-in default or a user key). */
export async function isMarkedReady() {
  const auth = await textAuth();
  return !!auth;
}

export function clearReady() {
  /* no-op for cloud mode — use setApiKey('') / clear leftover pack */
}

/** Cleanup leftover on-device packs from older app versions. */
export async function deleteDeviceModel() {
  memKey = memKey; // keep key
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

export async function nativeStatus() {
  const ready = await isMarkedReady();
  return {
    ready,
    downloading: false,
    done: ready ? 1 : 0,
    total: 1,
    path: null,
    engine: 'cloud',
  };
}

async function geminiGenerate(apiKey, model, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `http_${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

function orMessageText(data) {
  const msg = data?.choices?.[0]?.message || {};
  let text = msg.content;
  if (Array.isArray(text)) {
    text = text.map(p => (typeof p === 'string' ? p : (p?.text || p?.content || ''))).join('');
  }
  return scrub(String(text || '').trim());
}

async function openRouterOnce(apiKey, system, user, maxTokens) {
  const r = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': OR_REFERER,
      'X-Title': OR_TITLE,
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 429) {
    throw httpError(429, data?.error?.message || 'rate_limit', { retryAfterMs: retryAfterMs(r) });
  }
  if (!r.ok) {
    const msg = data?.error?.message || data?.message || `http_${r.status}`;
    throw httpError(r.status, msg);
  }
  const text = orMessageText(data);
  if (!text) throw httpError(r.status, 'empty');
  return text;
}

async function withRetry(fn) {
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const retryable = e.status === 429 || e.status === 503 || e.status === 502;
      if (!retryable || i === 3) throw e;
      const wait = e.retryAfterMs || (800 * (2 ** i) + Math.floor(Math.random() * 250));
      await sleep(Math.min(20000, wait));
    }
  }
  throw lastErr || new Error('unavailable');
}

async function generateOpenRouter(apiKey, system, user, opts = {}) {
  const base = opts.maxOutputTokens || 512;
  // Leave room for hidden reasoning tokens on the default model.
  let budget = Math.max(base + 256, 768);
  try {
    return await withRetry(() => openRouterOnce(apiKey, system, user, budget));
  } catch (e) {
    if (e && e.message === 'empty') {
      budget = Math.max(budget * 2, 1600);
      return await withRetry(() => openRouterOnce(apiKey, system, user, budget));
    }
    throw e;
  }
}

async function generateGemini(apiKey, system, user, opts = {}) {
  let lastErr;
  const maxOutputTokens = opts.maxOutputTokens || 512;
  for (const model of TEXT_MODELS) {
    try {
      const data = await withRetry(() => geminiGenerate(apiKey, model, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens,
        },
      }));
      const text = scrub(
        data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
      );
      if (!text) throw new Error('empty');
      return text;
    } catch (e) {
      lastErr = e;
      if (e.status === 404 || /not found|NOT_FOUND/i.test(String(e.message || ''))) continue;
      if (e.status === 429) throw e;
      continue;
    }
  }
  throw lastErr || new Error('unavailable');
}

async function generateText(system, user, opts = {}) {
  const auth = await textAuth();
  if (!auth) {
    const err = new Error('need_key');
    err.code = 'need_key';
    throw err;
  }
  if (auth.provider === 'gemini') return generateGemini(auth.key, system, user, opts);
  return generateOpenRouter(auth.key, system, user, opts);
}

function errCode(e) {
  if (!e) return '';
  if (e.code === 'rate_limit' || e.status === 429) return 'rate_limit';
  if (e.code === 'need_key' || e.message === 'need_key') return 'need_key';
  return String(e.message || e);
}

function buildPlanPrompt(A, lang) {
  const S = A?.setup || {};
  const b = A?.bias || {};
  const side = S.side || 'WAIT';
  const reasons = (b.reasons || []).map(r => (r && (r[lang] || r.en || r.th)) || '').filter(Boolean).slice(0, 4);
  const langName = { th: 'Thai', en: 'English', zh: 'Simplified Chinese', ja: 'Japanese' }[lang] || 'English';
  return {
    system:
      `You are PureFxAi, a gold (XAUUSD) trading education assistant inside the PUREGOLD app. ` +
      `Reply ONLY in ${langName}. Be concise (max 8 short lines). ` +
      `Never claim to be financial advice. Never invent prices that contradict the numbers given. ` +
      `Never mention any underlying AI vendor or model name — you are PureFxAi only. ` +
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
      `Education only, not financial advice. Brand yourself as PureFxAi only — never name other AI vendors/models.`,
    user:
      `Trader asked: ${String(userText || '').slice(0, 240)}\n` +
      `Context: XAU≈${A?.price} bias=${b.dir || 'side'} setup=${S.side || 'WAIT'} ` +
      `entry ${S.entry?.[0]}-${S.entry?.[1]} SL ${S.sl} TP ${S.tp}\n` +
      `Answer helpfully about gold trading / this plan / Exness signup education.`,
  };
}

/** Rule-based PureFxAi narrative if cloud call fails. */
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
      S.hyp ? 'สัญญาณยังไม่ชัด — ใช้เป็นสมมติฐาน รอยืนยัน' : 'อิงกฎเทคนิค + PureFxAi',
      'เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน',
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      `PureFxAi · 偏向：${b.dir === 'up' ? '上涨' : b.dir === 'down' ? '下跌' : '震荡'}（${b.conf ?? '?'}%）`,
      `计划：${side === 'BUY' ? '买入' : side === 'SELL' ? '卖出' : '观望'} · 入场 ${f(S.entry?.[0])}–${f(S.entry?.[1])}`,
      `止损 ${f(S.sl)} · 止盈 ${f(S.tp)} · 盈亏比 1:${S.rr ?? '-'}`,
      S.hyp ? '信号尚不明确 — 视为假设，等待确认' : '基于规则引擎 + PureFxAi',
      '仅供教育，非投资建议',
    ].join('\n');
  }
  return [
    `PureFxAi · Bias: ${b.dir || 'side'} (${b.conf ?? '?'}%)`,
    `Plan: ${side} · Entry ${f(S.entry?.[0])}–${f(S.entry?.[1])}`,
    `SL ${f(S.sl)} · TP ${f(S.tp)} · R:R 1:${S.rr ?? '-'}`,
    S.hyp ? 'No clear signal — hypothetical; wait for confirmation' : 'Based on rules + PureFxAi',
    'Education only. Not financial advice.',
  ].join('\n');
}

/**
 * Run PureFxAi analysis via the default cloud provider (or a user override).
 */
export async function analyzeWithPureFxAi(A, lang, onProgress) {
  onProgress?.({ phase: 'analyzing', pct: 100, done: 1, total: 1 });
  try {
    const { system, user } = buildPlanPrompt(A, lang);
    const text = await generateText(system, user);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: errCode(e),
    };
  }
}


export async function analyzeNewsWithPureFxAi(items, lang) {
  const langName = { th: 'Thai', en: 'English', zh: 'Simplified Chinese', ja: 'Japanese' }[lang] || 'English';
  const pack = (items || []).slice(0, 10).map(n => ({
    id: n.id,
    title: (lang === 'th' && n.title_th) ? n.title_th : (n.title_en || n.title_th || ''),
    summary: String((lang === 'th' && n.summary_th) ? n.summary_th : (n.summary_en || n.summary_th || '')).slice(0, 280),
    impact: n.impact || 'neutral',
    level: n.level || 'medium',
  }));
  const system =
    `You are PureFxAi, the gold-market assistant inside PUREGOLD. ` +
    `Reply ONLY in ${langName}. Return ONLY valid JSON — no markdown fences. ` +
    `Never mention any AI vendor or model name — you are PureFxAi only. ` +
    `Education only, not financial advice. ` +
    `JSON shape: {"summary":"2-4 sentences overall gold-market impact",` +
    `"items":[{"id":"...","bias":"bullish|bearish|neutral","strength":"high|medium|low","text":"1-2 sentences why this moves gold"}]}`;
  const user =
    `Analyze these latest gold headlines for XAU/gold market impact.\n` +
    JSON.stringify(pack);
  try {
    const raw = await generateText(system, user, { maxOutputTokens: 1400 });
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
    const map = {};
    (parsed.items || []).forEach(it => {
      if (!it || !it.id) return;
      const bias = ['bullish', 'bearish', 'neutral'].includes(it.bias) ? it.bias : 'neutral';
      const strength = ['high', 'medium', 'low', 'strong'].includes(it.strength) ? (it.strength === 'strong' ? 'high' : it.strength) : 'medium';
      map[it.id] = { bias, strength, text: scrub(it.text || '') };
    });
    return {
      summary: scrub(parsed.summary || ''),
      items: map,
      source: 'model',
    };
  } catch (e) {
    return { summary: '', items: {}, source: 'none', error: errCode(e) };
  }
}


export async function translateNewsWithPureFxAi(items, lang) {
  const langName = { th: 'Thai', zh: 'Simplified Chinese', ja: 'Japanese' }[lang];
  if (!langName) return { items: {}, error: 'skip' };
  const pack = (items || []).map(n => ({
    id: n.id,
    title: n.title_en || n.title_th || n.title_zh || n.title_ja || '',
    summary: String(n.summary_en || n.summary_th || n.summary_zh || n.summary_ja || '').slice(0, 280),
  })).filter(n => n.id && n.title);
  if (!pack.length) return { items: {} };
  const system =
    `You are PureFxAi inside PUREGOLD. Reply ONLY valid JSON — no markdown fences. ` +
    `Translate each gold-news headline and a short 1-sentence summary into ${langName}. ` +
    `Keep meaning accurate. No HTML, no links, no entity codes, no vendor or model names. ` +
    `JSON shape: {"items":[{"id":"...","title":"...","summary":"..."}]}`;
  const user = `Translate these headlines into ${langName}:\n` + JSON.stringify(pack);
  try {
    const raw = await generateText(system, user, { maxOutputTokens: 1800 });
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
    const map = {};
    (parsed.items || []).forEach(it => {
      if (!it || !it.id) return;
      const title = String(it.title || '').replace(/<[^>]+>/g, ' ').trim();
      const summary = String(it.summary || '').replace(/<[^>]+>/g, ' ').trim();
      if (title) map[it.id] = { title, summary };
    });
    return { items: map, source: 'model' };
  } catch (e) {
    return { items: {}, error: errCode(e) };
  }
}

export async function chatWithPureFxAi(userText, A, lang) {
  try {
    const { system, user } = buildChatPrompt(userText, A, lang);
    const text = await generateText(system, user);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: errCode(e),
    };
  }
}

/** Stop any playing PureFxAi audio. */
export function stopCloudSpeech() {
  try { lastAudio?.pause?.(); } catch {}
  lastAudio = null;
}

function writeAscii(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/** Wrap raw 16-bit PCM in a WAV container so HTML Audio can play it. */
function pcmToWav(pcmBytes, sampleRate = 24000) {
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  out.set(pcmBytes, 44);
  return out;
}

function sampleRateFromMime(mime) {
  const m = /rate=(\d+)/i.exec(mime || '');
  return m ? parseInt(m[1], 10) : 24000;
}

function audioBytesForPlayback(bytes, mime) {
  const m = String(mime || '').toLowerCase();
  const hasRiff = bytes.length >= 4 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const rawPcm = /l16|pcm|raw/.test(m) || (!hasRiff && !/wav|mpeg|mp3|ogg|mp4|aac|webm/.test(m));
  if (rawPcm) {
    return { bytes: pcmToWav(bytes, sampleRateFromMime(mime)), mime: 'audio/wav' };
  }
  return { bytes, mime: m.includes('audio') ? mime : 'audio/wav' };
}

function isPreviewTts(model) {
  return /2\.5|3\.1|preview-tts/.test(model || '');
}

function ttsRequestBody(model, plain, voiceName, langCode) {
  if (isPreviewTts(model)) {
    return {
      contents: [{ parts: [{ text: plain }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          languageCode: langCode,
        },
      },
    };
  }
  return {
    contents: [{
      role: 'user',
      parts: [{
        text: plain,
        speechMetadata: { style: 'clear, friendly trading assistant' },
      }],
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { voice: voiceName } },
    },
  };
}

/**
 * Speak with PureFxAi cloud voice when key + non-device voice selected.
 * Returns 'played' | 'device' | 'failed'.
 */
export async function speakWithPureFxAi(text, lang) {
  const plain = String(text || '').replace(/\n+/g, '. ').slice(0, 500);
  if (!plain) return 'device';
  const meta = voiceMeta(getVoiceId());
  if (!meta.voice) return 'device';
  // Cloud TTS needs the optional user override key. Otherwise use device TTS.
  if (!(await hasGeminiOverride())) return 'device';
  const key = await getApiKey();
  if (!key) return 'device';

  const langCode = { th: 'th-TH', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP' }[lang] || 'en-US';
  for (const model of TTS_MODELS) {
    try {
      const data = await geminiGenerate(key, model, ttsRequestBody(model, plain, meta.voice, langCode));
      const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
      const inline = part?.inlineData || part?.inline_data;
      const b64 = inline?.data;
      const mime = inline?.mimeType || inline?.mime_type || 'audio/L16;codec=pcm;rate=24000';
      if (!b64) throw new Error('no_audio');
      stopCloudSpeech();
      const bin = atob(b64);
      const raw = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
      const play = audioBytesForPlayback(raw, mime);
      const blob = new Blob([play.bytes], { type: play.mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      lastAudio = audio;
      await new Promise((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('play')); };
        audio.play().catch(reject);
      });
      return 'played';
    } catch (e) {
      if (e.status === 404 || /not found|NOT_FOUND/i.test(String(e.message))) continue;
      continue;
    }
  }
  return 'failed';
}

export async function unloadModel() { stopCloudSpeech(); }
export function cancelInstall() {}
export async function ensureInstalled(onProgress) {
  onProgress?.({ phase: 'ready', pct: 100, done: 1, total: 1 });
  return { path: null, source: 'cloud' };
}
