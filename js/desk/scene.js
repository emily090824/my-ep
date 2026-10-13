/* ==========================================================================
   The desk: a rotary Rolodex on a walnut desk at dusk.
   Units are centimetres. y is up, the desk top is y = 0, the camera looks
   toward -z. Persona data comes from js/personas.js (window.PERSONAS).
   ========================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import * as TX from "./textures.js";

const section = document.getElementById("rolodex");
const canvasEl = document.getElementById("desk-canvas");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPower = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 560;
const DEG = Math.PI / 180;

/* ---------------- personas ---------------- */
const intro = window.EMH.hasIntro();
const personas = window.PERSONAS.filter((p) => p.visibility !== "hidden" || intro).map((p, i) => ({
  ...p,
  number: i + 1,
  sealed: p.visibility === "unlisted" && !intro,
  delivered: p.visibility !== "public" && intro
}));
personas.forEach((p) => {
  p.href = p.sealed ? "#contact" : "persona.html?p=" + p.slug;
  p.label = "Emily as " + p.article + " " + p.title;
});

/* ---------------- boot ---------------- */
main().catch((err) => {
  console.error(err);
  section.classList.add("no-webgl");
});

async function main() {
  // Card faces are painted with web fonts, so wait for them (but not forever).
  await Promise.race([
    Promise.all([
      "400 40px Fraunces", "300 40px Fraunces", "400 40px 'Courier Prime'", "700 40px 'Courier Prime'",
      "italic 400 40px Spectral", "500 40px Caveat"
    ].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 2500))
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07080d");
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;

  const camera = new THREE.PerspectiveCamera(30, 1, 5, 600);

  buildRoom(scene);
  const lights = buildLights(scene);
  const rolodex = buildRolodex(scene);
  const extras = buildProps(scene);

  /* ---------- post: depth of field, then tone mapping ---------- */
  // multisampled target: post-processing would otherwise drop antialiasing
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowPower ? 2 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 80, aperture: 0.00009, maxblur: 0.006 });
  if (!lowPower) composer.addPass(bokeh);
  // a soft halation around the window and the lamp: the lo-fi glow
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.3, 0.8, 0.9));
  composer.addPass(new OutputPass());

  /* ---------- framing ---------- */
  const view = { target: new THREE.Vector3(), base: new THREE.Vector3(), aspect: 1 };
  function frame() {
    const w = section.clientWidth, h = section.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = view.aspect = w / h;

    const elev = 17 * DEG, azim = -8 * DEG;
    let dist;
    if (view.aspect >= 1.05) {
      view.target.set(1, 10.5, 2);
      dist = 15.5 / Math.tan((camera.fov / 2) * DEG);
    } else {
      // portrait: centre on the Rolodex and fit it to the width
      view.target.set(rolodex.group.position.x, 12.5, 0);
      const visibleW = 31;
      dist = (visibleW / view.aspect / 2) / Math.tan((camera.fov / 2) * DEG);
    }
    view.base.set(
      view.target.x + dist * Math.cos(elev) * Math.sin(azim),
      view.target.y + dist * Math.sin(elev),
      view.target.z + dist * Math.cos(elev) * Math.cos(azim)
    );
    camera.position.copy(view.base);
    camera.lookAt(view.target);
    camera.updateProjectionMatrix();
    bokeh.uniforms.focus.value = camera.position.distanceTo(rolodex.focusPoint);
    placeControls();
  }

  // Keep the HTML controls centred under the Rolodex on screen.
  const controls = section.querySelector(".desk__controls");
  function placeControls() {
    const p = rolodex.group.position.clone().setY(0).project(camera);
    const x = (p.x * 0.5 + 0.5) * section.clientWidth;
    controls.style.setProperty("--rolodex-x", x + "px");
  }

  new ResizeObserver(frame).observe(section);
  frame();

  /* ---------- interaction ---------- */
  const ui = rolodexUI(rolodex);
  const pointer = new THREE.Vector2(-9, -9);
  const parallax = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let drag = null;

  function hit(e) {
    const r = canvasEl.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const h = raycaster.intersectObjects(rolodex.pickables, false)[0];
    return h ? h.object.userData : null;
  }

  canvasEl.addEventListener("pointermove", (e) => {
    parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    if (drag) {
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) ui.scrub(drag.pos + dy * 0.12);
      return;
    }
    const d = hit(e);
    canvasEl.style.cursor = d ? (d.knob ? "pointer" : d.persona !== undefined ? "pointer" : "grab") : "";
  });
  canvasEl.addEventListener("pointerdown", (e) => {
    const d = hit(e);
    if (!d) return;
    drag = { y: e.clientY, pos: ui.pos(), moved: false, data: d };
    canvasEl.setPointerCapture(e.pointerId);
    canvasEl.style.cursor = "grabbing";
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    canvasEl.style.cursor = "";
    if (d.moved) { ui.settle(); return; }
    if (d.data.knob) ui.step(d.data.knob);
    else if (d.data.persona !== undefined) {
      if (d.data.persona === ui.active()) ui.open();
      else ui.goTo(d.data.persona);
    }
  };
  canvasEl.addEventListener("pointerup", endDrag);
  canvasEl.addEventListener("pointercancel", () => { drag = null; ui.settle(); });

  // Wheel flips cards only while the pointer is on the Rolodex, so the page still scrolls.
  let wheelLock = 0;
  canvasEl.addEventListener("wheel", (e) => {
    if (!hit(e)) return;
    e.preventDefault();
    if (performance.now() < wheelLock || Math.abs(e.deltaY) < 4) return;
    ui.step(e.deltaY > 0 ? 1 : -1);
    wheelLock = performance.now() + 380;
  }, { passive: false });

  /* ---------- loop ---------- */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(section);
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  let first = true;

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    ui.update(dt);
    extras.update(t, dt);
    lights.update(t);

    // slow handheld drift + pointer parallax
    const k = reduceMotion ? 0 : 1;
    const tx = view.base.x + (parallax.x * 2.2 + Math.sin(t * 0.13) * 0.6) * k;
    const ty = view.base.y + (-parallax.y * 1.2 + Math.sin(t * 0.17) * 0.35) * k;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    look.copy(view.target);
    camera.lookAt(look);

    composer.render(dt);
    if (first) { first = false; section.classList.add("is-ready"); }
  });

  // handle for automated screenshots: freeze the scene, or flip to a card
  window.__desk = { stop: () => renderer.setAnimationLoop(null), goTo: ui.goTo, scene };
}

