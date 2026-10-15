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
  wrapText(ctx, sealed ? "Password protected. Shared by introduction." : p.tagline, 280, top + 384, w - 330, 46);

  ctx.fillStyle = "#7a5b44";
  ctx.font = "400 26px 'Courier Prime'";
  ctx.fillText(`FILE UNDER ${p.letter}`, 48, h - 46);
  ctx.textAlign = "right";
  ctx.fillStyle = "#2e4535";
  ctx.fillText(sealed ? "ENTER PASSWORD →" : "PULL CARD →", w - 48, h - 46);

  if (sealed) stamp(ctx, "PRIVATE", w - 170, top + 130, "#9b4a2f");
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
  ctx.fillStyle = "#e8e2d3"; ctx.fillRect(0, 0, 220, H);
  ctx.fillStyle = "#d6cfbd"; ctx.fillRect(219, 0, 2, H);
  ctx.fillStyle = "#2a1d14"; ctx.font = "700 24px 'Courier Prime'";
  ctx.fillText("Projects", 26, 52);
  ctx.font = "400 19px 'Courier Prime'";
  ["Brand refresh", "Fall campaign", "Newsletter", "Book launch", "Course design"].forEach((t, i) => {
    if (i === 0) { ctx.fillStyle = "rgba(63,94,72,0.14)"; ctx.fillRect(12, 84 + i * 44, 196, 36); }
    ctx.fillStyle = ["#9fb497", "#e8a640", "#a99ae0", "#d886ae", "#7fa3c8"][i];
    ctx.beginPath(); ctx.arc(32, 102 + i * 44, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = i === 0 ? "#2a1d14" : "#6f6253";
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

/* ---------------- Gold-leaf moulding ----------------
   UV: u runs along a side (one tile = 4 cm), v across the profile from the sight edge (0) out.
   regions: { bead, cove, band } as [v0, v1]. Shading is baked across the profile so the
   rounded cove reads as rounded even in dim light. Returns colour + bump maps. */
export function giltMouldingTextures(regions) {
  const W = 1024, H = 512;
  const rnd = mulberry32(61);
  const [cc, c] = canvas(W, H);
  const [bc, b] = canvas(W, H);
  const vy = (v) => (1 - v) * H;
  const span = (r) => [vy(r[1]), vy(r[0]) - vy(r[1])];      // [top px, height px]

  // warm pale gold leaf over red-brown bole
  c.fillStyle = "#c3984f"; c.fillRect(0, 0, W, H);
  b.fillStyle = "#808080"; b.fillRect(0, 0, W, H);

  // cove: dark at both flanks, a broad burnished highlight along the crown
  const [cy, ch] = span(regions.cove);
  const g = c.createLinearGradient(0, cy + ch, 0, cy);
  g.addColorStop(0, "#7a5222"); g.addColorStop(0.18, "#b88a43"); g.addColorStop(0.42, "#ecd08f");
  g.addColorStop(0.55, "#f6e2aa"); g.addColorStop(0.72, "#c99c55"); g.addColorStop(1, "#6e4a1e");
  c.fillStyle = g; c.fillRect(0, cy, W, ch);
  // long burnishing streaks and the odd worn spot where the red bole shows through
  for (let i = 0; i < 320; i++) {
    const y = cy + rnd() * ch, x = rnd() * W, len = 60 + rnd() * 420;
    c.strokeStyle = rnd() < 0.65 ? `rgba(255, 238, 190, ${0.06 + rnd() * 0.16})` : `rgba(110, 70, 25, ${0.06 + rnd() * 0.12})`;
    c.lineWidth = 1 + rnd() * 3;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    c.beginPath(); c.moveTo(x - W, y); c.lineTo(x - W + len, y); c.stroke();
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(120, 50, 25, ${0.25 + rnd() * 0.3})`;
    c.fillRect(rnd() * W, cy + rnd() * ch, 2 + rnd() * 10, 1 + rnd() * 2);
  }

  // bead: a bright line with a dark groove either side
  const [by, bh] = span(regions.bead);
  const bg = c.createLinearGradient(0, by + bh, 0, by);
  bg.addColorStop(0, "#4a3010"); bg.addColorStop(0.3, "#d7b46a"); bg.addColorStop(0.5, "#f8e6b2");
  bg.addColorStop(0.75, "#b88a43"); bg.addColorStop(1, "#4a3010");
  c.fillStyle = bg; c.fillRect(0, by, W, bh);
  // tiny pearls along the bead
  for (let x = 0; x < W; x += 16) {
    b.fillStyle = "#c8c8c8"; b.beginPath(); b.ellipse(x + 8, by + bh / 2, 6, bh * 0.35, 0, 0, Math.PI * 2); b.fill();
  }

  // ornamented border: running rocaille of leaves, nubs and scrolls in gold on a dark ground
  const [ny, nh] = span(regions.band);
  c.fillStyle = "#3b240c"; c.fillRect(0, ny, W, nh);
  b.fillStyle = "#2e2e2e"; b.fillRect(0, ny, W, nh);
  for (let k = -1; k <= 1; k++) {
    let x = k * W;
    while (x < (k + 1) * W) {
      const kind = rnd();
      const w = 12 + rnd() * 22, hh = nh * (0.4 + rnd() * 0.45), cyy = ny + nh / 2 + (rnd() - 0.5) * nh * 0.25;
      const rot = (rnd() - 0.5) * 1.4;
      if (kind < 0.7) {
        const gg = c.createRadialGradient(x + w / 2 - w * 0.15, cyy - hh * 0.2, 1, x + w / 2, cyy, w * 0.6);
        gg.addColorStop(0, "#fbe8b4"); gg.addColorStop(0.6, "#d4ac60"); gg.addColorStop(1, "#8a6026");
        c.fillStyle = gg;
        c.beginPath(); c.ellipse(x + w / 2, cyy, w / 2, hh / 2, rot, 0, Math.PI * 2); c.fill();
        b.fillStyle = "#f2f2f2";
        b.beginPath(); b.ellipse(x + w / 2, cyy, w / 2, hh / 2, rot, 0, Math.PI * 2); b.fill();
      } else {
        // a little C-scroll
        c.strokeStyle = "#dcb76c"; b.strokeStyle = "#e6e6e6";
        [c, b].forEach((ctx) => {
          ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + w / 2, cyy, Math.min(w, hh) * 0.35, 0.3, Math.PI * 1.7); ctx.stroke();
        });
      }
      x += w * (0.75 + rnd() * 0.45);
    }
  }
  // border edges: thin bright fillets
  c.fillStyle = "#e6c784"; c.fillRect(0, ny - 3, W, 3); c.fillRect(0, ny + nh, W, 3);

  // fine distressing everywhere
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(45, 25, 8, ${0.15 + rnd() * 0.35})`;
    c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 1.5);
  }
  return {
    map: toTexture(cc, { repeat: [1, 1] }),
    bump: toTexture(bc, { srgb: false, repeat: [1, 1] })
  };
}

/* ---------------- Golden pothos leaf ----------------
   Bright green, glossy, with butter-yellow variegation streaking out from the midrib. */
export function pothosLeafTexture() {
  const S = 512;
  const rnd = mulberry32(77);
  const [c, ctx] = canvas(S, S);
  const g = ctx.createLinearGradient(0, S, S * 0.3, 0);
  g.addColorStop(0, "#3d7f22"); g.addColorStop(0.55, "#4f9a2c"); g.addColorStop(1, "#63ad38");
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // variegation: soft yellow-cream streaks fanning from the midrib, following the veins
  for (let i = 0; i < 60; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const y0 = S * (0.15 + rnd() * 0.8);
    const reach = S * (0.15 + rnd() * 0.33);
    ctx.strokeStyle = `rgba(${225 + rnd() * 25}, ${228 + rnd() * 20}, ${120 + rnd() * 50}, ${0.25 + rnd() * 0.45})`;
    ctx.lineWidth = 3 + rnd() * 16;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(S / 2 + side * 4, y0);
    ctx.quadraticCurveTo(S / 2 + side * reach * 0.6, y0 - reach * 0.25, S / 2 + side * reach, y0 - reach * 0.55 - rnd() * 30);
    ctx.stroke();
  }
  // a few broad lime patches
  for (let i = 0; i < 10; i++) {
    const x = S * (0.2 + rnd() * 0.6), y = S * (0.1 + rnd() * 0.8), r = 30 + rnd() * 70;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, "rgba(200, 225, 90, 0.4)"); rg.addColorStop(1, "rgba(200, 225, 90, 0)");
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // pale midrib and fine paired veins
  ctx.strokeStyle = "rgba(225, 235, 160, 0.85)"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(S / 2, S); ctx.quadraticCurveTo(S / 2 + 6, S * 0.5, S / 2, S * 0.03); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(210, 230, 150, 0.55)";
  for (let i = 0; i < 7; i++) {
    const y = S * (0.9 - i * 0.12);
    [-1, 1].forEach((sd) => {
      ctx.beginPath(); ctx.moveTo(S / 2, y);
      ctx.quadraticCurveTo(S / 2 + sd * S * 0.2, y - S * 0.05, S / 2 + sd * S * 0.4, y - S * 0.17); ctx.stroke();
    });
  }
  return toTexture(c);
}

/* ---------------- Frame medallion: a carved cartouche ----------------
   Returns { height: Float32Array (W*H, 0..1), W, H, map } — height drives real relief. */
export function cartoucheRelief() {
  const W = 440, H = 200;
  const [hc, h] = canvas(W, H);
  h.fillStyle = "#000"; h.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const v = (x) => `rgb(${x},${x},${x})`;
  h.lineCap = "round"; h.lineJoin = "round";
  // backing cartouche: a shallow lozenge the ornament sits on
  h.fillStyle = v(80);
  h.beginPath(); h.ellipse(cx, cy, 150, 64, 0, 0, Math.PI * 2); h.fill();
  // C-scrolls, mirrored
  [-1, 1].forEach((sd) => {
    h.strokeStyle = v(200); h.lineWidth = 15;
    h.beginPath();
    for (let a = 0; a <= Math.PI * 2.3; a += 0.06) {
      const r = 40 - a * 9;
      const x = cx + sd * (82 + Math.cos(a) * r), y = cy - 6 + Math.sin(a) * r * 0.9;
      a === 0 ? h.moveTo(x, y) : h.lineTo(x, y);
    }
    h.stroke();
    h.lineWidth = 12;
    h.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.06) {
      const r = 26 - a * 7;
      const x = cx + sd * (150 - Math.cos(a) * r), y = cy + 14 - Math.sin(a) * r * 0.9;
      a === 0 ? h.moveTo(x, y) : h.lineTo(x, y);
    }
    h.stroke();
    // acanthus leaves fanning outward
    for (let k = 0; k < 3; k++) {
      h.fillStyle = v(150 + k * 20);
      h.beginPath();
      h.ellipse(cx + sd * (190 + k * 6), cy - 30 + k * 28, 28, 10, sd * (0.6 - k * 0.5), 0, Math.PI * 2);
      h.fill();
    }
    // small leaves above and below the boss
    h.fillStyle = v(170);
    h.beginPath(); h.ellipse(cx + sd * 26, cy - 62, 26, 10, sd * 0.5, 0, Math.PI * 2); h.fill();
    h.beginPath(); h.ellipse(cx + sd * 26, cy + 62, 26, 10, -sd * 0.5, 0, Math.PI * 2); h.fill();
  });
  // ring and domed boss
  h.strokeStyle = v(215); h.lineWidth = 12;
  h.beginPath(); h.ellipse(cx, cy, 52, 46, 0, 0, Math.PI * 2); h.stroke();
  const bg = h.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 36);
  bg.addColorStop(0, v(255)); bg.addColorStop(1, v(150));
  h.fillStyle = bg;
  h.beginPath(); h.ellipse(cx, cy, 34, 30, 0, 0, Math.PI * 2); h.fill();

  // soften into a carved relief
  const [sc, sctx] = canvas(W, H);
  sctx.filter = "blur(3px)";
  sctx.drawImage(hc, 0, 0);
  const d = sctx.getImageData(0, 0, W, H).data;
  const height = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) height[i] = d[i * 4] / 255;

  // colour: burnished gold on the high points, black-brown patina pooled in the recesses
  const [cc, cctx] = canvas(W, H);
  const img = cctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const t = Math.min(1, Math.max(0, (height[i] - 0.18) / 0.6));
    const k = t * t * (3 - 2 * t);
    // deepest crevices (rim of each form) go dark; bodies stay gold with highlights on top
    const rim = Math.min(1, Math.max(0, (0.32 - height[i]) / 0.2));
    const r = 150 + k * 100, gg = 106 + k * 112, bb = 46 + k * 92;
    img.data[i * 4] = r * (1 - rim * 0.7); img.data[i * 4 + 1] = gg * (1 - rim * 0.72); img.data[i * 4 + 2] = bb * (1 - rim * 0.75);
    img.data[i * 4 + 3] = height[i] > 0.1 ? 255 : 0;
  }
  cctx.putImageData(img, 0, 0);
  const map = toTexture(cc);
  return { height, W, H, map };
}

