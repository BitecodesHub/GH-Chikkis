# Upgrade plan — speed, order desk, expenses, brand

Twelve owner messages arrived after the performance request (2026-11-01, 19:08–19:50). They were
recovered from the local chat store, so this plan covers them verbatim rather than from thumbnails.

## About the model request

You asked for the work to be done on **qwen3.8 Flash**. That model is not available in this
install:

- The only agent on this device is `agent:default` ("Qoder · 192.68.1.104") with `model: null`, so
  it runs on this conversation's model.
- `create_chat_session` has no model parameter — its own schema says the new conversation
  "keeps this conversation's model".
- The BYOK catalog (`byok_model_profiles`) is empty. The stored model keys are: `auto`,
  `ultimate`, `fast`, `efficient`, `smodel`, `cmodel`, `qmodel_38max`, `qfmodel`, `gmodel`,
  `gfmodel`, `kmodel_latest`, `kmodel`, `dmodel`, `dfmodel`, `mmodel`. The nearest Qwen entry is
  `qmodel_38max`; there is no Flash variant.

So the work is executed here. If you want it on a specific model, switch the picker in this
conversation's composer, or create a custom Agent in Settings with that model key and I will
delegate to it.

---

## Batch A — performance

`src/lib/read-cache.ts` is the shared read-through cache (in-flight dedup, prefix invalidation,
priming) with five tests. Settings, content, products and reviews now sit behind it.

| # | Change | Files | Done when |
|---|---|---|---|
| A1 | Wire the shared read-through cache: `getSettings` behind `readThrough("settings")`, `updateSettings` calls `invalidateReads("settings")` | `src/lib/settings.ts:55,83` | 1 settings read per page, not 3; admin save is reflected on the next request |
| A2 | Same for content: `readThrough("content:<page>")`, invalidated by the content publish/save actions | `src/lib/content.ts`, `src/app/admin/content/*` | Publish shows within the TTL and immediately for the editor |
| A3 | Take the preview cookie off the read path — the DB query no longer waits on `cookies()` | `src/lib/content.ts` | No serial waterfall before the first fetch |
| A4 | One query for home's two pages (`$in: ["home","process"]`) instead of two `findOne`s | `src/lib/content.ts`, `src/app/(site)/page.tsx:40` | Home issues one content read |
| A5 | ~~Remove `force-dynamic` from the public layout~~ — removed, but the build log was unchanged: `cookies()` in `getPreviewingContent` and `headers()` for the CSP nonce already force dynamic. The cache in A1/A2 is what actually paid | `src/app/(site)/layout.tsx` | done, no measurable effect |
| A6 | ~~Drop the `npm run indexes` claim or add the script — `ensureIndexes` is now fire-and-forget~~ **Done:** the script exists, `npm run build` runs it as `prebuild`, and `getDb` no longer queues 28 index commands behind a cold instance's first request | `package.json`, `src/lib/db.ts` | Build log prints `Indexes ready in <db>` |
| A7 | `GoogleReviews` no longer blocks the render: settings read cached, Places refresh moved to a revalidating route, awaited `updateOne` removed from the request | `src/components/site/google-reviews.tsx` | Home TTFB independent of the Google API |
| A8 | Memoize the brand file probe (5–10 `existsSync` per request, three callers per page) | `src/lib/brand.ts` | One probe per 30 s, not per request |
| A9 | ~~Project only the fields `/collection/[slug]` renders~~ — skipped: with A1/A2 in place the extra bytes measured under a millisecond and the projection broke the inactive-product `notFound()` path | `src/app/(site)/collection/[slug]/page.tsx` | not done, deliberately |
| A10 | Cache the `Intl.DateTimeFormat` used by `businessToday()` | `src/lib/dates.ts` | No formatter built per call |
| A11 | ~~Shrink `public/brand/logo.png` (626 KB)~~ — dropped: `wordmark.tsx` renders it through `next/image`, so browsers never fetch the original. Only the raw file on disk is large | `public/brand/` | not done, deliberately |
| A12 | Keep heavy admin code out of the shared chunk (recharts, exceljs, pdf-lib are route-only) | admin routes/components | Public first-load JS does not grow |

**Measured after A1–A4, A7–A8, A10** (production build, local Atlas-compatible `mongod`): home
first request 178 ms, then 8–14 ms for every public page (`/`, `/collection`, `/our-story`,
`/process`, `/gifting`, `/faqs`, `/contact`). Before the cache, home was ~205 ms warm and each page
re-read settings and content on every request.

**Gate:** `npx tsc --noEmit`, `npx eslint src --max-warnings=0`, `npx vitest run`, `npm run build`,
plus before/after timings from a headless-Chrome script against `/`, `/collection`, `/our-story`.

## Batch B — order desk (the biggest change)

Owner's model is the Melt.Co "Create New Order" sheet: name + phone, product rows with a photo,
`− + ×` controls, total, payment. Nothing else.

