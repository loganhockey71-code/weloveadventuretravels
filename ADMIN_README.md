# Site Admin Panel

Lets Victoria edit every page's text and images — and add or remove offer cards,
testimonials, and travel cards — without touching any code.

## First-time setup (do this once)

```
npm install
npm run setup
```

`npm run setup` will ask for an admin username and password. This is a one-time
step — it creates a local `admin/.auth.json` file (never committed to git).

To connect publishing to the live Netlify site, see [NETLIFY_SETUP.md](NETLIFY_SETUP.md).
The admin panel works fully without it — edits just won't go live until it's
connected.

## Running it

```
npm start
```

- Public site: http://localhost:3012
- Admin panel: http://localhost:3012/admin

For real use, this needs to run on a machine/server that stays on (not just
your laptop) so the admin panel is reachable whenever Victoria wants to log in.

## How it works

- Every page's content lives in `content/*.json`. Editing through the admin
  panel changes these files — never the HTML directly — so the layout can't break.
- Saving re-generates the actual `.html` files from `templates/*.hbs` +
  the content JSON, and commits the change to a local git history automatically.
- **History & rollback**: each page has a "History" link showing every past save.
  Any version can be restored with one click — nothing is ever permanently lost.
- **Publish**: the admin dashboard has a "Publish to Live Site" button that
  pushes the current pages to Netlify directly (see NETLIFY_SETUP.md).
- Images are set by pasting a direct image link (URL) into a field —
  the editor checks that the link actually loads an image before you save,
  and shows a preview.

## What Victoria can and can't do

She can: edit all text and images on every page, add/remove/reorder offer
cards, testimonials, and travel cards, and add extra images to any gallery-style
section.

She can't: edit raw HTML/CSS, or restructure the page layout — that's by
design, so nothing can visually break.
