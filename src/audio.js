// كل الصوت يمر من master: للسماعة + لمسار التسجيل
import { LINES } from './lines.js';
export const A = { ctx: null, master: null, music: null, sfx: null, voice: null, recDest: null, muted: false, buffers: {}, musicTimer: null, voiceSrc: null };
const BASE = import.meta.env.BASE_URL;

export function initAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  A.ctx = ctx;
  A.master = ctx.createGain(); A.master.gain.value = A.muted ? 0 : 1;
  A.master.connect(ctx.destination);
  A.recDest = ctx.createMediaStreamDestination();
  A.master.connect(A.recDest);
  A.music = ctx.createGain(); A.music.gain.value = 0.18; A.music.connect(A.master);
  A.sfx = ctx.createGain(); A.sfx.gain.value = 0.35; A.sfx.connect(A.master);
  A.voice = ctx.createGain(); A.voice.gain.value = 1.0; A.voice.connect(A.master);
  // ضاغط بسيط عشان الصوت ما يتشوّه بالتسجيل
}
export function setMuted(m) { A.muted = m; if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 1, A.ctx.currentTime, 0.02); try { localStorage.setItem('lr_muted', m ? '1' : '0'); } catch {} }

export async function loadLine(key) {
  if (A.buffers[key] || !A.ctx) return A.buffers[key];
  try {
    const r = await fetch(`${BASE}voice/${key}.mp3`);
    const ab = await r.arrayBuffer();
    A.buffers[key] = await A.ctx.decodeAudioData(ab);
  } catch (e) { console.warn('voice', key, e); }
  return A.buffers[key];
}
export function preload(keys) { return Promise.all(keys.map(loadLine)); }

// يرجّع مدة الجملة بالثواني
export async function playLine(key) {
  if (!A.ctx) return 0;
  const buf = await loadLine(key);
  if (!buf) return 1.5;
  if (A.voiceSrc) { try { A.voiceSrc.stop(); } catch {} }
  const s = A.ctx.createBufferSource(); s.buffer = buf; s.connect(A.voice); s.start();
  A.voiceSrc = s;
  // خفض الموسيقى وقت الكلام
  const t = A.ctx.currentTime; A.music.gain.cancelScheduledValues(t);
  A.music.gain.setTargetAtTime(0.06, t, 0.05); A.music.gain.setTargetAtTime(0.18, t + buf.duration, 0.3);
  return buf.duration;
}
export const lineText = k => LINES[k] || '';

function tone(freq, dur, type = 'square', vol = 0.5, slide = 0, when = 0) {
  if (!A.ctx) return;
  const t = A.ctx.currentTime + when;
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.4) {
  if (!A.ctx) return;
  const n = A.ctx.sampleRate * dur, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = A.ctx.createBufferSource(), g = A.ctx.createGain(); s.buffer = b; g.gain.value = vol;
  s.connect(g); g.connect(A.sfx); s.start();
}
export const sfx = {
  spark: () => { tone(880, 0.08, 'triangle', 0.35); tone(1320, 0.1, 'triangle', 0.25, 0, 0.05); },
  jump: () => tone(300, 0.2, 'square', 0.25, 400),
  slide: () => noise(0.18, 0.25),
  lane: () => tone(500, 0.05, 'triangle', 0.15),
  hit: () => { noise(0.3, 0.6); tone(160, 0.3, 'sawtooth', 0.4, -100); },
  power: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.25, 0, i * 0.07)),
  win: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.35, 0, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.25, 0, i * 0.18)),
  wrong: () => tone(200, 0.25, 'square', 0.3, -60),
  horn: () => { tone(330, 0.35, 'square', 0.25); tone(415, 0.35, 'square', 0.2); },
  tick: () => tone(1000, 0.04, 'square', 0.15),
  go: () => tone(784, 0.4, 'square', 0.3, 200),
};

// موسيقى خلفية مولّدة بالكود، تتغير حسب المكان
const SCALES = {
  souq: [0, 1, 4, 5, 7, 8, 10], desert: [0, 1, 4, 5, 7, 8, 11], city: [0, 2, 4, 7, 9], mall: [0, 2, 4, 5, 7, 9, 11],
  cafe: [0, 3, 5, 7, 10], rooftop: [0, 2, 3, 7, 8], night: [0, 1, 4, 5, 7, 8, 10],
};
export function startMusic(loc = 'city', bpm = 118) {
  stopMusic(); if (!A.ctx) return;
  const scale = SCALES[loc] || SCALES.city, root = loc === 'desert' || loc === 'souq' || loc === 'night' ? 146.83 : 196;
  const step = 60 / bpm / 2; let i = 0; let next = A.ctx.currentTime + 0.1;
  const mel = Array.from({ length: 16 }, (_, k) => (k % 4 === 3 ? -1 : scale[(k * 3 + (k > 7 ? 2 : 0)) % scale.length]));
  const play = (f, t, d, type, v) => { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(A.music); o.start(t); o.stop(t + d + 0.02); };
  const kick = t => { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(A.music); o.start(t); o.stop(t + 0.16); };
  const sched = () => {
    while (next < A.ctx.currentTime + 0.3) {
      const k = i % 16;
      if (k % 4 === 0) kick(next);
      if (k % 4 === 2) play(root / 2 * Math.pow(2, scale[(i >> 4) % 2 ? 4 % scale.length : 0] / 12), next, step * 1.6, 'triangle', 0.5);
      if (k % 2 === 1 && (loc === 'souq' || loc === 'desert' || loc === 'night')) play(2000, next, 0.03, 'square', 0.08); // دف
      const m = mel[(k + (i >> 5) * 5) % 16];
      if (m >= 0) play(root * 2 * Math.pow(2, m / 12), next, step * 0.9, loc === 'mall' || loc === 'cafe' ? 'sine' : 'square', 0.18);
      next += step; i++;
    }
  };
  sched(); A.musicTimer = setInterval(sched, 100);
}
export function stopMusic() { if (A.musicTimer) clearInterval(A.musicTimer); A.musicTimer = null; }