| # | Change | Files | Done when |
|---|---|---|---|
| B1 | Delete the "Delivery & dates" card: method, charge, expected date and delivery notes. Order date defaults to today; one notes field survives | `src/components/admin/order-form.tsx:502-592`, `src/lib/orders.ts:281-290`, `src/lib/types.ts:251` | No delivery fields render or validate; existing orders still open |
| B2 | Delete the customer "Address" card (line 1/2, city, state, PIN, label) | `src/components/admin/customer-form.tsx:140-215`, `src/lib/types.ts:100`, `src/lib/customers.ts:51-65` | No address inputs anywhere in admin |
| B3 | Replace the Variety `<select>` with photo tiles — the Varieties-row pattern: thumb, name, packaging, tap to add | `src/components/admin/order-form.tsx:373-388`, product media | Adding a line is one tap |
| B4 | Compact each line to: thumb · name/packaging · Qty · ₹ · `− + ×`. Weight, rate and adjustment move behind a "details" disclosure; the ₹/g maths stays identical | `src/components/admin/order-form.tsx:336-500` | A 3-line order fits one screen with no scrolling |
| B5 | "Delete order" next to "Edit order" on the order detail page, with a type-to-confirm and an audit entry | `src/app/admin/orders/[id]/page.tsx:236`, `src/app/admin/orders/actions.ts`, `src/lib/orders.ts` | A mis-keyed order can be removed in one action |
| B6 | Quick-order sheet reachable from the dashboard "New order" button | `src/app/admin/page.tsx`, new client component under `src/components/admin/` | 60–70 orders can be logged without leaving the dashboard |

Data written before this change is not rewritten; the removed fields become unread rather than
deleted from the database.

B1–B5 shipped and verified in the browser: two taps on one tile fill a single line at qty 2, the
₹60 total saves as `GH-1`, the repeat-customer chip appears on the next new order, a wrong
confirmation is refused and the right one deletes with an audit entry. B6 shipped as the "Order
again" chip row on the picker rather than a second modal — the desk already opens in one click and
a modal would hide the form below it.

## Batch C — expenses and reports

| # | Change | Files | Done when |
|---|---|---|---|
| C1 | Remove the "Inventory on hand" panel from Reports | `src/app/admin/reports/page.tsx:483-516` (and the `lg:grid-cols-2` at :428) | Reports shows no stock list |
| C2 | Keep today's free-form sheet as **Other expense** | `src/components/admin/expense-form.tsx`, `src/app/admin/expenses/new/page.tsx` | The old form is still reachable and labelled |
| C3 | Add the fixed raw-material mode: 3×3 cm photo tiles (groundnut, jaggery, ghee, til, coconut, dry fruit, daliya, packaging, sticker), each with editable volume (`kg/g/litres/ml/pieces/packs` from `INVENTORY_UNITS`) and price | `src/app/admin/expenses/new/`, `src/lib/inventory.ts:384-458` (`recordPurchase`) | A stock buy is tile → quantity → price → save, and still writes the linked `PURCHASE` expense |
| C4 | Record-expense entry from the order desk | `src/app/admin/expenses/actions.ts:23-46` | Reachable where the owner works |

C1–C4 shipped and verified: Reports no longer lists stock, the expense desk opens on
"Raw material or packaging" with one tile per inventory item (quantity carries the item's own unit,
price and date sit beside it, supplier/category hide behind a disclosure), and a save writes the
`PURCHASE` movement plus its linked expense. The order page gained an "Add a cost for this order"
block that books a `Transport/delivery` expense described as `GH-2 · Courier slip`. Tiles are the
kitchen's live inventory items, so the owner adds a material once in Inventory and it is a tile
everywhere after.

## Batch D — public site

| # | Change | Files | Done when |
|---|---|---|---|
| D1 | Tagline becomes **Ghar ki Gud-crafted Chikki's** (hyphen) everywhere: settings default, `BRAND_TAGLINE`, hero badge, Our Story aside, and `LEGACY_TAGLINES` gains the unhyphenated form so the live doc is repaired | `src/lib/settings.ts:21`, `src/lib/seo.ts:5`, `src/app/(site)/page.tsx:154,193`, `src/app/(site)/our-story/page.tsx:50`, `src/scripts/migrate-mamra.ts:49`, tests | No surface says "Gudcrafted" |
| D2 | Our Story aside: the logo fills the space the big tagline text occupies; the wording sits under it | `src/app/(site)/our-story/page.tsx:40-60` | Logo, not a three-line display quote |
| D3 | Bigger logo on home, blending into the navbar on scroll — scroll-linked `transform` written straight to the node in a `requestAnimationFrame`, no JS animation library. The pill is 76 px over the hero and the glass arrives at the moment the badge reaches 1× | `src/components/site/site-header.tsx` | Badge 62 px → 44 px, always inside the pill, no re-render per scroll frame |
| D4 | Smaller collection cards: tighter grid, 4 across on desktop | `src/app/(site)/collection/page.tsx:32` | Eight cards visible per screen on desktop |
| D5 | Verify the footer Instagram link renders (committed in `3c32dc0`) and add it to the admin nav if it is genuinely absent | `src/components/site/site-footer.tsx` | Instagram visible on the live footer |
| D6 | Public enquiry: after submit, offer a WhatsApp handoff with the enquiry text prefilled | `src/app/(site)/contact/` | Visitor presses send, nothing to type |

