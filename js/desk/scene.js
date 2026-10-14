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
const SHOT = new URLSearchParams(location.search).get("shot");   // "links": the book-stack still
const lowPower = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 560;
const DEG = Math.PI / 180;

/* ---------------- personas ---------------- */
// Built once any password (from the link or this session) has been tried; locked cards stay sealed.
let personas = [];
function loadPersonas() {
  personas = window.PERSONAS.filter((p) => window.EMH.isVisible(p)).map((p, i) => ({
    ...p,
    number: i + 1,
    sealed: !window.EMH.isOpen(p),
    delivered: p.visibility !== "public" && !!p.unlocked,
    href: "persona.html?p=" + p.slug,
    label: "Emily as " + p.article + " " + p.title
  }));
}

/* ---------------- boot ---------------- */
main().catch((err) => {
  console.error(err);
  section.classList.add("no-webgl");
});

async function main() {
  await window.EMH.ready;
  loadPersonas();
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
  const books = SHOT === "links" ? buildBookStack(scene) : null;

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
    if (books) {     // the links still: low over the desk, books and mug in front of the window
      const portrait = view.aspect < 1;
      view.target.copy(books.aim).add(new THREE.Vector3(portrait ? -4 : -9, portrait ? 8 : 6, 0));
      view.base.copy(books.aim).add(portrait ? new THREE.Vector3(-8, 22, 112) : new THREE.Vector3(-22, 18, 92));
    }
    camera.position.copy(view.base);
    camera.lookAt(view.target);
    camera.updateProjectionMatrix();
    bokeh.uniforms.focus.value = camera.position.distanceTo(books ? books.aim : rolodex.focusPoint);
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
  if (books) {
    // hand the screen rectangle of each spine to the screenshot script
    window.__desk.spines = () => books.spines.map((m) => {
      const box = new THREE.Box3().setFromObject(m), pts = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).project(camera));
      const xs = pts.map((p) => (p.x + 1) / 2), ys = pts.map((p) => (1 - p.y) / 2);
      return { name: m.userData.name, l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
    });
  }
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

  // The city beyond the glass, in three depths so it shifts with the camera like the real thing:
  // sky, river, bridge and far skyline; midtown towers; a brick walk-up and the elevated train.
  [["far", TX.cityFarTexture(), false], ["mid", TX.cityMidTexture(), true], ["near", TX.cityNearTexture(), true]].forEach(([k, map, alpha]) => {
    const L = TX.CITY[k];
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(L.w, L.h),
      new THREE.MeshBasicMaterial({ map, transparent: alpha, depthWrite: !alpha, color: new THREE.Color(1.1, 1.1, 1.12) })
    );
    m.position.set(L.cx, L.cy + L.dy, L.z);
    scene.add(m);
  });

  // A golden pothos on the sill: a full mound of heart-shaped leaves, vines spilling over the edge.
  const potX = win.x0 + 13, potZ = WALL_Z - 4, sillY = win.y0;
  const potProf = [[0, 0], [3.3, 0], [3.5, 0.3], [4.1, 5.5], [4.7, 5.6], [4.8, 7.2], [4.4, 7.3], [4.1, 6.4], [0, 6.3]].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = add(new THREE.LatheGeometry(potProf, 40), new THREE.MeshStandardMaterial({ color: "#a65b3c", roughness: 0.88 }), potX, sillY, potZ);
  const soil = add(new THREE.CircleGeometry(4.1, 28), new THREE.MeshStandardMaterial({ color: "#2a1a10", roughness: 1 }), potX, sillY + 6.4, potZ);
  soil.rotation.x = -Math.PI / 2;

  // leaf: a pointed heart, cupped and curled back a little
  const heart = new THREE.Shape();
  heart.moveTo(0, 0);
  heart.bezierCurveTo(-0.32, -0.14, -0.64, 0.22, -0.52, 0.55);
  heart.bezierCurveTo(-0.42, 0.82, -0.14, 0.98, 0, 1.18);
  heart.bezierCurveTo(0.14, 0.98, 0.42, 0.82, 0.52, 0.55);
  heart.bezierCurveTo(0.64, 0.22, 0.32, -0.14, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(heart, 8);
  const lp = leafGeo.attributes.position, luv = leafGeo.attributes.uv;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i);
    luv.setXY(i, x / 1.3 + 0.5, (y + 0.15) / 1.35);
    lp.setZ(i, 0.12 * x * x * 4 - 0.18 * y * y);   // cup across the midrib, curl back toward the tip
  }
  leafGeo.computeVertexNormals();
  const leafMat = new THREE.MeshPhysicalMaterial({ map: TX.pothosLeafTexture(), roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const leaves = [];
  const rnd = mulberry(3);
  const soilY = sillY + 6.4;
  const stems = [];

  // the mound: every leaf sits on its own stem rising from the soil; low ones arch out
  // over the rim so the foliage meets the pot instead of hovering above it
  for (let i = 0; i < 130; i++) {
    const a = rnd() * Math.PI * 2;
    const low = i < 45;
    const el = low ? -0.15 + rnd() * 0.45 : 0.3 + Math.pow(rnd(), 0.8) * 0.95;
    const r = low ? 5.2 + rnd() * 3.5 : 2.5 + rnd() * 8;
    const ba = rnd() * Math.PI * 2, br = rnd() * 2.6;
    const base = new THREE.Vector3(potX + Math.cos(ba) * br, soilY, potZ + Math.sin(ba) * br);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) * 0.85).normalize();
    const p = base.clone().addScaledVector(dir, r);
    p.y = Math.max(p.y, soilY - 3.5);
    stems.push([base, p]);
    leaves.push({ p, out: dir.clone().setY(dir.y + 0.35), size: 3.6 + rnd() * 2.4, droop: low ? 0.9 + rnd() * 0.5 : 0.25 + rnd() * 0.6 });
  }
  const stemMat = new THREE.MeshStandardMaterial({ color: "#6f8a34", roughness: 0.55 });
  const stemInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.11, 1, 5), stemMat, stems.length);
  const sd = new THREE.Object3D();
  stems.forEach(([a0, a1], i) => {
    sd.position.copy(a0).add(a1).multiplyScalar(0.5);
    sd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a1.clone().sub(a0).normalize());
    sd.scale.set(1, a0.distanceTo(a1), 1);
    sd.updateMatrix();
    stemInst.setMatrixAt(i, sd.matrix);
  });
  stemInst.castShadow = true;
  scene.add(stemInst);
  // vines: from the rim, over the sill's front edge, then hanging down the wall
  const sillFront = WALL_Z + 5;
  const vineMat = new THREE.MeshStandardMaterial({ color: "#5a6b2e", roughness: 0.6 });
  for (let v = 0; v < 9; v++) {
    const x0 = potX + (v - 4) * 1.6 + (rnd() - 0.5);
    const drop = 6 + rnd() * 9, sway = (rnd() - 0.5) * 6;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, sillY + 6.8, potZ + 3),
      new THREE.Vector3(x0 + sway * 0.2, sillY + 2.5, sillFront - 1.5),
      new THREE.Vector3(x0 + sway * 0.4, sillY - 1, sillFront + 0.8),
      new THREE.Vector3(x0 + sway * 0.8, sillY - drop * 0.5, sillFront + 1.5),
      new THREE.Vector3(x0 + sway, sillY - drop, sillFront + 1.2 + rnd())
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.11, 6), vineMat);
    tube.castShadow = true;
    scene.add(tube);
    // leaves along the vine at uneven spacing, turning every which way around it
    let t = 0.06 + rnd() * 0.06;
    while (t < 0.97) {
      const p = curve.getPoint(t), turn = rnd() * Math.PI * 2;
      const out = new THREE.Vector3(Math.cos(turn), -0.3 + rnd() * 0.5, 0.6 + Math.abs(Math.sin(turn))).normalize();
      leaves.push({ p: p.clone().addScaledVector(out, 0.3), out, size: (4.4 - t * 1.8) * (0.75 + rnd() * 0.45), droop: 0.8 + rnd() * 0.8, hang: true });
      t += 0.07 + rnd() * 0.09;
    }
  }
  const inst = new THREE.InstancedMesh(leafGeo, leafMat, leaves.length);
  inst.castShadow = inst.receiveShadow = true;
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  leaves.forEach((L, i) => {
    dummy.position.copy(L.p);
    dummy.up.set(0, 1, 0);
    dummy.lookAt(L.p.clone().add(L.out));
    dummy.rotateX(-L.droop);                      // tip the leaf over
    dummy.rotateZ((rnd() - 0.5) * (L.hang ? 0.8 : 1.6));
    if (L.hang) dummy.rotateX(-0.9);              // hanging leaves point downward
    dummy.scale.setScalar(L.size);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, col.setRGB(1, 1, 1).multiplyScalar(0.8 + rnd() * 0.35));
  });
  scene.add(inst);
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
    b.innerHTML = `<span>${p.letter}</span>${p.title}${p.sealed ? `<i class="lock" title="Password protected">${window.ICONS.lock}</i>` : ""}`;
    b.setAttribute("aria-label", "Turn to: " + p.label + (p.sealed ? " (password protected)" : ""));
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
    current.querySelector(".desk__current-name").textContent = p.label;
    current.querySelector(".desk__current-cta").textContent = p.sealed ? "Password protected · enter →" : "Pull this card →";
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
  if (window.EMH.arrivedByLink()) { const j = personas.findIndex((p) => p.delivered); if (j >= 0) landOn = j; }
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
  // gold-leaf moulding: a fine ornamented outer border, a deep rounded cove, a small inner lip,
  // swept around the opening so the corners mitre; carved medallions at the centre of each side
  const IW = 10.4, IH = 13.6;
  // profile (d out from the sight edge, z up): sight edge, a half-round bead, a deep rounded
  // cove, a groove, then the flat ornamented border and the outer edge
  const prof = [[0, -0.3], [0, 0.3], [0.05, 0.36]];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; prof.push([0.2 - 0.14 * Math.cos(a), 0.38 + 0.14 * Math.sin(a)]); }
  prof.push([0.38, 0.36]);
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    prof.push([0.4 + 1.35 * t, 0.38 + 0.68 * Math.pow(Math.sin(Math.PI * t), 0.7)]);
  }
  prof.push([1.8, 0.4], [1.86, 0.52], [1.95, 0.6], [2.1, 0.64], [2.25, 0.62], [2.34, 0.56], [2.39, 0.45], [2.42, 0.2], [2.42, -0.3]);
  // v = arc length across the profile, so the texture follows the shape
  const arc = [0];
  for (let i = 1; i < prof.length; i++) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const vAt = (d) => { const i = prof.findIndex((p) => p[0] >= d); return arc[i] / arc[arc.length - 1]; };
  const gilt = TX.giltMouldingTextures({ bead: [vAt(0.06), vAt(0.37)], cove: [vAt(0.4), vAt(1.76)], band: [vAt(1.86), vAt(2.36)] });
  const gold = new THREE.MeshStandardMaterial({
    map: gilt.map, bumpMap: gilt.bump, bumpScale: 1.6, color: "#ffd890", metalness: 1, roughness: 0.34,
    envMap: scene.environment, envMapIntensity: 0.9, side: THREE.DoubleSide
  });
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const pos = [], uv = [], idx = [];
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const c0 = corners[sIdx], c1 = corners[(sIdx + 1) % 4];
    const alongX = sIdx % 2 === 0;
    const base = pos.length / 3;
    prof.forEach(([d, z], j) => {
      [c0, c1].forEach((c) => {
        const x = c[0] * (IW / 2 + d), y = c[1] * (IH / 2 + d);
        pos.push(x, y, z);
        uv.push((alongX ? x : y) / 4, arc[j] / arc[arc.length - 1]);
      });
    });
    for (let j = 0; j < prof.length - 1; j++) {
      const a0 = base + j * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
      idx.push(a0, b0, b1, a0, b1, a1);
    }
  }
  const mould = new THREE.BufferGeometry();
  mould.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  mould.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  mould.setIndex(idx);
  mould.computeVertexNormals();
  add(mould, gold, 0, 7.9, 0, tilt);
  const OW = IW + 4.84, OH = IH + 4.84;
  add(new THREE.BoxGeometry(OW - 0.1, OH - 0.1, 0.3), frameMat, 0, 7.9, -0.45, tilt);          // backing

  // medallions: carved cartouches (boss, ring, C-scrolls, acanthus) moulded onto the cove
  // at the centre of each side, with dark patina in the recesses
  const relief = TX.cartoucheRelief();
  const coveZ = (d) => {
    d = Math.min(2.38, Math.max(0.05, d));
    for (let i = 1; i < prof.length; i++) {
      const [d0, z0] = prof[i - 1], [d1, z1] = prof[i];
      if (d1 >= d && d1 > d0) return z0 + ((d - d0) / (d1 - d0)) * (z1 - z0);
    }
    return 0.4;
  };
  const MW = 3.9, MH = 2.3, MC = 1.2;
  const medGeo = new THREE.PlaneGeometry(MW, MH, 184, 84);
  const mp = medGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), y = mp.getY(i);
    const px = Math.round((x / MW + 0.5) * (relief.W - 1)), py = Math.round((0.5 - y / MH) * (relief.H - 1));
    mp.setZ(i, coveZ(MC + y) - 0.04 + relief.height[py * relief.W + px] * 0.42);
  }
  medGeo.computeVertexNormals();
  const medMat = new THREE.MeshStandardMaterial({ map: relief.map, color: "#ffd890", alphaTest: 0.5, metalness: 1, roughness: 0.32, envMap: scene.environment, envMapIntensity: 0.9, side: THREE.DoubleSide });
  [[0, IH / 2 + MC, 0], [0, -IH / 2 - MC, Math.PI], [-IW / 2 - MC, 0, Math.PI / 2], [IW / 2 + MC, 0, -Math.PI / 2]].forEach(([x, y, r]) => {
    const m = add(medGeo, medMat, x, 7.9 + y, 0, tilt);
    m.rotation.z = r;
  });
  add(new THREE.PlaneGeometry(IW, IH), new THREE.MeshStandardMaterial({ color: "#efe7d4", roughness: 0.95 }), 0, 7.9, 0.1, tilt);
  const photo = add(new THREE.PlaneGeometry(7.8, 10.2), new THREE.MeshStandardMaterial({ map: TX.photoTexture("assets/headshot.jpg"), roughness: 0.7 }), 0, 8.2, 0.11, tilt);
  photo.castShadow = false;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(IW, IH), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 2 }));
  glass.position.set(0, 7.9, 0.2);
  tilt.add(glass);
  const strut = add(new THREE.BoxGeometry(1.8, 12, 0.3), frameMat, 0, 5.8, -4.6, frame);
  strut.rotation.x = 0.36;

  /* mug: a round-bellied enamel mug, hand-painted pink check, copper rim, cream inside */
  const mugProf = [[0, 0], [3.0, 0], [3.3, 0.25], [3.4, 0.7], [3.9, 1.4], [4.45, 2.6], [4.75, 3.8], [4.7, 5.0],
    [4.35, 6.2], [3.98, 7.3], [3.86, 8.2], [3.94, 9.0], [4.05, 9.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const checks = TX.pinkCheckTexture();
  const enamel = new THREE.MeshPhysicalMaterial({ map: checks, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const cream = new THREE.MeshPhysicalMaterial({ color: "#f4ecda", roughness: 0.15, clearcoat: 1, side: THREE.BackSide });
  const copper = new THREE.MeshStandardMaterial({ color: "#c98a5c", metalness: 1, roughness: 0.28 });
  const mug = new THREE.Group();
  mug.position.set(25, 0, 13);
  mug.rotation.y = -0.6;
  scene.add(mug);
  add(new THREE.LatheGeometry(mugProf, 72), enamel, 0, 0, 0, mug);
  const innerProf = [[0, 1.0], [3.4, 1.2], [4.35, 3.8], [4.15, 6.2], [3.72, 8.2], [3.9, 9.38]].map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.LatheGeometry(innerProf, 72), cream, 0, 0, 0, mug);
  const rim = add(new THREE.TorusGeometry(3.98, 0.13, 10, 72), copper, 0, 9.4, 0, mug);
  rim.rotation.x = Math.PI / 2;
  const handle = add(new THREE.TorusGeometry(2.5, 0.5, 16, 40, Math.PI * 1.15), enamel, 4.4, 5.2, 0, mug);
  handle.rotation.z = -Math.PI / 2 - 0.25;
  const coffee = add(new THREE.CircleGeometry(3.72, 48), new THREE.MeshPhysicalMaterial({ color: "#26140a", roughness: 0.08, clearcoat: 1 }), 0, 8.1, 0, mug);
  coffee.rotation.x = -Math.PI / 2;

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

/* ==========================================================================
   A stack of books, spines out, with reading glasses on top (links still only)
   ========================================================================== */
function buildBookStack(scene) {
  const list = [
    // name, sub, cloth, w (along spine), thickness, depth, offset, turn, style
    ["Thesis", "Reading the Romance Reader", "#3e4a55", 25, 4.2, 17, 0.0, 0.03, 2],
    ["Academic CV", "Teaching & research", "#6e2219", 23, 3.4, 16, 1.2, -0.05, 1],
    ["LinkedIn", "The professional record", "#22334f", 24, 3.8, 16.5, -0.8, 0.04, 0],
    ["Previous ePortfolio", "The archive", "#7e3b40", 22, 3.0, 15, 0.6, -0.03, 2],
    ["TikTok", "", "#2e5652", 21, 2.8, 14.5, -0.4, 0.06, 1],
    ["Email", "eemaranto@gmail.com", "#e2d3b2", 20, 2.6, 14, 0.9, -0.02, 0],
    ["Résumé", "Marketing & leadership", "#2c4634", 22.5, 3.2, 15.5, -0.2, 0.05, 2]
  ];
  const ICON = {
    "Résumé": '<path d="M6 3h12v18H6z"/><circle cx="12" cy="8.5" r="2.2"/><path d="M8.5 14c.8-1.8 6.2-1.8 7 0"/><path d="M9 17.5h6"/>',
    "LinkedIn": '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17"/><circle cx="8" cy="7.4" r="0.6"/><path d="M12 17v-6.5M12 13.2c0-2.2 5-3 5 0V17"/>',
    "Academic CV": '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 11h7M9 14h7M9 17h4"/>',
    "Thesis": '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    "TikTok": '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.6 2.6 2.6 4.2 5 4.3"/>',
    "Previous ePortfolio": '<path d="M3 6h6l2 2h10v11H3z"/><path d="M3 10h18"/>',
    "Email": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
  };
  const base = new THREE.Vector3(43, 0, 4);
  const group = new THREE.Group();
  group.position.copy(base);
  group.rotation.y = -0.12;
  scene.add(group);
  const pages = new THREE.MeshStandardMaterial({ map: TX.pageEdgeTexture(), roughness: 0.92 });
  const pagesSide = pages.clone(); pagesSide.map = TX.pageEdgeTexture(9); pagesSide.map.rotation = Math.PI / 2;
  const spines = [];
  let y = 0;
  list.forEach(([name, sub, cloth, w, t, d, off, turn, style], i) => {
    const b = new THREE.Group();
    b.position.set(off, y + t / 2, 0);
    b.rotation.y = turn;
    group.add(b);
    const tex = TX.bookSpineTextures({ title: name, sub, cloth, icon: ICON[name], seed: 20 + i, style });
    const clothMat = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.85 });
    const spineMat = new THREE.MeshStandardMaterial({
      map: tex.map, roughnessMap: tex.rough, metalnessMap: tex.metal, metalness: 1, roughness: 1,
      bumpMap: tex.bump, bumpScale: 0.6
    });
    const board = 0.28;
    // covers overhang the page block slightly on three sides
    for (const s of [-1, 1]) {
      const cover = new THREE.Mesh(new RoundedBoxGeometry(w, board, d, 2, 0.1), clothMat);
      cover.position.y = s * (t / 2 - board / 2);
      cover.castShadow = cover.receiveShadow = true;
      b.add(cover);
    }
    const block = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, t - board * 2 + 0.02, d - 0.7),
      [pagesSide, pagesSide, pages, pages, pages, pages]);
    block.position.z = -0.25;
    block.castShadow = block.receiveShadow = true;
    b.add(block);
    // a rounded spine: half a cylinder, flattened, wrapped with the foil texture
    const spineGeo = new THREE.CylinderGeometry(t / 2, t / 2, w, 32, 1, true, 0, Math.PI);
    spineGeo.rotateZ(Math.PI / 2);
    spineGeo.rotateX(Math.PI / 2);
    spineGeo.scale(1, 1, 0.42);
    const uv = spineGeo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, 1 - uv.getY(k), uv.getX(k));
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.z = d / 2 - 0.02;
    spine.castShadow = true;
    spine.userData.name = name;
    b.add(spine);
    spines.push(spine);
    y += t;
  });

  // tortoiseshell reading glasses resting on top
  const tort = new THREE.MeshPhysicalMaterial({ color: "#6a3415", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transmission: 0.9, thickness: 0.2, transparent: true, opacity: 0.35 });
  const glasses = new THREE.Group();
  glasses.position.set(-2, y, 2.5);
  glasses.rotation.y = 0.25;
  group.add(glasses);
  const rim = new THREE.Shape(); rim.absarc(0, 0, 2.3, 0, Math.PI * 2);
  for (const sx of [-2.9, 2.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.16, 12, 48), tort);
    ring.scale.set(1.15, 0.8, 1); ring.position.set(sx, 1.85, 0); ring.rotation.x = -0.12; ring.castShadow = true;
    glasses.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), lensMat);
    lens.scale.set(1.1, 0.88, 1); lens.position.copy(ring.position); lens.rotation.copy(ring.rotation);
    glasses.add(lens);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 12.5), tort);
    arm.position.set(sx * 1.88, 2.1, -6.2); arm.rotation.set(0.08, -sx * 0.02, 0); arm.castShadow = true;
    glasses.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.14, 10, 20, Math.PI), tort);
  bridge.position.set(0, 2.3, 0); bridge.rotation.x = -0.12;
  glasses.add(bridge);

  // a reading light on the stack, so the foil catches
  const key = new THREE.SpotLight("#ffc98a", 2600, 0, 0.6, 0.8, 2);
  key.position.set(base.x - 30, 45, base.z + 30);
  key.target.position.copy(base).setY(10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);

  return { spines, aim: base.clone().setY(y * 0.55) };
}
