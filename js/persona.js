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
    }
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
