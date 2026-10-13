/* ==========================================================================
   Procedural textures, painted on <canvas> — no image files needed.
   ========================================================================== */
import * as THREE from "three";

const rand = mulberry32(7);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c, { srgb = true, repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 8;
  return t;
}

/* Fine speckle so flat fills read as a material, not a colour. */
function grain(ctx, w, h, amount, alpha = 0.06) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // a few soft blotches (age, handling)
  for (let i = 0; i < 18; i++) {
    const x = rand() * w, y = rand() * h, r = 40 + rand() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120, 90, 50, ${alpha * rand()})`);
    g.addColorStop(1, "rgba(120, 90, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/* ---------------- Rolodex cards ---------------- */

export const CARD = { W: 10.2, H: 5.7, TAB_H: 0.72, TAB_W: 1.9 };
const PX = 1024 / CARD.W;                                 // pixels per cm
export const CARD_PX = { w: 1024, h: Math.round((CARD.H + CARD.TAB_H) * PX) };
const TAB_PX = CARD_PX.h - Math.round(CARD.H * PX);

function paperBase(ctx, tint = "#f3ecdc") {
  const { w, h } = CARD_PX;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, 14, 0.05);
  // ruled lines
  ctx.strokeStyle = "rgba(70, 110, 90, 0.22)";
  ctx.lineWidth = 2;
  for (let y = TAB_PX + 150; y < h - 30; y += 54) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(w - 24, y); ctx.stroke();
  }
  // top double rule
  ctx.strokeStyle = "rgba(155, 74, 47, 0.55)";
  ctx.lineWidth = 2.5;
  [TAB_PX + 70, TAB_PX + 78].forEach((y) => {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(w - 24, y); ctx.stroke();
  });
  // edge darkening from handling
  const e = ctx.createLinearGradient(0, 0, 0, h);
  e.addColorStop(0, "rgba(90, 60, 30, 0.0)");
  e.addColorStop(0.92, "rgba(90, 60, 30, 0.0)");
  e.addColorStop(1, "rgba(90, 60, 30, 0.18)");
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, w, h);
}

function drawIcon(ctx, svg, cx, cy, size, color) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const s = size / 48;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  doc.querySelectorAll("path,circle,rect").forEach((el) => {
    const p = new Path2D();
    if (el.tagName === "path") p.addPath(new Path2D(el.getAttribute("d")));
    else if (el.tagName === "circle") {
      p.arc(+el.getAttribute("cx"), +el.getAttribute("cy"), +el.getAttribute("r"), 0, Math.PI * 2);
    } else {
      p.roundRect(+el.getAttribute("x"), +el.getAttribute("y"), +el.getAttribute("width"),
        +el.getAttribute("height"), +(el.getAttribute("rx") || 0));
    }
    ctx.stroke(p);
  });
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines = 2) {
  const words = text.split(" ");
  let line = "", lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      line = words[i];
      if (++lines >= maxLines) return;
    } else line = test;
  }
  ctx.fillText(line, x, y + lines * lineH);
}

function stamp(ctx, text, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.1);
  ctx.globalAlpha = 0.72;
  ctx.font = "700 26px 'Courier Prime'";
  const w = ctx.measureText(text).width + 34;
  ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -26, w, 52);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2 + 6, -20, w - 12, 40);
  ctx.fillStyle = color;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 2);
  // worn ink
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = rand() * 0.6;
    ctx.fillRect((rand() - 0.5) * w, (rand() - 0.5) * 52, 2 + rand() * 4, 2 + rand() * 3);
  }
  ctx.restore();
}

/** tabX: left edge of the tab in cm, measured from the card's left edge. */
export function personaCardTexture(p, { number, tabX, sealed, delivered, icon }) {
  const [c, ctx] = canvas(CARD_PX.w, CARD_PX.h);
  paperBase(ctx, sealed ? "#efe6d3" : "#f5efe0");
  const { w, h } = CARD_PX;

  // tab (the geometry only exists where the tab is, so it can overhang)
  const tx = tabX * PX, tw = CARD.TAB_W * PX;
  ctx.fillStyle = sealed ? "#7a5b44" : "#3f5e48";
  ctx.fillRect(tx, 0, tw, TAB_PX + 6);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(tx, 0, tw, 10);
  ctx.fillStyle = "#f4eedf";
  ctx.font = "700 46px 'Courier Prime'";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(p.letter, tx + tw / 2, TAB_PX / 2 + 4);

  const top = TAB_PX;
  // icon seal
  const ix = 150, iy = top + 300;
  const ink = sealed ? "#7a5b44" : "#2e4535";
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(ix, iy, 84, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(ix, iy, 96, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  drawIcon(ctx, icon, ix, iy, 100, ink);

  // typed text
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#7a5b44";
  ctx.font = "400 28px 'Courier Prime'";
  ctx.fillText(`NO. 0${number}  ·  EMILY AS ${p.article.toUpperCase()}`, 280, top + 205);
  ctx.fillStyle = "#2a1d14";
  ctx.font = `400 ${p.title.length > 10 ? 92 : 112}px Fraunces`;
  ctx.fillText(p.title, 274, top + 318);
  ctx.fillStyle = "#4a3426";
  ctx.font = "italic 400 36px Spectral";
  wrapText(ctx, sealed ? "Shared by direct introduction only." : p.tagline, 280, top + 384, w - 330, 46);

  ctx.fillStyle = "#7a5b44";
  ctx.font = "400 26px 'Courier Prime'";
  ctx.fillText(`FILE UNDER ${p.letter}`, 48, h - 46);
  ctx.textAlign = "right";
  ctx.fillStyle = "#2e4535";
  ctx.fillText(sealed ? "REQUEST AN INTRO →" : "PULL CARD →", w - 48, h - 46);

  if (sealed) stamp(ctx, "BY INTRODUCTION", w - 220, top + 130, "#9b4a2f");
  if (delivered) stamp(ctx, "HAND-DELIVERED", w - 220, top + 130, "#2e4535");

  return toTexture(c);
}

/* Filler cards — mostly blank, a few with pencilled names (all fictional). */
const SCRAWLS = [
  ["Bookbinder — Magazine St.", "Tues/Thurs only"],
  ["Aunt June", "pralines recipe!!"],
  ["Typewriter repair", "ask for Lou"],
  ["Print shop", "letterpress quote?"],
  ["Records & Rarities", "hold: Etta James LP"],
  ["Florist", "magnolias in May"]
];
export function fillerCardTextures(count) {
  const out = [];
  for (let v = 0; v < count; v++) {
    const [c, ctx] = canvas(CARD_PX.w, CARD_PX.h);
    const tints = ["#f1eada", "#f4eee1", "#eee5d2", "#f2ebdc"];
    paperBase(ctx, tints[v % tints.length]);
    const s = SCRAWLS[v % SCRAWLS.length];
    if (v < SCRAWLS.length) {
      ctx.fillStyle = "rgba(60, 55, 50, 0.62)";
      ctx.font = "500 64px Caveat";
      ctx.save();
      ctx.translate(60, TAB_PX + 205);
      ctx.rotate(-0.015 + rand() * 0.03);
      ctx.fillText(s[0], 0, 0);
      ctx.font = "500 48px Caveat";
      ctx.fillStyle = "rgba(60, 55, 50, 0.5)";
      ctx.fillText(s[1], 14, 108);
      ctx.restore();
    }
    out.push(toTexture(c));
  }
  return out;
}

/* ---------------- Desk: walnut ---------------- */
export function walnutTextures() {
  const W = 2048, H = 1024;
  const [c, ctx] = canvas(W, H);
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#4b2e1b"); base.addColorStop(0.5, "#573521"); base.addColorStop(1, "#47291a");
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

  // broad colour bands
  for (let i = 0; i < 40; i++) {
    const y = rand() * H, hh = 20 + rand() * 90;
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "30,16,8" : "120,78,45"}, ${0.05 + rand() * 0.1})`;
    ctx.fillRect(0, y, W, hh);
  }
  // grain lines
  for (let i = 0; i < 520; i++) {
    let y = rand() * H;
    const amp = 2 + rand() * 9, freq = 0.002 + rand() * 0.004, ph = rand() * 10;
    ctx.strokeStyle = rand() < 0.75 ? `rgba(28, 14, 6, ${0.08 + rand() * 0.22})` : `rgba(150, 100, 60, ${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 16) {
      const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph * 2) * amp * 0.3;
      x < 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // cathedral figure
  for (let k = 0; k < 6; k++) {
    const cx = rand() * W, cy = rand() * H;
    for (let r = 10; r < 220; r += 9 + rand() * 6) {
      ctx.strokeStyle = `rgba(25, 12, 5, ${0.06 + rand() * 0.08})`;
      ctx.lineWidth = 1 + rand() * 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 4.2, r * 0.55, 0, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }
  }
  // pores
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(15, 8, 3, ${0.15 + rand() * 0.3})`;
    ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 1);
  }
  grain(ctx, W, H, 10, 0);

  // roughness: worn (shinier) patches, otherwise satin
  const [rc, rctx] = canvas(512, 256);
  rctx.fillStyle = "#8c8c8c"; rctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 60; i++) {
    const x = rand() * 512, y = rand() * 256, r = 10 + rand() * 60;
    const g = rctx.createRadialGradient(x, y, 0, x, y, r);
    const v = rand() < 0.5 ? 90 : 170;
    g.addColorStop(0, `rgba(${v},${v},${v},0.5)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    rctx.fillStyle = g; rctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return {
    map: toTexture(c, { repeat: [1, 1] }),
    roughness: toTexture(rc, { srgb: false, repeat: [1, 1] }),
    bump: toTexture(c, { srgb: false, repeat: [1, 1] })
  };
}

/* ---------------- Wall: limewashed green plaster ---------------- */
export function plasterTexture() {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#4a5e4c"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = rand() * W, y = rand() * H, r = 20 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() < 0.5;
    g.addColorStop(0, light ? "rgba(140,160,130,0.06)" : "rgba(20,35,25,0.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  grain(ctx, W, H, 18, 0);
  return toTexture(c, { repeat: [3, 2] });
}

/* ---------------- Window: dusk sky over a low skyline ---------------- */
export function skyTexture() {
  const W = 2048, H = 1024;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, "#2a2847");
  g.addColorStop(0.32, "#5e4a6e");
  g.addColorStop(0.55, "#b06a6c");
  g.addColorStop(0.72, "#ec9c5c");
  g.addColorStop(0.8, "#f7c47e");
  g.addColorStop(1.0, "#f3d39a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // sun glow
  const sx = W * 0.62, sy = H * 0.8;
  let s = ctx.createRadialGradient(sx, sy, 0, sx, sy, 520);
  s.addColorStop(0, "rgba(255, 236, 190, 0.95)");
  s.addColorStop(0.12, "rgba(255, 210, 140, 0.7)");
  s.addColorStop(1, "rgba(255, 170, 110, 0)");
  ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);

  // streaky clouds
  for (let i = 0; i < 26; i++) {
    const y = H * (0.25 + rand() * 0.4), x = rand() * W, len = 200 + rand() * 600;
    const cg = ctx.createLinearGradient(x, 0, x + len, 0);
    const col = y > H * 0.5 ? "255,190,150" : "200,140,170";
    cg.addColorStop(0, `rgba(${col},0)`);
    cg.addColorStop(0.5, `rgba(${col},${0.12 + rand() * 0.18})`);
    cg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(x + len / 2, y, len / 2, 6 + rand() * 14, 0, 0, Math.PI * 2); ctx.fill();
  }

  // skyline: two depths of rooftops with lit windows
  const layers = [
    { base: H * 0.86, col: "#6a4a5c", min: 30, max: 120, lit: 0.08 },
    { base: H * 0.93, col: "#3a2834", min: 60, max: 210, lit: 0.18 }
  ];
  layers.forEach((L) => {
    let x = -20;
    while (x < W) {
      const bw = 60 + rand() * 150, bh = L.min + rand() * (L.max - L.min);
      ctx.fillStyle = L.col;
      ctx.fillRect(x, L.base - bh, bw, H);
      if (rand() < 0.2) ctx.fillRect(x + bw * 0.4, L.base - bh - 40, 6, 40); // antenna / chimney
      for (let wy = L.base - bh + 14; wy < H; wy += 22) {
        for (let wx = x + 10; wx < x + bw - 12; wx += 18) {
          if (rand() < L.lit) {
            ctx.fillStyle = `rgba(255, ${200 + rand() * 40}, ${120 + rand() * 60}, ${0.6 + rand() * 0.4})`;
            ctx.fillRect(wx, wy, 7, 10);
          }
        }
      }
      x += bw + rand() * 10;
    }
  });
  // a far line of trees
  ctx.fillStyle = "#2a1f28";
  for (let x = 0; x < W; x += 14) {
    const r = 18 + rand() * 30;
    ctx.beginPath(); ctx.arc(x, H * 0.97, r, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

/* ---------------- Headshot (with monogram fallback) ---------------- */
export function photoTexture(url) {
  const [c, ctx] = canvas(600, 760);
  const g = ctx.createLinearGradient(0, 0, 0, 760);
  g.addColorStop(0, "#d9cdb2"); g.addColorStop(1, "#b7a582");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 760);
  grain(ctx, 600, 760, 22, 0.1);
  ctx.fillStyle = "rgba(74, 52, 38, 0.65)";
  ctx.font = "italic 300 120px Fraunces";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("EMH", 300, 360);
  ctx.font = "400 26px 'Courier Prime'";
  ctx.fillText("your photo here", 300, 470);
  const tex = toTexture(c);

  const img = new Image();
  img.onload = () => {
    // cover-fit, lightly warmed to sit in the room
    const r = Math.max(600 / img.width, 760 / img.height);
    const w = img.width * r, h = img.height * r;
    ctx.filter = "sepia(0.15) saturate(0.95)";
    ctx.drawImage(img, (600 - w) / 2, (760 - h) / 2, w, h);
    ctx.filter = "none";
    tex.needsUpdate = true;
  };
  img.src = url;
  return tex;
}

/* ---------------- small sprites ---------------- */
export function softDotTexture() {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return toTexture(c, { srgb: false });
}

export function smokeTexture() {
  const [c, ctx] = canvas(256, 256);
  for (let i = 0; i < 40; i++) {
    const x = 128 + (rand() - 0.5) * 90, y = 128 + (rand() - 0.5) * 140, r = 20 + rand() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  }
  return toTexture(c, { srgb: false });
}

export function leatherTexture(hex) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, 512);
  grain(ctx, 512, 512, 26, 0.12);
  return toTexture(c);
}

/* ---------------- Window at night: city skyline ---------------- */
export function nightSkyTexture() {
  const W = 2048, H = 1024;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, "#04060d");
  g.addColorStop(0.45, "#0b1328");
  g.addColorStop(0.72, "#1a2343");
  g.addColorStop(0.86, "#3b2f4a");   // city glow on the haze
  g.addColorStop(1.0, "#4a3540");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // stars, thinning toward the light-polluted horizon
  for (let i = 0; i < 700; i++) {
    const y = Math.pow(rand(), 1.8) * H * 0.7;
    ctx.fillStyle = `rgba(230, 235, 255, ${(0.25 + rand() * 0.75) * (1 - y / (H * 0.7))})`;
    const s = rand() < 0.04 ? 2.4 : 1.2;
    ctx.fillRect(rand() * W, y, s, s);
  }
  // crescent moon with a halo
  const mx = W * 0.74, my = H * 0.2;
  let halo = ctx.createRadialGradient(mx, my, 0, mx, my, 220);
  halo.addColorStop(0, "rgba(220, 228, 255, 0.35)");
  halo.addColorStop(1, "rgba(220, 228, 255, 0)");
  ctx.fillStyle = halo; ctx.fillRect(mx - 220, my - 220, 440, 440);
  ctx.fillStyle = "#f3f0e4";
  ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath(); ctx.arc(mx + 15, my - 8, 31, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // skyline in three depths; nearer is darker, taller, and more lit
  const layers = [
    { base: H * 0.84, col: "#1d1d33", min: 40, max: 200, lit: 0.22, win: [5, 7] },
    { base: H * 0.9, col: "#141426", min: 80, max: 330, lit: 0.3, win: [6, 9] },
    { base: H * 0.97, col: "#0b0b16", min: 120, max: 420, lit: 0.36, win: [7, 10] }
  ];
  const warm = () => `rgba(255, ${190 + rand() * 50}, ${110 + rand() * 70}, ${0.55 + rand() * 0.45})`;
  const cool = () => `rgba(${170 + rand() * 40}, ${200 + rand() * 30}, 255, ${0.45 + rand() * 0.4})`;
  layers.forEach((L, li) => {
    let x = -30;
    while (x < W) {
      const bw = 50 + rand() * 170, bh = L.min + rand() * (L.max - L.min);
      const top = L.base - bh;
      ctx.fillStyle = L.col;
      ctx.fillRect(x, top, bw, H);
      // crowns: stepped tops, spires, water towers
      const r = rand();
      if (r < 0.15) { ctx.fillRect(x + bw * 0.2, top - 30, bw * 0.6, 30); ctx.fillRect(x + bw * 0.4, top - 70, bw * 0.2, 40); }
      else if (r < 0.25) { ctx.fillRect(x + bw / 2 - 2, top - 90, 4, 90); }
      else if (r < 0.32 && li === 2) {
        ctx.fillRect(x + 20, top - 34, 34, 24);
        ctx.beginPath(); ctx.moveTo(x + 16, top - 34); ctx.lineTo(x + 37, top - 54); ctx.lineTo(x + 58, top - 34); ctx.fill();
        ctx.fillRect(x + 24, top - 10, 3, 10); ctx.fillRect(x + 47, top - 10, 3, 10);
      }
      if (r < 0.25 && rand() < 0.7) {           // aircraft warning light
        ctx.fillStyle = "rgba(255, 60, 50, 0.95)";
        ctx.fillRect(x + bw / 2 - 2, top - (r < 0.15 ? 72 : 92), 4, 4);
      }
      const [ww, wh] = L.win;
      for (let wy = top + 10; wy < H; wy += wh + 7) {
        for (let wx = x + 8; wx < x + bw - ww - 4; wx += ww + 6) {
          if (rand() < L.lit) {
            ctx.fillStyle = rand() < 0.78 ? warm() : cool();
            ctx.fillRect(wx, wy, ww, wh);
          }
        }
      }
      x += bw + rand() * 14;
    }
  });
  // street-level glow
  const sg = ctx.createLinearGradient(0, H * 0.9, 0, H);
  sg.addColorStop(0, "rgba(255, 170, 90, 0)");
  sg.addColorStop(1, "rgba(255, 170, 90, 0.25)");
  ctx.fillStyle = sg; ctx.fillRect(0, H * 0.9, W, H * 0.1);
  return toTexture(c);
}

/* ---------------- Tiffany shade: leaded stained glass ----------------
   Painted in lathe UV space: u runs around the shade, v from rim (0) to crown (1). */
export function stainedGlassTexture() {
  const W = 2048, H = 512;
  const [c, ctx] = canvas(W, H);
  const pal = {
    amber: ["#d98d2b", "#e8a640", "#c47a22"], honey: ["#f0c46a", "#e9b456", "#f5d48a"],
    green: ["#4f7d34", "#5f8f3c", "#3f6a2c"], deep: ["#24452a", "#2c5532", "#1d3a24"],
    red: ["#a8321f", "#c0442a"], blue: ["#2f4f86", "#3c63a0"], cream: ["#efdcaa", "#f4e6bf"]
  };
  const pick = (k) => pal[k][Math.floor(rand() * pal[k].length)];
  // rows from rim (bottom of canvas) to crown (top)
  const rows = [
    { h: 34, kinds: ["deep", "green"], seg: [60, 90] },          // rim
    { h: 60, kinds: ["red", "amber", "red", "blue"], seg: [50, 70] },  // jewel band
    { h: 70, kinds: ["green", "deep"], seg: [70, 110] },
    { h: 80, kinds: ["honey", "amber", "cream"], seg: [80, 130] },
    { h: 90, kinds: ["green", "honey", "green"], seg: [90, 150] },
    { h: 90, kinds: ["amber", "honey"], seg: [110, 170] },
    { h: 88, kinds: ["deep", "green"], seg: [140, 220] }        // crown
  ];
  let y = H;
  rows.forEach((row) => {
    const y0 = y - row.h;
    let x = 0;
    while (x < W) {
      const w = row.seg[0] + rand() * (row.seg[1] - row.seg[0]);
      const col = pick(row.kinds[Math.floor(rand() * row.kinds.length)]);
      ctx.fillStyle = col;
      // panes are slightly trapezoidal so the lead lines don't read as a grid
      const skew = (rand() - 0.5) * 18;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + skew, y0); ctx.lineTo(x + skew, y0); ctx.closePath();
      ctx.fill();
      // mottled, streaky glass
      for (let k = 0; k < 5; k++) {
        const gx = x + rand() * w, gy = y0 + rand() * row.h, gr = 8 + rand() * 30;
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        gg.addColorStop(0, rand() < 0.5 ? "rgba(255,240,200,0.35)" : "rgba(40,20,0,0.25)");
        gg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
      // lead came
      ctx.strokeStyle = "#17110b"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + skew, y0); ctx.stroke();
      x += w;
    }
    ctx.strokeStyle = "#17110b"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    y = y0;
  });
  return toTexture(c);
}

/* ---------------- Laptop screen: an evening video call ---------------- */
export function laptopScreenTexture() {
  const W = 1280, H = 820;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#16171c"; ctx.fillRect(0, 0, W, H);
  // top bar
  ctx.fillStyle = "#202229"; ctx.fillRect(0, 0, W, 54);
  ctx.fillStyle = "#e9e4d8"; ctx.font = "400 24px 'Courier Prime'";
  ctx.fillText("Weekly sync  ·  remote", 28, 35);
  ctx.textAlign = "right"; ctx.fillStyle = "#9fb497"; ctx.fillText("● 42:17", W - 28, 35);
  ctx.textAlign = "left";

  const tiles = [
    { bg: ["#3b4a63", "#22293a"], skin: "#c99a7b", hair: "#2b1d16", shirt: "#9b4a2f", name: "Priya" },
    { bg: ["#4d3b33", "#2a201b"], skin: "#8a5a40", hair: "#120c09", shirt: "#3f5e48", name: "Marcus" },
    { bg: ["#2f4a40", "#1b2a24"], skin: "#e2b89c", hair: "#c48a4a", shirt: "#e6dcc6", name: "Hannah" },
    { bg: ["#5a4a3a", "#2f261d"], skin: "#e8bfa3", hair: "#5a3420", shirt: "#c9c9c9", name: "Emily (you)" }
  ];
  const pad = 18, tw = (W - pad * 3) / 2, th = (H - 54 - 110 - pad * 3) / 2;
  tiles.forEach((t, i) => {
    const x = pad + (i % 2) * (tw + pad), y = 54 + pad + Math.floor(i / 2) * (th + pad);
    const g = ctx.createLinearGradient(x, y, x, y + th);
    g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, tw, th, 14); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tw, th, 14); ctx.clip();
    // a soft lamp glow in each person's room
    const lg = ctx.createRadialGradient(x + tw * 0.8, y + th * 0.25, 0, x + tw * 0.8, y + th * 0.25, tw * 0.5);
    lg.addColorStop(0, "rgba(255, 210, 150, 0.25)"); lg.addColorStop(1, "rgba(255,210,150,0)");
    ctx.fillStyle = lg; ctx.fillRect(x, y, tw, th);
    const cx = x + tw / 2, cy = y + th * 0.52;
    ctx.fillStyle = t.shirt;
    ctx.beginPath(); ctx.ellipse(cx, y + th + 30, tw * 0.3, th * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.hair;
    ctx.beginPath(); ctx.ellipse(cx, cy - 8, th * 0.2, th * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    if (i === 3) { ctx.fillRect(cx - th * 0.2, cy - 8, th * 0.4, th * 0.42); }   // shoulder-length hair
    ctx.fillStyle = t.skin;
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, th * 0.15, th * 0.19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.roundRect(x + 12, y + th - 44, ctx.measureText(t.name).width + 30, 32, 8); ctx.fill();
    ctx.fillStyle = "#f2ede2"; ctx.font = "400 22px 'Courier Prime'";
    ctx.fillText(t.name, x + 26, y + th - 21);
    if (i === 0) { ctx.strokeStyle = "#9fb497"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, tw - 4, th - 4, 12); ctx.stroke(); }
  });
  // control bar
  const by = H - 80;
  [["#2c2e36", -150], ["#2c2e36", -50], ["#2c2e36", 50], ["#b5402a", 150]].forEach(([col, dx]) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(W / 2 + dx, by, 30, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = "#e9e4d8"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(W / 2 - 160, by - 14, 20, 26, 10); ctx.stroke();           // mic
  ctx.beginPath(); ctx.roundRect(W / 2 - 64, by - 11, 22, 22, 4); ctx.stroke();               // camera
  ctx.beginPath(); ctx.moveTo(W / 2 - 42, by); ctx.lineTo(W / 2 - 34, by - 7); ctx.lineTo(W / 2 - 34, by + 7); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(W / 2 + 36, by - 12, 28, 22, 3); ctx.stroke();               // share
  ctx.beginPath(); ctx.moveTo(W / 2 + 136, by); ctx.lineTo(W / 2 + 164, by); ctx.stroke();  // leave
  return toTexture(c);
}

export function keyboardTexture() {
  const W = 1024, H = 700;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#3c3d42"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1b1c20";
  const kw = 60, gap = 8, x0 = 60;
  for (let r = 0; r < 6; r++) {
    for (let k = 0; k < 13; k++) {
      ctx.beginPath(); ctx.roundRect(x0 + k * (kw + gap), 40 + r * (kw * (r === 0 ? 0.5 : 1) + gap) - (r > 0 ? kw * 0.5 : 0), kw, r === 0 ? kw * 0.5 : kw, 6); ctx.fill();
    }
  }
  ctx.fillStyle = "#2f3035";
  ctx.beginPath(); ctx.roundRect(W / 2 - 200, 470, 400, 200, 14); ctx.fill();               // trackpad
  return toTexture(c);
}
