import * as THREE from 'three';
import { M, sph, box, cyl, cone, at, makeCar } from './models.js';

export const LOCS = {
  souq:    { name: 'سوق الزل', sky: 0xffcf8a, fog: 0xffd9a0, ground: '#d9b07a', lane: '#c99a62', line: '#f6e2b8', amb: 0xfff1d6, sun: 0xffe0a8, sunI: 1.1 },
  desert:  { name: 'طرف البر', sky: 0xff9e6b, fog: 0xffb98a, ground: '#e7b866', lane: '#dcaa58', line: '#f3d18f', amb: 0xffe2c4, sun: 0xffc48a, sunI: 1.2 },
  city:    { name: 'شوارع الرياض', sky: 0x8fd0ff, fog: 0xbfe4ff, ground: '#4a4f5c', lane: '#3f4450', line: '#ffffff', amb: 0xeaf4ff, sun: 0xffffff, sunI: 1.1 },
  mall:    { name: 'المول', sky: 0xf4efe6, fog: 0xf4efe6, ground: '#efe7da', lane: '#e2d8c7', line: '#c9b99d', amb: 0xffffff, sun: 0xfff8ec, sunI: 0.9 },
  cafe:    { name: 'شارع الكوفيهات', sky: 0x8a6fd1, fog: 0xb091e0, ground: '#a77a5a', lane: '#966a4c', line: '#f0c9a0', amb: 0xffe6f0, sun: 0xffc9a8, sunI: 1.0 },
  rooftop: { name: 'فوق السطوح', sky: 0x1d2a5c, fog: 0x2b3a75, ground: '#9aa0ab', lane: '#8a909b', line: '#c7ccd5', amb: 0xb8c6ff, sun: 0xcfd8ff, sunI: 0.8 },
  night:   { name: 'السوق بالليل', sky: 0x241a4f, fog: 0x3a2a6b, ground: '#8f6e52', lane: '#7f5f45', line: '#ffcf7a', amb: 0xc9b6ff, sun: 0xffb366, sunI: 0.8 },
};
export const LANE_X = 2.2;

