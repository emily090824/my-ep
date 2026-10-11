/* Renders persona.html?p=<slug> from window.PERSONAS. */
(function () {
  var root = document.getElementById("persona");
  var switcher = document.getElementById("persona-switch");
  var intro = window.EMH.hasIntro();
  var fill = window.EMH.fill;

  var slug = new URLSearchParams(location.search).get("p") || "marketer";
  var p = window.PERSONAS.find(function (x) { return x.slug === slug; });
  var locked = !p || (p.visibility !== "public" && !intro);

  if (p && p.visibility !== "public") {
    var meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
  }

  if (locked) {
    document.title = "By introduction · Emily Maranto Hill";
    root.insertAdjacentHTML("beforeend",
      '<div class="persona__sealed">' +
        '<div class="persona-seal" style="margin:0 auto 24px">' + window.ICONS.executive + '</div>' +
        '<h1 class="sheet__no" style="font-size:1rem">This card is shared by introduction</h1>' +
        '<p>If someone sent you here, ask them for the full link — or say hello and I\'ll pass it along.</p>' +
        '<a class="btn btn--solid" href="./#contact">Don\'t be a stranger</a>' +
      '</div>');
  } else {
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
  }

  // "Pull another card" — only cards this visitor is allowed to see.
  var others = window.PERSONAS.filter(function (x) {
    return x !== p && (x.visibility === "public" || intro);
  });
  if (others.length) {
    switcher.innerHTML = "<h2>Pull another card</h2><ul>" + others.map(function (x) {
      return '<li><a href="persona.html?p=' + x.slug + '"><span class="ic">' + window.ICONS[x.slug] +
        "</span>" + x.title + "</a></li>";
    }).join("") + "</ul>";
  }
})();
