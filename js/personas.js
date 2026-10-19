/* ==========================================================================
   Personas — the single place to edit what each rolodex card says.

   visibility:
     "public"  → shown on the rolodex, open to everyone
     "locked"  → shown on the rolodex with a lock; the page is password protected
     "hidden"  → not on the rolodex until unlocked; reachable only by link + password

   A locked page's content is NOT in this file. It lives in private/<slug>.json
   (never published) and is encrypted into js/locked.js by `node tools/lock.mjs <password>`.
   Visitors unlock it by entering the password, or by a direct link that carries it:
     https://<your-site>/?intro=<password>

   Text wrapped in [[double brackets]] renders as a highlighted placeholder
   so it's easy to spot what still needs real copy.
   ========================================================================== */

window.SITE = {
  name: "Emily Maranto Hill",
  email: "eemaranto@gmail.com",
  links: {
    linkedin: "https://www.linkedin.com/in/emilymarantohill/",
    portfolio: "https://emilymhill.portfolial.com/",
    thesis: "https://doi.org/10.25777/67hyyr98"
  }
};

window.ICONS = {
  marketer:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 20v8h7l15 8V12l-15 8H7z"/><path d="M14 28l3 9h5l-2-8"/><path d="M34 19c1.6 2 1.6 8 0 10"/><path d="M38 15c3.6 4.5 3.6 13.5 0 18"/></svg>',
  executive:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="15" cy="24" r="8"/><circle cx="15" cy="24" r="2.5"/><path d="M23 24h19"/><path d="M36 24v6"/><path d="M41 24v4"/></svg>',
  academic:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M3 18l21-9 21 9-21 9z"/><path d="M11 22v9c0 3 6 6.5 13 6.5S37 34 37 31v-9"/><path d="M45 18v12"/><circle cx="45" cy="32" r="1.6"/></svg>',
  writer:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l10 15-4 19H18l-4-19z"/><path d="M24 4v17"/><circle cx="24" cy="24" r="2.6"/><path d="M17 38h14v5H17z"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  creator:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="14" width="38" height="25" rx="3"/><circle cx="24" cy="26.5" r="7.5"/><circle cx="24" cy="26.5" r="3"/><path d="M16 14l3-5h10l3 5"/><circle cx="37" cy="19.5" r="1.4"/></svg>'
};