export function groundTexture(loc) {
  const L = LOCS[loc], c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = L.ground; g.fillRect(0, 0, 256, 256);
  g.fillStyle = L.lane; g.fillRect(34, 0, 188, 256);
  g.fillStyle = L.line;
  for (const x of [34, 220]) g.fillRect(x - 3, 0, 6, 256);
  for (const x of [96, 158]) { g.fillRect(x - 2, 0, 4, 90); g.fillRect(x - 2, 128, 4, 90); }
  if (loc === 'mall' || loc === 'rooftop') { g.globalAlpha = 0.25; g.fillStyle = '#000'; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 12); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const AWN = [0xff4d6d, 0x1e5eff, 0x12a150, 0xffc93c, 0xff8a1e, 0x8a4dff];

// ديكور الجوانب لكل مكان
export function makeDecor(loc) {
  const g = new THREE.Group();
  if (loc === 'souq' || loc === 'night') {
    const t = rnd(0, 1);
    if (t < 0.65) {
      const w = rnd(2.5, 3.5);
      g.add(at(box(w, 2.6, 2.6, loc === 'night' ? pick([0x8a6a4a, 0x6e5a8a, 0x8a4a4a]) : pick([0xf2dcb3, 0xd98e5f, 0xe8c9a0, 0xc97b5a])), 0, 1.3, 0));
      const aw = box(w + 0.2, 0.12, 1.6, pick(AWN)); aw.rotation.z = 0; aw.rotation.x = 0; at(aw, 0, 2.5, 0); aw.rotation.y = 0; g.add(aw);
      for (let i = 0; i < 3; i++) g.add(at(sph(0.25, pick([0xff8a1e, 0xe63946, 0x6a994e, 0xffd166])), rnd(-w / 2.5, w / 2.5), 0.9, 0.9));
      if (loc === 'night') { const lan = sph(0.22, 0xffcf5a); lan.material = new THREE.MeshBasicMaterial({ color: 0xffcf5a }); at(lan, 0, 2.2, 1.2); g.add(lan); }
    } else {
      g.add(at(box(0.5, 4, 0.5, 0xc9a173), -1.2, 2, 0)); g.add(at(box(0.5, 4, 0.5, 0xc9a173), 1.2, 2, 0));
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.25, 6, 12, Math.PI), M(0xc9a173)); at(arch, 0, 4, 0); g.add(arch);
    }
  } else if (loc === 'desert') {
    if (Math.random() < 0.5) {
      const tr = cyl(0.15, 0.22, rnd(3, 4.5), 0x8b5a2b, 6); const h = tr.geometry.parameters.height; at(tr, 0, h / 2, 0); g.add(tr);
      for (let i = 0; i < 6; i++) { const l = cone(0.3, 1.8, 0x3f8f3a, 4); l.rotation.z = Math.PI / 2.4; const p = new THREE.Group(); p.add(at(l, 0.9, 0, 0)); p.rotation.y = i * Math.PI / 3; at(p, 0, h, 0); g.add(p); }
      for (let i = 0; i < 4; i++) g.add(at(sph(0.12, 0x7a3b10, 6, 5), rnd(-.2, .2), h - 0.25, rnd(-.2, .2)));
    } else { const d = sph(rnd(2, 3.5), 0xe9b45f, 12, 8); d.scale.y = 0.35; at(d, 0, 0, 0); g.add(d); if (Math.random() < 0.3) g.add(at(box(0.6, 0.4, 0.6, 0xa58b6d), 1, 0.2, 1)); }
  } else if (loc === 'city') {
    const r = Math.random();
    if (r < 0.7) {
      const h = rnd(5, 16), w = rnd(2.5, 4);
      g.add(at(box(w, h, w, pick([0xd9d2c5, 0xbfc9d6, 0xe8d8b8, 0x9fb3c8])), 0, h / 2, 0));
      for (let y = 1.5; y < h - 0.5; y += 1.6) g.add(at(box(w + 0.05, 0.5, w + 0.05, 0x5a7fa8), 0, y, 0));
    } else if (r < 0.85) { // برج المملكة مصغّر
      const h = 18; for (const s of [-1, 1]) { const p = box(0.9, h, 2, 0x8fa7c4); p.rotation.z = s * 0.05; at(p, s * 1.1, h / 2, 0); g.add(p); }
      g.add(at(box(3.1, 0.5, 2, 0x8fa7c4), 0, h * 0.82, 0));
    } else { g.add(at(cyl(0.08, 0.08, 4, 0x555555), 0, 2, 0)); g.add(at(box(0.9, 0.12, 0.3, 0x555555), -0.4, 4, 0)); g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1a0 })), -0.8, 3.9, 0)); }
  } else if (loc === 'mall') {
    if (Math.random() < 0.7) {
      const w = rnd(3, 4.2), c = pick(AWN);
      g.add(at(box(w, 4, 2, 0xffffff), 0, 2, 0));
      g.add(at(box(w * 0.8, 2.4, 0.05, 0x9fd3ff), 0, 1.4, 1.01));
      g.add(at(box(w * 0.9, 0.6, 0.1, c), 0, 3.3, 1.05));
    } else { g.add(at(cyl(0.4, 0.4, 5, 0xf2eadb, 12), 0, 2.5, 0)); g.add(at(cyl(0.5, 0.4, 0.6, 0xa0704b, 10), 1.5, 0.3, 0)); g.add(at(sph(0.6, 0x3f8f3a, 8, 6), 1.5, 1.0, 0)); }
  } else if (loc === 'cafe') {
    if (Math.random() < 0.6) {
      g.add(at(cyl(0.5, 0.5, 0.08, 0xffffff, 12), 0, 0.8, 0)); g.add(at(cyl(0.05, 0.05, 0.8, 0x333333), 0, 0.4, 0));
      g.add(at(cyl(0.04, 0.04, 2.3, 0x333333), 0, 1.6, 0)); g.add(at(cone(1.3, 0.6, pick(AWN), 8), 0, 2.7, 0));
      for (const s of [-1, 1]) g.add(at(box(0.4, 0.5, 0.4, 0x5b3a29), s * 0.8, 0.25, 0));
      g.add(at(cyl(0.08, 0.06, 0.15, 0xffffff, 8), 0.15, 0.92, 0));
    } else {
      g.add(at(box(3.5, 3.5, 2.5, pick([0x3a2a4f, 0x4f2a3a, 0x2a3a4f])), 0, 1.75, 0));
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: pick([0xff4d6d, 0xffc93c, 0x5bc8ff]) })); at(sign, 0, 2.9, 1.3); g.add(sign);
      g.add(at(box(2.2, 1.6, 0.05, 0xffd9a0), 0, 1.1, 1.26));
    }
  } else if (loc === 'rooftop') {
    const r = Math.random();
    if (r < 0.4) { g.add(at(cyl(0.8, 0.8, 1.6, 0xe8e8e8, 14), 0, 2.4, 0)); g.add(at(box(1.4, 1.6, 1.4, 0x777777), 0, 0.8, 0)); }
    else if (r < 0.7) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), M(0xdddddd, { side: THREE.DoubleSide })); d.rotation.x = -0.8; at(d, 0, 1.2, 0); g.add(d); g.add(at(cyl(0.05, 0.05, 1.2, 0x999999), 0, 0.6, 0)); }
    else { g.add(at(box(1.6, 1, 1, 0xb0b6c0), 0, 0.5, 0)); { const _m = at(cyl(0.35, 0.35, 0.05, 0x444444, 12), 0, 0.5, 0.52); _m.rotation.x = Math.PI / 2; g.add(_m); } }
    const bld = box(6, 30, 6, pick([0x2c3566, 0x343e78, 0x252d5a])); at(bld, rnd(4, 8), -15.5, 0); g.add(bld);
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({ color: Math.random() < 0.6 ? 0xffd27a : 0x445088 })); w.rotation.y = -Math.PI / 2; at(w, rnd(4, 8) - 3.01, -rnd(1, 8), rnd(-2, 2)); g.add(w); }
  }
  return g;
}

