# Emily Maranto Hill — ePortfolio

A static site (plain HTML/CSS/JS, no build step) built around a rolodex of personas.

```
index.html        Parent page: headshot, rolodex, About, Links, Read Me, Press, Contact
persona.html      One template for every persona page (persona.html?p=academic)
js/personas.js    ← edit this: every card's text, icon, and visibility
js/rolodex.js     The flip-file animation and controls
css/styles.css    Palette (brown · ivory · green) and type
assets/           Put your headshot here as headshot.jpg
```

## Preview locally
```
python3 -m http.server
```
then open http://localhost:8000

## Adding your headshot
Save a portrait (roughly 4:5) as `assets/headshot.jpg`. Until then a monogram placeholder shows.

## Placeholders
Copy wrapped in `[[double brackets]]` in `js/personas.js` (and `<span class="todo">` in
`index.html`) shows with a green highlighter so you can see what still needs writing.

## Showing personas only to certain people
Each persona in `js/personas.js` has a `visibility`:

| value      | Rolodex                                     | Persona page |
|------------|---------------------------------------------|--------------|
| `public`   | Normal card                                 | Open         |
| `unlisted` | Sealed "By introduction" card               | Only with the intro link |
| `hidden`   | Not shown at all                            | Only with the intro link |

The intro link is your site address plus `?intro=` and the `introKey` in `js/personas.js`:

- `https://<your-site>/?intro=a-proper-introduction` — the rolodex rolls straight to the
  executive card, stamped "Hand-delivered"
- `https://<your-site>/persona.html?p=executive&intro=a-proper-introduction` — straight to the page

Once someone opens an intro link, it's remembered for the rest of their browser session.

**Note:** this is "unlisted", not password protection. Anyone reading the page source can see
the key and the text. For genuinely confidential content, use your host's password protection
(e.g. Netlify or Cloudflare Access) on that page.

## Publishing
Any static host works. For GitHub Pages: repo Settings → Pages → deploy from this branch, root folder.