/* ==========================================================================
   Room: desk, wall with a window, sky
   ========================================================================== */
function buildRoom(scene) {
  const walnut = TX.walnutTextures();
  [walnut.map, walnut.roughness, walnut.bump].forEach((t) => t.repeat.set(2.2, 1.6));
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 150),
    new THREE.MeshPhysicalMaterial({
      map: walnut.map, roughnessMap: walnut.roughness, bumpMap: walnut.bump, bumpScale: 1.5,
      roughness: 0.68, clearcoat: 0.12, clearcoatRoughness: 0.55
    })
  );
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(0, 0, 30);
  desk.receiveShadow = true;
  scene.add(desk);

  // Wall with a window opening.
  const WALL_Z = -46;
  const win = { x0: -2, x1: 66, y0: 13, y1: 90 };
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-160, -2); wallShape.lineTo(180, -2); wallShape.lineTo(180, 160); wallShape.lineTo(-160, 160);
  const hole = new THREE.Path();
  hole.moveTo(win.x0, win.y0); hole.lineTo(win.x0, win.y1); hole.lineTo(win.x1, win.y1); hole.lineTo(win.x1, win.y0);
  wallShape.holes.push(hole);
  const plaster = TX.plasterTexture();
  plaster.repeat.set(1 / 110, 1 / 110);
  const wall = new THREE.Mesh(
    new THREE.ShapeGeometry(wallShape),
    new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 })
  );
  wall.position.z = WALL_Z;
  wall.receiveShadow = true;
  wall.castShadow = true;
  scene.add(wall);

  // Skirting where desk meets wall (a shadow line sells the depth).
  const back = new THREE.Mesh(new THREE.BoxGeometry(340, 4, 3), new THREE.MeshStandardMaterial({ color: "#2c241d", roughness: 0.8 }));
  back.position.set(10, 2, WALL_Z + 1.5);
  back.receiveShadow = back.castShadow = true;
  scene.add(back);

  // Window: reveals, sill, sash, muntins.
  const wood = new THREE.MeshStandardMaterial({ color: "#e9e0cc", roughness: 0.55 });
  const reveal = new THREE.MeshStandardMaterial({ color: "#3d4f40", roughness: 0.9 });
  const D = 9;
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const cx = (win.x0 + win.x1) / 2, cy = (win.y0 + win.y1) / 2, ww = win.x1 - win.x0, wh = win.y1 - win.y0;
  add(new THREE.BoxGeometry(ww, 0.5, D), reveal, cx, win.y1, WALL_Z - D / 2);
  add(new THREE.BoxGeometry(0.5, wh, D), reveal, win.x0, cy, WALL_Z - D / 2);
  add(new THREE.BoxGeometry(0.5, wh, D), reveal, win.x1, cy, WALL_Z - D / 2);
  add(new THREE.BoxGeometry(ww + 8, 1.6, D + 5), wood, cx, win.y0 - 0.8, WALL_Z - D / 2 + 2.5);   // sill
  // casing
  add(new THREE.BoxGeometry(ww + 8, 3, 1), wood, cx, win.y1 + 1.5, WALL_Z + 0.5);
  add(new THREE.BoxGeometry(3, wh + 3, 1), wood, win.x0 - 1.5, cy + 1.5, WALL_Z + 0.5);
  add(new THREE.BoxGeometry(3, wh + 3, 1), wood, win.x1 + 1.5, cy + 1.5, WALL_Z + 0.5);
  // sash + muntins (set back in the opening)
  const sz = WALL_Z - D + 2;
  add(new THREE.BoxGeometry(ww, 2.2, 2), wood, cx, win.y0 + 1.1, sz);
  add(new THREE.BoxGeometry(ww, 2.2, 2), wood, cx, win.y1 - 1.1, sz);
  add(new THREE.BoxGeometry(2.2, wh, 2), wood, win.x0 + 1.1, cy, sz);
  add(new THREE.BoxGeometry(2.2, wh, 2), wood, win.x1 - 1.1, cy, sz);
  add(new THREE.BoxGeometry(ww, 3, 2.6), wood, cx, cy, sz);         // meeting rail
  add(new THREE.BoxGeometry(1.2, wh, 1.4), wood, cx, cy, sz);
  [0.25, 0.75].forEach((f) => add(new THREE.BoxGeometry(ww, 1.2, 1.4), wood, cx, win.y0 + wh * f, sz));

  // Glass: barely there, but it catches reflections of the room.
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.07, envMapIntensity: 3 }));
  pane.position.set(cx, cy, sz - 0.2);
  scene.add(pane);

  // Sky, far beyond the glass.
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 260),
    new THREE.MeshBasicMaterial({ map: TX.nightSkyTexture(), color: new THREE.Color(1.15, 1.15, 1.2) })
  );
  sky.position.set(60, 52, -200);
  scene.add(sky);

  // A small trailing plant on the sill.
  const pot = add(new THREE.CylinderGeometry(4.2, 3.2, 7, 32), new THREE.MeshStandardMaterial({ color: "#a65b3c", roughness: 0.85 }), win.x0 + 13, win.y0 + 3.5, WALL_Z - 4);
  const leafMat = new THREE.MeshStandardMaterial({ color: "#3e6a3f", roughness: 0.6, side: THREE.DoubleSide });
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  leafGeo.scale(1.6, 0.25, 0.9);
  const rnd = mulberry(3);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 1 + rnd() * 4.5;
    const trailing = i > 28;
    const m = new THREE.Mesh(leafGeo, leafMat);
    m.position.set(
      pot.position.x + Math.cos(a) * r * (trailing ? 1.2 : 1),
      trailing ? pot.position.y + 2 - rnd() * 12 : pot.position.y + 4 + rnd() * 6,
      pot.position.z + Math.sin(a) * r * 0.8 + (trailing ? 3.5 : 0)
    );
    m.rotation.set(rnd() * 1.2 - 0.6, a, rnd() * 1.4 - 0.7);
    m.scale.setScalar(0.8 + rnd() * 0.7);
    m.castShadow = true;
    scene.add(m);
  }
}