// العوائق: low = نط، high = انزل، block = غيّر المسار، gap = فراغ لازم تنط
export function makeObstacle(loc, type, vehicle) {
  const g = new THREE.Group();
  if (type === 'gap') {
    const p = new THREE.Mesh(new THREE.BoxGeometry(LANE_X * 3 + 1.4, 0.1, 2.6), new THREE.MeshBasicMaterial({ color: 0x0a0f2a })); p.position.y = 0.03; g.add(p);
    g.userData = { type, depth: 2.6 }; return g;
  }
  if (type === 'block' && (vehicle || loc === 'city')) { const c = makeCar(pick([0xe63946, 0xffffff, 0x1e5eff, 0x222222, 0xffc93c, 0x8d99ae])); c.rotation.y = vehicle ? 0 : Math.PI; g.add(c); g.userData = { type, depth: 3.2, moving: vehicle ? rnd(3, 7) : 0 }; return g; }
  if (type === 'low') {
    const opts = {
      souq: () => { g.add(at(box(1.6, 0.6, 0.8, 0x9c6b3a), 0, 0.3, 0)); for (let i = 0; i < 4; i++) g.add(at(sph(0.15, 0xff8a1e, 8, 6), -0.5 + i * 0.33, 0.7, 0)); },
      desert: () => { const r = sph(0.75, 0xa58b6d, 7, 5); r.scale.y = 0.6; at(r, 0, 0.3, 0); g.add(r); },
      city: () => { g.add(at(box(1.8, 0.7, 0.3, 0xff8a1e), 0, 0.35, 0)); g.add(at(box(1.8, 0.15, 0.32, 0xffffff), 0, 0.5, 0)); },
      mall: () => { g.add(at(box(1.6, 0.55, 0.6, 0xffc93c), 0, 0.28, 0)); g.add(at(box(0.6, 0.4, 0.05, 0x0b2a6f), 0, 0.9, 0)); },
      cafe: () => { g.add(at(box(1.4, 0.6, 0.8, 0x7a4a2a), 0, 0.3, 0)); g.add(at(cyl(0.1, 0.08, 0.2, 0xffffff, 8), 0.3, 0.7, 0)); },
      rooftop: () => { g.add(at(box(1.8, 0.6, 0.6, 0x9aa0ab), 0, 0.3, 0)); { const _m = at(cyl(0.08, 0.08, 1.8, 0x666666), 0, 0.65, 0); _m.rotation.z = Math.PI / 2; g.add(_m); } },
    }; (opts[loc] || opts.souq)();
    if (loc === 'night') opts.souq();
    g.userData = { type, depth: 0.8 }; return g;
  }
  if (type === 'high') {
    const col = pick(AWN);
    for (const s of [-1, 1]) g.add(at(cyl(0.07, 0.07, 1.9, 0x555555), s * 0.95, 0.95, 0));
    const bar = box(2.1, 0.7, 0.2, col); at(bar, 0, 1.6, 0); g.add(bar);
    g.add(at(box(1.3, 0.25, 0.22, 0xffffff), 0, 1.6, 0));
    g.userData = { type, depth: 0.4 }; return g;
  }
  // block
  const opts = {
    souq: () => { g.add(at(box(1.7, 1.2, 1.4, 0x9c6b3a), 0, 0.8, 0)); for (const s of [-1, 1]) { const w = cyl(0.3, 0.3, 0.1, 0x333333, 10); w.rotation.z = Math.PI / 2; at(w, s * 0.9, 0.3, 0); g.add(w); } g.add(at(sph(0.5, 0x6a994e, 8, 6), 0, 1.5, 0)); },
    desert: () => { const c = new THREE.Group(); c.add(at(box(0.8, 0.8, 1.8, 0xc49a6c), 0, 1.4, 0)); c.add(at(sph(0.45, 0xc49a6c, 8, 6), 0, 1.95, 0.1)); c.add(at(box(0.3, 0.9, 0.3, 0xc49a6c), 0, 1.9, -1.0)); c.add(at(box(0.35, 0.3, 0.6, 0xc49a6c), 0, 2.4, -1.2)); for (const [x, z] of [[-.3, -.7], [.3, -.7], [-.3, .7], [.3, .7]]) c.add(at(cyl(0.08, 0.08, 1.1, 0xb08a5c, 6), x, 0.55, z)); g.add(c); },
    mall: () => { g.add(at(box(1.5, 1.0, 1.2, 0xc0c0c0), 0, 0.7, 0)); g.add(at(box(1.5, 0.05, 1.2, 0x888888), 0, 1.25, 0)); for (let i = 0; i < 3; i++) g.add(at(box(0.35, 0.45, 0.3, pick(AWN)), -0.4 + i * 0.4, 1.5, 0)); },
    cafe: () => { g.add(at(box(1.8, 1.6, 1.2, 0xff4d6d), 0, 0.8, 0)); g.add(at(box(1.9, 0.2, 1.3, 0xffffff), 0, 1.6, 0)); g.add(at(sph(0.3, 0xfff1d6, 8, 6), 0, 1.9, 0)); },
    rooftop: () => { g.add(at(box(1.7, 1.6, 1.4, 0xb0b6c0), 0, 0.8, 0)); { const _m = at(cyl(0.45, 0.45, 0.05, 0x444444, 12), 0, 0.9, -0.72); _m.rotation.x = Math.PI / 2; g.add(_m); } },
  }; (opts[loc] || opts.souq)();
  g.userData = { type: 'block', depth: 1.4 }; return g;
}

