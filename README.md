# Restaurant POS — Tukaram Bar & Restaurant

A Petpooja-style point of sale for **Tukaram Bar & Restaurant**, Karaswada, Mapusa, Goa.
Tables → order → KOT to kitchen/bar → bill → payment (Cash / UPI / Card / split) → printed receipt.
It keeps working when the internet drops, and catches up when it comes back.

Set up for Tukaram:

- **Ground Floor** G1–G8 and **First Floor** F1–F15, plus Takeaway and Delivery
- Full menu from the printed cards: fish thalis, fish fry (Rawa / Tawa / Masala / Recheado / Golden), chicken, beverages, beer, whisky, vodka, rum, feni, wine
- **APS items** (fish at market price): menu price ₹0 means the POS asks for today's price when the item is added
- Kitchen items print on the **KITCHEN** KOT, drinks on the **BAR** KOT
- Prices are final (GST included). Food is on GST 5%, liquor has no GST. Change it in **Settings** / **Menu**.
- The receipt shows the name, address, "FRESH FISH & HOME FOOD" and the Instagram handle

## Put it online on Vercel (one time, about 15 minutes)

You need a GitHub account and a Vercel account (sign up at vercel.com with GitHub).

1. **Push this folder to GitHub** (your repo).
2. **Vercel → Add New → Project →** import the repo. Leave every setting as it is; `vercel.json` already sets the build.
   Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `JWT_SECRET` | a long random string (40+ characters; keep it secret) |
   | `SEED_OWNER_PASSWORD` | the first password for the `owner` login (8+ characters) |
   | `SEED_OWNER_PIN` | optional: 4-digit owner PIN for approving voids/discounts |
   | `RESTAURANT` | `tukaram` |

3. Click **Deploy**. The first deploy will say *"DATABASE_URL is not set"*. That is expected.
4. **Project → Storage → Create Database → Neon (Postgres)**, free plan, region **Mumbai** (or Singapore),
   and connect it to the project. This adds `DATABASE_URL` automatically.
5. **Deployments → ⋯ → Redeploy.** This build creates the tables and sets up Tukaram's menu and tables.
6. Open the site, sign in as **`owner`** with your `SEED_OWNER_PASSWORD`, and go to **Staff** to add waiters
   (Captain role), cashier and manager. Change the owner password there too.

Every later `git push` redeploys automatically. Your data stays in the Neon database, and menu or price changes
made in the POS are kept.

### Using it in the restaurant

- Open the site in **Chrome** on the counter PC / tablet. Use *Install app* (address bar icon) so it opens like an app.
- **Printing:** connect the 80 mm thermal printer to the counter PC (USB) and set it as the default printer.
  Bills and KOTs open the print dialog. To print with no dialog, start Chrome with `--kiosk-printing`.
- Waiters can use their phones: open the same site, sign in, take orders at the table. Other screens update within ~5 s.
- **Reports** (owner/manager): today, yesterday, last 7 days, this month or any dates. Shows sales, payment modes,
  categories, every item sold. *Print summary* gives a day-end slip on the thermal printer; *Excel / CSV* downloads it.
- **Security:** 5 wrong passwords (or manager PINs) lock that account for 10 minutes. A staff account switched off
  on the Staff page stops working within a minute.
- Internet down? Keep billing. Orders are saved on the device and sent when the connection returns
  (the top bar shows *Offline* and a count).

### Cost and limits

- **Vercel Hobby (free) is for non-commercial use only.** A restaurant is a business, so use **Vercel Pro**
  (about $20/month per team; one team can hold all your hotels).
- **Neon free plan** is enough for one restaurant. The POS stops polling after 20 minutes without use,
  so the database can sleep at night.

## Adding the next hotel

1. Copy `apps/api/src/restaurants/tukaram.ts` to e.g. `shetty.ts`. Change name, address, floors/tables, menu.
2. Add it to `apps/api/src/restaurants/index.ts`.
3. In Vercel create a **new project from the same repo** with `RESTAURANT=shetty`, its own `JWT_SECRET`,
   `SEED_OWNER_PASSWORD`, and its **own Neon database**. Each hotel's data stays fully separate.

## Run it on your PC (for testing)

```bash
npm run setup      # first time: installs, creates apps/api/.env, local database, Tukaram data
npm run dev        # POS on http://localhost:5173
```

Local login: `owner` / `tukaram-local-1` (from `apps/api/.env`). For the demo cafe with sample staff
(`owner/owner123`, `cashier/cashier123`, …) set `RESTAURANT=demo` in `apps/api/.env` and run `npm run db:reset`;
build the POS with `VITE_DEMO=true` to show one-click demo logins.

