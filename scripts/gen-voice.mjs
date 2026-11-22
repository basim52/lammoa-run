import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import { LINES } from '../src/lines.js';
const out = new URL('../public/voice/', import.meta.url);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let tts;
async function client(){ tts = new MsEdgeTTS(); await tts.setMetadata('ar-SA-ZariyahNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3); }
await client();
for (const [k, t] of Object.entries(LINES)) {
  const f = new URL(k + '.mp3', out);
  if (fs.existsSync(f) && fs.statSync(f).size > 2000) continue;
  for (let a = 0; a < 4; a++) {
    try {
      const { audioStream } = tts.toStream(esc(t), { pitch: '+2%', rate: '+4%' });
      const chunks = []; await new Promise((res, rej) => { audioStream.on('data', c => chunks.push(c)); audioStream.on('end', res); audioStream.on('error', rej); setTimeout(()=>rej(new Error('timeout')),20000); });
      const buf = Buffer.concat(chunks); if (buf.length < 2000) throw new Error('short');
      fs.writeFileSync(f, buf); console.log('ok', k, buf.length); break;
    } catch (e) { console.log('retry', k, e.message); await client(); }
  }
}
