/* Shared page behaviour: mobile menu, footer year. */
(function () {
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }
  // Dropdown: click/tap toggles; Escape or a click elsewhere closes it.
  document.querySelectorAll(".has-drop").forEach(function (item) {
    var btn = item.querySelector(".drop-toggle");
    function set(open) {
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      set(!item.classList.contains("is-open"));
    });
    document.addEventListener("click", function (e) { if (!item.contains(e.target)) set(false); });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { set(false); btn.focus(); }
    });
  });

  // Over the desk scene the masthead goes transparent with light type.
  var masthead = document.querySelector(".masthead");
  var desk = document.getElementById("rolodex");
  if (masthead && document.body.classList.contains("on-desk")) masthead.classList.add("is-over-desk");
  if (masthead && desk && desk.classList.contains("desk")) {
    document.body.classList.add("has-desk");
    masthead.classList.add("is-over-desk");
    new IntersectionObserver(function (entries) {
      masthead.classList.toggle("is-over-desk", entries[0].isIntersecting);
    }, { rootMargin: "-70px 0px 0px 0px" }).observe(desk);
  }

  // Headings and subheadings get a quick bump: a little wave of letters hopping up
  // and down across the words, when they come into view and again on hover.
  var BUMP = "main h1, main h2, main h3, main .kicker, .sheet-paper__file, .ofolder__caption";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function bumpify(el) {
    if (el.dataset.bump) return;
    el.dataset.bump = "1";
    var label = el.textContent.replace(/\s+/g, " ").trim();
    var i = 0;
    var total = label.length || 1, step = Math.min(28, 700 / total);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); i++; return; }
          var w = document.createElement("span");
          w.className = "bump-w";
          Array.prototype.forEach.call(part, function (ch) {
            var c = document.createElement("span");
            c.className = "bump-c";
            c.style.setProperty("--d", (i++ * step).toFixed(0) + "ms");
            c.textContent = ch;
            w.appendChild(c);
          });
          frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(el);
    el.setAttribute("aria-label", label);
    Array.prototype.forEach.call(el.children, function (c) { c.setAttribute("aria-hidden", "true"); });
    if (reduce) return;
    seen.observe(el);
    el.addEventListener("mouseenter", function () { replay(el); });
  }
  function replay(el) {
    el.classList.remove("is-bumped");
    void el.offsetWidth;
    el.classList.add("is-bumped");
  }
  var seen = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { replay(e.target); seen.unobserve(e.target); }
    });
  }, { threshold: 0.6 }) : { observe: function () {}, unobserve: function () {} };
  function scan() { document.querySelectorAll(BUMP).forEach(bumpify); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scan); else scan();
  // persona pages render after load; catch headings added later
  var mainEl = document.getElementById("main");
  if (mainEl && "MutationObserver" in window) new MutationObserver(scan).observe(mainEl, { childList: true, subtree: true });

  // Press videos: show YouTube's thumbnail first, swap in the player (cued to the
  // timestamp) on click, so the page doesn't load two players up front.
  document.querySelectorAll(".reel__frame").forEach(function (frame) {
    var btn = frame.querySelector(".reel__play");
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + frame.dataset.video + "?start=" + frame.dataset.start + "&autoplay=1&rel=0";
      f.title = btn.getAttribute("aria-label").replace(/^Play /, "");
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      frame.replaceChild(f, btn);
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
