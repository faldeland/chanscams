# Chans Cams — Cinema Rental Site

A simple, professional, cinematic single-page site for a small film camera & equipment rental house. Built with plain HTML, CSS, and vanilla JavaScript so it can be hosted anywhere (Netlify, Vercel, GitHub Pages, S3, a regular web host) with zero build step.

## What's included

- **Hero + value prop** for indie studios and filmmakers
- **Equipment catalog** with category filters, search, and per-item daily rental rates
- **Per-item scheduling calendar** with two-month side-by-side view, range selection, conflict detection, and live price breakdown
- **Discount rule engine** supporting weekday patterns, weekend specials, date ranges, specific dates (holidays/surcharges), and length-based rules with priority-based stacking
- **Rental cart drawer** that uses per-item dates when set, or falls back to a global day-count
- **Admin panel** with full CRUD for bookings, discount rules, and blackouts (`#admin` URL or `Ctrl/Cmd + Shift + A`)
- **Quote request form** that mirrors the cart contents with itemized pricing
- **Process / About / Contact / Footer** sections
- **Persistent data** via `localStorage` (cart, bookings, discount rules, blackouts) — production-ready to swap for a real API
- Fully responsive, accessible (semantic landmarks, aria labels, keyboard-dismissable drawer/modals)
- No frameworks, no build pipeline — just open `index.html`

## File structure

```
chanscams/
├── index.html              # all page sections
├── styles.css              # dark cinematic theme, responsive
├── script.js               # catalog, filtering, cart, quote form
├── data/
│   ├── equipment.js        # CATEGORIES + EQUIPMENT inventory
│   └── scheduling.js       # default discount rules + sample bookings + blackouts
├── modules/
│   ├── engine.js           # pricing engine + state (localStorage abstraction)
│   ├── calendar.js         # per-item availability calendar (modal)
│   └── admin.js            # admin panel (bookings · rules · blackouts · settings)
├── server.js               # Node static-file server (Railway entrypoint)
├── package.json            # deps + start script
├── railway.json            # Railway build/deploy config
├── .nvmrc                  # Node version pin (20)
├── .gitignore
└── README.md
```

## Run it locally

```powershell
cd chanscams
npm install
npm run dev
# open http://localhost:3000
```

You can also just double-click `index.html` to open it in a browser — everything works without a server because the data file is loaded as a regular `<script>`.

## Deploy to Railway

