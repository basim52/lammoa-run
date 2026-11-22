import * as THREE from 'three';
const matCache = {};
export const M = (c, opts = {}) => { const k = c + JSON.stringify(opts); return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial({ color: c, ...opts })); };
const sph = (r, c, w = 14, h = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, w, h), M(c));
const box = (x, y, z, c) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), M(c));
const cyl = (rt, rb, h, c, s = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), M(c));
const cone = (r, h, c, s = 10) => new THREE.Mesh(new THREE.ConeGeometry(r, h, s), M(c));
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
export { sph, box, cyl, cone, at };

// لمّوعة: شعلة برتقالية بخدود وضفيرتين
export function makeLammoa() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const ORANGE = 0xff8a1e, GOLD = 0xffc93c, RED = 0xff5a4d, NAVY = 0x0b2a6f;
  const torso = sph(0.55, ORANGE, 20, 16); torso.scale.set(1, 1.08, 0.95); at(torso, 0, 1.0, 0); body.add(torso);
  const belly = sph(0.42, GOLD, 18, 14); belly.scale.set(1, 1.05, 0.6); at(belly, 0, 0.9, 0.28); body.add(belly);
  const tail = cone(0.42, 0.9, ORANGE, 14); tail.rotation.x = Math.PI; at(tail, 0, 0.32, 0); body.add(tail);
  const tail2 = cone(0.25, 0.55, GOLD, 12); tail2.rotation.x = Math.PI; at(tail2, 0, 0.3, 0.12); body.add(tail2);
  const hair = sph(0.57, RED, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); hair.geometry = new THREE.SphereGeometry(0.57, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42); hair.scale.set(1, 1.08, 0.97); at(hair, 0, 1.03, -0.01); body.add(hair);
  const fringe = cone(0.16, 0.3, RED, 8); fringe.rotation.x = Math.PI * 0.85; at(fringe, 0.05, 1.42, 0.45); body.add(fringe);
  const tails = [];
  for (const s of [-1, 1]) {
    const pt = new THREE.Group(); at(pt, s * 0.55, 1.45, -0.05); pt.rotation.z = -s * 0.9;
    const c1 = cone(0.2, 0.5, RED, 10); c1.position.y = 0.2; pt.add(c1);
    const c2 = cone(0.12, 0.32, ORANGE, 8); at(c2, s * -0.08, 0.32, 0.05); pt.add(c2);
    body.add(pt); tails.push(pt);
  }
  const face = new THREE.Group(); at(face, 0, 1.1, 0.48); body.add(face);
  for (const s of [-1, 1]) {
    const w = sph(0.13, 0xffffff, 12, 10); w.scale.set(1, 1.1, 0.5); at(w, s * 0.19, 0.03, 0); face.add(w);
    const p = sph(0.085, NAVY, 10, 8); p.scale.set(1, 1.1, 0.5); at(p, s * 0.19, 0.02, 0.05); face.add(p);
    const sh = sph(0.03, 0xffffff, 6, 6); at(sh, s * 0.19 + 0.03, 0.06, 0.09); face.add(sh);
    const ch = sph(0.08, 0xff7f8f, 10, 8); ch.scale.set(1.2, 0.7, 0.3); at(ch, s * 0.33, -0.14, -0.04); face.add(ch);
    const br = box(0.13, 0.025, 0.02, NAVY); br.rotation.z = s * -0.25; at(br, s * 0.19, 0.2, 0.01); face.add(br);
  }
  const mouth = sph(0.1, 0x7a1430, 12, 8); mouth.scale.set(1, 0.35, 0.4); at(mouth, 0, -0.17, 0.0); face.add(mouth);
  const tongue = sph(0.05, 0xff6f8f, 8, 6); tongue.scale.set(1, 0.4, 0.4); at(tongue, 0, -0.19, 0.03); face.add(tongue);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); at(a, s * 0.5, 0.95, 0.05);
    const m = cyl(0.08, 0.11, 0.42, ORANGE, 8); m.position.y = -0.18; a.add(m);
    const h = sph(0.11, ORANGE, 8, 6); h.position.y = -0.4; a.add(h);
    a.rotation.z = s * 0.6; body.add(a); arms.push(a);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  // درع شفاف
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), new THREE.MeshBasicMaterial({ color: 0x5bc8ff, transparent: true, opacity: 0.28, depthWrite: false }));
  shield.position.y = 0.95; shield.visible = false; g.add(shield);
  // سكوتر للمهمة 3
  const scooter = new THREE.Group();
  scooter.add(at(box(0.5, 0.12, 1.4, 0x1e5eff), 0, 0.22, 0));
  scooter.add(at(cyl(0.05, 0.05, 1.0, 0x333333), 0, 0.72, -0.62));
  scooter.add(at(box(0.7, 0.06, 0.06, 0x333333), 0, 1.2, -0.62));
  for (const z of [-0.6, 0.6]) { const w = cyl(0.2, 0.2, 0.12, 0x222222, 12); w.rotation.z = Math.PI / 2; at(w, 0, 0.2, z); scooter.add(w); }
  const bag = box(0.55, 0.5, 0.5, 0xff4d6d); at(bag, 0, 1.15, 0.55); scooter.add(bag);
  scooter.add(at(box(0.3, 0.06, 0.52, 0xffffff), 0, 1.15, 0.81));
  scooter.visible = false; g.add(scooter);
  g.userData = { body, face, mouth, arms, tails, shadow, shield, scooter, t: 0 };
  return g;
}
export function animLammoa(g, dt, { run = 1, y = 0, slide = false, talk = false, turn = 0, vehicle = false }) {
  const u = g.userData; u.t += dt * (vehicle ? 0.5 : run);
  const t = u.t;
  u.body.position.y = y + (vehicle ? 0.28 : Math.abs(Math.sin(t * 10)) * 0.12);
  u.body.scale.set(slide ? 1.15 : 1, slide ? 0.55 : 1, 1);
  u.body.rotation.x = vehicle ? 0 : (slide ? 0.5 : -0.15);
  u.arms.forEach((a, i) => { a.rotation.x = vehicle ? -1.2 : Math.sin(t * 10 + i * Math.PI) * 0.9; });
  u.tails.forEach((p, i) => { p.rotation.x = Math.sin(t * 12 + i) * 0.25; });
  u.mouth.scale.y = talk ? 0.35 + Math.abs(Math.sin(performance.now() / 70)) * 0.9 : 0.35;
  u.body.rotation.y += ((turn) - u.body.rotation.y) * Math.min(1, dt * 8);
  u.shadow.scale.setScalar(Math.max(0.4, 1 - y * 0.3));
  u.scooter.visible = vehicle;
}

