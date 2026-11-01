# GH Chikkis

Premium public website plus a private `/admin` workspace for a handmade chikki
business in Ahmedabad: enquiries, orders, GST-style invoices, inventory,
expenses, reports, WhatsApp messaging and encrypted backups, all on MongoDB.

Live site: https://gh-chikkis.vercel.app

## Running it locally

1. Install dependencies: `npm install`.
2. Start a MongoDB instance. Either run a local `mongod` or point at an Atlas
   cluster; the app reads exactly two variables, `MONGODB_URI` and `MONGODB_DB`.
3. Copy `.env.example` to `.env.local` and fill in what you need. Everything has
   a working simulation mode, so the app runs with only the two Mongo variables.
4. Seed the catalogue, content, settings and Owner account: `npm run seed`.
   Seeding never overwrites records that already exist.
5. `npm run dev`, then open http://localhost:3000.

Sign in at `/login`. With `DEV_AUTH_ENABLED=true` and a non-production build,
the page offers a development sign-in for the `OWNER_EMAIL` account, so the
workspace is reachable before Google OAuth is configured. In production, sign-in
is Google-only for accounts the Owner has approved, plus the email-and-password
account bootstrapped on first use.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint over the whole repo. |
| `npm test` | Vitest unit tests. |
| `npm run seed` | Creates missing products, content pages, settings, templates and the Owner account. |
| `npm run backup` / `npm run restore` | Encrypted database backup and verified restore. |
| `npm run gmail-auth` | One-time Gmail OAuth refresh token for manual email sending. |

One-off data migrations live in `src/scripts/` and are run directly, with a
preview first:

```bash
npx tsx --env-file-if-exists=.env.local src/scripts/migrate-mamra.ts --dry-run
npx tsx --env-file-if-exists=.env.local src/scripts/migrate-mamra.ts
```

## Layout

- `src/app/(site)/` — public pages: home, collection, product detail, Our Story,
  process, gifting, FAQs, contact, privacy, terms.
- `src/app/admin/` — the workspace, guarded by `src/proxy.ts` and per-page
  permission checks.
- `src/app/api/` — auth callback, cron endpoints, WhatsApp webhook, media and
  export endpoints, `/api/health`.
- `src/lib/` — all data access and business logic. Nothing talks to MongoDB
  outside this folder.
- `src/components/site/` — public UI, including `line-art.tsx`, the hand-drawn
  SVG scenes used by the process steps and the ingredient tiles.

Website copy is editable in the admin under **Website content**. Each page stores
a draft and a published copy, and falls back to the defaults in
`src/lib/content-schema.ts` for any field that has never been saved.

Per-variety **Ingredients** and **Nutritional highlights** are one item per line
and appear publicly only when the variety's "details verified" box is ticked.
`npm run seed` fills those fields where a record has none at all and never
overwrites what was typed in the admin. Mamra Chikki is the one variety the
Owner has not supplied ingredient details for, so it still shows the "ask us and
we will confirm" fallback — that is deliberate, not a bug.

## Brand assets

- Logo: `public/brand/logo.png` is the Owner's badge (background removed). It
  stands alone in the header and replaces the "GH / Chikkis" type lockup,
  because the badge already spells the name; on the dark olive surfaces —
  footer, workspace sidebar, sign-in panel — it rides a paper plate, since its
  own brown fills disappear against the green. Also accepted: `.svg`, `.jpg`,
  `.jpeg`, `.webp`.
- Tab and home-screen icons are crops of the same artwork: the "GH" lettering
  on a brown plate, in `src/app/icon.png` and `src/app/apple-icon.png`.
  Regenerate them from a new badge rather than hand-editing.
- If you swap the logo and the browser still shows the old one, delete
  `.next/dev/cache/images` — the dev server keys that cache by request, not by
  file contents.
- Founder photographs: `public/brand/founder-gopi.jpg` and
  `public/brand/founder-himani.jpg` appear as portraits on Our Story. No file,
  no frame — the page never shows an empty placeholder.
- The couplet *"Gud ki mithaas, Ghee ki richness."* is set once as
  `BRAND_COUPLET` in `src/lib/seo.ts` and appears under the tagline in the
  footer, on the Our Story aside and on the link-preview card. The tagline has
  two sources that must agree: `BRAND_TAGLINE` (page metadata and the card) and
  the editable copy in **Admin › Settings** (the footer).
- Per-variety ingredient lists are supplied by the business and entered in
  **Admin › Products**, where each product has an "ingredients verified" tick
  before the detail shows publicly.
- Business email, Instagram URL and Google review link live in
  **Admin › Settings › Business details** and render in the footer "Reach us"
  list. Blank means the link is hidden, so nothing half-finished shows up.
- Google reviews: enter the business's Google Place ID in **Admin › Settings**,
  tick "Show Google reviews on the website" and set
  `GOOGLE_PLACES_API_KEY`. Until then the band renders nothing — the site never
  shows an invented review. The `g.page/r/…/review` share link is not enough to
  find it: that code decodes to the internal listing number, not a Place ID.
  Open the listing in Google Maps and copy the `ChIJ…` part of its URL.

## Deploying

Vercel (Hobby) plus MongoDB Atlas is the current setup. Two constraints matter:

- Vercel bakes environment variables into the build, so a changed variable needs
  a redeploy, not a restart.
- The filesystem is read-only and wiped between invocations, so in-app backups
  cannot persist there; Atlas continuous backups is the real disaster-recovery
  path for that host.

Set `APP_URL` to the exact canonical origin — it feeds OAuth callbacks,
canonicals, the sitemap and robots.txt. Without it, production falls back to
`VERCEL_PROJECT_PRODUCTION_URL`.

`GET /api/health` reports `{"status":"ok","database":"connected"}` or a
secret-free reason (`malformed_uri`, `dns`, `unreachable`, `auth`) when the
database layer is broken.