This site is configured to deploy on [Railway](https://railway.com) out of the box using their Nixpacks builder. There is no build step — Railway just installs `serve` and runs it bound to the platform-provided `$PORT`.

### 1. Push the folder to GitHub

```powershell
cd chanscams
git init
git add .
git commit -m "Initial Chans Cams site"
git branch -M main
git remote add origin https://github.com/<your-user>/chancams.git
git push -u origin main
```

### 2. Create the Railway project

1. Go to https://railway.com/new and choose **Deploy from GitHub repo**.
2. Pick your `chancams` repository.
3. Railway will auto-detect Node via `package.json`, install `serve`, and run `npm start`.
4. Click **Generate Domain** in the service's Settings → Networking to get a public URL (Railway will assign `*.up.railway.app`).

### 3. (Optional) Custom domain

In the Railway service settings, **Networking → Custom Domain**, add your domain and follow the CNAME instructions.

### How it works

- `server.js` is a ~30-line Node 18+ static file server using [`serve-handler`](https://github.com/vercel/serve-handler). It binds to `0.0.0.0` and reads `process.env.PORT` (Railway provides this automatically; locally it falls back to `3000`). It also sets sensible cache headers (HTML revalidated, static assets cached 24h) and handles SIGTERM cleanly so Railway's zero-downtime deploys work.
- `package.json` declares `serve-handler` as the only dependency and runs `node server.js` as the start command.
- `railway.json` pins the builder to Nixpacks and adds a basic health check on `/` so Railway can detect crashes and restart.
- `.nvmrc` pins Node 20 so builds are reproducible.

### Railway CLI alternative

If you prefer deploying directly from your machine without GitHub:

```powershell
npm i -g @railway/cli
railway login
railway init
railway up
```

### Troubleshooting

- **502 / "Application failed to respond"** — means the app isn't binding to `0.0.0.0` or isn't using `$PORT`. Both are handled in `server.js`; don't change `HOST` from `"0.0.0.0"` or hardcode the port.
- **Build picks the wrong builder** — `railway.json` forces Nixpacks. Delete the file only if you want Railway to auto-detect.
- **Want a Dockerfile instead?** Set `"builder": "DOCKERFILE"` in `railway.json` and add a `Dockerfile`. Not needed for this site.

## Customizing the inventory

All gear lives in `data/equipment.js`. Each item:

```js
{
  id: "unique-slug",                 // used by the cart
  name: "Display name",
  category: "camera",                // must match a CATEGORIES id
  mount: "Leica L",                  // optional
  retail: 5495,                      // dollars
  daily: 175,                        // dollars / day
  weeklyMultiplier: 4,               // 5+ days = N × daily per week
  tagline: "One-line hook",
  summary: "Longer prose for future detail page",
  specs: ["Bullet 1", "Bullet 2"],   // first 4 are shown on the card
  badge: "Hero Camera",              // optional pill on the visual
  url: "https://..."                 // canonical product link
}
```

Add or remove items, run the page — no rebuild needed.

### Adjusting rental rates

Industry rule of thumb is 3–5% of retail per day; smaller consumable-feeling items (media, batteries) can run higher. The starter rates already reflect that.

### Adding categories

Append to `CATEGORIES` and (if it's a brand-new icon) add an entry to the `ICONS` map in `script.js`. Each card draws its visual from the inline SVG so there are no images to manage.

## Scheduling, calendar, and discounts

Every item has a **Dates** button on its catalog card that opens a per-item availability calendar:

- Two months side-by-side (one month on mobile) with prev/next navigation
- Day cells visualize: available · booked · maintenance · discount · surcharge · selected range
- Click once to set the pickup date, click again to set the return date
- Booked or blackout dates are non-selectable; an attempted range that crosses one is rejected with a warning
- A live price breakdown below the calendar shows the per-day rate, which discount/surcharge was applied, the subtotal, the long-rental discount, and the final total

Adding a booking from the calendar attaches those dates to the cart line. The cart drawer then prices each line individually using the engine; items without dates fall back to the global "days" selector.

### Discount rule types

| Type            | Use case                                  | Fields                            |
|-----------------|-------------------------------------------|-----------------------------------|
| `dayOfWeek`     | "20% off Mon–Thu", "Weekend special"      | `days: [1,2,3,4]` (0=Sun…6=Sat)   |
| `dateRange`     | Off-season pricing, seasonal sales        | `start`, `end` (ISO YYYY-MM-DD)   |
| `specificDates` | Holidays (positive for off, negative for surcharge) | `dates: ["2026-12-25", …]` |
| `length`        | Long-rental discounts (e.g. 5+ days)      | `minDays`                         |

Each rule also carries:

- `discountPercent` — positive for a discount, **negative for a surcharge**
- `priority` — when multiple rules apply on the same day, the highest priority wins
- `appliesTo` — `"all"`, `"category:<id>"`, a single item id, or an array of item ids
- `active` — toggle without deleting
- `color` — color used for the calendar badge and rule pill

### Bookings & blackouts

- **Bookings** represent confirmed customer rentals. They block the underlying dates from being selected by the calendar.
- **Blackouts** are admin-only unavailable windows (maintenance, calibration, internal use). They behave like bookings but are kept separate in the data model.

## Admin panel

Access methods:

- Navigate to `https://yoursite/#admin`
- Click the discreet **Admin** link in the footer
- Keyboard shortcut **`Ctrl/Cmd + Shift + A`**

> The admin panel is currently public for demo purposes. Before going live, gate it behind your auth layer — e.g. an HTTP basic-auth check in `server.js`, a session cookie, or by hiding the route entirely and mounting it at a secret path on a private subdomain.

Tabs:

- **Bookings** — list/create/edit/delete customer bookings with item, dates, customer, status, notes
- **Discount Rules** — list/create/edit/delete/toggle rules (forms adapt to the chosen rule type)
- **Blackouts** — block specific items for specific dates with an internal reason
- **Settings** — quick stats and a "reset to demo defaults" action

All admin edits trigger an in-page rerender of the catalog, cart, and any open calendar.

### Moving the admin to a real backend

Right now the engine reads/writes localStorage. To move to a server-backed admin:

1. Build an API with endpoints for bookings, rules, and blackouts (REST or GraphQL).
2. In `modules/engine.js`, replace the `load`/`save` helpers' `localStorage` calls with `fetch()` against your API. The downstream code (`getBookings`, `setBookings`, etc.) doesn't change.
3. Optionally make the getters async and update callers to `await` them.

The component boundary is intentional: calendar + catalog never touch storage directly — they go through `Engine.state`.

## Brand & design notes

- **Theme**: deep charcoal (`#0a0a0c`) with a warm cinematic amber accent (`#f4b740`) — evokes film-stock grading without feeling retro.
- **Type**: `Space Grotesk` for display + `Inter` for UI/body. Loaded from Google Fonts.
- **Iconography**: inline SVGs in `script.js` so categories don't depend on external image assets. Swap them for product photos when ready.

## Product images

Each item in `data/equipment.js` has an `image` field pointing to a file under
`images/products/<item-id>.jpg`. The starter set ships with royalty-free
category-appropriate photos from [Unsplash](https://unsplash.com) (Unsplash
License — free for commercial use, no attribution required). To swap one for
a real product shot:

1. Drop a new JPG/PNG/WebP into `images/products/` (or anywhere under the site
   root) using the same filename, **or**
2. Edit the `image` field on the item in `data/equipment.js` to point at the
   new file or a fully-qualified URL.

The catalog cards render `<img>` inside `.card__visual` with a `loading="lazy"`
hint and an `object-fit: cover` crop. If an image fails to load, the original
SVG category icon shows through as a graceful fallback.

## Roadmap (easy next steps)

1. **Swap the starter photos.** Replace the Unsplash placeholders in `images/products/` with real photos of your inventory (same filename, no other changes needed).
2. **Detail pages.** The existing `summary`, `specs`, and `url` fields are ready to power per-item pages. Generate them at build-time from the same data file.
3. **Wire up the quote form.** Currently it validates and stores the request to `localStorage`. Point it at Formspree, Resend, your own API, or an `<a href="mailto:">` fallback.
4. **Insurance & policy pages.** Add `/insurance.html` and `/policies.html` linked from the footer.
5. **SEO.** Replace the title/description in `index.html`, add `og:` tags and a sitemap.

## Deploying

- **Netlify / Vercel**: drag the `chanscams/` folder onto the dashboard, or `vercel deploy`.
- **GitHub Pages**: push the folder to a repo, enable Pages on the branch.
- **S3 / Cloudflare Pages / any static host**: upload the four files + `data/` directory.

That's it — no environment variables, no databases, no servers required to ship a v1.
