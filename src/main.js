import * as THREE from 'three';
import { makeLammoa, animLammoa, makeCat, makeSheep, makeGuard, makeBus, makePigeons, animCreature } from './models.js';
import { LOCS, LANE_X, groundTexture, makeDecor, makeObstacle, makeSpark, makePower, POWERS, makeCup, CUPS } from './world.js';
import { MISSIONS, ENDLESS } from './missions.js';
import { A, initAudio, setMuted, playLine, lineText, preload, sfx, startMusic, stopMusic } from './audio.js';
import { Recorder, FORMATS, pickMime } from './recorder.js';

const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

// ---------- three ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('stage').appendChild(renderer.domElement);
const glc = renderer.domElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160);
const amb = new THREE.HemisphereLight(0xffffff, 0xbba58a, 2.3); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(-5, 10, 6); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(LANE_X * 3 + 1.4, 200), new THREE.MeshLambertMaterial({ color: 0xffffff }));
ground.rotation.x = -Math.PI / 2; ground.position.z = -70; scene.add(ground);
const sideGround = new THREE.Mesh(new THREE.PlaneGeometry(80, 200), new THREE.MeshLambertMaterial({ color: 0xffffff }));
sideGround.rotation.x = -Math.PI / 2; sideGround.position.set(0, -0.02, -70); scene.add(sideGround);
const player = makeLammoa(); scene.add(player);
const world = new THREE.Group(); scene.add(world);
const decorGroup = new THREE.Group(); scene.add(decorGroup);
const avatarImg = new Image(); avatarImg.src = import.meta.env.BASE_URL + 'lammoa.png';

const rec = new Recorder();
let view = { w: 1, h: 1 };
function frameCamera(aspect) {
  camera.aspect = aspect;
  if (aspect < 0.8) { camera.fov = 70; camera.position.set(0, 6.0, 8.6); camera.lookAt(0, 0.6, -6); }
  else { camera.fov = 52; camera.position.set(0, 4.3, 7.4); camera.lookAt(0, 1.0, -9); }
  camera.updateProjectionMatrix();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  if (rec.active) { // أثناء التسجيل: نرسم بمقاس الفيديو ونعرضه داخل الشاشة
    const F = rec.F; renderer.setPixelRatio(1); renderer.setSize(F.w, F.h, false);
    const s = Math.min(w / F.w, h / F.h); glc.style.width = F.w * s + 'px'; glc.style.height = F.h * s + 'px';
    frameCamera(F.w / F.h);
  } else {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.setSize(w, h);
    frameCamera(w / h);
  }
  view = { w, h };
}
addEventListener('resize', resize); resize();

// ---------- environment ----------
let curLoc = null, groundTex = null;
const decor = [];
function setLocation(loc) {
  if (curLoc === loc) return; curLoc = loc; const L = LOCS[loc];
  scene.background = new THREE.Color(L.sky); scene.fog = new THREE.Fog(L.fog, 30, 95);
  amb.color.set(L.amb); sun.color.set(L.sun); sun.intensity = L.sunI;
  amb.intensity = loc === 'rooftop' || loc === 'night' ? 1.8 : 2.3; sun.intensity = L.sunI * 1.6;
  if (groundTex) groundTex.dispose(); groundTex = groundTexture(loc);
  ground.material.map = groundTex; ground.material.needsUpdate = true;
  sideGround.material.color.set(loc === 'rooftop' ? 0x10183a : new THREE.Color(L.ground).multiplyScalar(0.9));
  sideGround.position.y = loc === 'rooftop' ? -30 : -0.02;
  decor.forEach(d => decorGroup.remove(d)); decor.length = 0;
  for (let z = 10; z > -110; z -= 5.5) for (const s of [-1, 1]) addDecor(s, z + rnd(-1, 1));
}
function addDecor(side, z) {
  const d = makeDecor(curLoc); d.position.set(side * (LANE_X * 1.5 + 2.2 + rnd(0, 1.2)), 0, z); d.rotation.y = side * -Math.PI / 2;
  d.userData.side = side; decorGroup.add(d); decor.push(d);
}

// ---------- game state ----------
let G = null; // الجولة الحالية
let state = 'menu';
let progress = store.get('lr_progress', { unlocked: 1, stars: {}, best: 0 });
function saveProgress() { store.set('lr_progress', progress); }

