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
  // Menu labels dissolve letter by letter: split each label into letters for the CSS
  // transition, keeping the whole words for screen readers.
  document.querySelectorAll(".swap__a, .swap__b").forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = document.createElement("span");
      s.className = "ch";
      s.style.setProperty("--i", i);
      s.textContent = ch === " " ? "\u00a0" : ch;
      vis.appendChild(s);
    });
    el.appendChild(sr);
    el.appendChild(vis);
  });

  // Each menu item is as wide as the label showing, and eases wider or narrower as the
  // other label takes over, so a long hover label doesn't leave a gap in the menu.
  function measure() {
    document.querySelectorAll(".swap").forEach(function (sw) {
      var a = sw.querySelector(".swap__a [aria-hidden]"), b = sw.querySelector(".swap__b [aria-hidden]");
      if (!a || !b) return;
      sw.style.setProperty("--wa", Math.ceil(a.getBoundingClientRect().width) + "px");
      sw.style.setProperty("--wb", Math.ceil(b.getBoundingClientRect().width) + "px");
    });
    document.documentElement.classList.add("swap-measured");
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure); else measure();

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

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