/* ---------------- City at night, in three depths (seen through the window) ----------------
   Each layer is painted in world centimetres on a plane: spec = { w, h, cx, cy, s } where s is
   pixels per cm. Painting with y up keeps the layout readable. */
function worldCanvas(spec) {
  const [c, ctx] = canvas(Math.round(spec.w * spec.s), Math.round(spec.h * spec.s));
  ctx.setTransform(spec.s, 0, 0, -spec.s, -(spec.cx - spec.w / 2) * spec.s, (spec.cy + spec.h / 2) * spec.s);
  return [c, ctx];
}
function windowGrid(ctx, rnd, x, y0, w, h, o) {
  // o: { cw, ch, ww, wh, lit, warm, office }
  for (let y = y0 + o.ch * 0.6; y < y0 + h - o.ch * 0.4; y += o.ch) {
    const floorLit = o.office && rnd() < 0.18;
    for (let xx = x + o.cw * 0.35; xx < x + w - o.ww; xx += o.cw) {
      const on = floorLit || rnd() < o.lit;
      if (on) {
        const warm = rnd() < o.warm;
        const a = 0.55 + rnd() * 0.45;
        ctx.fillStyle = warm ? `rgba(255, ${200 + rnd() * 40}, ${120 + rnd() * 60}, ${a})` : `rgba(${200 + rnd() * 30}, ${215 + rnd() * 25}, 255, ${a})`;
      } else {
        ctx.fillStyle = `rgba(20, 22, 34, ${0.5 + rnd() * 0.4})`;
      }
      ctx.fillRect(xx, y, o.ww, o.wh);
    }
  }
}