const CREATURES = { cat: () => makeCat(true), sheep: makeSheep, guard: makeGuard, bus: makeBus, pigeons: makePigeons };
function newRun(m) {
  world.clear();
  const g = {
    m, t: 0, time: m.T || 0, dist: 0, speed: m.speed, base: m.speed, sparks: 0, hits: 0, lane: 0, x: 0, y: 0, vy: 0, slide: 0,
    invul: 0, objs: [], toNext: 30, power: { magnet: 0, speed: 0, shield: false }, combo: 0, over: false, talkUntil: 0, lastTalk: -99,
    gap: m.gap || 0, chaserD: 8, strikes: 0, correct: 0, order: 0, wrong: 0, look: { phase: 'walk', t: rnd(3, 5), spotted: false }, said: {}, levelAt: 400, locIdx: 0,
  };
  // الشخصية المطاردة أو الهدف
  if (m.creature) {
    g.creature = CREATURES[m.creature](); world.add(g.creature); g.creature.userData.lane = 0;
    if (m.gang) { g.gang = [makeCat(false, 0x777777), makeCat(false, 0x222222)]; g.gang.forEach(c => world.add(c)); }
  }
  if (m.type === 'endless') { g.creature = makeSheep(); g.creature.userData.lane = 0; world.add(g.creature); }
  if (m.type === 'orders') g.order = (Math.random() * 3) | 0;
  setLocation(m.loc);
  return g;
}

// ---------- spawning ----------
const laneX = l => l * LANE_X;
function addObj(obj, lane, z, extra = {}) { obj.position.set(laneX(lane), obj.position.y, z); obj.userData = { ...obj.userData, lane, ...extra }; world.add(obj); G.objs.push(obj); return obj; }
function spawnRow(z) {
  const m = G.m, lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const loc = curLoc;
  // صفوف الفراغات فوق السطوح
  if (m.gaps && Math.random() < 0.38) { addObj(makeObstacle(loc, 'gap'), 0, z).position.x = 0; for (let i = 0; i < 4; i++) addObj(makeSpark(), lanes[0], z + 2 - i * 1.4).position.y = 1.0 + Math.sin(i / 3 * Math.PI) * 1.0; return; }
  let nObs = Math.random() < (G.t < 6 ? 0.85 : 0.5) ? 1 : 2;
  if (m.type === 'stealth' || m.type === 'orders') nObs = Math.random() < 0.45 ? 0 : 1;
  const types = m.vehicle ? ['block', 'block', 'low'] : m.type === 'stealth' ? ['low', 'high', 'block'] : ['low', 'high', 'block', 'block'];
  const blocked = [];
  for (let i = 0; i < nObs; i++) {
    const t = pick(types), lane = lanes[i];
    addObj(makeObstacle(loc, t, m.vehicle), lane, z); if (t === 'block') blocked.push(lane);
  }
  const free = lanes.slice(nObs);
  if (m.type === 'orders') { // أكواب بثلاث ألوان
    if (Math.random() < 0.75) { const others = [0, 1, 2].filter(c => c !== G.order).sort(() => Math.random() - 0.5); free.forEach((l, i) => { addObj(makeCup(i === 0 ? G.order : others[i - 1]), l, z - 4).position.y = 0.6; }); }
    return;
  }
  const r = Math.random();
  if (r < 0.08 && free.length) addObj(makePower(pick(['magnet', 'shield', 'speed'])), free[0], z - 5).position.y = 1.0;
  else if (free.length) { const l = free[(Math.random() * free.length) | 0]; for (let i = 0; i < 5; i++) addObj(makeSpark(), l, z - 3 - i * 2.2).position.y = 0.8; }
}

// ---------- talking ----------
let bubbleTimer = 0;
async function say(key, { prio = false } = {}) {
  if (!G && !prio) return 0;
  const now = performance.now() / 1000;
  if (!prio && G && now - G.lastTalk < 3.2) return 0;
  if (G) G.lastTalk = now;
  const text = lineText(key);
  $('bubble').textContent = text; $('bubbleWrap').classList.add('show');
  hudState.bubble = text;
  const dur = await playLine(key) || 2;
  if (G) G.talkUntil = performance.now() / 1000 + dur;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { $('bubbleWrap').classList.remove('show'); hudState.bubble = ''; }, dur * 1000 + 700);
  return dur;
}

