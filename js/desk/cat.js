/* ==========================================================================
   The cat figurine: a glazed ceramic Persian, after the vase it is modelled on.
   One cast piece, made as a smooth blend of simple volumes and meshed with
   surface nets, with fur pressed shallowly into it, glass eyes and painted markings.
   Units are centimetres before the scene scales it; y is up, the base sits on
   y = 0, and the body's front faces +z before it is posed.
   ========================================================================== */
import * as THREE from "three";

const V = THREE.Vector3;
const P = (x, y, z) => new V(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = (x) => x - Math.floor(x);
const hash = (n) => fract(Math.sin(n * 127.1) * 43758.5453);
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const ell = (p, c, r) => {      // ellipsoid (approximate distance)
  const x = (p.x - c[0]) / r[0], y = (p.y - c[1]) / r[1], z = (p.z - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return (k0 * (k0 - 1)) / k1;
};
const capT = { h: 0 };
const cap = (p, a, b, r) => {   // capsule a-b (leaves the position along it in capT.h)
  const pax = p.x - a.x, pay = p.y - a.y, paz = p.z - a.z, bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z;
  const h = clamp01((pax * bx + pay * by + paz * bz) / (bx * bx + by * by + bz * bz));
  capT.h = h;
  return Math.hypot(pax - bx * h, pay - by * h, paz - bz * h) - r;
};

// ---- pose: the body turns to its right, the head turns back toward the viewer ----
const POSE_Y = 0.85;
const HEAD = { p: P(0.25, 13.3, 2.4), ry: -0.75, rx: 0.06 };
// eye sockets: wide almonds, the outer corners dipping a little, for a wistful look
const EYE = { x: 1.2, y: 0.32, z: 2.05, r: [0.82, 0.35, 0.45], tilt: 0.2 };

/* The cast form, with vertex colours for the glaze and markings. */
function figurineGeometry(headPos, headInv) {
  const tail = new THREE.CatmullRomCurve3([P(-2.0, 2.0, -7.0), P(-5.2, 1.8, -4.4), P(-5.8, 1.6, -0.6), P(-4.8, 1.5, 2.8), P(-2.9, 1.4, 4.9), P(-1.6, 1.3, 5.6)]);
  const NT = 18, tailPts = tail.getSpacedPoints(NT);
  const tailH = new Float32Array(NT);
  const legs = [-1, 1].map((sx) => [P(sx * 1.4, 6.0, 1.8), P(sx * 1.4, 1.0, 3.9)]);
  const mouth = [[P(0, -0.6, 2.18), P(0, -0.82, 2.2)], [P(0, -0.82, 2.2), P(-0.28, -0.98, 2.14)], [P(0, -0.82, 2.2), P(0.28, -0.98, 2.14)]];
  const hp = new V(), q2 = new V(), q3 = new V();
  const out = { mouth: 9, paws: 9, ear: 9, earIn: 9, fur: 0, part: 0 };
  const eyeSocket = (h, sx) => {
    const x = h.x - sx * EYE.x, y = h.y - EYE.y, a = sx * EYE.tilt, c = Math.cos(a), sn = Math.sin(a);
    q3.set(x * c - y * sn, x * sn + y * c, h.z - EYE.z);
    return ell(q3, [0, 0, 0], EYE.r);
  };

  // ---- the smooth form: rounded volumes only, no fur ----
  const baseSdf = (p) => {
    // body: compact and plump, broad at the base, a full rounded chest
    let d = ell(p, [0, 4.3, -2.6], [4.7, 4.4, 4.9]);                     // haunch
    d = smin(d, ell(p, [0, 7.4, 0.0], [4.2, 4.6, 3.9]), 2.6);             // torso
    for (const [a, b] of legs) d = smin(d, cap(p, a, b, 1.15), 1.4);      // front legs under the fur
    d = smin(d, ell(p, [0, 8.0, 2.3], [3.6, 3.7, 2.5]), 2.0);             // chest
    d = smin(d, ell(p, [0, 5.6, 3.0], [2.9, 2.9, 2.0]), 1.8);             // bib falling to the paws
    d = smin(d, ell(p, [0, 10.4, 1.2], [4.1, 2.1, 3.5]), 2.0);            // ruff: no neck
    let paws = 9;
    for (const sx of [-1, 1]) {
      paws = Math.min(paws, ell(p, [sx * 1.4, 0.8, 4.6], [1.05, 0.8, 1.3]));
      if (p.z > 4.2 && p.y < 1.8) for (const o of [-0.45, 0, 0.45])
        paws = smin(paws, ell(p, [sx * 1.4 + o, 0.55, 5.5 - Math.abs(o) * 0.35], [0.36, 0.42, 0.42]), 0.15);
    }
    out.paws = paws;
    d = smin(d, paws, 0.6);
    // tail: one smooth, thick, rounded plume wrapping the front of the base
    let dt = 9;
    for (let i = 0; i < NT; i++) {
      dt = smin(dt, cap(p, tailPts[i], tailPts[i + 1], 1.75 - (i / NT) * 0.35), 0.6);
      tailH[i] = capT.h;
    }
    // head: broad and round, a flat face, wide round cheeks
    hp.copy(p).sub(headPos).applyMatrix4(headInv);
    let h = ell(hp, [0, 0.1, 0], [3.55, 3.2, 2.85]);
    h = smax(h, hp.z - 2.0, 0.9);                                         // flat Persian face
    for (const sx of [-1, 1]) {
      const k = sx > 0 ? 0.9 : 1;                                         // the far cheek, turned toward us, a touch smaller
      h = smin(h, ell(hp, [sx * (1.5 + 1.05 * k), -1.3, 0.6], [2.25 * k, 1.85 * k, 1.9 * k]), 1.0);
    }
    // ears: small, set wide, softly rounded, their bases sunk into the head
    out.ear = 9; out.earIn = 9;
    if (hp.y > 0.6 && Math.abs(hp.x) > 0.8) {
      const sx = Math.sign(hp.x);
      q2.set(hp.x - sx * 2.3, hp.y - 1.95, hp.z + 0.1);
      const a = sx * 0.45, c = Math.cos(a), sn = Math.sin(a);
      q2.set(q2.x * c - q2.y * sn, q2.x * sn + q2.y * c, q2.z);
      q2.z -= q2.y * 0.12;
      const H = 1.75, R = 1.0 * Math.max(0, 1 - q2.y / H) + 0.2;
      const ear = Math.max((Math.hypot(q2.x, q2.z * 1.6) - R) * 0.8, -q2.y - 0.7, q2.y - H);
      const inner = Math.max((Math.hypot(q2.x * 1.2, (q2.z - 0.34) * 2.2) - R * 0.62) * 0.8, 0.2 - q2.y, q2.y - H + 0.4);
      out.ear = ear; out.earIn = inner;
      h = smin(h, smax(ear, -inner, 0.15), 0.6);
    }
    out.mouth = 9;
    if (hp.z > 0.8 && Math.abs(hp.x) < 2.4 && hp.y > -2.2 && hp.y < 1.4) {
      // a short muzzle: small nose pad, soft whisker pads, a little chin
      h = smin(h, ell(hp, [0, -0.4, 2.08], [0.42, 0.32, 0.28]), 0.3);
      for (const sx of [-1, 1]) h = smin(h, ell(hp, [sx * 0.4, -0.88, 2.0], [0.48, 0.34, 0.3]), 0.3);
      h = smin(h, ell(hp, [0, -1.36, 1.9], [0.44, 0.27, 0.3]), 0.3);
      for (const sx of [-1, 1]) h = smax(h, -eyeSocket(hp, sx), 0.14);
      let mg = 9;
      for (const [a, b] of mouth) mg = Math.min(mg, cap(hp, a, b, 0.05));
      out.mouth = mg;
      h = smax(h, -mg, 0.04);
    }
    out.part = d <= dt && d <= h ? 0 : dt <= h ? 1 : 2;                   // body, tail or head
    // the head settles softly into the ruff and chest
    return Math.max(smin(smin(d, dt, 1.0), h, 1.4 + 0.8 * sstep(-0.5, -2.2, hp.y)), -p.y);
  };
  const gradAt = (p, gOut) => {
    const e = 0.04, t = new V();
    return gOut.set(baseSdf(t.copy(p).setX(p.x + e)) - baseSdf(t.copy(p).setX(p.x - e)),
                    baseSdf(t.copy(p).setY(p.y + e)) - baseSdf(t.copy(p).setY(p.y - e)),
                    baseSdf(t.copy(p).setZ(p.z + e)) - baseSdf(t.copy(p).setZ(p.z - e))).normalize();
  };
  const toSurface = (p) => {
    const g = new V();
    for (let k = 0; k < 6; k++) { const d = baseSdf(p); gradAt(p, g); p.addScaledVector(g, -d); }
    return Math.abs(baseSdf(p));
  };

  /* Fur: short, softly rounded, curved strokes pressed shallowly into the smooth form.
     They are laid once, on the finished surface itself, each along the fur's flow at
     that spot (down the body, fanning out on the cheeks, along the tail), spaced out
     with plenty of plain glaze between. A stroke is only ever an indentation, fading
     to nothing at its ends and edges, so it never breaks the rounded outline. */
  const strokes = [], CELL = 1.35, BUCKET = 2.2, buckets = new Map();
  const bkey = (x, y, z) => `${Math.floor(x / BUCKET)},${Math.floor(y / BUCKET)},${Math.floor(z / BUCKET)}`;
  {
    const g = new V(), f = new V(), bn = new V(), tmp = new V(), headW = new V();
    let n = 0;
    for (let x = -8.5; x < 8.5; x += CELL) for (let y = 0; y < 18.5; y += CELL) for (let z = -9.8; z < 8.8; z += CELL) {
      const id = ++n * 1.618;
      const s = P(x + CELL * hash(id), y + CELL * hash(id + 1.3), z + CELL * hash(id + 2.7));
      if (Math.abs(baseSdf(s)) > CELL) continue;
      if (toSurface(s) > 0.03 || s.y < 0.9) continue;
      baseSdf(s);
      const part = out.part;
      if (out.paws < 0.8 || out.ear < 0.5) continue;
      hp.copy(s).sub(headPos).applyMatrix4(headInv);
      const r = Math.hypot(hp.x, hp.y + 0.4);
      if (part === 2 && hp.z > 0.7 && r < 2.6) continue;                 // the face stays plain
      const keep = part === 0 ? 0.5 : part === 1 ? 0.22 : (Math.abs(hp.x) > 1.6 || hp.y < -1.2 ? 0.55 : 0.25);
      if (hash(id + 4.1) > keep) continue;
      gradAt(s, g);
      // flow: down the body, outward from the head's centre, along the tail
      if (part === 0) f.set(0, -1, 0.15 * Math.sign(s.z));
      else if (part === 2) f.copy(s).sub(headW.copy(headPos).add(P(0, -0.6, 0)));
      else {
        let best = 9, bi = 0;
        for (let i = 0; i < NT; i++) { const dd = cap(s, tailPts[i], tailPts[i + 1], 0); if (dd < best) { best = dd; bi = i; } }
        f.subVectors(tailPts[bi + 1], tailPts[bi]);
      }
      f.addScaledVector(g, -f.dot(g));
      if (f.lengthSq() < 0.05) continue;
      f.normalize().applyAxisAngle(g, (hash(id + 5.9) - 0.5) * 0.35);
      bn.crossVectors(g, f).normalize();
      const L = (part === 2 ? 0.9 : part === 1 ? 1.6 : 1.45) * (0.8 + 0.45 * hash(id + 6.6));
      const bend = (hash(id + 7.3) - 0.5) * 0.24 * L;                         // a gentle curve, not a chevron
      const a = s.clone().addScaledVector(f, -L / 2), b = s.clone().addScaledVector(f, L / 2);
      const m = s.clone().addScaledVector(bn, bend);
      toSurface(a); toSurface(b); toSurface(m);
      const depth = part === 2 ? 0.045 : part === 1 ? 0.05 : 0.065, w = part === 2 ? 0.2 : 0.26;
      const st = { a, m, b, depth, w };
      strokes.push(st);
      const k = bkey(s.x, s.y, s.z);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(st);
    }
  }
  const furAt = (p) => {
    let best = 0;
    const bx = Math.floor(p.x / BUCKET), by = Math.floor(p.y / BUCKET), bz = Math.floor(p.z / BUCKET);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const list = buckets.get(`${bx + i},${by + j},${bz + k}`);
      if (!list) continue;
      for (const s of list) {
        const d0 = cap(p, s.a, s.m, 0), h0 = capT.h, d1 = cap(p, s.m, s.b, 0), h1 = capT.h;
        const d = Math.min(d0, d1);
        if (d >= s.w) continue;
        const t = d0 < d1 ? h0 * 0.5 : 0.5 + h1 * 0.5;
        const q = 1 - (d / s.w) * (d / s.w);
        const v = s.depth * q * q * Math.pow(Math.sin(Math.PI * t), 1.2);
        if (v > best) best = v;
      }
    }
    return best;
  };
  const sdf = (p) => {
    const d = baseSdf(p);
    const fur = Math.abs(d) < 0.35 ? furAt(p) : 0;
    out.fur = fur;
    return d + fur;                                                        // pressed in, never raised
  };

  // ---- surface nets over a grid ----
  const S = 0.12, min = P(-8.5, -0.3, -9.8), n = [Math.ceil(17 / S), Math.ceil(19.3 / S), Math.ceil(18.6 / S)];
  const nx = n[0] + 1, ny = n[1] + 1, nz = n[2] + 1;
  const F = new Float32Array(nx * ny * nz), q = new V();
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[at(i, j, k)] = sdf(q.set(min.x + i * S, min.y + j * S, min.z + k * S));
  const vid = new Int32Array(n[0] * n[1] * n[2]).fill(-1), pos = [];
  const cid = (i, j, k) => i + n[0] * (j + n[1] * k);
  const corners = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { cv[c] = F[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (cv[c] > 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, c = 0;
    for (const [e0, e1] of edges) {
      if ((cv[e0] > 0) === (cv[e1] > 0)) continue;
      const t = cv[e0] / (cv[e0] - cv[e1]), A = corners[e0], B = corners[e1];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; c++;
    }
    vid[cid(i, j, k)] = pos.length / 3;
    pos.push(min.x + (i + sx / c) * S, min.y + (j + sy / c) * S, min.z + (k + sz / c) * S);
  }
  const idx = [];
  for (let k = 1; k < n[2]; k++) for (let j = 1; j < n[1]; j++) for (let i = 1; i < n[0]; i++) {
    const f0 = F[at(i, j, k)];
    for (let ax = 0; ax < 3; ax++) {
      const o = [0, 0, 0]; o[ax] = 1;
      const f1 = F[at(i + o[0], j + o[1], k + o[2])];
      if ((f0 > 0) === (f1 > 0)) continue;
      const u = [0, 0, 0], w = [0, 0, 0]; u[(ax + 1) % 3] = 1; w[(ax + 2) % 3] = 1;
      const c = (du, dw) => vid[cid(i - u[0] * du - w[0] * dw, j - u[1] * du - w[1] * dw, k - u[2] * du - w[2] * dw)];
      const a = c(0, 0), b = c(1, 0), d = c(1, 1), e = c(0, 1);
      if (a < 0 || b < 0 || d < 0 || e < 0) continue;
      if (f0 > 0) idx.push(a, e, d, a, d, b); else idx.push(a, b, d, a, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);

  // ---- normals from the field; colour: warm ivory glaze, slate markings, pale pink nose ----
  const nor = [], col = [], e = 0.05, g = new V(), pp = new V();
  const IVORY = [0.95, 0.92, 0.855], SLATE = [0.35, 0.385, 0.43], PINK = [0.93, 0.68, 0.64], EAR_IN = [0.62, 0.58, 0.6];
  const mix = (a, b, t) => a.map((x, k) => x + (b[k] - x) * t);
  for (let i = 0; i < pos.length; i += 3) {
    pp.set(pos[i], pos[i + 1], pos[i + 2]);
    g.set(sdf(q.copy(pp).setX(pp.x + e)) - sdf(q.copy(pp).setX(pp.x - e)),
          sdf(q.copy(pp).setY(pp.y + e)) - sdf(q.copy(pp).setY(pp.y - e)),
          sdf(q.copy(pp).setZ(pp.z + e)) - sdf(q.copy(pp).setZ(pp.z - e))).normalize();
    nor.push(g.x, g.y, g.z);
    sdf(pp);
    const { mouth: mouthD, paws: pawD, ear: earD, earIn: earInD, fur } = out;
    hp.copy(pp).sub(headPos).applyMatrix4(headInv);
    const ax = Math.abs(hp.x), wob = 0.05 * Math.sin(Math.atan2(hp.y, hp.x) * 9);
    // slate patches round both eyes and up over the ears, either side of a broad ivory blaze
    const blaze = 0.42 + 0.14 * Math.max(0, hp.y) - 0.12 * sstep(0.3, -0.2, hp.y);
    let gr = sstep(0, 0.14, ax - blaze + wob) * sstep(-0.12, 0.08, hp.y + 0.22 + 0.22 * Math.max(0, ax - 1.3) + wob);
    if (hp.x > 0) gr = Math.max(gr, sstep(1.9, 2.2, hp.x + wob) * sstep(-2.5, -2.1, hp.y + wob) * sstep(-0.6, 0.1, hp.z) * sstep(0.6, 0.2, hp.y) * 0.98);   // down the far cheek
    gr *= 1 - sstep(3.4, 4.0, hp.length());                              // only on the head
    if (earD < 0.3) gr = Math.max(gr, 1);
    // small grey accents on the toes
    if (pawD < 0.3) gr = Math.max(gr, sstep(5.0, 5.6, pp.z + 0.2 * Math.sin(pp.x * 9)) * sstep(0.3, 0.1, pawD));
    let c0 = mix(IVORY, SLATE, gr);
    if (earInD < 0.06) c0 = mix(c0, EAR_IN, sstep(0.06, -0.04, earInD));
    if (hp.z > 1.9) {          // a tiny pale-pink nose, a soft triangle
      const nose = sstep(0.02, -0.02, ax - (0.04 + (hp.y + 0.6) * 0.72)) * sstep(-0.62, -0.57, hp.y) * sstep(-0.22, -0.27, hp.y);
      c0 = mix(c0, PINK, nose);
    }
    if (hp.z > 1.4 && ax < 2.2 && hp.y > -0.4 && hp.y < 1.0) {   // soft dark liner round the eyes
      const sock = eyeSocket(hp, Math.sign(hp.x));
      c0 = c0.map((w) => w * (1 - 0.28 * sstep(0.08, 0.02, sock) * sstep(-0.06, 0.0, sock)));
    }
    const shade = (1 - 1.2 * fur) * (mouthD < 0.12 ? 0.6 + 3.3 * Math.max(0, mouthD) : 1);
    col.push(c0[0] * shade, c0[1] * shade, c0[2] * shade);
  }
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

// a glass eye: a pale grey-green iris, a dark pupil glancing up and aside, a soft dark rim
function eyeTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#33363a"; g.fillRect(0, 0, 256, 256);
  const iris = g.createRadialGradient(118, 120, 10, 124, 128, 104);
  iris.addColorStop(0, "#e4ebe3"); iris.addColorStop(0.45, "#c8d5cc"); iris.addColorStop(0.82, "#98aba2"); iris.addColorStop(1, "#5f716b");
  g.fillStyle = iris; g.beginPath(); g.ellipse(124, 128, 100, 96, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(80,100,94,0.22)"; g.lineWidth = 2;
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2, r0 = 40 + (i % 3) * 4;
    g.beginPath(); g.moveTo(110 + Math.cos(a) * r0, 116 + Math.sin(a) * r0); g.lineTo(124 + Math.cos(a) * 92, 128 + Math.sin(a) * 88); g.stroke();
  }
  g.fillStyle = "#1b1c1d"; g.beginPath(); g.ellipse(108, 112, 34, 42, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#4a4d50"; g.lineWidth = 5; g.beginPath(); g.ellipse(124, 128, 108, 104, 0, 0, Math.PI * 2); g.stroke();
  // a soft upper lid line, heavier than the lower, as painted on the figurine
  g.strokeStyle = "rgba(45,46,48,0.6)"; g.lineWidth = 8; g.beginPath(); g.ellipse(124, 128, 108, 104, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(130, 92, 11, 8, -0.4, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// a sphere whose front carries the eye texture flat-on
function eyeGeometry() {
  const geo = new THREE.SphereGeometry(1, 40, 28), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getY(i) * 0.5 + 0.5);
  return geo;
}

/* The figurine, posed, at the origin and unscaled. With clay: true it is shown as
   bare grey clay, for judging the form on its own. */
export function buildCatFigurine({ clay = false } = {}) {
  const glaze = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.18
  });
  const clayMat = new THREE.MeshStandardMaterial({ color: "#d9d4ca", roughness: 0.75 });
  const fig = new THREE.Group();
  const pose = new THREE.Group(); pose.rotation.y = POSE_Y; fig.add(pose);
  const head = new THREE.Group(); head.position.copy(HEAD.p); head.rotation.set(HEAD.rx, HEAD.ry, 0, "YXZ"); pose.add(head);
  const headInv = new THREE.Matrix4().makeRotationFromEuler(head.rotation).invert();
  const body = new THREE.Mesh(figurineGeometry(HEAD.p, headInv), clay ? clayMat : glaze);
  body.castShadow = body.receiveShadow = true;
  pose.add(body);
  if (!clay) {
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
    const geo = eyeGeometry();
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(geo, eyeMat);
      eye.position.set(sx * EYE.x, EYE.y, EYE.z - 0.38);
      eye.scale.set(EYE.r[0] * 0.92, EYE.r[1] * 1.08, 0.3);
      eye.rotation.z = -sx * EYE.tilt;
      eye.castShadow = true;
      head.add(eye);
    }
  }
  return fig;
}
