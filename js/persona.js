/* Renders persona.html?p=<slug> from window.PERSONAS. Locked pages ask for a password. */
(function () {
  var root = document.getElementById("persona");
  var switcher = document.getElementById("persona-switch");
  var fill = window.EMH.fill;

  var slug = new URLSearchParams(location.search).get("p") || "marketer";
  document.body.classList.add("persona-page--" + slug);
  var p = window.PERSONAS.find(function (x) { return x.slug === slug; });

  if (p && p.visibility !== "public") {
    var meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
  }

  function clear() {
    Array.prototype.slice.call(root.children).forEach(function (c) {
      if (!c.classList.contains("persona__back")) c.remove();
    });
  }

  function renderPage() {
    clear();
    document.title = "Emily as " + p.article + " " + p.title + " · Emily Maranto Hill";
    var html =
      '<header class="persona__hero">' +
        '<div class="persona-seal">' + window.ICONS[p.slug] + '</div>' +
        '<div>' +
          '<p class="kicker">File under ' + p.letter + '</p>' +
          '<h1>Emily as ' + p.article + ' <em>' + p.title + '</em></h1>' +
          '<p class="persona__tagline">' + fill(p.tagline) + '</p>' +
        '</div>' +
      '</header>' +
      '<p class="persona__summary">' + fill(p.summary) + '</p>';
    p.sections.forEach(function (s) {
      html += '<section class="persona__section"><h2>' + s.heading + '</h2><ul>' +
        s.items.map(function (it) { return "<li>" + fill(it) + "</li>"; }).join("") +
        "</ul></section>";
    });
    root.insertAdjacentHTML("beforeend", html);
    if (p.promo && !document.querySelector(".arc")) root.insertAdjacentHTML("beforebegin", p.promo);
    var dlg = document.getElementById("arc-signup");
    if (dlg && !dlg.dataset.wired) {
      dlg.dataset.wired = "1";
      document.querySelectorAll('[data-open="arc-signup"]').forEach(function (b) {
        b.addEventListener("click", function () { dlg.showModal(); });
      });
      dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });   // click outside the card
      // the form posts straight to the Google Apps Script, into a hidden frame; when the
      // script's reply has loaded there, the sign-up is in and the card says thank you
      var sink = document.querySelector('iframe[name="arc-signup-sink"]'), pending = null;
      sink.addEventListener("load", function () {
        if (!pending) return;
        var f = pending; pending = null;
        f.querySelectorAll(".signup__row, .signup__field, .signup__consent, .signup__submit, .signup__note").forEach(function (el) { el.hidden = true; });
        f.querySelector(".signup__lead").textContent = "Thank you, " + f.firstName.value.trim() + ".";
        var msg = f.querySelector(".signup__msg");
        msg.textContent = "You\u2019re on the list. I\u2019ll write when your copy is ready.";
        msg.classList.add("is-done");
        document.dispatchEvent(new Event("arc-signed-up"));
      });
      dlg.querySelector("form").addEventListener("submit", function (e) {
        var f = e.target, msg = f.querySelector(".signup__msg"), btn = f.querySelector(".signup__submit");
        if (!f.checkValidity()) { e.preventDefault(); msg.textContent = "Please fill in each field and tick the box."; return; }
        pending = f; btn.disabled = true; msg.textContent = "Sending\u2026";
        setTimeout(function () {   // no reply after a while: let them try again
          if (pending !== f) return;
          pending = null; btn.disabled = false;
          msg.textContent = "That didn\u2019t go through. Please try again in a moment.";
        }, 20000);
      });
      if (new URLSearchParams(location.search).get("signup") === "open") dlg.showModal();
      // the count of ARC readers: read from the sheet (the script's doGet), counted up
      // when it first comes into view, and checked again now and then so it keeps rising
      var counters = document.querySelectorAll("[data-arc-count]"), shown = 0, seen = false, known = null;
      // the count comes from the script's doGet, which answers {"count": n}
      // the working deployment (the one the form posts to) first; the older one as a fallback
      var COUNT_URLS = [
        "https://script.google.com/macros/s/AKfycbwvI33WBWYR7P89TAl43bahbsJ0EIrwF7M3W-RjgMROPPiN7fM4Gkq_hSx6ZOl4qGVQow/exec",
        "https://script.google.com/macros/s/AKfycbwTjfnqw3CBk9ft-b_gpNMnA_WJsK5YvZN321N8gVTJPZ8wVi4atx6bgq-QH3j3fhyd/exec"
      ];
      function paint(n) {
        counters.forEach(function (el) {
          // "Join the 5 other ARC readers"; with none yet, an invitation to be the first
          if (n === 0) { el.innerHTML = "Be the first ARC reader"; return; }
          el.innerHTML = "Join " + (n === 1 ? "" : "the ") + '<span class="arc__count-n">' + n.toLocaleString() + "</span> other ARC reader" + (n === 1 ? "" : "s");
        });
      }
      function tickTo(target) {
        var from = shown, t0 = performance.now(), dur = Math.min(2200, 500 + (target - from) * 40);
        if (target <= from || matchMedia("(prefers-reduced-motion: reduce)").matches) { shown = target; paint(target); return; }
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          paint(Math.round(from + (target - from) * e));
          if (k < 1) requestAnimationFrame(step); else shown = target;
        })(t0);
      }
      function update(n) {
        if (typeof n !== "number" || !isFinite(n) || n < 0) return;   // only a real count is shown
        known = Math.max(known === null ? 0 : known, n);
        counters.forEach(function (el) { el.hidden = false; });
        if (seen) tickTo(known);
      }
      function poll() {
        (function attempt(i) {
          if (i >= COUNT_URLS.length) return;   // every address failed: the counter simply stays hidden
          fetch(COUNT_URLS[i], { method: "GET", cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) {
              if (!d || d.count === undefined || d.count === null || d.count === "") throw new Error("no count");
              update(Number(d.count));
            })
            .catch(function () { attempt(i + 1); });
        })(0);
      }
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; }) && !seen) { seen = true; if (known !== null) tickTo(known); }
        }, { threshold: 0.5 });
        counters.forEach(function (el) { io.observe(el); });
      } else seen = true;
      poll();
      setInterval(function () { if (!document.hidden) poll(); }, 60000);
      document.addEventListener("arc-signed-up", function () { if (known !== null) update(known + 1); });

    }
    // on phones, long passages fold to a few lines with a "Read more" toggle, so the page scrolls quickly
    var phone = matchMedia("(max-width: 760px)");
    document.querySelectorAll("[data-collapse]").forEach(function (box, i) {
      if (box.dataset.foldWired) return;
      box.dataset.foldWired = "1";
      if (!box.id) box.id = "fold-" + i;
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "fold-toggle"; btn.setAttribute("aria-controls", box.id);
      box.insertAdjacentElement("afterend", btn);
      function set(open) {
        box.classList.toggle("is-folded", !open);
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "Show less" : box.dataset.collapse;
      }
      function sync() { btn.hidden = !phone.matches; if (phone.matches) set(false); else box.classList.remove("is-folded"); }
      btn.addEventListener("click", function () {
        var open = box.classList.contains("is-folded");
        set(open);
        if (!open) box.scrollIntoView({ block: "nearest" });   // folding back up: keep the reader in place
      });
      (phone.addEventListener ? phone.addEventListener("change", sync) : phone.addListener(sync));
      sync();
    });

    // the PlumX badge only shows once PlumX's own script has loaded and defined the element
    // two round buttons that float in the bottom corners: home to the rolodex, and back to the top
    if (p.promo && !document.querySelector(".float-btn")) {
      document.body.insertAdjacentHTML("beforeend",
        '<a class="float-btn float-btn--home" href="./#rolodex" aria-label="Back to the rolodex" title="Back to the rolodex">' +
          '<svg viewBox="0 0 48 48" aria-hidden="true">' +
            // a fan of cards on their wheel, standing on two feet
            '<g class="cards">' +
              '<rect x="15" y="6" width="18" height="13" rx="1.8" transform="rotate(-42 24 27)"/>' +
              '<rect x="15" y="6" width="18" height="13" rx="1.8" transform="rotate(42 24 27)"/>' +
              '<rect x="15" y="6" width="18" height="13" rx="1.8" transform="rotate(-21 24 27)"/>' +
              '<rect x="15" y="6" width="18" height="13" rx="1.8" transform="rotate(21 24 27)"/>' +
              '<rect x="15" y="6" width="18" height="13" rx="1.8"/>' +
            '</g>' +
            '<circle cx="24" cy="27" r="4.2"/><circle cx="24" cy="27" r="1.2" class="dot"/>' +
            '<path d="M24 31.5l-7 9M24 31.5l7 9M12 41h24"/>' +
          '</svg></a>' +
        '<button class="float-btn float-btn--top" type="button" aria-label="Back to top" title="Back to top">' +
          '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 36V13M14 22l10-10 10 10"/></svg></button>');
      var topBtn = document.querySelector(".float-btn--top");
      topBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
      var onScroll = function () { document.body.classList.toggle("is-scrolled", scrollY > innerHeight * 0.6); };
      addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }

    var plum = document.querySelector(".thesis__metrics");
    if (plum && !document.querySelector('script[src*="plumx-widget.js"]')) {   // PlumX's loader, only on the page that shows a badge
      var ps = document.createElement("script");
      ps.src = "https://plumx.elsevier.com/widget/plumx-widget.js"; ps.async = true;
      document.head.appendChild(ps);
    }
    if (plum && window.customElements) customElements.whenDefined("plumx-widget").then(function () { plum.hidden = false; });
    renderSwitcher();
  }

  function renderPassword() {
    clear();
    document.title = "Emily as " + p.article + " " + p.title + " · Password protected";
    root.insertAdjacentHTML("beforeend",
      '<div class="persona__sealed">' +
        '<div class="persona-seal persona-seal--locked">' + window.ICONS[p.slug] + '</div>' +
        '<p class="kicker">File under ' + p.letter + ' · password protected</p>' +
        '<h1 class="persona__locked-title">Emily as ' + p.article + ' <em>' + p.title + '</em></h1>' +
        '<p>This card is shared by introduction. Enter the password you were given.</p>' +
        '<form class="unlock" novalidate>' +
          '<label class="sr-only" for="unlock-pass">Password</label>' +
          '<input id="unlock-pass" class="unlock__input" type="password" autocomplete="current-password" placeholder="Password" required>' +
          '<button class="btn btn--solid" type="submit">Open the card</button>' +
          '<p class="unlock__msg" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<p class="persona__ask">No password? <a href="contact.html">Ask for an introduction →</a></p>' +
      '</div>');
    var form = root.querySelector(".unlock"), input = form.querySelector("input"), msg = form.querySelector(".unlock__msg");
    var btn = form.querySelector("button");
    input.focus();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!input.value) { msg.textContent = "Enter the password first."; return; }
      btn.disabled = true;
      msg.textContent = "Checking…";
      window.EMH.unlock(input.value).then(function (ok) {
        btn.disabled = false;
        if (ok && p.unlocked) { renderPage(); return; }
        msg.textContent = "That's not it. Try again, or ask for an introduction.";
        form.classList.remove("is-wrong"); void form.offsetWidth; form.classList.add("is-wrong");
        input.select();
      });
    });
    renderSwitcher();
  }

  // "Pull another card": only cards this visitor can see.
  function renderSwitcher() {
    var others = window.PERSONAS.filter(function (x) { return x !== p && window.EMH.isVisible(x); });
    switcher.innerHTML = others.length ? "<h2>Pull another card</h2><ul>" + others.map(function (x) {
      return '<li><a href="persona.html?p=' + x.slug + '"><span class="ic">' + window.ICONS[x.slug] +
        "</span>" + x.title + (window.EMH.isOpen(x) ? "" : ' <i class="lock" title="Password protected">' + window.ICONS.lock + '</i>') + "</a></li>";
    }).join("") + "</ul>" : "";
  }

  window.EMH.ready.then(function () {
    if (!p) { p = window.PERSONAS[0]; }
    if (window.EMH.isOpen(p)) renderPage();
    else renderPassword();
  });
})();