// ---------- input ----------
let touch = null;
function act(a) {
  if (state !== 'play' || !G || G.over) return;
  if (a === 'left' && G.lane > -1) { G.lane--; sfx.lane(); }
  if (a === 'right' && G.lane < 1) { G.lane++; sfx.lane(); }
  if (a === 'up' && G.y <= 0.01) { G.vy = 9.2; G.slide = 0; sfx.jump(); }
  if (a === 'down' && !G.m.vehicle) { G.slide = G.m.type === 'stealth' ? 2.0 : 0.8; if (G.y > 0) G.vy = -14; sfx.slide(); }
}
glc.addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY, t: performance.now(), used: false }; });
addEventListener('pointermove', e => {
  if (!touch || touch.used) return; const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.hypot(dx, dy) > 28) { touch.used = true; act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down')); }
});
addEventListener('pointerup', e => {
  if (touch && !touch.used && performance.now() - touch.t < 350 && e.target === glc) { const x = e.clientX / innerWidth; act(x < 0.33 ? 'left' : x > 0.67 ? 'right' : 'up'); }
  touch = null;
});
addEventListener('keydown', e => { const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', ' ': 'up' }[e.key]; if (k) { e.preventDefault(); act(k); } });

// ---------- HUD ----------
const hudState = { mission: '', score: 0, time: '', bubble: '', center: '', progress: null, avatar: avatarImg };
function setCenter(t) { $('center').textContent = t; hudState.center = t; }
function updateHUD() {
  const m = G.m; let prog = 0, sub = '';
  if (m.type === 'chase') { prog = 1 - clamp(G.gap / m.gap, 0, 1); sub = `${m.creature === 'bus' ? '🚌' : '🐱'} قدامك بـ ${Math.max(0, G.gap).toFixed(0)} متر`; }
  else if (m.type === 'escape') { prog = clamp(G.t / m.T, 0, 1); sub = `${m.creature === 'sheep' ? '🐑' : '🕊️'} ورا لمّوعة: ${'🟥'.repeat(Math.ceil((10 - G.chaserD) / 2.5))}${'⬜'.repeat(4 - Math.ceil((10 - G.chaserD) / 2.5))}`; }
  else if (m.type === 'delivery') { prog = clamp(G.dist / m.D, 0, 1); sub = `🍔 باقي ${Math.max(0, m.D - G.dist).toFixed(0)} متر`; }
  else if (m.type === 'stealth') { prog = clamp(G.t / m.T, 0, 1); sub = `👀 شافك: ${'❌'.repeat(G.strikes)}${'⚪'.repeat(3 - G.strikes)}`; }
  else if (m.type === 'orders') { prog = clamp(G.correct / m.N, 0, 1); sub = `☕ ${G.correct}/${m.N}   غلط: ${'❌'.repeat(G.wrong)}`; }
  else { prog = 0; sub = `🏃 ${G.dist.toFixed(0)} م   الأفضل ${progress.best}`; }
  $('goalTitle').textContent = `${m.icon} ${m.title}`; $('goalSub').textContent = sub; $('goalFill').style.width = (prog * 100) + '%';
  const score = endlessScore();
  $('score').textContent = `✨ ${m.type === 'endless' ? score : G.sparks}`;
  const tl = m.type === 'endless' ? `${G.dist.toFixed(0)}م` : Math.ceil(Math.max(0, G.time)).toString();
  $('timer').textContent = m.type === 'endless' ? tl : '⏱ ' + tl;
  $('powers').innerHTML = ['magnet', 'speed'].filter(k => G.power[k] > 0).map(k => `<span>${POWERS[k].icon} ${Math.ceil(G.power[k])}</span>`).join('') + (G.power.shield ? '<span>🛡️</span>' : '');
  if (m.type === 'orders') { $('order').classList.remove('hidden'); $('order').innerHTML = `الطلب: <i style="background:${CUPS[G.order].css}"></i> ${CUPS[G.order].name}`; } else $('order').classList.add('hidden');
  Object.assign(hudState, { mission: m.title, score: m.type === 'endless' ? score : G.sparks, time: tl, progress: m.type === 'endless' ? null : prog });
}
const endlessScore = () => Math.floor(G.dist) + G.sparks * 10;

// ---------- update ----------
function hit(obj) {
  if (G.invul > 0) return;
  if (G.power.speed > 0) { knock(obj); return; }
  if (G.power.shield) { G.power.shield = false; knock(obj); sfx.power(); G.invul = 1; return; }
  G.hits++; G.invul = 1.1; G.combo = 0; sfx.hit(); knock(obj);
  $('flash').style.opacity = 0.35; setTimeout(() => $('flash').style.opacity = 0, 120);
  shake = 0.35;
  const m = G.m;
  if (m.type === 'chase') G.gap += m.hitPen;
  else if (m.type === 'escape' || m.type === 'endless') G.chaserD -= obj && obj.userData.type === 'gap' ? 4.2 : 3.4;
  else G.time -= m.type === 'delivery' ? 4 : 3;
  if (m.type === 'delivery' || m.type === 'orders' || m.type === 'stealth') G.speed = Math.max(G.base * 0.6, G.speed * 0.7);
  say(Math.random() < 0.5 ? 'hit' : 'hit2');
}
function knock(obj) { if (obj && obj.userData.type !== 'gap') obj.userData.knocked = 1; }
let shake = 0;
function update(dt) {
  const m = G.m; G.t += dt;
  if (m.T) G.time -= dt;
  // السرعة تزيد مع الوقت
  const target = (m.type === 'endless' ? G.base + Math.min(14, G.dist / 120) : G.base + Math.min(5, G.t / 12)) * (G.power.speed > 0 ? 1.45 : 1);
  G.speed += (target - G.speed) * Math.min(1, dt * 1.5);
  const dz = G.speed * dt; G.dist += dz;
  if (m.type === 'endless' && G.dist > G.levelAt) { G.levelAt += 400; say('levelup'); const locs = ['city', 'souq', 'desert', 'cafe', 'mall', 'rooftop', 'night']; G.locIdx++; G.pendingLoc = locs[G.locIdx % locs.length]; }
  if (G.pendingLoc && G.objs.length === 0) { setLocation(G.pendingLoc); swapChaser(); G.pendingLoc = null; }
  // اللاعب
  G.x += (laneX(G.lane) - G.x) * Math.min(1, dt * 14);
  G.vy -= 26 * dt; G.y = Math.max(0, G.y + G.vy * dt); if (G.y === 0) G.vy = 0;
  G.slide = Math.max(0, G.slide - dt); G.invul = Math.max(0, G.invul - dt);
  G.power.magnet = Math.max(0, G.power.magnet - dt); G.power.speed = Math.max(0, G.power.speed - dt);
  player.position.x = G.x;
  const talking = performance.now() / 1000 < G.talkUntil;
  animLammoa(player, dt, { run: G.speed / 12, y: G.y, slide: G.slide > 0, talk: talking, turn: talking ? Math.PI * 0.12 : Math.PI, vehicle: !!m.vehicle });
  player.visible = !(G.invul > 0 && Math.floor(G.t * 16) % 2);
  player.userData.shield.visible = G.power.shield;
  // الأرض والديكور
  if (groundTex) groundTex.offset.y += dz / (200 / 12);
  for (const d of decor) { d.position.z += dz; if (d.position.z > 14) { d.position.z -= 121; } }
  // الإنتاج
  if (!G.pendingLoc) { G.toNext -= dz; if (G.toNext <= 0) { spawnRow(-95); G.toNext = clamp(G.speed * 0.95, 12, 24) * (m.gaps ? 1.1 : 1); } }
  // الأجسام
  const px = G.x, py = G.y, sliding = G.slide > 0;
  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i], u = o.userData;
    o.position.z += dz - (u.moving ? u.moving * dt : 0);
    if (u.knocked) { u.knocked += dt; o.position.y += dt * 8; o.rotation.x += dt * 10; o.position.x += (o.position.x >= px ? 1 : -1) * dt * 8; }
    if (u.kind === 'spark' || u.kind === 'power' || u.kind === 'cup') o.rotation.y += dt * 3;
    if (u.kind === 'spark' && G.power.magnet > 0 && o.position.z > -14 && o.position.z < 2) { o.position.x += (px - o.position.x) * Math.min(1, dt * 8); o.position.y += (py + 0.8 - o.position.y) * Math.min(1, dt * 8); }
    const z = o.position.z;
    if (z > 12 || u.knocked > 1.2) { world.remove(o); G.objs.splice(i, 1); continue; }
    if (u.knocked || u.done) continue;
    const near = Math.abs(z) < (u.depth || 0.6) / 2 + 0.45;
    if (!near) { if (u.type && !u.passed && z > 1) { u.passed = true; if (Math.abs(o.position.x - px) < 1 && Math.random() < 0.18) say('near'); } continue; }
    const sameLane = u.type === 'gap' || Math.abs(o.position.x - px) < 1.0;
    if (!sameLane) continue;
    if (u.kind === 'spark') { if (Math.abs(o.position.y - (py + 0.8)) < 1.3) { u.done = true; world.remove(o); G.objs.splice(i, 1); collectSpark(); } continue; }
    if (u.kind === 'power') { u.done = true; world.remove(o); G.objs.splice(i, 1); power(u.power); continue; }
    if (u.kind === 'cup') { u.done = true; world.remove(o); G.objs.splice(i, 1); cup(u.cup); continue; }
    if (u.type === 'low' && py > 0.65) continue;
    if (u.type === 'high' && sliding) continue;
    if (u.type === 'gap' && py > 0.2) continue;
    u.done = true; hit(o);
  }
  missionLogic(dt);
  // الكاميرا
  const cx = G.x * 0.35; camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
  camera.position.y = (camera.aspect < 0.8 ? 6.0 : 4.3) + (shake > 0 ? rnd(-.1, .1) : 0);
  if (shake > 0) { shake -= dt; camera.position.x += rnd(-.15, .15); }
}
function collectSpark() { G.sparks++; G.combo++; sfx.spark(); if (G.m.type === 'chase') G.gap -= 0.12; if (G.combo % 25 === 0) say('combo'); }
function power(k) {
  sfx.power(); if (k === 'shield') G.power.shield = true; else G.power[k] = k === 'magnet' ? 8 : 4;
  if (k === 'speed') G.invul = Math.max(G.invul, 0.2);
  say(k, { prio: true });
}
function cup(i) {
  if (i === G.order) { G.correct++; G.sparks += 5; sfx.power(); G.order = (Math.random() * 3) | 0; G.objs.filter(o => o.userData.kind === 'cup').forEach(o => { world.remove(o); }); G.objs = G.objs.filter(o => o.userData.kind !== 'cup'); }
  else { G.wrong++; sfx.wrong(); say('m6_wrong', { prio: true }); $('flash').style.opacity = 0.3; setTimeout(() => $('flash').style.opacity = 0, 120); }
}
function swapChaser() {
  const kinds = ['sheep', 'guard', 'cat', 'pigeons']; const k = kinds[G.locIdx % kinds.length];
  if (G.creature) world.remove(G.creature);
  G.creature = k === 'cat' ? makeCat(false) : CREATURES[k](); world.add(G.creature); G.creature.userData.lane = 0;
  G.m = { ...G.m, creature: k, loc: curLoc };
}
function missionLogic(dt) {
  const m = G.m, c = G.creature, t = G.t;
  if (c) animCreature(c, t);
  if (m.type === 'chase') {
    G.gap -= m.close * dt * (G.power.speed > 0 ? 3 : 1);
    if (!G.said.mid && G.gap < m.gap * 0.5) { G.said.mid = true; say(m.key + '_mid', { prio: true }); }
    if (m.creature === 'bus' && Math.random() < dt * 0.15) sfx.horn();
    c.userData.laneT = (c.userData.laneT || 0) - dt; if (c.userData.laneT <= 0) { c.userData.lane = pick([-1, 0, 1]); c.userData.laneT = rnd(1.5, 3.5); }
    c.position.x += (laneX(m.creature === 'bus' ? 0 : c.userData.lane) - c.position.x) * Math.min(1, dt * 3);
    c.position.z = -(2.5 + Math.max(0, G.gap) * 1.15) - (m.creature === 'bus' ? 3 : 0);
    c.rotation.y = m.creature === 'bus' ? Math.PI : 0;
    if (G.gang) G.gang.forEach((g, i) => { animCreature(g, t + i); g.position.set(c.position.x + (i ? 1.3 : -1.3), g.position.y, c.position.z - 1.5 - i); });
    if (G.gap <= 0) return finish(true);
    if (G.time <= 0) return finish(false);
  } else if (m.type === 'escape' || m.type === 'endless') {
    G.chaserD = Math.min(10, G.chaserD + dt * 0.33);
    if (G.chaserD < 3.6 && !G.said.closeT) { G.said.closeT = 1; say(m.type === 'escape' && Math.random() < 0.5 ? m.key + '_mid' : 'close', { prio: true }); setTimeout(() => G && (G.said.closeT = 0), 7000); }
    c.position.x += (G.x - c.position.x) * Math.min(1, dt * 2.2);
    c.position.z = 1.4 + G.chaserD * 0.62; c.rotation.y = c.userData.kind === 'sheep' ? Math.PI : 0; if (c.userData.kind === 'pigeons') c.position.y = 0.6;
    if (c.userData.kind === 'guard') c.rotation.y = 0;
    c.visible = G.chaserD < 9.6;
    if (G.chaserD <= 0) return finish(m.type === 'endless' ? null : false);
    if (m.type === 'escape' && G.time <= 0) return finish(true);
  } else if (m.type === 'delivery') {
    if (!G.said.mid && G.dist > m.D * 0.4) { G.said.mid = true; say('m3_mid', { prio: true }); }
    if (G.dist >= m.D) return finish(true);
    if (G.time <= 0) return finish(false);
  } else if (m.type === 'stealth') {
    const L = G.look; L.t -= dt; const u = c.userData;
    c.position.set(Math.sin(t * 0.6) * 1.2, 0, -13);
    if (L.phase === 'walk' && L.t <= 0) { L.phase = 'alert'; L.t = 1.15; u.alert.visible = true; sfx.tick(); if (!G.said.look || Math.random() < 0.35) { G.said.look = 1; say('m4_look', { prio: true }); } }
    else if (L.phase === 'alert' && L.t <= 0) { L.phase = 'look'; L.t = 1.7; L.spotted = false; L.grace = 0.25; }
    else if (L.phase === 'look') {
      L.grace -= dt; u.alert.visible = false;
      if (L.grace <= 0 && !L.spotted && G.slide <= 0) { L.spotted = true; G.strikes++; sfx.wrong(); u.body.children.at(-1).visible = true; $('flash').style.opacity = 0.35; setTimeout(() => $('flash').style.opacity = 0, 150); if (G.strikes < 3) say('hit2', { prio: true }); }
      if (L.t <= 0) { L.phase = 'walk'; L.t = rnd(3, 5.5); u.body.children.at(-1).visible = false; }
    }
    c.rotation.y += ((L.phase === 'look' ? Math.PI : 0) - c.rotation.y) * Math.min(1, dt * 10);
    if (G.strikes >= 3) return finish(false);
    if (G.time <= 0) return finish(true);
  } else if (m.type === 'orders') {
    if (G.correct >= m.N) return finish(true);
    if (G.wrong >= 3 || G.time <= 0) return finish(false);
  }
}

