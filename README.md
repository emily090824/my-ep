# Emily Maranto Hill — ePortfolio

A static site (plain HTML/CSS/JS, no build step) built around a rolodex of personas.

```
index.html          Parent page: the desk scene, then About, Links, Read Me, Press, Contact
persona.html        One template for every persona page (persona.html?p=academic)
contact.html        Don't Be a Stranger: the desk from above, personnel file + contact cards
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

## Contact page
`contact.html` is plain HTML: edit the email, location, working style and social links there.
TikTok and YouTube links are placeholders marked `data-todo`; replace `href="#"` with your URLs.
The desk background is `assets/walnut.jpg`, rendered from the same painter as the 3D desk.

## Placeholders
Copy wrapped in `[[double brackets]]` in `js/personas.js` (and `<span class="todo">` in
`index.html`) shows with a green highlighter so you can see what still needs writing.

## Password-protected personas (the Executive card)
Each persona in `js/personas.js` has a `visibility`:

| value    | Rolodex                          | Persona page        |
|----------|----------------------------------|---------------------|
| `public` | Normal card                      | Open                |
| `locked` | Card shown with a lock           | Asks for a password |
| `hidden` | Not shown until unlocked         | Asks for a password |

A locked page's content is encrypted (AES-256-GCM, key derived from the password), so it
cannot be read from the site's source. The readable version lives in `private/<slug>.json`,
which is git-ignored and never published. To change the content or the password:

```
# edit private/executive.json, then
node tools/lock.mjs <new-password>      # rewrites js/locked.js
```

Visitors open the card by typing the password, or through a direct link that carries it:
`https://<your-site>/?intro=<password>` (the Rolodex rolls straight to the card and stamps it
"Hand-delivered"; the password is removed from the address bar). Once unlocked it stays open
for that browser session.

## Publishing
Any static host works. For GitHub Pages: repo Settings → Pages → deploy from this branch, root folder.
