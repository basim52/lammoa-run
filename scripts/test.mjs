import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const URL = process.argv[2] || 'http://localhost:4173/';
const OUT = '/workspace/lammoa-run-shots/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mode = process.argv[3] || 'all';
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(1500);
console.log('mime', await page.evaluate(() => window.lammoa.mime()));
if (mode === 'all' || mode === 'shots') {
  await page.screenshot({ path: OUT + 'portrait-menu.png' });
  await page.evaluate(() => window.lammoa.unlockAll());
  // كل مهمة ثواني مع حركات عشوائية للتأكد ما فيه أخطاء
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 99]) {
    await page.evaluate(id => { window.lammoa.play(id); }, id);
    await sleep(2600);
    for (let i = 0; i < 6; i++) { await page.evaluate(a => window.lammoa.act(a), ['left', 'right', 'up', 'down'][i % 4]); await sleep(450); }
    const st = await page.evaluate(() => ({ s: window.lammoa.state, objs: window.lammoa.G && window.lammoa.G.objs.length, t: window.lammoa.G && window.lammoa.G.t.toFixed(1) }));
    console.log('mission', id, JSON.stringify(st));
    if ([1, 4, 6, 7].includes(id)) await page.screenshot({ path: OUT + `portrait-m${id}.png` });
  }
  await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const id of [3, 8, 2]) {
    await page.evaluate(id => { window.lammoa.play(id); }, id); await sleep(5200);
    await page.screenshot({ path: OUT + `landscape-m${id}.png` });
  }
  await page.evaluate(() => { document.querySelector('#hud').classList.add('hidden'); });
}
if (mode === 'all' || mode === 'rec') {
  for (const [fmt, id, vp] of [['v', 1, { width: 412, height: 915 }], ['h', 3, { width: 915, height: 412 }]]) {
    await page.setViewport({ ...vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.evaluate(id => { window.lammoa.play(id); }, id); await sleep(2500);
    await page.evaluate(f => window.lammoa.startRec(f), fmt);
    for (let i = 0; i < 16; i++) { await page.evaluate(a => window.lammoa.act(a), ['left', 'up', 'right', 'down'][i % 4]); await sleep(500); }
    await page.evaluate(() => window.lammoa.stopRec());
    await sleep(1500);
    const r = await page.evaluate(async () => { const { blob, name, mime } = window.__lastRec; const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { name, mime, data: btoa(s) }; });
    const ext = r.name.split('.').pop();
    const p = OUT + `sample-${fmt === 'v' ? 'vertical' : 'horizontal'}.${ext}`;
    fs.writeFileSync(p, Buffer.from(r.data, 'base64')); console.log('saved', p, r.mime);
    await page.screenshot({ path: OUT + `preview-${fmt}.png` });
    await page.evaluate(() => document.getElementById('prevClose').click());
  }
}
console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 30).join('\n'));
await browser.close();