/* ==========================================================================
   Lights: moonlight through the window, a Tiffany lamp, a laptop
   (the laptop light and a soft fill live with the props in buildProps)
   ========================================================================== */
const TIFFANY = new THREE.Vector3(-7, 0, -38);

function buildLights(scene) {
  scene.add(new THREE.HemisphereLight("#33405f", "#0e0907", 0.22));

  const moon = new THREE.DirectionalLight("#8fa8ff", 0.9);
  moon.position.set(95, 75, -190);
  moon.target.position.set(-4, 0, 6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 60, far: 360 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  // Tiffany: a warm pool on the desk from under the shade...
  const pool = new THREE.SpotLight("#ffb860", 1100, 0, 1.0, 1, 2);
  pool.position.set(TIFFANY.x, 12, TIFFANY.z + 1);
  pool.target.position.set(6, 2, 2);
  pool.castShadow = true;
  pool.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  pool.shadow.camera.near = 2;
  pool.shadow.camera.far = 160;
  pool.shadow.bias = -0.0005;
  pool.shadow.normalBias = 0.03;
  scene.add(pool, pool.target);

  // ...and the coloured glow the glass throws onto the wall around it.
  const glow = new THREE.PointLight("#ffa856", 2200, 0, 2);
  glow.position.set(TIFFANY.x, 17, TIFFANY.z - 2);
  scene.add(glow);

  return {
    update(t) {
      const f = 1 + Math.sin(t * 2.1) * 0.006 + Math.sin(t * 7.3) * 0.004;
      pool.intensity = 1100 * f;
    }
  };
}

/* ==========================================================================
   The Rolodex
   ========================================================================== */
function buildRolodex(scene) {
  const group = new THREE.Group();
  group.position.set(7, 0, 0);
  group.rotation.y = -0.05;
  scene.add(group);

  const HUB_Y = 10.6, HUB_R = 1.5;
  const { W, H, TAB_H, TAB_W } = TX.CARD;

  const enamel = new THREE.MeshPhysicalMaterial({ color: "#1f3527", roughness: 0.32, metalness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.18 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#d9d6cf", metalness: 1, roughness: 0.16 });
  const bakelite = new THREE.MeshPhysicalMaterial({ color: "#4b2816", roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.25 });

  const mesh = (geo, mat, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // base, chrome band, felt feet
  mesh(new RoundedBoxGeometry(17.5, 1.5, 12.5, 4, 0.6), enamel).position.y = 0.95;
  mesh(new RoundedBoxGeometry(17.7, 0.28, 12.7, 2, 0.12), chrome).position.y = 0.32;
  const feltMat = new THREE.MeshStandardMaterial({ color: "#1a1410", roughness: 1 });
  [[-7.5, -5], [7.5, -5], [-7.5, 5], [7.5, 5]].forEach(([x, z]) => {
    mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 20), feltMat).position.set(x, 0.1, z);
  });

  // side arms: a tapering upright with a round boss at the hub
  const arm = new THREE.Shape();
  arm.moveTo(-5.2, 1.4);
  arm.lineTo(5.2, 1.4);
  arm.bezierCurveTo(4.6, 4.5, 2.3, 6.5, 2.0, HUB_Y);
  arm.absarc(0, HUB_Y, 2.0, 0, Math.PI, false);
  arm.bezierCurveTo(-2.3, 6.5, -4.6, 4.5, -5.2, 1.4);
  const armGeo = new THREE.ExtrudeGeometry(arm, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 32 });
  [-1, 1].forEach((s) => {
    const m = mesh(armGeo, enamel);
    m.rotation.y = -Math.PI / 2;
    m.position.x = s * 5.75 + (s > 0 ? 0.38 : 0);
  });

  // rod + hub drum
  const rod = mesh(new THREE.CylinderGeometry(0.34, 0.34, 17.2, 24), chrome);
  rod.rotation.z = Math.PI / 2; rod.position.y = HUB_Y;
  const drum = mesh(new THREE.CylinderGeometry(HUB_R, HUB_R, 10.9, 40), new THREE.MeshStandardMaterial({ color: "#2a1d15", roughness: 0.5, metalness: 0.3 }));
  drum.rotation.z = Math.PI / 2; drum.position.y = HUB_Y;

  // knurled bakelite knobs with chrome caps
  const prof = [[0, 0], [2.35, 0], [2.55, 0.18], [2.6, 0.5], [2.6, 1.5], [2.5, 1.8], [1.6, 2.05], [0.9, 2.2], [0, 2.25]].map(([x, y]) => new THREE.Vector2(x, y));
  const knobGeo = new THREE.LatheGeometry(prof, 120);
  const pos = knobGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    if (r > 2.3) {
      const a = Math.atan2(z, x), k = 1 + 0.028 * Math.cos(a * 44);
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
  }
  knobGeo.computeVertexNormals();
  const capGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 32);
  const knobs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 6.3, HUB_Y, 0);
    group.add(pivot);
    const spin = new THREE.Group();
    pivot.add(spin);
    const k = mesh(knobGeo, bakelite, spin);
    k.rotation.z = -s * Math.PI / 2;
    const cap = mesh(capGeo, chrome, spin);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * 2.27;
    k.userData = { knob: s };
    return spin;
  });

  /* ---------- cards ---------- */
  const N = 96, STEP = 360 / N;
  const wheel = new THREE.Group();
  wheel.position.y = HUB_Y;
  group.add(wheel);

  function cardShape(tabX) {
    const s = new THREE.Shape(), x0 = -W / 2, x1 = W / 2, r = 0.25;
    s.moveTo(x0, 0);
    // two slots that clip over the rails
    [[-2.75, -1.95], [1.95, 2.75]].forEach(([a, b]) => {
      s.lineTo(a, 0); s.lineTo(a, 0.6); s.lineTo(b, 0.6); s.lineTo(b, 0);
    });
    s.lineTo(x1, 0);
    s.lineTo(x1, H - r); s.quadraticCurveTo(x1, H, x1 - r, H);
    if (tabX !== undefined) {
      const a = x0 + tabX, b = a + TAB_W;
      s.lineTo(b + 0.15, H);
      s.quadraticCurveTo(b, H, b, H + 0.2);
      s.lineTo(b, H + TAB_H - 0.2); s.quadraticCurveTo(b, H + TAB_H, b - 0.2, H + TAB_H);
      s.lineTo(a + 0.2, H + TAB_H); s.quadraticCurveTo(a, H + TAB_H, a, H + TAB_H - 0.2);
      s.lineTo(a, H + 0.2); s.quadraticCurveTo(a, H, a - 0.15, H);
    }
    s.lineTo(x0 + r, H); s.quadraticCurveTo(x0, H, x0, H - r);
    s.lineTo(x0, 0);
    return s;
  }
  const T = 0.03;
  function bodyGeo(shape) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, HUB_R, -T / 2);
    return g;
  }
  function faceGeo(shape) {
    const g = new THREE.ShapeGeometry(shape, 4);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, p.getY(i) / (H + TAB_H));
    g.translate(0, HUB_R, T / 2 + 0.004);
    return g;
  }

  const paperEdge = new THREE.MeshStandardMaterial({ color: "#e8dfcb", roughness: 0.9 });

  // which card index each persona sits at
  const P = personas.length;
  const slots = personas.map((_, k) => Math.round((k * N) / P) + 4);
  const slotOf = new Map(slots.map((s, k) => [s, k]));

  // fillers (instanced)
  const fillerShape = cardShape();
  const fillerBody = bodyGeo(fillerShape), fillerFace = faceGeo(fillerShape);
  const variants = TX.fillerCardTextures(10);
  const fillerIdx = [];
  for (let i = 0; i < N; i++) if (!slotOf.has(i)) fillerIdx.push(i);
  // Cards don't receive shadows from each other (90 paper-thin casters alias
  // badly); instead each card is darkened by how far it has turned from the light.
  const bodyInst = new THREE.InstancedMesh(fillerBody, paperEdge, fillerIdx.length);
  bodyInst.castShadow = true;
  wheel.add(bodyInst);
  const faceInst = variants.map((tex, v) => {
    const count = fillerIdx.filter((_, j) => j % variants.length === v).length;
    const m = new THREE.InstancedMesh(fillerFace, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 }), count);
    wheel.add(m);
    return m;
  });

  const rnd = mulberry(11);
  const jitter = Array.from({ length: N }, () => ({ x: (rnd() - 0.5) * 0.06, z: (rnd() - 0.5) * 1.1 * DEG, a: (rnd() - 0.5) * 0.6 }));

  // persona cards (individual meshes, clickable)
  const pickables = [];
  const personaCards = personas.map((p, k) => {
    const tabX = 0.35 + k * ((W - TAB_W - 0.7) / Math.max(P - 1, 1));
    const shape = cardShape(tabX);
    const g = new THREE.Group();
    wheel.add(g);
    const body = mesh(bodyGeo(shape), paperEdge.clone(), g);
    const face = new THREE.Mesh(faceGeo(shape), new THREE.MeshStandardMaterial({
      map: TX.personaCardTexture(p, { number: p.number, tabX, sealed: p.sealed, delivered: p.delivered, icon: window.ICONS[p.slug] }),
      roughness: 0.82
    }));
    g.add(face);
    body.userData = face.userData = { persona: k };
    pickables.push(face, body);
    return g;
  });
  knobs.forEach((s) => s.traverse((o) => { if (o.isMesh && o.userData.knob) pickables.push(o); }));
  // the whole wheel can be grabbed to spin
  bodyInst.userData = { wheel: true };
  pickables.push(bodyInst);

  /* fan: open a gap at the card facing you; front cards fall further than back ones */
  function fan(a) {
    // cards in front drop well forward so the open card reads; cards behind fan back
    const G = a < 0 ? 80 : 26, w = a < 0 ? 2.2 : 7;
    return a + G * Math.tanh(a / w) * (1 - Math.abs(a) / 180) + 6;   // +6: the file leans back a touch
  }
  const shadeCol = new THREE.Color();
  const occlusion = (deg) => {
    const t = Math.min(1, Math.max(0, (Math.abs(deg) - 25) / 120));
    return 1 - 0.62 * t * t * (3 - 2 * t);
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  function layout(pos) {
    const counts = variants.map(() => 0);
    let bi = 0;
    for (let i = 0; i < N; i++) {
      let a = ((i - pos) * STEP) % 360;
      if (a > 180) a -= 360; if (a <= -180) a += 360;
      const fa = fan(a);
      const rot = -(fa + jitter[i].a) * DEG;
      shadeCol.setScalar(occlusion(fa) * (0.95 + jitter[i].x));
      if (slotOf.has(i)) {
        const g = personaCards[slotOf.get(i)];
        g.rotation.set(rot, 0, jitter[i].z);
        g.position.x = jitter[i].x;
        g.children.forEach((c) => c.material.color.copy(shadeCol));
      } else {
        e.set(rot, 0, jitter[i].z);
        q.setFromEuler(e);
        v.set(jitter[i].x, 0, 0);
        m4.compose(v, q, one);
        bodyInst.setMatrixAt(bi, m4);
        bodyInst.setColorAt(bi, shadeCol);
        const j = fillerIdx.indexOf(i), vv = j % variants.length;
        faceInst[vv].setColorAt(counts[vv], shadeCol);
        faceInst[vv].setMatrixAt(counts[vv]++, m4);
        bi++;
      }
    }
    bodyInst.instanceMatrix.needsUpdate = bodyInst.instanceColor.needsUpdate = true;
    faceInst.forEach((f) => (f.instanceMatrix.needsUpdate = f.instanceColor.needsUpdate = true));
    knobs.forEach((k) => (k.rotation.x = -pos * STEP * DEG));
  }

  return {
    group, layout, slots, N, pickables,
    focusPoint: new THREE.Vector3(group.position.x, HUB_Y + 4, 0)
  };
}

