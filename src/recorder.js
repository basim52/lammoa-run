// تسجيل الفيديو: مشهد اللعبة + واجهة مرسومة + صوت اللعبة
import { A } from './audio.js';
export const FORMATS = { v: { w: 1080, h: 1920, label: 'عمودي 9:16' }, h: { w: 1920, h: 1080, label: 'أفقي 16:9' } };
const MIMES = ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export function pickMime() { if (!window.MediaRecorder) return null; return MIMES.find(m => MediaRecorder.isTypeSupported(m)) || ''; }

export class Recorder {
  constructor() { this.active = false; this.comp = document.createElement('canvas'); this.ctx = this.comp.getContext('2d'); }
  start(fmt) {
    const F = FORMATS[fmt]; this.fmt = fmt; this.F = F;
    this.comp.width = F.w; this.comp.height = F.h;
    this.ctx.fillStyle = '#0B2A6F'; this.ctx.fillRect(0, 0, F.w, F.h);
    const vs = this.comp.captureStream(30);
    const tracks = [...vs.getVideoTracks()];
    if (A.recDest) tracks.push(...A.recDest.stream.getAudioTracks());
    this.mime = pickMime();
    const opts = { videoBitsPerSecond: fmt === 'v' || fmt === 'h' ? 8_000_000 : 6_000_000, audioBitsPerSecond: 128000 };
    if (this.mime) opts.mimeType = this.mime;
    this.chunks = [];
    this.mr = new MediaRecorder(new MediaStream(tracks), opts);
    this.mime = this.mr.mimeType || this.mime || 'video/webm';
    this.mr.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.done = new Promise(res => { this.mr.onstop = () => res(new Blob(this.chunks, { type: this.mime.split(';')[0] })); });
    this.mr.start(1000);
    this.active = true; this.t0 = performance.now();
  }
  async stop() { if (!this.active) return null; this.active = false; this.mr.stop(); const b = await this.done; this.blob = b; return b; }
  get ext() { return (this.mime || '').includes('mp4') ? 'mp4' : 'webm'; }
  // يُستدعى بعد كل رسم للمشهد
  frame(glCanvas, hud) {
    if (!this.active) return;
    const c = this.ctx, W = this.comp.width, H = this.comp.height, s = Math.min(W, H) / 1080;
    c.drawImage(glCanvas, 0, 0, W, H);
    c.save(); c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    // العنوان والعلامة المائية
    const ty = (this.fmt === 'v' ? 150 : 70) * s;
    c.font = `${(this.fmt === 'v' ? 96 : 74) * s}px Lalezar, Tajawal, sans-serif`;
    c.lineJoin = 'round'; c.lineWidth = 14 * s; c.strokeStyle = '#0B2A6F'; c.fillStyle = '#FFC93C';
    const title = 'لمّوعة • فرفشة';
    c.strokeText(title, W / 2, ty); c.fillText(title, W / 2, ty);
    // المهمة والنقاط
    if (hud.mission) {
      c.font = `${44 * s}px Lalezar, Tajawal, sans-serif`;
      const t = `${hud.mission}   ✨ ${hud.score}   ⏱ ${hud.time}`;
      const tw = c.measureText(t).width + 50 * s, y = ty + (this.fmt === 'v' ? 100 : 70) * s;
      c.fillStyle = 'rgba(11,42,111,.85)'; rr(c, W / 2 - tw / 2, y - 34 * s, tw, 68 * s, 34 * s); c.fill();
      c.fillStyle = '#fff'; c.fillText(t, W / 2, y + 3 * s);
      if (hud.progress != null) { const bw = Math.min(W * 0.7, 700 * s), by = y + 52 * s; c.fillStyle = '#fff'; rr(c, W / 2 - bw / 2, by, bw, 20 * s, 10 * s); c.fill(); c.fillStyle = '#FF8A1E'; rr(c, W / 2 + bw / 2 - bw * hud.progress, by, bw * hud.progress, 20 * s, 10 * s); c.fill(); }
    }
    // فقاعة الكلام
    if (hud.bubble) {
      c.font = `${50 * s}px Lalezar, Tajawal, sans-serif`;
      const maxW = W * 0.78, lines = wrap(c, hud.bubble, maxW);
      const lh = 66 * s, bh = lines.length * lh + 40 * s, bw = Math.max(...lines.map(l => c.measureText(l).width)) + 70 * s;
      const by = H - bh - (this.fmt === 'v' ? 300 : 70) * s, bx = W / 2 - bw / 2 + 60 * s;
      c.fillStyle = '#fff'; c.strokeStyle = '#0B2A6F'; c.lineWidth = 8 * s; rr(c, bx, by, bw, bh, 36 * s); c.fill(); c.stroke();
      c.fillStyle = '#0B2A6F'; lines.forEach((l, i) => c.fillText(l, bx + bw / 2, by + 20 * s + lh * (i + 0.5) + 4 * s));
      if (hud.avatar && hud.avatar.complete) { const aw = 150 * s; c.drawImage(hud.avatar, bx - aw * 0.95, by + bh - aw * 0.95, aw, aw * 693 / 615); }
    }
    if (hud.center) { c.font = `${220 * s}px Lalezar, sans-serif`; c.lineWidth = 18 * s; c.strokeStyle = '#0B2A6F'; c.fillStyle = '#FFC93C'; c.strokeText(hud.center, W / 2, H / 2); c.fillText(hud.center, W / 2, H / 2); }
    c.restore();
  }
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrap(c, text, maxW) { const words = text.split(' '), out = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
