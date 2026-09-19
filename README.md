# Nails Landing (nails.drave.sk)

Multi-tenant nail-salon landing page product: one Worker + one D1 database
serving every paying agency at `<slug>.nails.drave.sk`. Positioned as a
cheap, one-time-fee (€79) alternative to the full Dragon Nail Studio /
Nail Core SaaS for salons that don't want a monthly fee.

## Architecture

- **Bare `nails.drave.sk`** — unchanged: the original "Nails by Linh"
  sales/demo page (mirrored 2026-09-19 from the standalone Worker that used
  to live here), shown to prospects as a sample of what a generated site
  looks like.
- **`<slug>.nails.drave.sk`** — each agency's real, live site, rendered from
  its row in D1 (`src/site.ts`). A brand new agency is reachable the
  instant its row exists — no redeploy, no new Worker route.
- **D1** (`nails-landing-db`) — two tables: `tenants` (branding, hero copy,
  contact/footer, Calendly link, per-tenant admin password) and `services`
  (name/price/icon list). `super_admin` holds the operator's own single
  shared password.
- **Booking**: entirely delegated to each agency's own Calendly account
  (`calendly_url` field, embedded as an iframe + linked from the CTA
  buttons) — this product does not build or store any bookings itself.
- **Logo/images**: stored as base64 `data:` URLs directly in
  `tenants.logo_data_url` — no R2 bucket, keeps the product to "1 Worker +
  1 D1" as intended.

## Two admin surfaces

- **`/super-admin`** (operator only, bare domain) — create a new agency
  (slug + brand name + password; live immediately), list agencies,
  activate/pause one. Single shared password, seeded directly in D1 (see
  "Seeding secrets" below), never in migration history.
- **`<slug>.nails.drave.sk/admin`** (per agency, own password) — edit
  branding (name, logo, colors, hero text), contact/footer (address,
  phone, WhatsApp, email, socials, hours, Calendly URL), and full CRUD on
  the services/price list. Plain server-rendered HTML + vanilla JS, no
  build step — deliberately lightweight, matching this product's
  "simple/cheap" positioning versus the main Nail Core admin.

## Required one-time setup: wildcard DNS

Workers Routes match by hostname at Cloudflare's edge, which requires a DNS
record for the pattern to exist in the zone — even though the record's
actual target doesn't matter (the platform intercepts before proxying).
**This has NOT been created yet** (the wrangler OAuth token used in this
project only has `zone:read`, not DNS write access, so this step needs to
be done by hand or with an API-token that has DNS edit).

In the Cloudflare dashboard → `drave.sk` zone → DNS → Add record:
- Type: `A` (or `AAAA`)
- Name: `*.nails`
- Content: `192.0.2.1` (or any placeholder — it's never actually used)
- Proxy status: **Proxied** (orange cloud) — required, this is what lets
  the Worker route intercept the request

Until this record exists, `<slug>.nails.drave.sk` will not resolve at all
(the bare `nails.drave.sk` demo page and `/super-admin` already work today
since that's a `custom_domain` route, not a wildcard).

## Seeding secrets (already done for this deployment, kept here for re-runs)

```bash
# Session signing key (used for both admin JWTs)
echo "<random 32-byte hex>" | npx wrangler secret put SESSION_SECRET

# Super-admin password — hash it the same way src/auth.ts#hashPassword does
# (PBKDF2-SHA256, 100k iterations, "salt_hex:hash_hex"), then:
npx wrangler d1 execute nails-landing-db --remote \
  --command "INSERT INTO super_admin (id, password_hash) VALUES (1, '<hash>')"
```

## Local development

```bash
npm install
npx wrangler d1 migrations apply nails-landing-db --local
# seed a local super_admin row the same way, against --local
npx wrangler dev --local
```

Note: `wrangler dev`'s local/--remote preview always reports the Worker's
own configured route hostname as `Host`, regardless of what a client sends
— so subdomain-based tenant resolution can't be exercised through `curl -H
"Host: ..."` against `wrangler dev`. It's verified against the real
deployment instead.

## Deploying

```bash
npx wrangler deploy
```

## Origin

This was originally a standalone Cloudflare Worker named `nails`, deployed
via the dashboard's Quick Edit (raw script upload) on 2026-07-08 — no git
history, no wrangler.toml. Mirrored into this repo on 2026-09-19 by
fetching the live rendered `index.html`, since the Cloudflare API blocks
fetching a Worker's raw script content over an OAuth session (only an API
Token can do that). It's kept as-is at the bare domain; the multi-tenant
product above was built alongside it.