/* Rolodex state: position, tweening, and the HTML controls. */
function rolodexUI(rolodex) {
  const { slots, N } = rolodex;
  const status = document.getElementById("desk-status");
  const list = document.getElementById("desk-index");
  const current = document.getElementById("desk-current");
  let pos = slots[0] - 34, active = 0, tween = null;

  personas.forEach((p, k) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<span>${p.letter}</span>${p.sealed ? "Private" : p.title}`;
    b.setAttribute("aria-label", "Turn to: " + p.label);
    b.addEventListener("click", () => goTo(k));
    li.appendChild(b);
    list.appendChild(li);
  });
  const buttons = list.querySelectorAll("button");
  document.getElementById("desk-prev").addEventListener("click", () => step(-1));
  document.getElementById("desk-next").addEventListener("click", () => step(1));
  section.addEventListener("keydown", (e) => {
    if (e.target.closest("a, button") && e.key === "Enter") return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  function setActive(k) {
    active = k;
    const p = personas[k];
    buttons.forEach((b, i) => b.setAttribute("aria-current", i === k ? "true" : "false"));
    current.href = p.href;
    current.querySelector(".desk__current-name").textContent = p.sealed ? "By introduction only" : p.label;
    current.querySelector(".desk__current-cta").textContent = p.sealed ? "Request an intro →" : "Pull this card →";
    status.textContent = `Card ${k + 1} of ${personas.length}: ${p.label}`;
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function animateTo(target, ms) {
    tween = { from: pos, to: target, t: 0, ms: reduceMotion ? 1 : ms };
  }
  function nearest(slot) { return slot + N * Math.round((pos - slot) / N); }
  function goTo(k) {
    k = ((k % personas.length) + personas.length) % personas.length;
    setActive(k);
    const target = nearest(slots[k]);
    animateTo(target, 420 + Math.min(Math.abs(target - pos), 60) * 22);
  }
  function step(d) { goTo(active + d); }

  // landing: one long roll that settles on the first card (or the introduced one)
  let landOn = 0;
  if (intro) { const j = personas.findIndex((p) => p.visibility !== "public"); if (j >= 0) landOn = j; }
  setActive(landOn);
  pos = slots[landOn] - 40;
  rolodex.layout(pos);
  setTimeout(() => animateTo(slots[landOn], 2600), 350);

  return {
    pos: () => pos,
    active: () => active,
    step, goTo,
    open() { location.href = personas[active].href; },
    scrub(p) { tween = null; pos = p; },
    settle() {
      // snap to the persona nearest the current position
      let best = 0, bd = Infinity;
      slots.forEach((s, k) => { const d = Math.abs(nearest(s) - pos); if (d < bd) { bd = d; best = k; } });
      goTo(best);
    },
    update(dt) {
      if (tween) {
        tween.t = Math.min(1, tween.t + (dt * 1000) / tween.ms);
        pos = tween.from + (tween.to - tween.from) * ease(tween.t);
        if (tween.t >= 1) tween = null;
      }
      rolodex.layout(pos);
    }
  };
}

/* ==========================================================================
   Props: banker's lamp, portrait frame, mug with steam, books, notebook, dust
   ========================================================================== */
function buildProps(scene) {
  const brass = new THREE.MeshStandardMaterial({ color: "#b8925a", metalness: 1, roughness: 0.32 });
  const add = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* Tiffany lamp: bronze base, leaded stained-glass dome lit from within */
  const bronze = new THREE.MeshStandardMaterial({ color: "#5e4126", metalness: 1, roughness: 0.42 });
  const tif = new THREE.Group();
  tif.position.copy(TIFFANY);
  scene.add(tif);
  // baluster base: fluted foot, swelling stem, collar
  const baseProf = [[0, 0], [6.6, 0], [6.7, 0.35], [6.3, 0.8], [5.8, 0.9], [5.6, 1.3], [4.4, 1.7], [3.4, 2.3], [2.2, 2.8], [1.5, 3.4],
    [1.15, 4.2], [1.5, 5.4], [1.95, 6.8], [1.7, 8.0], [1.05, 9.0], [0.95, 9.8], [1.5, 10.3], [1.6, 10.7], [0.9, 11.1], [0.55, 11.6], [0.5, 13], [0, 13]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const baseGeo = new THREE.LatheGeometry(baseProf, 96);
  const bp = baseGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const a = Math.atan2(z, x);
    // flutes on the foot and the stem's swell
    const k = y < 2.4 ? 1 + 0.035 * Math.cos(a * 24) : (y > 4.5 && y < 8.2 ? 1 + 0.05 * Math.cos(a * 12) : 1);
    bp.setX(i, x * k); bp.setZ(i, z * k);
  }
  baseGeo.computeVertexNormals();
  const darkBronze = new THREE.MeshStandardMaterial({ color: "#3b2a1b", metalness: 1, roughness: 0.48 });
  add(baseGeo, darkBronze, 0, 0, 0, tif);

  // shade: a low dome whose rim hangs in scallops
  const shadeProf = [[12.4, 0], [12.25, 1.4], [11.7, 3.4], [10.6, 5.5], [8.9, 7.4], [6.6, 8.9], [4, 9.9], [1.7, 10.3]].map(([x, y]) => new THREE.Vector2(x, y));
  const shadeGeo = new THREE.LatheGeometry(shadeProf, 168);
  const spos = shadeGeo.attributes.position;
  for (let i = 0; i < spos.count; i++) {
    const y = spos.getY(i);
    if (y < 1.5) {
      const a = Math.atan2(spos.getZ(i), spos.getX(i));
      spos.setY(i, y - (1 - y / 1.5) * 1.3 * Math.abs(Math.sin(a * 8)));
    }
  }
  shadeGeo.computeVertexNormals();
  const glassTex = TX.tiffanyGlassTexture();
  const shade = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({
    map: glassTex, emissiveMap: glassTex, emissive: "#ffffff", emissiveIntensity: 0.95,
    roughness: 0.35, side: THREE.DoubleSide
  }));
  shade.position.y = 13;
  shade.castShadow = true;
  tif.add(shade);
  // crown: cap, a stack of beads, and a pointed finial
  add(new THREE.CylinderGeometry(1.9, 2.2, 0.6, 24), darkBronze, 0, 23.4, 0, tif);
  add(new THREE.SphereGeometry(0.75, 16, 12), darkBronze, 0, 24.2, 0, tif);
  add(new THREE.CylinderGeometry(0.25, 0.45, 0.8, 12), darkBronze, 0, 25.1, 0, tif);
  add(new THREE.SphereGeometry(0.5, 16, 12), darkBronze, 0, 25.7, 0, tif);
  add(new THREE.ConeGeometry(0.3, 1.2, 12), darkBronze, 0, 26.7, 0, tif);
  const bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDotTexture(), color: "#ffcf8a", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }));
  bulb.position.set(0, 11.5, 0);
  bulb.scale.set(20, 8, 1);
  tif.add(bulb);

  /* laptop, open on a video call: the remote office */
  const laptop = new THREE.Group();
  laptop.position.set(30, 0, -27);
  laptop.rotation.y = -0.62;
  laptop.scale.setScalar(0.9);
  scene.add(laptop);
  const alu = new THREE.MeshStandardMaterial({ color: "#4a4b50", metalness: 0.85, roughness: 0.34 });
  add(new RoundedBoxGeometry(30, 1.4, 20.5, 3, 0.5), alu, 0, 0.7, 0, laptop);
  const kb = add(new THREE.PlaneGeometry(27, 18.5), new THREE.MeshStandardMaterial({ map: TX.keyboardTexture(), roughness: 0.6, metalness: 0.4 }), 0, 1.42, 0.4, laptop);
  kb.rotation.x = -Math.PI / 2;
  const lid = new THREE.Group();
  lid.position.set(0, 1.4, -10.1);
  lid.rotation.x = -0.27;
  laptop.add(lid);
  add(new RoundedBoxGeometry(30, 20, 0.6, 3, 0.25), alu, 0, 10, 0, lid);
  add(new THREE.PlaneGeometry(29.2, 19.2), new THREE.MeshStandardMaterial({ color: "#09090b", roughness: 0.2 }), 0, 10, 0.31, lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(27.6, 17.4), new THREE.MeshBasicMaterial({ map: TX.laptopScreenTexture(), color: new THREE.Color(0.85, 0.85, 0.9) }));
  screen.position.set(0, 10.4, 0.32);
  lid.add(screen);
  const screenLight = new THREE.PointLight("#a9c0ff", 260, 0, 2);
  screenLight.position.set(0, 10, 6);
  lid.add(screenLight);

  /* soft warm fill on the card faces (no visible source) */
  const fill = new THREE.PointLight("#ff9d4a", 300, 0, 2);
  fill.position.set(19, 7.7, 7);
  scene.add(fill);

  /* portrait frame on a strut */
  const frame = new THREE.Group();
  frame.position.set(-15, 0, 7);
  frame.rotation.y = 0.42;
  frame.scale.setScalar(0.85);
  scene.add(frame);
  const tilt = new THREE.Group();
  tilt.rotation.x = -0.16;
  frame.add(tilt);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: "#3a2416", roughness: 0.38, clearcoat: 0.6 });
  // antique gilt: a scalloped moulding with acanthus relief, beading and corner rosettes
  const gilt = TX.giltTextures();
  const gold = new THREE.MeshStandardMaterial({ map: gilt.map, bumpMap: gilt.bump, bumpScale: 1.6, color: "#e3bd78", metalness: 1, roughness: 0.36, envMap: scene.environment, envMapIntensity: 0.9 });
  const goldPlain = new THREE.MeshStandardMaterial({ color: "#d4a955", metalness: 1, roughness: 0.3, envMap: scene.environment, envMapIntensity: 0.9 });
  const OW = 14, OH = 17.2, IW = 10.4, IH = 13.6;
  const outline = new THREE.Shape();
  const lobes = (x0, y0, x1, y1, n, out) => {     // scalloped edge between two points
    for (let i = 1; i <= n; i++) {
      const t0 = (i - 1) / n, t1 = i / n, tm = (t0 + t1) / 2;
      const mx = x0 + (x1 - x0) * tm + out[0], my = y0 + (y1 - y0) * tm + out[1];
      outline.quadraticCurveTo(mx, my, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
    }
  };
  outline.moveTo(-OW / 2, -OH / 2);
  lobes(-OW / 2, -OH / 2, OW / 2, -OH / 2, 7, [0, -0.45]);
  lobes(OW / 2, -OH / 2, OW / 2, OH / 2, 9, [0.45, 0]);
  lobes(OW / 2, OH / 2, -OW / 2, OH / 2, 7, [0, 0.45]);
  lobes(-OW / 2, OH / 2, -OW / 2, -OH / 2, 9, [-0.45, 0]);
  const opening = new THREE.Path();
  opening.moveTo(-IW / 2, -IH / 2); opening.lineTo(-IW / 2, IH / 2); opening.lineTo(IW / 2, IH / 2); opening.lineTo(IW / 2, -IH / 2);
  outline.holes.push(opening);
  const moulding = new THREE.ExtrudeGeometry(outline, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.55, bevelSegments: 5, curveSegments: 8 });
  moulding.translate(0, 0, -0.3);
  add(moulding, gold, 0, 7.9, 0, tilt);
  add(new THREE.BoxGeometry(OW - 0.4, OH - 0.4, 0.3), frameMat, 0, 7.9, -0.65, tilt);          // backing
  // a row of pearls around the opening
  const beadGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const beadPts = [];
  for (let x = -IW / 2; x <= IW / 2 + 0.01; x += 0.42) beadPts.push([x, -IH / 2 - 0.25], [x, IH / 2 + 0.25]);
  for (let y = -IH / 2 + 0.42; y < IH / 2; y += 0.42) beadPts.push([-IW / 2 - 0.25, y], [IW / 2 + 0.25, y]);
  const beads = new THREE.InstancedMesh(beadGeo, goldPlain, beadPts.length);
  const bm = new THREE.Matrix4();
  beadPts.forEach(([x, y], i) => beads.setMatrixAt(i, bm.makeTranslation(x, 7.9 + y, 0.78)));
  tilt.add(beads);
  // corner rosettes
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const cx = sx * (OW / 2 - 0.9), cy = 7.9 + sy * (OH / 2 - 0.9);
    const ros = add(new THREE.SphereGeometry(0.85, 20, 12), gold, cx, cy, 0.75, tilt);
    ros.scale.set(1, 1, 0.55);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const petal = add(new THREE.SphereGeometry(0.42, 12, 8), goldPlain, cx + Math.cos(a) * 0.95, cy + Math.sin(a) * 0.95, 0.65, tilt);
      petal.scale.set(1, 1, 0.5);
    }
  });
  // crest at the top centre
  const crest = add(new THREE.SphereGeometry(1.1, 24, 12), gold, 0, 7.9 + OH / 2 + 0.25, 0.4, tilt);
  crest.scale.set(1.6, 0.9, 0.5);
  add(new THREE.PlaneGeometry(IW, IH), new THREE.MeshStandardMaterial({ color: "#efe7d4", roughness: 0.95 }), 0, 7.9, 0.1, tilt);
  const photo = add(new THREE.PlaneGeometry(7.8, 10.2), new THREE.MeshStandardMaterial({ map: TX.photoTexture("assets/headshot.jpg"), roughness: 0.7 }), 0, 8.2, 0.11, tilt);
  photo.castShadow = false;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(IW, IH), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 2 }));
  glass.position.set(0, 7.9, 0.2);
  tilt.add(glass);
  const strut = add(new THREE.BoxGeometry(1.8, 12, 0.3), frameMat, 0, 5.8, -4.6, frame);
  strut.rotation.x = 0.36;

  /* mug */
  const mugProf = [[0, 0], [3.5, 0], [3.85, 0.35], [4.0, 1.2], [4.05, 9.4], [3.8, 9.6], [3.6, 9.3], [3.5, 1.1], [0, 0.95]].map(([x, y]) => new THREE.Vector2(x, y));
  const ceramic = new THREE.MeshPhysicalMaterial({ color: "#efe6d2", roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const mug = new THREE.Group();
  mug.position.set(25, 0, 13);
  mug.rotation.y = -0.6;
  scene.add(mug);
  add(new THREE.LatheGeometry(mugProf, 64), ceramic, 0, 0, 0, mug);
  const handle = add(new THREE.TorusGeometry(2.5, 0.55, 16, 40, Math.PI * 1.15), ceramic, 4.0, 5, 0, mug);
  handle.rotation.z = -Math.PI / 2 - 0.25;
  const coffee = add(new THREE.CircleGeometry(3.55, 40), new THREE.MeshPhysicalMaterial({ color: "#26140a", roughness: 0.08, clearcoat: 1 }), 0, 8.3, 0, mug);
  coffee.rotation.x = -Math.PI / 2;
  // green band around the mug
  add(new THREE.CylinderGeometry(4.07, 4.07, 0.7, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: "#2e4a37", roughness: 0.3, clearcoat: 0.8 }), 0, 7.6, 0, mug);

  const smoke = TX.smokeTexture();
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: "#fff3e3", transparent: true, depthWrite: false, opacity: 0 }));
    scene.add(s);
    return { s, phase: i / 10, sway: Math.random() * 6 };
  });

  /* books, stacked */
  const books = [
    { w: 17, h: 2.6, d: 23, c: "#2f4a3a", r: 0.05 },
    { w: 15.5, h: 3.1, d: 21.5, c: "#7a3a22", r: -0.12 },
    { w: 14, h: 2.2, d: 20, c: "#b39c70", r: 0.18 }
  ];
  let by = 0;
  const pages = new THREE.MeshStandardMaterial({ color: "#eadfc6", roughness: 0.95 });
  books.forEach((b) => {
    const g = new THREE.Group();
    g.position.set(-31, by, -21);
    g.rotation.y = b.r;
    scene.add(g);
    add(new RoundedBoxGeometry(b.w, b.h, b.d, 2, 0.25), new THREE.MeshPhysicalMaterial({ color: b.c, roughness: 0.6, clearcoat: 0.2 }), 0, b.h / 2, 0, g);
    add(new THREE.BoxGeometry(b.w - 0.6, b.h - 0.5, b.d - 0.8), pages, 0.35, b.h / 2, 0, g);
    by += b.h;
  });

  /* notebook + fountain pen in the foreground (falls into soft focus) */
  const nb = new THREE.Group();
  nb.position.set(4, 0, 27);
  nb.rotation.y = -0.35;
  scene.add(nb);
  add(new RoundedBoxGeometry(15, 1.3, 21, 3, 0.4), new THREE.MeshPhysicalMaterial({ map: TX.leatherTexture("#5a3420"), roughness: 0.7, clearcoat: 0.15 }), 0, 0.65, 0, nb);
  add(new THREE.BoxGeometry(0.8, 1.36, 21.1), new THREE.MeshStandardMaterial({ color: "#2e4535", roughness: 0.8 }), 5.5, 0.66, 0, nb);
  const pen = new THREE.Group();
  pen.position.set(-1, 1.65, 1);
  pen.rotation.y = -0.9;
  nb.add(pen);
  const penBody = add(new THREE.CylinderGeometry(0.55, 0.45, 12, 24), new THREE.MeshPhysicalMaterial({ color: "#13261b", roughness: 0.15, clearcoat: 1 }), 0, 0, 0, pen);
  penBody.rotation.z = Math.PI / 2;
  const nib = add(new THREE.ConeGeometry(0.42, 2.2, 24), brass, -7.1, 0, 0, pen);
  nib.rotation.z = Math.PI / 2;
  const clip = add(new THREE.BoxGeometry(4, 0.12, 0.25), brass, 3.5, 0.6, 0, pen);

  /* dust drifting through the lamp light */
  const COUNT = lowPower ? 90 : 220;
  const dpos = new Float32Array(COUNT * 3), seeds = [];
  for (let i = 0; i < COUNT; i++) {
    seeds.push([Math.random() * 70 - 40, Math.random() * 34 + 2, Math.random() * 40 - 25, Math.random() * 10]);
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({
    map: TX.softDotTexture(), size: 0.32, color: "#ffe2b8", transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(dust);

  return {
    update(t) {
      const m = reduceMotion ? 0.15 : 1;
      for (let i = 0; i < COUNT; i++) {
        const s = seeds[i];
        dpos[i * 3] = s[0] + Math.sin(t * 0.07 * m + s[3]) * 3;
        dpos[i * 3 + 1] = s[1] + Math.sin(t * 0.05 * m + s[3] * 2) * 2.5;
        dpos[i * 3 + 2] = s[2] + Math.cos(t * 0.06 * m + s[3]) * 3;
      }
      dgeo.attributes.position.needsUpdate = true;

      puffs.forEach((p) => {
        const u = (t * 0.09 * m + p.phase) % 1;
        p.s.position.set(
          mug.position.x + Math.sin(u * 5 + p.sway) * (0.6 + u * 2.4),
          9.6 + u * 17,
          mug.position.z + Math.cos(u * 4 + p.sway) * 0.8
        );
        const sc = 2 + u * 6;
        p.s.scale.set(sc, sc * 1.5, 1);
        p.s.material.opacity = Math.sin(Math.PI * u) * 0.13;
        p.s.material.rotation = u * 1.5 + p.sway;
      });
    }
  };
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