export const CITY = {
  // dy lowers each painted layer so the skyline sits at eye level, where the window is seen from the desk
  far: { w: 560, h: 520, cx: 150, cy: 170, z: -400, s: 2.6, dy: -100 },
  mid: { w: 320, h: 220, cx: 90, cy: 70, z: -220, s: 5, dy: -55 },
  near: { w: 240, h: 160, cx: 55, cy: 60, z: -120, s: 7, dy: -14 }
};

export function cityFarTexture() {
  const L = CITY.far, rnd = mulberry32(101);
  const [c, ctx] = worldCanvas(L);
  const x0 = L.cx - L.w / 2, x1 = L.cx + L.w / 2, y0 = L.cy - L.h / 2, y1 = L.cy + L.h / 2;
  // sky: deep blue overhead, warming to an amber city glow at the horizon
  const g = ctx.createLinearGradient(0, y1, 0, y0);
  g.addColorStop(0, "#050813"); g.addColorStop(0.35, "#0c1328"); g.addColorStop(0.55, "#1b2340");
  g.addColorStop(0.66, "#3b3350"); g.addColorStop(0.72, "#6b4b48"); g.addColorStop(1, "#1a1418");
  ctx.fillStyle = g; ctx.fillRect(x0, y0, L.w, L.h);
  for (let i = 0; i < 260; i++) {
    const y = 180 + rnd() * (y1 - 180);
    ctx.fillStyle = `rgba(230,235,255,${0.2 + rnd() * 0.6})`;
    ctx.fillRect(x0 + rnd() * L.w, y, 0.4, 0.4);
  }
  // moon
  ctx.fillStyle = "rgba(220,228,255,0.12)"; ctx.beginPath(); ctx.arc(300, 255, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1eee2"; ctx.beginPath(); ctx.arc(300, 255, 4.5, 0, Math.PI * 2); ctx.fill();

  // river with reflections
  ctx.fillStyle = "#0f1220"; ctx.fillRect(x0, 58, L.w, 18);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(255, ${190 + rnd() * 50}, ${120 + rnd() * 60}, ${0.15 + rnd() * 0.35})`;
    ctx.fillRect(x0 + rnd() * L.w, 58 + rnd() * 17, 1 + rnd() * 5, 0.25);
  }
  // suspension bridge on the left
  const deck = 76;
  ctx.fillStyle = "#15182a"; ctx.fillRect(-120, deck - 1.5, 220, 2.2);
  [[-40, 36], [50, 36]].forEach(([tx, th]) => {
    ctx.fillStyle = "#1a1d31";
    ctx.fillRect(tx - 2.5, deck, 1.6, th); ctx.fillRect(tx + 0.9, deck, 1.6, th);
    ctx.fillRect(tx - 2.5, deck + th - 3, 5, 1.2); ctx.fillRect(tx - 2.5, deck + th * 0.5, 5, 1);
  });
  ctx.strokeStyle = "rgba(160, 170, 210, 0.45)"; ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(-120, deck + 18); ctx.quadraticCurveTo(-85, deck + 2, -40, deck + 36);
  ctx.quadraticCurveTo(5, deck + 2, 50, deck + 36); ctx.quadraticCurveTo(75, deck + 12, 100, deck + 2); ctx.stroke();
  for (let x = -110; x < 100; x += 3) {                // deck lights
    ctx.fillStyle = "rgba(255, 220, 150, 0.9)"; ctx.fillRect(x, deck + 0.4, 0.6, 0.6);
  }
  for (let x = -120; x < 100; x += 4) {                // suspenders
    const t = ((x + 120) % 90) / 90;
    ctx.fillStyle = "rgba(150,160,200,0.25)"; ctx.fillRect(x, deck, 0.15, 2 + 30 * Math.pow(Math.abs(t - 0.5) * 2, 2));
  }

  // the skyline across the river, softened by haze
  const base = 78;
  let x = 60;
  while (x < 400) {
    const w = 5 + rnd() * 13, hgt = 10 + Math.pow(rnd(), 1.6) * 55;
    ctx.fillStyle = rnd() < 0.5 ? "#191d33" : "#20223a";
    ctx.fillRect(x, base, w, hgt);
    windowGrid(ctx, rnd, x, base, w, hgt, { cw: 1.1, ch: 1.5, ww: 0.5, wh: 0.7, lit: 0.22, warm: 0.7, office: true });
    if (rnd() < 0.2) { ctx.fillStyle = "#191d33"; ctx.fillRect(x + w * 0.3, base + hgt, w * 0.4, 4); }
    x += w + rnd() * 1.5;
  }
  // landmark towers: a tapered glass tower with a spire, and a stepped deco tower with a lit crown
  const st = 235, sb = base, sh = 112;
  ctx.fillStyle = "#1d2440";
  ctx.beginPath(); ctx.moveTo(st - 8, sb); ctx.lineTo(st + 8, sb); ctx.lineTo(st + 4.5, sb + sh); ctx.lineTo(st - 4.5, sb + sh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(120, 150, 220, 0.18)";
  ctx.beginPath(); ctx.moveTo(st - 8, sb); ctx.lineTo(st, sb); ctx.lineTo(st, sb + sh); ctx.lineTo(st - 4.5, sb + sh); ctx.closePath(); ctx.fill();
  for (let y = sb + 2; y < sb + sh - 2; y += 1.6) {
    const k = (y - sb) / sh, hw = 8 - 3.5 * k;
    for (let xx = st - hw + 0.6; xx < st + hw - 0.8; xx += 1.2) {
      if (rnd() < 0.3) { ctx.fillStyle = `rgba(200,220,255,${0.4 + rnd() * 0.4})`; ctx.fillRect(xx, y, 0.6, 0.7); }
    }
  }
  ctx.fillStyle = "#2a3150"; ctx.fillRect(st - 0.5, sb + sh, 1, 30);
  ctx.fillStyle = "rgba(255,60,50,1)"; ctx.fillRect(st - 0.6, sb + sh + 30, 1.2, 1.2);
  const dt = 160, dh = 82;
  ctx.fillStyle = "#1b1f36";
  ctx.fillRect(dt - 9, base, 18, dh); ctx.fillRect(dt - 6, base + dh, 12, 8); ctx.fillRect(dt - 3.5, base + dh + 8, 7, 6);
  ctx.beginPath(); ctx.moveTo(dt - 3.5, base + dh + 14); ctx.lineTo(dt, base + dh + 26); ctx.lineTo(dt + 3.5, base + dh + 14); ctx.fill();
  ctx.fillStyle = "rgba(255, 215, 150, 0.85)";
  for (let k = 0; k < 4; k++) ctx.fillRect(dt - 3 + k * 0.1, base + dh + 9 + k * 3, 6 - k * 1.4, 0.6);
  windowGrid(ctx, rnd, dt - 9, base, 18, dh, { cw: 1.2, ch: 1.6, ww: 0.55, wh: 0.75, lit: 0.3, warm: 0.8 });
  windowGrid(ctx, rnd, st - 30, base, 14, 70, { cw: 1.2, ch: 1.6, ww: 0.55, wh: 0.75, lit: 0.3, warm: 0.6, office: true });

  // atmospheric haze over the far city
  const hz = ctx.createLinearGradient(0, base, 0, base + 120);
  hz.addColorStop(0, "rgba(80, 65, 85, 0.45)"); hz.addColorStop(1, "rgba(40, 45, 80, 0)");
  ctx.fillStyle = hz; ctx.fillRect(60, base, 360, 140);
  return toTexture(c);
}

export function cityMidTexture() {
  const L = CITY.mid, rnd = mulberry32(202);
  const [c, ctx] = worldCanvas(L);
  const base = -10;
  let x = -20;
  while (x < 200) {
    const w = 12 + rnd() * 20, hgt = 40 + rnd() * 75;
    const shade = 16 + Math.floor(rnd() * 12);
    ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 12})`;
    ctx.fillRect(x, base, w, hgt);
    // moonlit edge and a setback or two
    ctx.fillStyle = "rgba(120, 140, 200, 0.10)"; ctx.fillRect(x, base, w * 0.12, hgt);
    if (rnd() < 0.4) { ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 12})`; ctx.fillRect(x + w * 0.2, base + hgt, w * 0.6, 6 + rnd() * 8); }
    windowGrid(ctx, rnd, x, base, w, hgt, { cw: 2, ch: 2.6, ww: 1.1, wh: 1.4, lit: 0.18 + rnd() * 0.25, warm: 0.75, office: rnd() < 0.5 });
    // rooftop water tower or antenna
    const r = rnd();
    if (r < 0.3) {
      const tx = x + w * (0.25 + rnd() * 0.4), ty = base + hgt;
      ctx.fillStyle = "#0c0d14";
      ctx.fillRect(tx, ty, 0.4, 3); ctx.fillRect(tx + 4, ty, 0.4, 3);
      ctx.fillRect(tx - 0.4, ty + 3, 5.2, 4.5);
      ctx.beginPath(); ctx.moveTo(tx - 0.6, ty + 7.5); ctx.lineTo(tx + 2.2, ty + 9.5); ctx.lineTo(tx + 5, ty + 7.5); ctx.fill();
    } else if (r < 0.45) {
      ctx.fillStyle = "#0c0d14"; ctx.fillRect(x + w / 2, base + hgt, 0.4, 12);
      ctx.fillStyle = "rgba(255,60,50,1)"; ctx.fillRect(x + w / 2 - 0.4, base + hgt + 12, 1, 1);
    }
    x += w + rnd() * 4;
  }
  const hz = ctx.createLinearGradient(0, base, 0, base + 70);
  hz.addColorStop(0, "rgba(120, 80, 60, 0.35)"); hz.addColorStop(1, "rgba(60, 50, 80, 0)");
  ctx.fillStyle = hz; ctx.fillRect(-80, base, 360, 80);
  return toTexture(c);
}

export function cityNearTexture() {
  const L = CITY.near, rnd = mulberry32(303);
  const [c, ctx] = worldCanvas(L);
  // brick apartment building on the left, fire escape down the middle
  const bx = 2, bw = 46, by = -20, bh = 52;
  ctx.fillStyle = "#3a1f17"; ctx.fillRect(bx, by, bw, bh);
  for (let y = by; y < by + bh; y += 0.6) { ctx.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.08})`; ctx.fillRect(bx, y, bw, 0.12); }
  ctx.fillStyle = "#4a2b20"; ctx.fillRect(bx - 1, by + bh, bw + 2, 2.5);     // cornice
  ctx.fillStyle = "#2a1610"; ctx.fillRect(bx - 1, by + bh - 1, bw + 2, 1);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const wx = bx + 3 + col * 7.2, wy = by + 6 + row * 10;
      const lit = rnd() < 0.45;
      ctx.fillStyle = "#24140f"; ctx.fillRect(wx - 0.5, wy - 0.5, 4.4, 6.6);     // sill + lintel
      if (lit) {
        const tint = [[255, 214, 150], [255, 196, 130], [250, 228, 190], [255, 180, 120]][Math.floor(rnd() * 4)];
        const gr = ctx.createLinearGradient(0, wy, 0, wy + 5.6);
        gr.addColorStop(0, `rgba(${tint},0.95)`); gr.addColorStop(1, `rgba(${tint.map((v) => v * 0.7)},0.95)`);
        ctx.fillStyle = gr; ctx.fillRect(wx, wy, 3.4, 5.6);
        if (rnd() < 0.5) { ctx.fillStyle = "rgba(90, 40, 30, 0.45)"; ctx.fillRect(wx, wy, 1.2, 5.6); }   // curtain
      } else {
        ctx.fillStyle = "#151520"; ctx.fillRect(wx, wy, 3.4, 5.6);
      }
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(wx + 1.6, wy, 0.2, 5.6);
    }
  }
  ctx.strokeStyle = "#0d0d10"; ctx.lineWidth = 0.35;
  for (let row = 1; row < 5; row++) {
    const y = by + 5 + row * 10;
    ctx.strokeRect(bx + 16.5, y, 14, 0.3);
    ctx.beginPath(); ctx.moveTo(bx + 17, y); ctx.lineTo(bx + 29, y + 10); ctx.stroke();
    ctx.fillStyle = "#0d0d10";
    for (let k = 0; k < 8; k++) ctx.fillRect(bx + 16.5 + k * 2, y, 0.15, 2);   // railing
  }

  // lower buildings with shopfront glow to the right
  let x = 52;
  while (x < 180) {
    const w = 14 + rnd() * 18, hgt = 22 + rnd() * 22;
    ctx.fillStyle = rnd() < 0.5 ? "#1c1820" : "#231c1c";
    ctx.fillRect(x, -20, w, hgt + 20);
    windowGrid(ctx, rnd, x, 22, w, hgt - 22, { cw: 4.5, ch: 6, ww: 2.4, wh: 3.6, lit: 0.4, warm: 0.85 });
    x += w + 0.8;
  }

  // elevated subway: steel girder, columns, and a train with lit windows
  const ty = 14;
  ctx.fillStyle = "#121318"; ctx.fillRect(-70, ty - 6, 260, 6);
  ctx.strokeStyle = "rgba(90, 95, 110, 0.6)"; ctx.lineWidth = 0.3;
  for (let gx = -70; gx < 190; gx += 3) {
    ctx.beginPath(); ctx.moveTo(gx, ty - 6); ctx.lineTo(gx + 3, ty); ctx.moveTo(gx + 3, ty - 6); ctx.lineTo(gx, ty); ctx.stroke();
  }
  ctx.fillStyle = "#0e0f13";
  for (let gx = -60; gx < 190; gx += 22) ctx.fillRect(gx, -20, 2, ty - 6 + 20);
  for (let car = 0; car < 6; car++) {
    const cx0 = 4 + car * 23.5;
    const body = ctx.createLinearGradient(0, ty, 0, ty + 9);
    body.addColorStop(0, "#6c717c"); body.addColorStop(0.5, "#9aa0aa"); body.addColorStop(1, "#5a5f69");
    ctx.fillStyle = body; ctx.fillRect(cx0, ty, 22.5, 8.8);
    ctx.fillStyle = "#3c4048"; ctx.fillRect(cx0, ty + 8.8, 22.5, 0.6);
    for (let w = 0; w < 7; w++) {
      ctx.fillStyle = `rgba(255, ${232 + rnd() * 20}, ${185 + rnd() * 40}, 0.95)`;
      ctx.fillRect(cx0 + 1.2 + w * 3.05, ty + 3.6, 2.3, 3);
    }
    ctx.fillStyle = "#2c3037"; ctx.fillRect(cx0 + 10.4, ty + 0.8, 1.8, 6.5);    // door
  }
  ctx.fillStyle = "rgba(255, 240, 200, 1)"; ctx.fillRect(144, ty + 2, 0.8, 0.8);   // headlight

  // streetlight glow below the tracks
  for (let lx = -20; lx < 180; lx += 26) {
    const rg = ctx.createRadialGradient(lx, 2, 0, lx, 2, 14);
    rg.addColorStop(0, "rgba(255, 170, 80, 0.55)"); rg.addColorStop(1, "rgba(255, 170, 80, 0)");
    ctx.fillStyle = rg; ctx.fillRect(lx - 14, -12, 28, 28);
  }
  return toTexture(c);
}