export function makeSpark() {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xffd23c }));
  const g = new THREE.Group(); g.add(m);
  const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0xff8a1e, transparent: true, opacity: 0.35, depthWrite: false })); g.add(halo);
  g.userData = { kind: 'spark' }; return g;
}
export const POWERS = { magnet: { c: 0xff3b6b, icon: '🧲', name: 'مغناطيس' }, shield: { c: 0x5bc8ff, icon: '🛡️', name: 'درع' }, speed: { c: 0x7cff5b, icon: '⚡', name: 'سرعة' } };
export function makePower(kind) {
  const g = new THREE.Group(); const c = POWERS[kind].c;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 8, 20), new THREE.MeshBasicMaterial({ color: c })); g.add(ring);
  let core;
  if (kind === 'magnet') { core = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff })); core.rotation.z = Math.PI; }
  else if (kind === 'shield') core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  else core = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  g.add(core); g.userData = { kind: 'power', power: kind }; return g;
}
// أكواب الكوفي (مهمة 6)
export const CUPS = [{ c: 0x6b3e26, name: 'قهوة', css: '#6b3e26' }, { c: 0xff7fa8, name: 'فراولة', css: '#ff7fa8' }, { c: 0x6fd36f, name: 'ماتشا', css: '#4cb84c' }];
export function makeCup(i) {
  const g = new THREE.Group();
  g.add(at(cyl(0.32, 0.24, 0.7, 0xffffff, 12), 0, 0, 0));
  g.add(at(cyl(0.33, 0.33, 0.25, CUPS[i].c, 12), 0, 0.05, 0));
  g.add(at(cyl(0.35, 0.35, 0.08, CUPS[i].c, 12), 0, 0.38, 0));
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 20), new THREE.MeshBasicMaterial({ color: CUPS[i].c, side: THREE.DoubleSide })); at(glow, 0, -0.5, 0).rotation.x = -Math.PI / 2; g.add(glow);
  g.userData = { kind: 'cup', cup: i }; return g;
}