## How the code is laid out

```
apps/api                  NestJS API + PostgreSQL (Drizzle). Runs as one Vercel function (api/index.js)
apps/api/src/restaurants  one file per hotel (menu, tables, settings)
apps/pos                  React POS (offline-capable PWA), served as static files
packages/shared           money / GST / bill maths, receipt + KOT layout
scripts/vercel-build.js   what Vercel runs: build → migrate DB → set up restaurant → build POS
```

---

# Technical reference

## Scripts

| Command                | What it does                                                                  |
|------------------------|-------------------------------------------------------------------------------|
| `npm run setup`        | one-shot install + env + migrate + seed                                       |
| `npm run dev`          | API (watch) + POS (Vite HMR) together                                         |
| `npm run dev:api` / `dev:pos` | run one side                                                            |
| `npm run build`        | production build of shared, API (`apps/api/dist`) and POS (`apps/pos/dist`)   |
| `npm test`             | unit tests: tax/billing engine (vitest) + server billing pipeline (jest)       |
| `npm run smoke`        | end-to-end HTTP smoke test against a running API (48 assertions, see below)   |
| `npm run db:migrate`   | apply SQL migrations in `apps/api/drizzle/`                                   |
| `npm run db:seed`      | create the restaurant from `RESTAURANT` (idempotent)                          |
| `npm run db:reset`     | drop everything, migrate, seed                                                |
| `npm run db:start`     | just hold the embedded Postgres up (e.g. for `psql` / Drizzle Studio)         |
| `npm run db:generate -w @rms/api` | generate a new migration after editing `src/db/schema.ts`          |

## Environment (`apps/api/.env`)

| Var              | Default                                        | Meaning                                                    |
|------------------|------------------------------------------------|------------------------------------------------------------|
| `DB_EMBEDDED`    | `true`                                         | boot embedded PostgreSQL in `apps/api/.pgdata`             |
| `DATABASE_URL`   | `postgresql://postgres:postgres@localhost:5433/rms` | connection string (port 5433 avoids clashing with a local PG) |
| `REDIS_URL`      | *(empty)*                                      | optional; Phase 1 uses an in-process event bus             |
| `JWT_SECRET`     | change-me                                      | **change in production**                                   |
| `JWT_EXPIRES_IN` | `12h`                                          | POS session length                                         |
| `API_PORT`       | `4000`                                         | local API port                                             |
| `RESTAURANT`     | `tukaram`                                      | which file in `apps/api/src/restaurants/` to set up        |
| `SEED_OWNER_PASSWORD` | —                                         | first password of user `owner` (first setup only)          |
| `SEED_OWNER_PIN` | —                                              | optional owner approval PIN                                |
| `CORS_ORIGIN`    | `http://localhost:5173`                        | comma-separated                                            |
| `PRINT_DRY_RUN`  | `true`                                         | `false` → send ESC/POS to the network printers in Settings |

POS: optional `VITE_API_URL` (defaults to same-origin; the Vite dev server proxies `/api` and `/ws`).

## How the POS works

**3 clicks to a bill.** Tap table → tap items → **F10 / Pay** (bill is generated, KOT auto-sent, receipt printed).
Shortcuts: `F2` or `/` search, `Enter` adds the first match (short codes like `PT`, `BN`, `MC`),
`F8` KOT, `F9` bill, `F10` settle, `Esc` back.

**Offline-first.** Every mutation is (1) applied to the IndexedDB mirror, (2) appended to an op queue,
(3) flushed to `POST /api/sync/push`. Online this completes in the same tick so the cashier sees the server's
invoice number; offline the queue waits and the cashier keeps working with the cached menu, floor and
provisional numbers (`L-3` orders, `OFF-<device>-7` bills). Ops carry client UUIDs and are recorded in
`sync_ops`, so retries after a dropped request never double-apply. Rejected ops (e.g. table was taken by
another terminal) are surfaced on the **Sync** page with retry/discard. Socket.IO pushes other terminals'
changes live; local unsynced edits are never clobbered.

**Concurrency.** Order rows carry a `version`; mutations lock the row (`SELECT … FOR UPDATE`) and clients
may pass `expectedVersion` → `409 VERSION_CONFLICT`. Two waiters on one table cannot corrupt an order.

**Money & tax.** Integer paise everywhere, percentages in basis points. `packages/shared/src/billing.ts`
is a pure function: item discounts → bill discount (largest-remainder allocation across lines) → per-line
GST (CGST/SGST rounded independently, inclusive or exclusive) → service charge (optionally taxed) →
configurable round-off. Same code runs on the server (authoritative) and in the POS (instant preview /
offline bills). 21 unit tests cover it.

