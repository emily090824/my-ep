# Emily Maranto Hill — ePortfolio

A static site (plain HTML/CSS/JS, no build step) built around a rolodex of personas.

```
index.html          Parent page: the desk scene, then About, Links, Read Me, Press, Contact
persona.html        One template for every persona page (persona.html?p=academic)
js/personas.js      ← edit this: every card's text, icon, and visibility
js/desk/scene.js    The 3D desk: Rolodex, lamp, window, props, camera, controls
js/desk/textures.js Everything painted procedurally: walnut, plaster, sky, card faces
css/styles.css      Palette (brown · ivory · green) and type
vendor/             three.js and the web fonts, self-hosted (no CDN needed)
assets/             Put your headshot here as headshot.jpg
```

## The desk
The homepage hero is a real-time 3D scene (three.js): a green enamel rotary Rolodex on a walnut
desk at night. A floral stained-glass Tiffany lamp glows against the window, the city skyline is lit
up outside, and an open laptop shows a project board (the remote office). Your headshot sits
in an ornate antique-gold frame. Depth of field, bloom and film grain finish the look.
Card faces are drawn from `js/personas.js`, so editing a persona there updates its card.
Visitors can drag the cards, scroll over them, click a knob, or use the buttons under the
Rolodex. On phones the heavier effects are turned down automatically; without WebGL, the
buttons still work.

## Preview locally
```
python3 -m http.server
```
then open http://localhost:8000

## Adding your headshot
Save a portrait (roughly 4:5) as `assets/headshot.jpg`. It appears in the picture frame on the
desk. Until then a monogram placeholder shows.

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