// الملاحقون / الأهداف
export function makeCat(tea = true, color = 0xf2a03d) {
  const g = new THREE.Group();
  const b = box(0.55, 0.5, 1.0, color); b.position.y = 0.65; g.add(b);
  for (let i = -1; i <= 1; i++) g.add(at(box(0.57, 0.1, 0.12, 0xc87420), 0, 0.85, i * 0.3));
  const h = sph(0.38, color); at(h, 0, 1.05, -0.6); g.add(h);
  for (const s of [-1, 1]) { const e = cone(0.13, 0.28, color, 4); at(e, s * 0.2, 1.42, -0.6); g.add(e); const ey = sph(0.07, 0x1b1b1b, 8, 6); at(ey, s * 0.14, 1.12, -0.95); g.add(ey); }
  const n = sph(0.05, 0xff6f8f, 6, 6); at(n, 0, 1.0, -0.98); g.add(n);
  const tl = cyl(0.06, 0.06, 0.8, color, 6); tl.rotation.x = -0.6; at(tl, 0, 1.1, 0.75); g.add(tl);
  const legs = []; for (const [x, z] of [[-.18, -.35], [.18, -.35], [-.18, .35], [.18, .35]]) { const l = cyl(0.07, 0.07, 0.45, color, 6); at(l, x, 0.22, z); g.add(l); legs.push(l); }
  if (tea) { // براد شاهي
    const pot = new THREE.Group(); pot.add(sph(0.22, 0xd9d9d9)); const sp = cyl(0.03, 0.05, 0.3, 0xd9d9d9, 6); sp.rotation.z = 1; at(sp, 0.2, 0.05, 0); pot.add(sp); pot.add(at(sph(0.06, 0x888888, 6, 6), 0, 0.22, 0));
    at(pot, 0, 1.2, -1.0); g.add(pot);
  }
  g.userData = { legs, kind: 'cat' }; g.scale.setScalar(1.1); return g;
}
export function makeSheep() {
  const g = new THREE.Group();
  for (const [x, y, z] of [[0, .9, 0], [.3, .95, .3], [-.3, .95, .3], [.3, .95, -.3], [-.3, .95, -.3], [0, 1.2, 0], [0, .9, .5], [0, .9, -.45]]) g.add(at(sph(0.42, 0xfaf7ee, 10, 8), x, y, z));
  const h = sph(0.3, 0x2b2b2b); h.scale.set(1, 1, 1.3); at(h, 0, 1.15, 0.85); g.add(h);
  for (const s of [-1, 1]) { const e = sph(0.06, 0xffffff, 6, 6); at(e, s * 0.13, 1.25, 1.15); g.add(e); const p = sph(0.03, 0x000000, 6, 6); at(p, s * 0.13, 1.25, 1.2); g.add(p); const ea = box(0.25, 0.08, 0.12, 0x2b2b2b); at(ea, s * 0.32, 1.25, 0.8); g.add(ea); const hr = cyl(0.05, 0.08, 0.25, 0xd8c39a, 6); hr.rotation.z = s * 1.2; at(hr, s * 0.2, 1.42, 0.85); g.add(hr); }
  const legs = []; for (const [x, z] of [[-.25, -.3], [.25, -.3], [-.25, .35], [.25, .35]]) { const l = cyl(0.07, 0.07, 0.5, 0x2b2b2b, 6); at(l, x, 0.25, z); g.add(l); legs.push(l); }
  g.userData = { legs, kind: 'sheep' }; return g;
}
export function makeGuard() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const w = cyl(0.28, 0.28, 0.14, 0x222222, 14); w.rotation.z = Math.PI / 2; at(w, s * 0.38, 0.28, 0); g.add(w); }
  g.add(at(box(0.7, 0.1, 0.4, 0x444444), 0, 0.32, 0));
  g.add(at(cyl(0.04, 0.04, 0.9, 0x888888), 0, 0.8, -0.2));
  g.add(at(box(0.5, 0.05, 0.05, 0x888888), 0, 1.25, -0.2));
  const body = new THREE.Group(); g.add(body);
  body.add(at(cyl(0.3, 0.32, 0.9, 0x1d3b8b), 0, 1.05, 0.05));
  body.add(at(box(0.62, 0.1, 0.02, 0xffc93c), 0, 1.25, -0.27));
  const head = sph(0.27, 0xe8b48a); at(head, 0, 1.75, 0.05); body.add(head);
  body.add(at(cyl(0.29, 0.29, 0.14, 0x0b2a6f, 14), 0, 1.95, 0.05));
  body.add(at(box(0.3, 0.04, 0.2, 0x0b2a6f), 0, 1.9, -0.22));
  body.add(at(box(0.32, 0.06, 0.04, 0x222222), 0, 1.6, -0.2)); // شنب
  for (const s of [-1, 1]) body.add(at(sph(0.04, 0x111111, 6, 6), s * 0.1, 1.78, -0.21));
  const sign = new THREE.Group(); const sb = cyl(0.25, 0.25, 0.04, 0xff2a2a, 16); sb.rotation.x = Math.PI / 2; sign.add(sb); sign.add(at(box(0.32, 0.08, 0.06, 0xffffff), 0, 0, 0));
  at(sign, 0.45, 1.6, 0); sign.visible = false; body.add(sign); // تنبيه
  const alert = new THREE.Group(); alert.add(at(box(0.12, 0.4, 0.05, 0xffd400), 0, 0.15, 0)); alert.add(at(box(0.12, 0.12, 0.05, 0xffd400), 0, -0.18, 0));
  at(alert, 0, 2.5, 0); alert.visible = false; g.add(alert);
  g.userData = { body, alert, kind: 'guard', legs: [] }; return g;
}
export function makeBus() {
  const g = new THREE.Group();
  g.add(at(box(2.4, 2.2, 6, 0x12a150), 0, 1.5, 0));
  g.add(at(box(2.45, 0.6, 6.05, 0xffffff), 0, 2.1, 0));
  g.add(at(box(2.0, 0.9, 0.05, 0x223344), 0, 1.9, 3.01));
  g.add(at(box(2.42, 0.25, 6.02, 0xffc93c), 0, 0.9, 0));
  for (const s of [-1, 1]) for (const z of [-2, 2]) { const w = cyl(0.45, 0.45, 0.3, 0x222222, 14); w.rotation.z = Math.PI / 2; at(w, s * 1.15, 0.45, z); g.add(w); }
  for (const s of [-1, 1]) g.add(at(box(0.3, 0.2, 0.05, 0xff2222), s * 0.9, 0.8, 3.02));
  g.userData = { kind: 'bus', legs: [] }; return g;
}
export function makePigeons() {
  const g = new THREE.Group(); const wings = [];
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group(); const b = sph(0.22, 0x8a93a6, 10, 8); b.scale.set(1, 0.9, 1.4); p.add(b);
    p.add(at(sph(0.14, 0x5d6b86, 8, 6), 0, 0.15, -0.28)); { const _m = at(cone(0.04, 0.12, 0xffa500, 6), 0, 0.12, -0.44); _m.rotation.x = -Math.PI / 2; p.add(_m); }
    for (const s of [-1, 1]) { const w = box(0.5, 0.04, 0.25, 0x6f7a90); w.position.x = s * 0.3; const wg = new THREE.Group(); wg.add(w); p.add(wg); wings.push([wg, s]); }
    at(p, (i % 2 ? 0.8 : -0.8) * (1 + (i >> 1) * 0.3), 1.4 + (i % 3) * 0.4, (i >> 1) * 0.8); g.add(p);
  }
  g.userData = { wings, kind: 'pigeons', legs: [] }; return g;
}
export function animCreature(g, t) {
  const u = g.userData;
  (u.legs || []).forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + i * 1.6) * 0.7; });
  if (u.wings) u.wings.forEach(([w, s], i) => { w.rotation.z = s * Math.sin(t * 20 + i) * 0.8; });
  if (u.kind !== 'bus' && u.kind !== 'guard') g.position.y = Math.abs(Math.sin(t * 10)) * 0.15;
}
export function makeCar(color) {
  const g = new THREE.Group();
  g.add(at(box(1.6, 0.6, 3.2, color), 0, 0.6, 0));
  g.add(at(box(1.4, 0.55, 1.6, color), 0, 1.15, 0.2));
  g.add(at(box(1.3, 0.45, 0.05, 0x223344), 0, 1.15, -0.62));
  for (const s of [-1, 1]) for (const z of [-1.1, 1.1]) { const w = cyl(0.32, 0.32, 0.22, 0x1a1a1a, 12); w.rotation.z = Math.PI / 2; at(w, s * 0.8, 0.32, z); g.add(w); }
  for (const s of [-1, 1]) g.add(at(box(0.3, 0.15, 0.05, 0xfff3b0), s * 0.55, 0.65, -1.62));
  return g;
}
