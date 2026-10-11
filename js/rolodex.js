/* ==========================================================================
   Rolodex — a flip-file of persona cards pivoting on a rod.
   Cards behind the active one lean back and peek over it; cards already
   flipped fall forward toward the viewer, showing their backs.
   ========================================================================== */
(function () {
  var stage = document.getElementById("rolodex-stage");
  var wheel = document.getElementById("rolodex-wheel");
  if (!stage || !wheel) return;

  var intro = window.EMH.hasIntro();
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var personas = window.PERSONAS.filter(function (p) {
    return p.visibility !== "hidden" || intro;
  });
  var N = personas.length;
  var status = document.getElementById("rolodex-status");
  var indexList = document.getElementById("rolodex-index");

  var pos = 0;      // continuous position; integer = a card standing upright
  var active = 0;   // index of the card currently facing the viewer
  var anim = null;

  /* ---------- build cards ---------- */
  var cards = personas.map(function (p, i) {
    var sealed = p.visibility === "unlisted" && !intro;
    var delivered = p.visibility !== "public" && intro;
    var el = document.createElement("a");
    el.className = "card" + (sealed ? " card--sealed" : "") + (delivered ? " card--delivered" : "");
    el.href = sealed ? "#contact" : "persona.html?p=" + p.slug;
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", sealed
      ? "Emily as " + p.article + " " + p.title + " — by introduction only. Get in touch."
      : "Open: Emily as " + p.article + " " + p.title);
    el.style.setProperty("--tab-x", (6 + i * (68 / Math.max(N - 1, 1))) + "%");

    var stamp = sealed
      ? '<span class="card__stamp">By introduction</span>'
      : delivered ? '<span class="card__stamp card__stamp--green">Hand-delivered</span>' : "";

    el.innerHTML =
      '<span class="card__face card__front">' +
        '<span class="card__tab">' + p.letter + '</span>' +
        '<span class="card__rule"></span>' +
        '<span class="card__body">' +
          '<span class="card__logo">' + window.ICONS[p.slug] + '</span>' +
          '<span class="card__text">' +
            '<span class="card__eyebrow">No. 0' + (i + 1) + ' · Emily as ' + p.article + '</span>' +
            '<span class="card__title">' + p.title + '</span>' +
            '<span class="card__line">' + (sealed ? "Shared by direct introduction only." : p.tagline) + '</span>' +
          '</span>' +
        '</span>' +
        '<span class="card__foot">' +
          '<span>File under ' + p.letter + '</span>' +
          '<span class="card__cta">' + (sealed ? "Request an intro →" : "Pull card →") + '</span>' +
        '</span>' +
        stamp +
        '<span class="card__slots" aria-hidden="true"><i></i><i></i></span>' +
      '</span>' +
      '<span class="card__face card__back" aria-hidden="true"><span>EMH</span></span>';

    el.addEventListener("click", function (e) {
      if (dragMoved) { e.preventDefault(); return; }
      if (i !== active) { e.preventDefault(); goTo(i); }
    });
    wheel.appendChild(el);

    if (indexList) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<span class="idx__letter">' + p.letter + '</span><span class="idx__name">' +
        (sealed ? "Private" : p.title) + '</span>';
      b.setAttribute("aria-label", "Turn to: Emily as " + p.article + " " + p.title);
      b.addEventListener("click", function () { goTo(i); });
      li.appendChild(b);
      indexList.appendChild(li);
    }
    return el;
  });
  var indexButtons = indexList ? indexList.querySelectorAll("button") : [];

  /* ---------- geometry ---------- */
  function render() {
    for (var i = 0; i < N; i++) {
      var d = i - pos, angle, lift, scale, opacity, shade;
      if (d >= 0) {
        // Leaning back behind the active card.
        angle = Math.min(d, 4) * 12;
        lift = -Math.min(d, 4) * 15;
        scale = 1 - Math.min(d, 4) * 0.025;
        opacity = d > 3.4 ? Math.max(0, 1 - (d - 3.4) / 0.6) : 1;
        shade = Math.min(d, 4) * 0.07;
      } else {
        // Flipped forward, toward the viewer.
        var t = -d;
        angle = t <= 1 ? -t * 104 : -104 - (t - 1) * 5;
        lift = 0;
        scale = 1;
        opacity = t > 1.2 ? Math.max(0, 1 - (t - 1.2) / 0.6) : 1;
        shade = 0;
      }
      var c = cards[i];
      c.style.transform = "translateY(" + lift + "px) rotateX(" + angle + "deg) scale(" + scale + ")";
      c.style.setProperty("--fade", opacity);
      c.style.zIndex = d >= 0 ? 50 - Math.round(d * 10) : 60 + Math.round(-d * 10);
      c.style.setProperty("--shade", shade);
      c.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
    }
  }

  function setActive(i) {
    active = i;
    cards.forEach(function (c, j) {
      c.setAttribute("tabindex", j === i ? "0" : "-1");
      c.classList.toggle("is-active", j === i);
      c.setAttribute("aria-hidden", j === i ? "false" : "true");
    });
    for (var k = 0; k < indexButtons.length; k++) {
      indexButtons[k].setAttribute("aria-current", k === i ? "true" : "false");
    }
    var p = personas[i];
    if (status) status.textContent = "Card " + (i + 1) + " of " + N + ": Emily as " + p.article + " " + p.title;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function tween(to, duration, ease, done) {
    if (anim) cancelAnimationFrame(anim.raf);
    if (reduceMotion) duration = 0;
    var from = pos, start = performance.now();
    anim = {};
    (function step(now) {
      var t = duration ? Math.min(1, (now - start) / duration) : 1;
      pos = from + (to - from) * ease(t);
      render();
      if (t < 1) anim.raf = requestAnimationFrame(step);
      else { anim = null; if (done) done(); }
    })(start);
  }

  function goTo(i) {
    i = ((i % N) + N) % N;
    setActive(i);
    var dist = Math.abs(i - pos);
    tween(i, 260 + 220 * Math.sqrt(dist), easeOutCubic);
  }

  /* ---------- controls ---------- */
  document.getElementById("rolodex-prev").addEventListener("click", function () { goTo(active - 1); });
  document.getElementById("rolodex-next").addEventListener("click", function () { goTo(active + 1); });

  stage.setAttribute("tabindex", "0");
  stage.setAttribute("aria-label", "Rolodex. Use arrow keys to flip cards, Enter to open.");
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
    else if (e.key === "Enter" && e.target === stage) { cards[active].click(); }
  });

  // Mouse wheel / trackpad: flips cards, but lets the page scroll at either end.
  var wheelAcc = 0, wheelLock = 0;
  stage.addEventListener("wheel", function (e) {
    var dir = e.deltaY > 0 ? 1 : -1;
    if ((dir > 0 && active === N - 1) || (dir < 0 && active === 0)) { wheelAcc = 0; return; }
    e.preventDefault();
    if (performance.now() < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) {
      goTo(active + dir);
      wheelAcc = 0;
      wheelLock = performance.now() + 220;
    }
  }, { passive: false });

  // Drag: pull down to flip the front card toward you, push up to bring it back.
  var dragStartY = null, dragStartPos = 0, dragMoved = false;
  stage.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    dragStartY = e.clientY;
    dragStartPos = pos;
    dragMoved = false;
  });
  stage.addEventListener("pointermove", function (e) {
    if (dragStartY === null) return;
    var dy = e.clientY - dragStartY;
    if (!dragMoved && Math.abs(dy) > 6) {
      dragMoved = true;
      if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-dragging");
    }
    if (dragMoved) {
      pos = Math.max(-0.35, Math.min(N - 0.65, dragStartPos + dy / 90));
      render();
    }
  });
  function endDrag() {
    if (dragStartY === null) return;
    dragStartY = null;
    stage.classList.remove("is-dragging");
    if (dragMoved) {
      goTo(Math.round(Math.max(0, Math.min(N - 1, pos))));
      setTimeout(function () { dragMoved = false; }, 0);
    }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* ---------- opening roll ---------- */
  var landOn = 0;
  if (intro) {
    for (var j = 0; j < N; j++) if (personas[j].visibility !== "public") { landOn = j; break; }
  }
  setActive(landOn);
  pos = N - 1 + 1.2;            // start with the deck flipped past the end
  render();
  setTimeout(function () {
    tween(landOn, 1700, easeInOut);
  }, 250);
})();
