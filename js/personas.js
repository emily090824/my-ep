/* ==========================================================================
   Personas — the single place to edit what each rolodex card says.

   visibility:
     "public"    → shown on the rolodex, open to everyone
     "unlisted"  → card appears "sealed" (by introduction only) until the
                   visitor arrives with the intro link, e.g.
                   https://<your-site>/?intro=a-proper-introduction
     "hidden"    → not on the rolodex at all; only the intro link opens it

   Text wrapped in [[double brackets]] renders as a highlighted placeholder
   so it's easy to spot what still needs real copy.
   ========================================================================== */

window.SITE = {
  name: "Emily Maranto Hill",
  // Change this to anything you like, then share links that include it.
  introKey: "a-proper-introduction",
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
      "Strategy, voice, and campaigns grounded in audience research — the same questions I study as a scholar, put to work for brands. [[Add a two-sentence summary of your marketing career.]]",
    sections: [
      {
        heading: "What I do",
        items: [
          "Brand & content strategy",
          "Audience research and social listening",
          "Campaign storytelling across platforms",
          "Community and fandom-driven growth"
        ]
      },
      {
        heading: "Selected work",
        items: [
          "[[Case study — client, challenge, result]]",
          "[[Case study — client, challenge, result]]",
          "[[Case study — client, challenge, result]]"
        ]
      }
    ]
  },
  {
    slug: "executive",
    article: "an",
    title: "Executive",
    letter: "E",
    visibility: "unlisted",
    tagline: "Leadership, by proper introduction.",
    summary:
      "[[Your executive role, company, and the scope you lead. This page is only reachable through your intro link.]]",
    sections: [
      {
        heading: "Current role",
        items: ["[[Title, Company — years]]", "[[Scope: team size, budget, markets]]"]
      },
      {
        heading: "Board-level highlights",
        items: ["[[Highlight]]", "[[Highlight]]", "[[Highlight]]"]
      }
    ]
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
          "Hill, E. M. (2025). <em>Reading the Romance Reader: BookTok, Algorithmic Subjugation, and the Fight for Cultural Legitimacy.</em> MA thesis, Old Dominion University. <a href=\"https://doi.org/10.25777/67hyyr98\">DOI: 10.25777/67hyyr98</a>",
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
          "M.A., Old Dominion University, 2025 — Summa Cum Laude",
          "B.M.C., Louisiana State University, 2021 — Summa Cum Laude; Distinguished Communicator Award"
        ]
      }
    ]
  },
  {
    slug: "writer",
    article: "a",
    title: "Writer",
    letter: "W",
    visibility: "public",
    tagline: "Books, essays, and the romance of a good sentence.",
    summary: "[[A short author bio — what you write, for whom, and what's next.]]",
    sections: [
      {
        heading: "Books",
        items: ["[[Title — year, publisher, one-line pitch]]"]
      },
      {
        heading: "Essays & features",
        items: ["[[Piece — outlet, year]]", "[[Piece — outlet, year]]"]
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
    summary: "[[Where you post, what you make, and who's watching.]]",
    sections: [
      {
        heading: "Channels",
        items: ["[[Platform — @handle — audience]]", "[[Platform — @handle — audience]]"]
      },
      {
        heading: "Featured",
        items: ["[[Series or post — link]]", "[[Brand collaboration]]"]
      }
    ]
  }
];

/* --------------------------------------------------------------------------
   Shared helpers
   -------------------------------------------------------------------------- */
window.EMH = (function () {
  var KEY = "emh-intro";

  function hasIntro() {
    var params = new URLSearchParams(location.search);
    var given = params.get("intro");
    if (given && given === window.SITE.introKey) {
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      return true;
    }
    try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  // Wraps [[placeholder]] copy in a visible marker.
  function fill(text) {
    return String(text).replace(/\[\[(.+?)\]\]/g, '<span class="todo">$1</span>');
  }

  return { hasIntro: hasIntro, fill: fill };
})();
