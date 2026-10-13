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
    ctx.strokeStyle = rand() < 0.75 ? `rgba(24, 11, 4, ${0.2 + rand() * 0.42})` : `rgba(170, 115, 70, ${0.12 + rand() * 0.18})`;
    ctx.lineWidth = (0.6 + rand() * 1.8) * 1.4;
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
      ctx.strokeStyle = `rgba(22, 10, 4, ${0.2 + rand() * 0.18})`;
      ctx.lineWidth = 1 + rand() * 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 4.2, r * 0.55, 0, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }
  }
  // bold flame figure and dark heartwood streaks (own RNG: leaves other textures unchanged)
  const r2 = mulberry32(91);
  for (let i = 0; i < 70; i++) {
    const y = r2() * H, amp = 6 + r2() * 22, freq = 0.0015 + r2() * 0.003, ph = r2() * 10;
    ctx.strokeStyle = `rgba(18, 8, 3, ${0.25 + r2() * 0.35})`;
    ctx.lineWidth = 2 + r2() * 5;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 12) {
      const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.4;
      x < 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const cx = r2() * W, cy = r2() * H;
    for (let r = 8; r < 260; r += 7 + r2() * 5) {
      ctx.strokeStyle = r2() < 0.8 ? `rgba(20, 9, 3, ${0.22 + r2() * 0.2})` : `rgba(175, 120, 75, ${0.15 + r2() * 0.12})`;
      ctx.lineWidth = 1.2 + r2() * 2.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 4.6, r * 0.5, 0, Math.PI * 0.85, Math.PI * 2.15);
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

/* ---------------- Tiffany shade: cream glass, irises and a butterfly ----------------
   Painted in lathe UV space: u runs around the shade, v from rim (0) to crown (1).
   Canvas y = (1 - v) * H. The pattern repeats REP times around the shade. */
export function tiffanyGlassTexture() {
  const W = 2048, H = 640, REP = 3, RW = W / REP;
  const rnd = mulberry32(23);
  const [c, ctx] = canvas(W, H);
  const yv = (v) => (1 - v) * H;
  const LEAD = "#1a130c";

  // draw a shape at every repeat, plus wrapped copies at the seam
  function each(fn) {
    for (let k = -1; k <= REP; k++) { ctx.save(); ctx.translate(k * RW, 0); fn(); ctx.restore(); }
  }
  function glassFill(path, base, light) {
    ctx.fillStyle = base; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    const b = path.__b || [0, 0, RW, H];
    for (let i = 0; i < 6; i++) {
      const x = b[0] + rnd() * b[2], y = b[1] + rnd() * b[3], r = 10 + rnd() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd() < 0.55 ? light : "rgba(60,30,10,0.18)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.stroke(path);
  }

  // cream background, leaded into small panes
  ctx.fillStyle = "#e6d3a4"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() < 0.5 ? "rgba(255,250,230,0.5)" : "rgba(200,170,110,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = LEAD; ctx.lineWidth = 3;
  const rows = [0.1, 0.24, 0.38, 0.52, 0.64, 0.75, 0.85, 0.93];
  rows.forEach((v) => { ctx.beginPath(); ctx.moveTo(0, yv(v)); ctx.lineTo(W, yv(v)); ctx.stroke(); });
  for (let i = 0; i < rows.length - 1; i++) {
    const n = Math.max(8, Math.round(64 * (1 - rows[i] * 0.75)));      // narrower panes toward the crown
    for (let j = 0; j < n; j++) {
      const x = (j / n) * W;
      ctx.beginPath(); ctx.moveTo(x, yv(rows[i])); ctx.lineTo(x, yv(rows[i + 1])); ctx.stroke();
    }
  }
  // crown ring and border
  ctx.fillStyle = "#e9d9ae"; ctx.fillRect(0, 0, W, yv(0.93));

  // green border band along the scalloped rim
  for (let j = 0; j < 56; j++) {
    const p = new Path2D(), x = (j / 56) * W, w = W / 56;
    p.rect(x, yv(0.1), w, yv(0) - yv(0.1));
    p.__b = [x, yv(0.1), w, yv(0) - yv(0.1)];
    glassFill(p, j % 2 ? "#3f6e34" : "#4f8540", "rgba(200,240,170,0.3)");
  }

  each(() => {
    // tall leaves and stems
    const leaves = [[20, 0.08, 0.56, -18], [70, 0.08, 0.7, 14], [125, 0.08, 0.5, -10], [180, 0.08, 0.64, 20], [250, 0.08, 0.58, -16],
      [310, 0.08, 0.72, 10], [370, 0.08, 0.52, 14], [430, 0.08, 0.66, -12], [500, 0.08, 0.6, 16], [560, 0.08, 0.5, -10], [620, 0.08, 0.68, 12], [665, 0.08, 0.54, -14]];
    leaves.forEach(([x, v0, v1, bend], i) => {
      const p = new Path2D(), y0 = yv(v0), y1 = yv(v1), w = 26 + (i % 3) * 8;
      p.moveTo(x - w / 2, y0);
      p.quadraticCurveTo(x - w / 2 + bend, (y0 + y1) / 2, x + bend * 1.6, y1);
      p.quadraticCurveTo(x + w / 2 + bend, (y0 + y1) / 2, x + w / 2, y0);
      p.closePath();
      p.__b = [x - 30, y1, 60, y0 - y1];
      glassFill(p, ["#4c7f39", "#2f5a2b", "#6a9a45"][i % 3], "rgba(210,245,170,0.35)");
    });
    // blooms: pansy/iris shapes, five petals around a dark heart
    const blooms = [
      { x: 95, v: 0.5, r: 82, col: ["#e48ab4", "#cc6f9c"], heart: "#6e2445" },
      { x: 260, v: 0.4, r: 92, col: ["#f0953a", "#de7624"], heart: "#7a3010" },
      { x: 440, v: 0.54, r: 86, col: ["#9a88dc", "#7c68c8"], heart: "#33245e" },
      { x: 600, v: 0.38, r: 70, col: ["#e9a0c4", "#c96b98"], heart: "#6e2445" }
    ];
    blooms.forEach((b) => {
      const cx = b.x, cy = yv(b.v);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2 + 0.3;
        const p = new Path2D();
        p.ellipse(cx + Math.cos(a) * b.r * 0.55, cy + Math.sin(a) * b.r * 0.5, b.r * 0.58, b.r * 0.42, a, 0, Math.PI * 2);
        p.__b = [cx - b.r * 1.2, cy - b.r * 1.2, b.r * 2.4, b.r * 2.4];
        glassFill(p, b.col[k % 2], "rgba(255,240,250,0.45)");
      }
      const h = new Path2D();
      h.arc(cx, cy, b.r * 0.2, 0, Math.PI * 2);
      h.__b = [cx - 12, cy - 12, 24, 24];
      glassFill(h, b.heart, "rgba(255,200,120,0.4)");
    });
    // butterfly near the top
    const bx = 360, by = yv(0.78);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const p = new Path2D();
      p.ellipse(bx + sx * 22, by + sy * (sy < 0 ? 14 : 10), sy < 0 ? 24 : 16, sy < 0 ? 17 : 12, sx * sy * 0.5, 0, Math.PI * 2);
      p.__b = [bx - 50, by - 40, 100, 80];
      glassFill(p, "#4a3324", "rgba(240,200,140,0.5)");
      ctx.fillStyle = "#f3e6c4";
      ctx.beginPath(); ctx.arc(bx + sx * 26, by + sy * 14, 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = LEAD;
    ctx.beginPath(); ctx.ellipse(bx, by, 4, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = LEAD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 18); ctx.quadraticCurveTo(bx - 6, by - 34, bx - 14, by - 36); ctx.moveTo(bx, by - 18); ctx.quadraticCurveTo(bx + 6, by - 34, bx + 14, by - 36); ctx.stroke();
  });
  return toTexture(c);
}

/* ---------------- Laptop screen: a project board ---------------- */
export function laptopScreenTexture() {
  const W = 1280, H = 820;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#f4f1ea"; ctx.fillRect(0, 0, W, H);
  // sidebar
  ctx.fillStyle = "#24302a"; ctx.fillRect(0, 0, 220, H);
  ctx.fillStyle = "#e9e4d8"; ctx.font = "700 24px 'Courier Prime'";
  ctx.fillText("Projects", 26, 52);
  ctx.font = "400 19px 'Courier Prime'";
  ["Brand refresh", "Fall campaign", "Newsletter", "Book launch", "Course design"].forEach((t, i) => {
    if (i === 0) { ctx.fillStyle = "rgba(159,180,151,0.25)"; ctx.fillRect(12, 84 + i * 44, 196, 36); }
    ctx.fillStyle = ["#9fb497", "#e8a640", "#a99ae0", "#d886ae", "#7fa3c8"][i];
    ctx.beginPath(); ctx.arc(32, 102 + i * 44, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = i === 0 ? "#ffffff" : "#c9c4b6";
    ctx.fillText(t, 48, 109 + i * 44);
  });
  // header
  ctx.fillStyle = "#2a1d14"; ctx.font = "400 34px Fraunces";
  ctx.fillText("Brand refresh", 250, 58);
  ctx.fillStyle = "#7a5b44"; ctx.font = "400 18px 'Courier Prime'";
  ctx.fillText("Board  ·  Timeline  ·  Files", 252, 92);
  ["#c99a7b", "#8a5a40", "#e2b89c", "#5a3420"].forEach((col, i) => {
    ctx.fillStyle = col; ctx.strokeStyle = "#f4f1ea"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W - 150 + i * 26, 50, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "#3f5e48";
  ctx.beginPath(); ctx.roundRect(W - 150 + 4 * 26 - 4, 34, 40, 32, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "700 20px 'Courier Prime'"; ctx.fillText("+", W - 150 + 4 * 26 + 10, 57);

  // columns
  const cols = [
    { t: "To do", cards: [["Audience survey", "#e8a640", 0], ["Moodboard v2", "#a99ae0", 0], ["Press kit outline", "#d886ae", 0]] },
    { t: "In progress", cards: [["Campaign brief", "#9fb497", 0.6], ["Social calendar", "#e8a640", 0.35], ["Landing page copy", "#7fa3c8", 0.8]] },
    { t: "Review", cards: [["Logo lockups", "#d886ae", 1], ["Q3 report", "#9fb497", 1]] },
    { t: "Done", cards: [["Kickoff call", "#7fa3c8", 1], ["Brand audit", "#e8a640", 1], ["Style guide", "#a99ae0", 1]] }
  ];
  const cx0 = 246, cw = (W - cx0 - 24 - 3 * 16) / 4;
  cols.forEach((col, i) => {
    const x = cx0 + i * (cw + 16), y = 124;
    ctx.fillStyle = "#e9e4d8";
    ctx.beginPath(); ctx.roundRect(x, y, cw, H - y - 24, 12); ctx.fill();
    ctx.fillStyle = "#4a3426"; ctx.font = "700 19px 'Courier Prime'";
    ctx.fillText(col.t.toUpperCase(), x + 16, y + 34);
    ctx.fillStyle = "#9a8a76"; ctx.font = "400 18px 'Courier Prime'";
    ctx.fillText(String(col.cards.length), x + cw - 30, y + 34);
    col.cards.forEach(([title, tag, prog], j) => {
      const yy = y + 56 + j * 150;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(60,40,20,0.15)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      ctx.beginPath(); ctx.roundRect(x + 10, yy, cw - 20, 132, 10); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = tag;
      ctx.beginPath(); ctx.roundRect(x + 24, yy + 16, 64, 12, 6); ctx.fill();
      ctx.fillStyle = "#2a1d14"; ctx.font = "400 21px Spectral";
      ctx.fillText(title, x + 24, yy + 56);
      if (col.t === "Done") {
        ctx.fillStyle = "#3f5e48"; ctx.font = "400 17px 'Courier Prime'";
        ctx.fillText("✓ complete", x + 24, yy + 112);
      } else {
        ctx.fillStyle = "#e9e4d8"; ctx.fillRect(x + 24, yy + 78, cw - 48, 8);
        ctx.fillStyle = "#3f5e48"; ctx.fillRect(x + 24, yy + 78, (cw - 48) * prog, 8);
        ctx.fillStyle = "#9a8a76"; ctx.font = "400 16px 'Courier Prime'";
        ctx.fillText(["Mon", "Wed", "Fri", "Thu"][(i + j) % 4], x + 24, yy + 114);
      }
      ctx.fillStyle = ["#c99a7b", "#8a5a40", "#e2b89c"][(i + j) % 3];
      ctx.beginPath(); ctx.arc(x + cw - 42, yy + 106, 12, 0, Math.PI * 2); ctx.fill();
    });
  });
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

/* ---------------- Antique gilt: scrolling acanthus relief ----------------
   Tiles every 4 cm; returns a colour map and a matching bump map. */
export function giltTextures() {
  const S = 512;
  const rnd = mulberry32(57);
  const [hc, h] = canvas(S, S);           // height: white = raised
  h.fillStyle = "#5a5a5a"; h.fillRect(0, 0, S, S);
  h.lineCap = "round";
  function scroll(x, y, r, dir, w) {
    h.lineWidth = w;
    h.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.08) {
      const rr = r * (1 - a / (Math.PI * 3.6));
      const px = x + Math.cos(a * dir) * rr, py = y + Math.sin(a * dir) * rr;
      a === 0 ? h.moveTo(px, py) : h.lineTo(px, py);
    }
    h.stroke();
  }
  for (let pass = 0; pass < 2; pass++) {
    h.strokeStyle = pass ? "#f2f2f2" : "#9a9a9a";
    const w = pass ? 9 : 22;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) {
      const ox = k * S, oy = j * S;
      scroll(ox + 128, oy + 128, 100, 1, w);
      scroll(ox + 384, oy + 384, 100, -1, w);
      scroll(ox + 384, oy + 128, 70, 1, w * 0.8);
      scroll(ox + 128, oy + 384, 70, -1, w * 0.8);
    }
  }
  // stippled ground between the scrolls, as on old gesso
  for (let i = 0; i < 5000; i++) {
    h.fillStyle = `rgba(40,40,40,${0.2 + rnd() * 0.3})`;
    h.fillRect(rnd() * S, rnd() * S, 2, 2);
  }
  const bump = toTexture(hc, { srgb: false, repeat: [1 / 4, 1 / 4] });

  // colour: gold on the raised parts, brown patina in the recesses
  const [cc, cx] = canvas(S, S);
  const img = h.getImageData(0, 0, S, S).data;
  const out = cx.createImageData(S, S);
  for (let i = 0; i < img.length; i += 4) {
    const t = img[i] / 255;
    out.data[i] = 120 + t * 130; out.data[i + 1] = 86 + t * 112; out.data[i + 2] = 32 + t * 56; out.data[i + 3] = 255;
  }
  cx.putImageData(out, 0, 0);
  const map = toTexture(cc, { repeat: [1 / 4, 1 / 4] });
  return { map, bump };
}
