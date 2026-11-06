/**
 * PureFxAi cloud analysis + speech for PUREGOLD.
 * Uses the user's API key (stored on-device). UI must brand as "PureFxAi" only —
 * never expose vendor/model names in user-facing strings.
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
    .replace(/\bGGUF\b/gi, '')
    .replace(/\b2B\b/g, '')
    .replace(/\b0\.8B\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

/** True when user has pasted an API key (PureFxAi online ready). */
export async function isMarkedReady() {
  const k = await getApiKey();
  return !!k;
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

async function generateText(apiKey, system, user) {
  let lastErr;
  for (const model of TEXT_MODELS) {
    try {
      const data = await geminiGenerate(apiKey, model, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 512,
        },
      });
      const text = scrub(
        data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
      );
      if (!text) throw new Error('empty');
      return text;
    } catch (e) {
      lastErr = e;
      // try next model on 404/not found
      if (e.status === 404 || /not found|NOT_FOUND/i.test(String(e.message))) continue;
      if (e.status === 429) throw e;
      continue;
    }
  }
  throw lastErr || new Error('unavailable');
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
 * Run PureFxAi analysis via cloud (requires API key in Settings).
 */
export async function analyzeWithPureFxAi(A, lang, onProgress) {
  onProgress?.({ phase: 'analyzing', pct: 100, done: 1, total: 1 });
  const key = await getApiKey();
  if (!key) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: 'need_key',
    };
  }
  try {
    const { system, user } = buildPlanPrompt(A, lang);
    const text = await generateText(key, system, user);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: String(e?.message || e),
    };
  }
}

export async function chatWithPureFxAi(userText, A, lang) {
  const key = await getApiKey();
  if (!key) {
    return { text: ruleNarrative(A, lang), source: 'rules', error: 'need_key' };
  }
  try {
    const { system, user } = buildChatPrompt(userText, A, lang);
    const text = await generateText(key, system, user);
    return { text, source: 'model' };
  } catch (e) {
    return {
      text: ruleNarrative(A, lang),
      source: 'rules',
      error: String(e?.message || e),
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