// ---------- flow ----------
function showScreen(id) { for (const s of ['menu', 'intro', 'end', 'pause']) $(s).classList.toggle('hidden', s !== id); }
function buildMap() {
  const map = $('map'); map.innerHTML = '';
  MISSIONS.forEach(m => {
    const locked = m.id > progress.unlocked, st = progress.stars[m.id] || 0;
    const d = document.createElement('button'); d.className = 'mcard' + (locked ? ' locked' : '');
    d.innerHTML = `<div class="num">${m.id}</div><div class="ic">${m.icon}</div><div class="n">${m.title}</div><div class="l">📍 ${LOCS[m.loc].name}</div><div class="st">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</div>`;
    d.onclick = () => { initAudio(); if (locked) { sfx.wrong(); return; } openIntro(m); };
    map.appendChild(d);
  });
  const e = document.createElement('button'); e.className = 'mcard endless';
  e.innerHTML = `<div class="ic">${ENDLESS.icon}</div><div class="n">${ENDLESS.title}</div><div class="l" style="color:#fff">أفضل نتيجة: ${progress.best}</div>`;
  e.onclick = () => { initAudio(); openIntro(ENDLESS); }; map.appendChild(e);
}
let curMission = null;
function openIntro(m) {
  curMission = m; state = 'intro';
  preload(['start', 'hit', 'hit2', 'near', 'close', 'magnet', 'shield', 'speed', 'combo', 'record', 'gameover', 'levelup', 'unlock', ...Object.keys(LINES_FOR(m))]);
  $('inIcon').textContent = m.icon; $('inTitle').textContent = m.title; $('inLoc').textContent = '📍 ' + LOCS[m.loc].name;
  $('inLine').textContent = '«' + lineText(m.key + '_intro') + '»'; $('inGoal').textContent = m.goal;
  showScreen('intro');
  G = newRun(m); state = 'intro'; player.position.x = 0;
  playLine(m.key + '_intro').then(d => { introTalk = performance.now() / 1000 + (d || 0); });
}
function LINES_FOR(m) { const o = {}; for (const s of ['_intro', '_mid', '_win', '_lose', '_look', '_wrong']) if (lineText(m.key + s)) o[m.key + s] = 1; return o; }
async function startPlay() {
  showScreen(null); $('hud').classList.remove('hidden'); $('pauseBtn').classList.remove('hidden');
  state = 'count'; startMusic(curMission.loc === 'night' ? 'night' : curMission.loc, curMission.vehicle ? 132 : 120);
  for (const n of ['٣', '٢', '١']) { setCenter(n); sfx.tick(); await wait(650); }
  setCenter('انطلق!'); sfx.go(); state = 'play'; say('start', { prio: true }); setTimeout(() => state === 'play' && setCenter(''), 700);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function finish(win) {
  if (G.over) return; G.over = true; state = 'ending';
  const m = G.m; stopMusic();
  let stars = 0, title, line;
  if (m.type === 'endless') {
    const sc = endlessScore(), rec = sc > progress.best; if (rec) { progress.best = sc; saveProgress(); }
    title = rec ? 'رقم قياسي!' : 'مسكوك!'; line = rec ? 'record' : 'gameover'; win = rec;
  } else {
    title = win ? 'كفو! نجحت المهمة' : 'ما زبطت هالمرة';
    line = m.key + (win ? '_win' : '_lose');
    if (win) { stars = G.hits === 0 ? 3 : G.hits <= 2 ? 2 : 1; progress.stars[m.id] = Math.max(progress.stars[m.id] || 0, stars); if (progress.unlocked <= m.id && m.id < MISSIONS.length) { progress.unlocked = m.id + 1; G.unlockedNew = true; } saveProgress(); }
  }
  win ? sfx.win() : sfx.lose();
  if (win && m.type === 'chase') { G.creature.position.z = -1.5; }
  const dur = await say(line, { prio: true });
  await wait(Math.max(900, dur * 1000 - 600));
  $('enIcon').textContent = win ? '🏆' : '😅'; $('enTitle').textContent = title;
  $('enStars').textContent = m.type === 'endless' ? '' : '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('enLine').textContent = '«' + lineText(line) + '»';
  $('enStats').textContent = m.type === 'endless' ? `المسافة ${G.dist.toFixed(0)} م • الشرار ${G.sparks} • النتيجة ${endlessScore()}` : `الشرار ✨ ${G.sparks} • الصدمات ${G.hits}`;
  const next = MISSIONS.find(x => x.id === m.id + 1);
  $('nextBtn').classList.toggle('hidden', !(next && next.id <= progress.unlocked) || m.type === 'endless');
  $('hud').classList.add('hidden'); $('pauseBtn').classList.add('hidden');
  showScreen('end'); state = 'end';
  if (G.unlockedNew) setTimeout(() => say('unlock', { prio: true }), 400);
}
function toMenu() { stopMusic(); state = 'menu'; G = null; $('hud').classList.add('hidden'); $('pauseBtn').classList.add('hidden'); buildMap(); showScreen('menu'); setCenter(''); }

$('goBtn').onclick = () => { initAudio(); startPlay(); };
$('backBtn').onclick = toMenu; $('mapBtn').onclick = toMenu; $('quitBtn').onclick = toMenu;
$('againBtn').onclick = () => openIntro(curMission);
$('nextBtn').onclick = () => openIntro(MISSIONS.find(x => x.id === curMission.id + 1));
$('pauseBtn').onclick = () => { if (state === 'play') { state = 'paused'; showScreen('pause'); stopMusic(); } };
$('resumeBtn').onclick = () => { showScreen(null); state = 'play'; startMusic(curMission.loc === 'night' ? 'night' : curMission.loc); };
setMuted(store.get('lr_muted', 0) === 1); $('muteBtn').textContent = A.muted ? '🔇' : '🔊';
$('muteBtn').onclick = () => { initAudio(); setMuted(!A.muted); $('muteBtn').textContent = A.muted ? '🔇' : '🔊'; };

// ---------- recording UI ----------
let recTick = 0;
$('recBtn').onclick = async () => {
  initAudio();
  if (rec.active) return stopRec();
  if (!window.MediaRecorder || !glc.captureStream) { alert('المتصفح هذا ما يدعم التسجيل، جرّب كروم'); return; }
  if (state === 'play') { state = 'paused'; G.recPaused = true; }
  $('recSheet').classList.remove('hidden');
};
function startRec(fmt) {
  $('recSheet').classList.add('hidden');
  rec.start(fmt); resize();
  const b = $('recBtn'); b.classList.add('on'); const t0 = performance.now();
  b.textContent = '⏹ 0:00'; recTick = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); b.textContent = `⏹ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s >= 180) stopRec(); }, 500);
  if (G && G.recPaused) { G.recPaused = false; state = 'play'; }
}
async function stopRec() {
  clearInterval(recTick); const b = $('recBtn'); b.classList.remove('on'); b.textContent = '🎥';
  const blob = await rec.stop(); resize();
  if (state === 'play') { state = 'paused'; showScreen('pause'); stopMusic(); }
  const url = URL.createObjectURL(blob), name = `lammoa-${rec.fmt === 'v' ? 'vertical' : 'horizontal'}-${Date.now()}.${rec.ext}`;
  window.__lastRec = { blob, name, mime: rec.mime };
  $('prevVideo').src = url; $('dlBtn').href = url; $('dlBtn').download = name;
  $('prevInfo').textContent = `${FORMATS[rec.fmt].label} • ${FORMATS[rec.fmt].w}×${FORMATS[rec.fmt].h} • ${rec.ext.toUpperCase()} • ${(blob.size / 1048576).toFixed(1)} ميجا`;
  const file = new File([blob], name, { type: blob.type });
  $('shareBtn').classList.toggle('hidden', !(navigator.canShare && navigator.canShare({ files: [file] })));
  $('shareBtn').onclick = () => navigator.share({ files: [file], title: 'لمّوعة تركض', text: 'لمّوعة • فرفشة' }).catch(() => {});
  $('preview').classList.remove('hidden');
}
$('recV').onclick = () => startRec('v'); $('recH').onclick = () => startRec('h');
$('recCancel').onclick = () => { $('recSheet').classList.add('hidden'); if (G && G.recPaused) { G.recPaused = false; state = 'play'; } };
$('prevClose').onclick = () => { $('preview').classList.add('hidden'); $('prevVideo').pause(); };

// ---------- loop ----------
let last = performance.now(), menuT = 0, introTalk = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play' && G && !G.over) { update(dt); updateHUD(); }
  else if (state === 'ending' && G) { // لمّوعة تلتفت وتتكلم
    animLammoa(player, dt, { run: 0.3, talk: performance.now() / 1000 < G.talkUntil, turn: 0 });
    if (G.creature) animCreature(G.creature, (menuT += dt));
  } else if (state === 'menu' || state === 'intro' || state === 'count') {
    if (!curLoc) setLocation('souq');
    menuT += dt;
    animLammoa(player, dt, { run: state === 'count' ? 1 : 0.6, talk: state === 'intro' && performance.now() / 1000 < introTalk, turn: state === 'count' ? Math.PI : 0 });
    const dz = (state === 'count' ? 4 : 3) * dt; if (groundTex) groundTex.offset.y += dz / (200 / 12);
    for (const d of decor) { d.position.z += dz; if (d.position.z > 14) d.position.z -= 121; }
    if (G && G.creature) { animCreature(G.creature, menuT); const m = G.m; if (m.type === 'chase') G.creature.position.set(0, G.creature.position.y, -10); else if (m.type === 'stealth') G.creature.position.set(0, 0, -13); else G.creature.position.set(0.0, G.creature.position.y, 6.5); }
    if (state === 'count' && G) updateHUD();
  }
  renderer.render(scene, camera);
  if (rec.active) rec.frame(glc, hudState);
  requestAnimationFrame(loop);
}
buildMap(); requestAnimationFrame(loop);
document.fonts && document.fonts.load('40px Lalezar', 'لمّوعة فرفشة').catch(() => {});

// واجهة للاختبار الآلي
window.lammoa = {
  play(id) { initAudio(); openIntro(id === 99 ? ENDLESS : MISSIONS.find(m => m.id === id)); return startPlay(); },
  startRec, stopRec, act, get state() { return state; }, get G() { return G; }, mime: pickMime,
  unlockAll() { progress.unlocked = 8; saveProgress(); buildMap(); },
};
