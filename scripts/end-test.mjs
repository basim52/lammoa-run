import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await p.goto(process.argv[2], { waitUntil: 'load' }); const s = ms => new Promise(r => setTimeout(r, ms)); await s(1500);
await p.evaluate(() => localStorage.clear());
for (const [id, force] of [[1, 'G.gap=0.05'], [2, 'G.time=0.05'], [4, 'G.strikes=3']]) {
  await p.evaluate(id => window.lammoa.play(id), id); await s(3200);
  await p.evaluate(f => { const G = window.lammoa.G; eval(f); }, force); await s(6000);
  const r = await p.evaluate(() => ({ state: window.lammoa.state, title: document.getElementById('enTitle').textContent, stars: document.getElementById('enStars').textContent, prog: localStorage.getItem('lr_progress') }));
  console.log(id, JSON.stringify(r));
}
await p.screenshot({ path: '/workspace/lammoa-run-shots/portrait-end.png' });
console.log('errors', errs); await b.close();