window.PERSONAS = [
  {
    slug: "marketer",
    article: "a",
    title: "Marketer",
    letter: "M",
    visibility: "public",
    tagline: "Brand stories built on how audiences actually behave.",
    summary:
      "Strategy, voice, and campaigns grounded in audience research — the same questions I study as a scholar, put to work for brands.",
    sections: [
      {
        heading: "What I do",
        items: [
          "Brand & content strategy",
          "Audience research and social listening",
          "Campaign storytelling across platforms",
          "Community and fandom-driven growth"
        ]
      }
    ]
  },
  {
    slug: "executive",
    article: "an",
    title: "Executive",
    letter: "E",
    visibility: "locked",
    // public teaser only; the page itself is in js/locked.js (encrypted)
    tagline: "Leadership, by proper introduction."
  },
  {
    slug: "academic",
    article: "an",
    title: "Academic",
    letter: "A",
    visibility: "public",
    tagline: "Media studies, fandom, and the platforms in between.",
    summary:
      "Media studies and digital communication scholar. Adjunct Instructor and ePortfolio Coordinator at Old Dominion University, researching fandom, media identity, and platform capitalism.",
    sections: [
      {
        heading: "Teaching & appointments",
        items: [
          "Adjunct Instructor, College of Arts & Letters, Old Dominion University — 2024–present. COM 345: Media Audiences; COM 301: Critical Methodologies.",
          "ePortfolio Coordinator, ePortfolio & Digital Initiatives, Old Dominion University — 2026–present.",
          "Graduate Assistant, ePortfolio & Digital Initiatives, Old Dominion University — 2024–2025.",
          "Editorial Assistant, Palgrave Handbook of Positive Communication for a Livable Future — 2024–2025, under the mentorship of Tom Socha, PhD."
        ]
      },
      {
        heading: "Publications & research",
        items: [
          "Hill, E. M. (2025). <a href=\"https://digitalcommons.odu.edu/communication_etds/35\"><em>Reading the Romance Reader: BookTok, Algorithmic Subjugation, and the Fight for Cultural Legitimacy.</em></a> MA thesis, Communication &amp; Theatre Arts, Old Dominion University. <a href=\"https://doi.org/10.25777/67hy-yr98\">DOI: 10.25777/67hy-yr98</a>",
          "Socha, T. J., Hill, E., et al. (2026). <a href=\"https://doi.org/10.1007/978-3-032-20388-5_21\">Towards positive food communication systems.</a> In T. J. Socha (Ed.), <em>The Palgrave Handbook of Positive Communication for Livable Futures</em>. Palgrave Macmillan.",
          "Socha, T., & Hill, E. <em>Designing Positive Family Communication.</em> Norfolk, VA: Old Dominion University, in press.",
          "Socha, T. J., Hill, E., et al. Predictors of food-support awareness: An exploratory applied positive communication study. Southern States Communication Association, Norfolk, VA."
        ]
      },
      {
        heading: "Research areas",
        items: [
          "Fandom studies · Participatory culture · Media communities",
          "Media identity · Media criticism",
          "Platform capitalism · Digital communication · Mass communication"
        ]
      },
      {
        heading: "Education",
        items: [
          "M.A. in Lifespan and Digital Communication, Old Dominion University, 2025 — Summa Cum Laude",
          "B.M.C., Louisiana State University, 2021 — Summa Cum Laude; Distinguished Communicator Award"
        ]
      }
    ]
  },
  {
    slug: "writer",
    article: "a",
    title: "Writer",
    // a banner above the page: the call for advance readers of the novel
    promo:
      '<section class="arc" aria-labelledby="arc-title">' +
        '<div class="arc__inner">' +
          '<figure class="arc__book"><div class="book3d">' +
            '<img src="assets/blood-of-a-begonia.jpg" width="600" height="777" alt="The Blood of a Begonia by Emily M. Hill: a botanical print of a begonia, the title on a cream label">' +
          '</div></figure>' +
          '<div class="arc__copy">' +
            '<p class="arc__lead">Sign up to be an<br> <abbr title="advance reader copy">ARC</abbr> reader of</p>' +
            '<h2 class="arc__title" id="arc-title">The Blood of<br> a&nbsp;Begonia</h2>' +
            '<a class="arc__btn" href="mailto:eemaranto@gmail.com?subject=ARC%20reader%3A%20The%20Blood%20of%20a%20Begonia&amp;body=I%27d%20love%20to%20read%20an%20advance%20copy%20of%20The%20Blood%20of%20a%20Begonia.%0A%0AName%3A%20%0APreferred%20format%20(ebook%20or%20print)%3A%20%0AWhere%20I%20review%20(Goodreads%2C%20BookTok%2C%20etc.)%3A%20">Sign up</a>' +
          '</div>' +
        '</div>' +
      '</section>',
    letter: "W",
    visibility: "public",
    tagline: "Books, essays, and the romance of a good sentence.",
    summary: "Writing about readers, fandom, and the stories communities gather around.",
    sections: [
      {
        heading: "Published",
        items: [
          "<a href=\"https://digitalcommons.odu.edu/communication_etds/35\"><em>Reading the Romance Reader: BookTok, Algorithmic Subjugation, and the Fight for Cultural Legitimacy</em></a> (2025)",
          "<a href=\"https://doi.org/10.1007/978-3-032-20388-5_21\">Towards positive food communication systems</a>, with T. J. Socha et al., in <em>The Palgrave Handbook of Positive Communication for Livable Futures</em> (2026)"
        ]
      },
      {
        heading: "In progress",
        items: [
          "<em>The Blood of a Begonia</em>, a novel (currently querying)",
          "<em>Designing Positive Family Communication</em>, with Thomas Socha (in press)"
        ]
      }
    ]
  },
  {
    slug: "creator",
    article: "a",
    title: "Content Creator",
    letter: "C",
    visibility: "public",
    tagline: "Making the kind of content I also study.",
    summary: "Books, fandom, and the platforms that shape both — made by someone who studies them, too.",
    sections: []
  }
];

/* --------------------------------------------------------------------------
   Shared helpers
   -------------------------------------------------------------------------- */
window.EMH = (function () {
  var KEY = "emh-pass";
  var params = new URLSearchParams(location.search);
  var viaLink = false;

  function bytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }

  function decrypt(pass, box) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(box.salt), iterations: box.iter, hash: "SHA-256" },
          base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      })
      .then(function (key) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(box.iv) }, key, bytes(box.data)); })
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }

  // Try a password against every locked persona; resolves true if anything opened.
  function unlock(pass) {
    var locked = window.LOCKED || {};
    if (!pass || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    var jobs = window.PERSONAS.filter(function (p) { return locked[p.slug] && !p.unlocked; }).map(function (p) {
      return decrypt(pass, locked[p.slug]).then(function (content) {
        Object.assign(p, content);
        p.unlocked = true;
        return true;
      }, function () { return false; });
    });
    return Promise.all(jobs).then(function (r) {
      var ok = r.indexOf(true) >= 0;
      if (ok) { try { sessionStorage.setItem(KEY, pass); } catch (e) {} }
      return ok;
    });
  }

  // On load: a password in the link (?intro=...) or one entered earlier this session.
  var fromLink = params.get("intro");
  var stored = null;
  try { stored = sessionStorage.getItem(KEY); } catch (e) {}
  var ready = unlock(fromLink || stored).then(function (ok) {
    if (fromLink) {
      viaLink = ok;
      params.delete("intro");                       // keep the password out of the address bar
      var q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    }
    return ok;
  });

  function isOpen(p) { return p.visibility === "public" || !!p.unlocked; }
  function isVisible(p) { return p.visibility !== "hidden" || !!p.unlocked; }

  // Wraps [[placeholder]] copy in a visible marker.
  function fill(text) {
    return String(text).replace(/\[\[(.+?)\]\]/g, '<span class="todo">$1</span>');
  }

  return {
    ready: ready, unlock: unlock, isOpen: isOpen, isVisible: isVisible, fill: fill,
    arrivedByLink: function () { return viaLink; }
  };
})();