/* ---------------- Hand-painted pink check enamel (for the mug) ----------------
   Lathe UV: u runs around, v up the side. */
export function pinkCheckTexture() {
  const W = 1024, H = 512, COLS = 12, ROWS = 6;
  const rnd = mulberry32(131);
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#f6f0e2"; ctx.fillRect(0, 0, W, H);
  const cw = W / COLS, rh = H / ROWS;
  const j = (v) => v + (rnd() - 0.5) * 7;          // a painter's wobble at each corner
  for (let r = 0; r < ROWS; r++) {
    for (let k = 0; k < COLS; k++) {
      if ((r + k) % 2) continue;
      const x0 = k * cw, y0 = r * rh;
      ctx.beginPath();
      ctx.moveTo(j(x0), j(y0)); ctx.lineTo(j(x0 + cw), j(y0)); ctx.lineTo(j(x0 + cw), j(y0 + rh)); ctx.lineTo(j(x0), j(y0 + rh));
      ctx.closePath();
      ctx.fillStyle = `rgba(${240 + rnd() * 10}, ${176 + rnd() * 14}, ${184 + rnd() * 12}, 0.85)`;
      ctx.fill();
      // brush strokes, slightly darker, running across the square
      for (let s = 0; s < 9; s++) {
        ctx.strokeStyle = `rgba(214, 140, 168, ${0.12 + rnd() * 0.2})`;
        ctx.lineWidth = 3 + rnd() * 7;
        const y = y0 + rnd() * rh;
        ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x0 + cw - 4, y + (rnd() - 0.5) * 6); ctx.stroke();
      }
      // the deeper pink line where the brush lifted at the square's edges
      ctx.strokeStyle = "rgba(200, 120, 152, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(j(x0), j(y0)); ctx.lineTo(j(x0), j(y0 + rh)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(j(x0 + cw), j(y0)); ctx.lineTo(j(x0 + cw), j(y0 + rh)); ctx.stroke();
    }
  }
  // the odd pale green-gold flick in the cream squares, as on the real thing
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(200, 200, 140, ${0.25 + rnd() * 0.25})`;
    ctx.lineWidth = 2;
    const x = rnd() * W, y = rnd() * H;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + rnd() * 20, y + (rnd() - 0.5) * 4); ctx.stroke();
  }
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/* ---------------- Book spines: cloth or leather with gold foil ----------------
   Returns { map, rough, metal, bump } for the spine face of a book lying flat. */
export function bookSpineTextures({ title, sub, cloth, icon, seed = 1, style = 0 }) {
  const W = 1024, H = 160;
  const r = mulberry32(seed);
  const [c, ctx] = canvas(W, H);
  const [rc, rctx] = canvas(W, H);    // roughness
  const [mc, mctx] = canvas(W, H);    // metalness
  const [bc, bctx] = canvas(W, H);    // bump
  ctx.fillStyle = cloth; ctx.fillRect(0, 0, W, H);
  // cloth weave and wear
  for (let i = 0; i < 9000; i++) {
    const v = r() < 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.04})`;
    ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1);
  }
  for (let i = 0; i < 14; i++) {     // scuffs
    const x = r() * W, y = r() * H, rr = 10 + r() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(255,240,220,${0.04 + r() * 0.06})`); g.addColorStop(1, "rgba(255,240,220,0)");
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // rounded spine: darker at top and bottom edges
  const sh = ctx.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, "rgba(0,0,0,0.35)"); sh.addColorStop(0.18, "rgba(0,0,0,0)"); sh.addColorStop(0.5, "rgba(255,255,255,0.05)");
  sh.addColorStop(0.82, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  // the edges wear through to the board
  ctx.fillStyle = "rgba(60,40,25,0.35)"; ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H);

  rctx.fillStyle = "#d8d8d8"; rctx.fillRect(0, 0, W, H);
  mctx.fillStyle = "#000"; mctx.fillRect(0, 0, W, H);
  bctx.fillStyle = "#808080"; bctx.fillRect(0, 0, W, H);

  // gold foil: drawn to colour, metalness, roughness and bump at once
  function foil(draw) {
    const goldGrad = ctx.createLinearGradient(0, 0, 0, H);
    goldGrad.addColorStop(0, "#b8913f"); goldGrad.addColorStop(0.45, "#f0d58c"); goldGrad.addColorStop(1, "#9a7430");
    ctx.save(); ctx.fillStyle = goldGrad; ctx.strokeStyle = goldGrad; draw(ctx); ctx.restore();
    mctx.save(); mctx.fillStyle = "#fff"; mctx.strokeStyle = "#fff"; draw(mctx); mctx.restore();
    rctx.save(); rctx.fillStyle = "#555"; rctx.strokeStyle = "#555"; draw(rctx); rctx.restore();
    bctx.save(); bctx.fillStyle = "#4a4a4a"; bctx.strokeStyle = "#4a4a4a"; draw(bctx); bctx.restore();  // foil is pressed in
  }
  // raised bands near each end
  const bands = style === 1 ? [70, 96, W - 96, W - 70] : [56, 70, W - 70, W - 56];
  foil((g) => { bands.forEach((x) => g.fillRect(x, 10, 5, H - 20)); });
  if (style === 2) foil((g) => { g.lineWidth = 3; g.strokeRect(120, 22, W - 240, H - 44); });
  // icon in a foil roundel
  foil((g) => {
    g.lineWidth = 3.5; g.beginPath(); g.arc(160, H / 2, 34, 0, Math.PI * 2); g.stroke();
    const doc = new DOMParser().parseFromString(`<svg>${icon}</svg>`, "image/svg+xml");
    g.save(); g.translate(160 - 26, H / 2 - 26); g.scale(52 / 24, 52 / 24); g.lineWidth = 1.9; g.lineCap = "round"; g.lineJoin = "round";
    doc.querySelectorAll("path,circle,rect").forEach((el) => {
      const p = new Path2D();
      if (el.tagName === "path") p.addPath(new Path2D(el.getAttribute("d")));
      else if (el.tagName === "circle") p.arc(+el.getAttribute("cx"), +el.getAttribute("cy"), +el.getAttribute("r"), 0, Math.PI * 2);
      else p.roundRect(+el.getAttribute("x"), +el.getAttribute("y"), +el.getAttribute("width"), +el.getAttribute("height"), +(el.getAttribute("rx") || 0));
      g.stroke(p);
    });
    g.restore();
  });
  // title and subtitle in foil
  // title sized to fit; the subtitle only where it has room of its own
  const T = title.toUpperCase(), S = sub.toUpperCase();
  let size = 68;
  ctx.font = `600 ${size}px Fraunces`;
  while (ctx.measureText(T).width > 600 && size > 40) { size -= 2; ctx.font = `600 ${size}px Fraunces`; }
  const titleEnd = 228 + ctx.measureText(T).width;
  ctx.font = "400 24px 'Courier Prime'";
  const showSub = titleEnd + 40 + ctx.measureText(S).width < W - 120;
  foil((g) => {
    g.textBaseline = "middle";
    g.font = `600 ${size}px Fraunces`;
    g.fillText(T, 228, H / 2 + 3);
    if (showSub) { g.font = "400 24px 'Courier Prime'"; g.textAlign = "right"; g.fillText(S, W - 130, H / 2 + 2); }
  });
  // foil wears off in places
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, w = 1 + r() * 4;
    ctx.fillStyle = cloth; ctx.globalAlpha = 0.35; ctx.fillRect(x, y, w, 1.5); ctx.globalAlpha = 1;
  }
  return {
    map: toTexture(c),
    rough: toTexture(rc, { srgb: false }), metal: toTexture(mc, { srgb: false }), bump: toTexture(bc, { srgb: false })
  };
}

export function pageEdgeTexture(seed = 3) {
  const W = 512, H = 64, r = mulberry32(seed);
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#efe4c8"; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 1.6) {
    ctx.fillStyle = `rgba(120, 95, 60, ${0.08 + r() * 0.12})`; ctx.fillRect(0, y, W, 0.6);
  }
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "rgba(150,110,60,0.25)"); g.addColorStop(0.1, "rgba(150,110,60,0)"); g.addColorStop(0.9, "rgba(150,110,60,0)"); g.addColorStop(1, "rgba(150,110,60,0.25)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return toTexture(c);
}

/* ---------------- Modern literary-fiction spines ----------------
   Flat printed colour, contemporary type, an author line and a small publisher mark.
   design: { bg, ink, accent, type: 0..3 } */
export function modernSpineTextures({ title, sub, icon, design, seed = 1 }) {
  const W = 1024, H = 160;
  const r = mulberry32(seed);
  const [c, ctx] = canvas(W, H);
  const [rc, rctx] = canvas(W, H);
  const { bg, ink, accent, type } = design;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // fine paper/cloth tooth, very light
  for (let i = 0; i < 5000; i++) {
    const v = r() < 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.025)`;
    ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 1);
  }
  // gentle roundness of the spine
  const sh = ctx.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, "rgba(0,0,0,0.18)"); sh.addColorStop(0.2, "rgba(0,0,0,0)");
  sh.addColorStop(0.5, "rgba(255,255,255,0.06)"); sh.addColorStop(0.8, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.2)");

  ctx.textBaseline = "middle";
  const mid = H / 2 + 2;
  // design-specific accents
  if (type === 0) {            // a bold colour block at the head
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 150, H);
  } else if (type === 1) {     // two thin rules framing the title
    ctx.fillStyle = accent; ctx.fillRect(196, 26, 4, H - 52); ctx.fillRect(W - 150, 26, 4, H - 52);
  } else if (type === 2) {     // a scatter of small dots, like a printed pattern
    ctx.fillStyle = accent;
    for (let x = 18; x < 140; x += 22) for (let y = 18; y < H; y += 22) { ctx.beginPath(); ctx.arc(x + (y % 44 ? 11 : 0), y, 4, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 4) {    // clean: fine rules near head and foot
    ctx.fillStyle = accent; ctx.fillRect(150, 30, 3, H - 60); ctx.fillRect(W - 150, 30, 3, H - 60);
  } else {                     // a wavy band
    ctx.strokeStyle = accent; ctx.lineWidth = 10;
    ctx.beginPath();
    for (let x = 0; x <= 150; x += 4) ctx.lineTo(x, mid + Math.sin(x / 14) * 22);
    ctx.stroke();
  }
  // icon
    const doc = new DOMParser().parseFromString(`<svg>${icon}</svg>`, "image/svg+xml");
  ctx.save(); ctx.translate(75 - 28, mid - 28); ctx.scale(56 / 24, 56 / 24);
  ctx.strokeStyle = type === 0 ? bg : ink; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
  doc.querySelectorAll("path,circle,rect").forEach((el) => {
    const p = new Path2D();
    if (el.tagName === "path") p.addPath(new Path2D(el.getAttribute("d")));
    else if (el.tagName === "circle") p.arc(+el.getAttribute("cx"), +el.getAttribute("cy"), +el.getAttribute("r"), 0, Math.PI * 2);
    else p.roundRect(+el.getAttribute("x"), +el.getAttribute("y"), +el.getAttribute("width"), +el.getAttribute("height"), +(el.getAttribute("rx") || 0));
    ctx.stroke(p);
  });
  ctx.restore();

  // title: each book set differently, like real covers from different publishers
  const fonts = [
    (s) => `italic 400 ${s}px Fraunces`,
    (s) => `700 ${s}px 'Courier Prime'`,
    (s) => `300 ${s}px Fraunces`,
    (s) => `500 ${s}px Caveat`,
    (s) => `400 ${s}px Fraunces`
  ];
  const caps = type === 1 || type === 2;
  const T = caps ? title.toUpperCase() : title;
  let size = type === 3 ? 80 : 70;
  ctx.font = fonts[type](size);
  while (ctx.measureText(T).width > 560 && size > 40) { size -= 2; ctx.font = fonts[type](size); }
  ctx.fillStyle = ink;
  if (type === 2) ctx.letterSpacing = "6px";
  ctx.fillText(T, 230, mid + (type === 3 ? 4 : 0));
  ctx.letterSpacing = "0px";
  const titleEnd = 230 + ctx.measureText(T).width;

  // author line, then a small publisher mark at the foot
  ctx.font = "500 26px Spectral";
  ctx.letterSpacing = "5px";
  ctx.fillStyle = ink; ctx.textAlign = "right";
  const S = sub ? sub.toUpperCase() : "EMILY M. HILL";
  if (titleEnd + 40 + ctx.measureText(S).width < W - 170) ctx.fillText(S, W - 170, mid);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(W - 64, mid, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = type === 0 ? ink : bg;
  ctx.font = "italic 400 24px Fraunces"; ctx.textAlign = "center";
  ctx.fillText("e", W - 64, mid - 2);
  ctx.textAlign = "left";

  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  rctx.fillStyle = "#b8b8b8"; rctx.fillRect(0, 0, W, H);   // satin print
  return { map: toTexture(c), rough: toTexture(rc, { srgb: false }) };
}