D1–D5 are shipped and verified in the browser. D6 is built with Batch E, which uses the same
`waLink()` helper and the same settings-stored destination number.

## Batch E — WhatsApp invoice handoff (owner message 102)

Whenever an order form is filled, the admin gets a one-click handoff to WhatsApp carrying that
order's details, so the owner only presses send.

- Destination is the existing `business.whatsappNumber` setting — the number is **not** hardcoded,
  because this repository is public on GitHub and it is a personal number. You enter it once in
  `/admin/settings`. `whatsappNumber` is `""` in `src/lib/settings.ts:24` today.
- Reuse `waLink()` (`src/lib/phone.ts:35`) and the composed invoice text from
  `src/lib/messaging.ts:365-411`, so the prefilled message matches what the Cloud API sends.
- Placement: on the order detail page and as the post-save landing on the new order desk.

Shipped and verified. `invoiceHandoff()` (`src/lib/messaging.ts`) composes the same
`INVOICE_DETAILS` body the Cloud API would send and wraps it in `waLink()`, so the button and the
automation agree. Verified in the browser with a placeholder number in the dev settings: `/admin/
orders/GH-2` renders "Open in WhatsApp" → `https://wa.me/…?text=Invoice GH-2 · 01/11/2026 …`, a new
order lands on "Order created. Use “Open in WhatsApp” above to send the invoice.", and the public
enquiry success screen prefills name, quantity, date and the free-text details. Setting a number is
the owner's one remaining step; the field's help text now says what it drives.

While verifying, the invoice line itself read `Groundnut Chikki — 250 g (250 g)`, because the
packaging label already carries the weight. `weightAside()` (`src/lib/quantity.ts:26-38`) now drops
that parenthetical wherever the label states the same grams, and the same guard is applied to the
WhatsApp invoice, the "completed" message, the invoice email (`src/lib/email.ts:50-60`) and the PDF
(`src/lib/invoice-pdf.ts:258-265`). A real weigh-in that differs from the label still prints, with
`each`/`total` to say whose weight it is.

## Batch F — upload limits (owner message 103)

"aiya file upload size 50mb thaishake?" — yes, with two guards.

| Limit | Before | After | Files |
|---|---|---|---|
| Import file | 2 MB | 50 MB | `src/lib/imports.ts:26-31,492-494`, `src/app/admin/imports/actions.ts:59-61`, copy at `src/app/admin/imports/page.tsx:176` |
| Server action body | 4 MB | 55 MB | `next.config.ts` `experimental.serverActions.bodySizeLimit` |
| Body the proxy reads | 10 MB (silent truncation) | 55 MB | `next.config.ts` `experimental.proxyClientMaxBodySize` |
| Media upload | 6 MB (7 MB guard) | 50 MB | `src/lib/media.ts:11-12,127-129`, `src/components/admin/media-uploader.tsx:8-9,36-39,92`, `src/app/api/admin/media/route.ts:51-54` |

Row cap stays 2,000 — a 50 MB sheet with 2,000 rows is already the memory ceiling for `exceljs`
in a serverless function.

Shipped and verified: a 5.83 MB CSV (previously refused at 2 MB) now reaches the column-mapping
step, and a 16.5 MB PNG uploads with "Image added." Every size string on screen and in an error now
derives from the one constant that guards it, so the copy cannot drift from the rule.

Two blockers surfaced only while testing, both silent:

1. Next reads only the first 10 MB of a request body when a proxy is configured and drops the rest
   without failing, so anything above 10 MB arrived as a corrupt slice. Raised with
   `experimental.proxyClientMaxBodySize`; the deprecated `middlewareClientMaxBodySize` name is what
   the warning in the dev log still prints.
2. The media route's same-origin guard compared `127.0.0.1:3111` (browser `Origin`) with
   `localhost:3111` (what the dev server reports) and answered "Request blocked." — a dead end with
   no clue for the owner. Loopback aliases now count as the same host.

**Hosted-site caveat, stated plainly:** Vercel caps a function's request body at 4.5 MB on every
plan (`413 FUNCTION_PAYLOAD_TOO_LARGE`), so the 50 MB ceiling is real on a machine you control and
on any self-hosted container, but a large upload on `gh-chikkis.vercel.app` will still be refused by
the platform. A 2,000-row sheet is far under 4.5 MB, so imports are unaffected in practice; photos
above ~4 MB need a direct browser-to-Cloudinary upload, which is a separate change and needs
Cloudinary credentials confirmed first.

## Out of scope

New pages or routes, changing the pricing model, rewriting stored order/customer documents, and
anything that needs the live Atlas database (that waits for the password rotation).