**Permissions.** Roles are bundles of granular permissions (`packages/shared/src/types.ts`). Sensitive
actions (void a sent item, discount above the cashier cap, cancel an order with sent items, void/refund a
bill) return `403 OVERRIDE_REQUIRED`; the POS prompts for a manager PIN, gets a 5-minute override token
(`POST /api/auth/override`) and retries with `X-Override-Token`. Everything sensitive lands in `audit_logs`
with who/what/why.

**Printing.** `@rms/shared` builds raw ESC/POS for bills and KOTs (42/48-col). The server routes each
ticket to the outlet printer for its station (BILL / KITCHEN / TANDOOR / BAR…) over TCP 9100; with
`PRINT_DRY_RUN=true` it returns the bytes + a text preview instead. The POS always shows the preview and
offers browser printing (80 mm print CSS) as a fallback; KOTs generated offline are queued and pushed to the
network printer on reconnect.

## API

Swagger UI: **http://localhost:4000/api/docs** (OpenAPI JSON at `/api/docs-json`). Main resources:

```
POST /api/auth/login  /auth/override  GET /auth/me
GET  /api/outlets/me  PATCH /outlets/me/settings  GET/POST/DELETE /outlets/me/printers
GET  /api/menu  POST /menu/items  PATCH /menu/items/:id/flags  POST /menu/categories|addon-groups|tax-slabs  GET /menu/export.csv  POST /menu/import
GET  /api/floor  POST /floor/areas  POST /floor/tables  POST /floor/tables/:id/reserve
POST /api/orders  GET /orders  GET /orders/:id  POST /orders/:id/items  PATCH /orders/:id/items/:itemId
POST /api/orders/:id/items/:itemId/void  /orders/:id/kot  /orders/:id/discount  /orders/:id/cancel
POST /api/orders/:id/transfer  /orders/:id/merge-into/:targetId  /orders/:id/split
GET  /api/orders/:id/bill/preview  POST /orders/:id/bill  GET /bills  GET /bills/:id  GET /bills/:id/receipt
POST /api/bills/:id/payments  /bills/:id/print  /bills/:id/void  /bills/:id/send
GET  /api/kots  POST /kots/:id/status  /kots/:id/reprint
POST /api/sync/push  GET /sync/bootstrap
GET  /api/customers?q=  GET /customers/by-phone/:phone  POST /customers
GET  /api/reports/summary  GET /audit
WS   /ws  (Socket.IO, auth: { token })  → 'event' { type: order.updated | table.updated | kot.created | bill.paid | menu.updated … }
```

## Tests

```bash
npm test          # 25 shared engine tests + 4 server pipeline tests
npm run smoke     # with `npm run dev:api` running: login → menu → order → 409 conflict → KOT → PIN override
                  # → discount cap → bill → split payment → offline sync replay → transfer/merge/cancel → audit
```

## Data model

Every business table carries `outlet_id` (outlets carry `brand_id`) so a chain is a query filter, not a
migration. Entities: `brands, outlets, users, areas, tables, tax_slabs, menu_categories, menu_items,
variations, addon_groups, addons, item_addon_groups, customers, orders, order_items, kots, bills, payments,
printers, counters (atomic order/KOT/bill sequences), sync_ops (idempotency ledger), audit_logs`.
Schema: `apps/api/src/db/schema.ts`; migration SQL: `apps/api/drizzle/0000_init.sql`.

## Roadmap

- **Phase 2 — Back office:** raw materials, recipes + auto-deduct on sale, wastage, stock transfers,
  vendors / PO / GRN / purchase bills, full reports (item, category, time-slot, payment mode, tax, discount,
  void, staff, consumption) with date range, outlet filter, CSV/PDF export.
- **Phase 3 — Growth:** aggregator adapters (Swiggy / Zomato behind a common interface, mock adapter first),
  own online channel, CRM + loyalty wallet, campaigns via messaging adapter, Kitchen Display System.
- **Phase 4 — Extras:** captain tablet app, QR scan-&-order, multi-outlet consolidated reports.

## Why Drizzle instead of Prisma

Prisma's CLI needs to download platform engine binaries at install time, which fails in locked-down networks
(and did in the environment this was built in). Drizzle is pure TypeScript — plain SQL migrations, no
binaries — and keeps the schema in code with typed queries. Swapping back to Prisma later only touches
`apps/api/src/db/*` and the service query calls.
