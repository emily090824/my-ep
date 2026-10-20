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
          "Hill, E. M. (2025). <a href=\"https://digitalcommons.odu.edu/communication_etds/35/\"><em>Reading the Romance Reader: BookTok, Algorithmic Subjugation, and the Fight for Cultural Legitimacy.</em></a> MA thesis, Communication &amp; Theatre Arts, Old Dominion University. <a href=\"https://doi.org/10.25777/67hy-yr98\">DOI: 10.25777/67hy-yr98</a>",
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
    pageTitle: "Emily Elizabeth Hill · The Blood of a Begonia",   // the browser tab, in place of "Emily as a Writer"
    // a banner above the page: the call for advance readers of the novel
    promo:
      '<div class="arc-page">' +
      '<section class="arc" aria-labelledby="arc-title">' +
        '<div class="arc__inner">' +
          '<figure class="arc__book"><div class="book3d">' +
            '<div class="book3d__front"><img src="assets/blood-of-a-begonia.jpg" width="600" height="777" alt="The Blood of a Begonia by Emily M. Hill: a botanical print of a begonia, the title on a cream label"></div>' +
            '<div class="book3d__spine" aria-hidden="true"><span class="book3d__spine-title">The Blood of a Begonia</span><span class="book3d__spine-author">Emily M. Hill</span></div>' +
          '</div></figure>' +
          '<div class="arc__copy">' +
            '<p class="arc__lead">Sign up to be an<br> <abbr title="advance reader copy">ARC</abbr> reader of</p>' +
            '<h2 class="arc__title" id="arc-title">The Blood of<br> a&nbsp;Begonia</h2>' +
            '<button class="arc__btn" type="button" data-open="arc-signup">Sign up</button>' +
            '<p class="arc__count" data-arc-count hidden>Join the <span class="arc__count-n">0</span> other ARC readers excited to read <abbr title="The Blood of a Begonia">TBOAB</abbr></p>' +
          '</div>' +
        '</div>' +
      '</section>' +
      // a line from the novel
      '<section class="arc-quote" aria-label="From the novel">' +
        '<blockquote>' +
          '<p>I must be untangled from these three people; untangled from the man inside of me and outside of me, and the woman between&nbsp;them.</p>' +
          '<footer>The Blood of a Begonia</footer>' +
        '</blockquote>' +
      '</section>' +
      // the back of the book
      '<section class="arc-sheet arc-blurb" aria-labelledby="blurb-title">' +
        '<p class="arc-sheet__kicker" id="blurb-title">About the book</p>' +
        '<p class="arc-blurb__hook">Meredith Moran would do almost anything to save her country-club life in 1999&nbsp;Mississippi.</p>' +
        '<p class="arc-blurb__hook arc-blurb__hook--2">A foursome with her husband, her former lover, and his new wife is asking a&nbsp;lot.</p>' +
        '<div class="arc-blurb__body" data-collapse="Read the full summary">' +
        '<div class="arc-blurb__col">' +
        '<p>Once a promising artist, Meredith, spends her days burning the latest <em>Southern Living</em> recipes, overpruning her begonias, and painting mediocre florals. Her inspiration has dried up, and so has her marriage to John, an amputee veteran whose disability checks sustain their lavish lifestyle. When Austin Thomas, the college lover who abandoned her, and newly elected politician, moves next door with his wife, Meredith wants answers, and she fears she&rsquo;ll want him, too.</p>' +
        '<p>When John starts bouncing checks, Meredith discovers mountains of debt that threatens their lifestyle, and he has already promised a generous donation to the country club&rsquo;s annual gala and silent auction. Meredith&rsquo;s paintings could fulfill his promise and keep their ruin behind manicured hedges for a bit longer. But her middling florals won&rsquo;t do.</p>' +
        '</div><div class="arc-blurb__col">' +
        '<p class="arc-blurb__turn">Luckily, her muse is just next door.</p>' +
        '<p>Meredith dips her brush in sin, and painting her fantasies of Austin produces the best work of Meredith&rsquo;s life. It also draws the two couples into an intimacy she finds increasingly difficult to control. As John stakes their future on her canvases, Austin assumes a claim on her talent, and Eleanora&rsquo;s affection becomes an invitation with troubling expectations, Meredith begins to question whether the life her paintings could save is one she still wants.</p>' +
        '<p>And when the others decide desire entitles them to more than a place on her canvas, saving appearances may cost Meredith the one thing she has never learned to call her own: <em>herself</em>.</p>' +
        '</div></div>' +
        '<p class="arc-blurb__comps"><span class="sc">The Blood of a Begonia</span> combines the marital disillusionment of Jessica Anthony&rsquo;s <em>The Most</em>, the exploration of art and unequal intimacy in Ursula Villarreal-Moura&rsquo;s <em>Like Happiness</em>, and the Southern Gothic homecoming and fraught mother-daughter reconciliation of Thao Thai&rsquo;s <em>Banyan Moon</em>.</p>' +
        '<div class="arc-sheet__cta">' +
          '<p>Read it before anyone else.</p>' +
          '<button class="arc__btn arc__btn--dark" type="button" data-open="arc-signup">Sign up</button>' +
          '<p class="arc__count" data-arc-count hidden>Join the <span class="arc__count-n">0</span> other ARC readers excited to read <abbr title="The Blood of a Begonia">TBOAB</abbr></p>' +
        '</div>' +
      '</section>' +
      // meet the author
      '<section class="arc-sheet arc-author" aria-labelledby="author-title">' +
        '<figure class="arc-author__portrait"><img src="assets/headshot.jpg" alt="Emily M. Hill" loading="lazy"></figure>' +
        '<div class="arc-author__text">' +
          '<p class="arc-sheet__kicker">Meet the author</p>' +
          '<h2 class="arc-author__name" id="author-title">Emily M. Hill</h2>' +
          '<p>I&rsquo;m a Southern belle like Meredith, drawn to how the Deep South demands much and gives little, especially to women. I wrote this novel after a quarter-life crisis brought me home, where I kept asking the question at Meredith&rsquo;s center: how can a woman claim her desires and ambitions as her own in a culture that insists they serve men and God?</p>' +
          '<p>A marketing professional with over eight years of experience, I earned my master&rsquo;s at Old Dominion University, where <a href="https://digitalcommons.odu.edu/communication_etds/35/" rel="noopener">my thesis</a> explored BookTok and community agency and how readers discover books. I also teach audiences, media analysis, and pop culture as an adjunct professor at ODU.</p>' +
        '</div>' +
      '</section>' +
      '</div>' +
      // the rest of the writing: the thesis in full, then the other published pieces
      '<section class="works" aria-labelledby="works-title">' +
        '<header class="works__head"><p class="kicker">Read me</p><h2 id="works-title">Other Published Work</h2></header>' +
        '<article class="thesis">' +
          '<div class="thesis__head"><div>' +
          '<p class="works__label">Master&rsquo;s thesis &middot; 2025</p>' +
          '<h3 class="thesis__title"><a href="https://digitalcommons.odu.edu/communication_etds/35/" rel="noopener">Reading the Romance Reader: BookTok, Algorithmic Subjugation, and the Fight for Cultural Legitimacy</a></h3>' +
          '<p class="works__cite">Hill, E. M. (2025). Master of Arts thesis, Communication &amp; Theatre Arts, Old Dominion University. <a href="https://doi.org/10.25777/67hy-yr98" rel="noopener">DOI: 10.25777/67hy-yr98</a></p>' +
          '</div>' +
          '<aside class="thesis__side">' +
              '<a class="btn btn--solid thesis__read" href="https://digitalcommons.odu.edu/communication_etds/35/" rel="noopener">Read the thesis</a>' +
              '<div class="thesis__metrics" hidden>' +
                '<h4>Readership</h4>' +
                '<plumx-widget type="artifact" identifier-type="doi" identifier="10.25777/67hy-yr98" display="badge" site="plumx" theme="liberty" config=\'{"hideWhenEmpty":true,"popupDirection":"right","printSize":"large","detailsLinkBaseUrl":"https://plumx.elsevier.com/a"}\'></plumx-widget>' +
              '</div>' +
            '</aside>' +
          '</div>' +
          '<div class="thesis__grid">' +
            '<div class="thesis__abstract" data-collapse="Read the full abstract">' +
              '<h4>Abstract</h4>' +
              '<p>This thesis examines the transformation of romance reader identity through the lens of BookTok, investigating how digital platforms grant cultural legitimacy while simultaneously subjugating community practices to algorithmic control. Romance readers historically developed emotional labor practices, counter-public formation strategies, and fan-driven meaning-making to resist decades of cultural marginalization. Through analysis of TikTok&rsquo;s platform attributes, user behaviors, and the viral Tillie Cole controversy, this study traces how BookTok converts these resistant practices into behavioral data optimized for engagement rather than authentic discourse. The research employs theoretical frameworks including Janice Radway&rsquo;s ethnographic analysis, Shoshana Zuboff&rsquo;s surveillance capitalism, Nick Srnicek&rsquo;s platform capitalism, and Nancy Fraser&rsquo;s counterpublic theory to examine three critical dimensions: first, how romance readers developed emotional labor as cultural resistance; second, how TikTok&rsquo;s technological affordances exploit these historical practices; and third, how platform and surveillance capitalism converge to create an algorithmic hive mind that fragments community solidarity. Findings reveal that while romance readers achieve unprecedented mainstream visibility and influence through BookTok, this cultural legitimacy operates within systems fundamentally indifferent to community welfare.</p>' +
              '<p>This transformation has broader implications for participatory cultures in digital spaces, revealing how surveillance capitalism can weaponize communities&rsquo; greatest strengths of emotional authenticity, defensive solidarity, and collective meaning-making into extractable vulnerabilities. The thesis examines how many romance readers navigate tensions between algorithmic visibility and autonomous community practices, arguing that for significant segments of this community, the pursuit of cultural legitimacy has produced not liberation, but new forms of digital containment and subjugation disguised as empowerment.</p>' +
            '</div>' +
          '</div>' +
          '<div class="thesis__defense">' +
            '<h4>The thesis defense</h4>' +
            // a cover card stands in for Canva's viewer, which is heavy; the deck loads only when asked for
            '<div class="embed16x9 deck" data-src="https://www.canva.com/design/DAG1_LjUa2E/Rus8krM1B10mFc2k1P2zYg/view?embed">' +
              '<button class="deck__cover" type="button" aria-label="View the presentation: Reading the Romance Reader, a thesis defense by Emily Hill">' +
                '<img src="assets/thesis-defense-cover-960.jpg" srcset="assets/thesis-defense-cover-960.jpg 960w, assets/thesis-defense-cover.jpg 1920w" sizes="(max-width: 1100px) 100vw, 1000px" width="1920" height="1080" alt="" loading="lazy">' +
                '<span class="deck__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>View the presentation</span>' +
              '</button>' +
            '</div>' +
            '<p class="works__credit"><a href="https://www.canva.com/design/DAG1_LjUa2E/Rus8krM1B10mFc2k1P2zYg/view?utm_content=DAG1_LjUa2E&amp;utm_campaign=designshare&amp;utm_medium=embeds&amp;utm_source=link" target="_blank" rel="noopener">Thesis Defense</a> by Emily Hill</p>' +
          '</div>' +
        '</article>' +
        '<ul class="works__list">' +
          '<li class="works__item--cover"><a class="works__cover" href="https://link.springer.com/chapter/10.1007/978-3-032-20388-5_21" rel="noopener" tabindex="-1" aria-hidden="true"><img src="assets/palgrave-handbook.jpg" width="500" height="753" alt="" loading="lazy"></a><div><p class="works__label">Book chapter &middot; 2026</p><h3><a href="https://link.springer.com/chapter/10.1007/978-3-032-20388-5_21" rel="noopener">Towards Positive Food Communication Systems</a></h3><p class="works__cite">Socha, T. J., Hill, E., et al. (2026). In T. J. Socha (Ed.), <em>The Palgrave Handbook of Positive Communication for Livable Futures</em>. Palgrave Macmillan. <a href="https://doi.org/10.1007/978-3-032-20388-5_21" rel="noopener">DOI: 10.1007/978-3-032-20388-5_21</a></p><p class="works__more"><a href="https://link.springer.com/chapter/10.1007/978-3-032-20388-5_21" rel="noopener">Read the chapter on Springer</a></p></div></li>' +
          '<li><p class="works__label">Book &middot; In press</p><h3>Designing Positive Family Communication <span class="works__with">with Thomas Socha</span></h3><p class="works__cite">Socha, T. J., &amp; Hill, E. Old Dominion University.</p></li>' +
        '</ul>' +
      '</section>' +
      '<dialog class="signup" id="arc-signup" aria-labelledby="signup-title">' +
        '<form class="signup__card" id="arc-signup-form" action="https://script.google.com/macros/s/AKfycbwvI33WBWYR7P89TAl43bahbsJ0EIrwF7M3W-RjgMROPPiN7fM4Gkq_hSx6ZOl4qGVQow/exec" method="POST" target="arc-signup-sink" novalidate>' +
          '<button class="signup__close" type="button" data-close aria-label="Close">&times;</button>' +
          '<p class="signup__lead">Be among the first to read</p>' +
          '<h2 class="signup__title" id="signup-title">The Blood of a&nbsp;Begonia</h2>' +
          '<p class="signup__note">Advance reader copies go out before publication. Leave your name and email and I&rsquo;ll write when yours is ready.</p>' +
          '<div class="signup__row">' +
            '<div class="signup__field"><label for="arc-first-name">First name</label><input id="arc-first-name" name="firstName" type="text" autocomplete="given-name" maxlength="100" required autofocus></div>' +
            '<div class="signup__field"><label for="arc-last-name">Last name</label><input id="arc-last-name" name="lastName" type="text" autocomplete="family-name" maxlength="100" required></div>' +
          '</div>' +
          '<div class="signup__field"><label for="arc-email">Email</label><input id="arc-email" name="email" type="email" autocomplete="email" maxlength="254" required></div>' +
          '<label class="signup__consent"><input name="consent" type="checkbox" value="yes" required><span>I&rsquo;d like to receive an advance reader copy of <em>The Blood of a Begonia</em> and occasional emails from Emily M. Hill about it. I can unsubscribe at any time.</span></label>' +
          '<button class="signup__submit" type="submit">Count me in</button>' +
          '<p class="signup__msg" role="status" aria-live="polite"></p>' +
        '</form>' +
      '</dialog>' +
      // the form posts into this hidden frame, so Google's reply page is never shown
      '<iframe name="arc-signup-sink" title="Sign-up response" hidden></iframe>',
    letter: "W",
    visibility: "public",
    tagline: "Books, essays, and the romance of a good sentence.",
    summary: "Writing about readers, fandom, and the stories communities gather around.",
    sections: []   // the published work is set out in full in the promo above
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
