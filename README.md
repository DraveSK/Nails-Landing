# Nails Landing (nails.drave.sk)

Sales/demo landing page for the Dragon Nail Studio SaaS product — a fictional
salon "Nails by Linh" used to show prospective nail-salon clients what a
generated site could look like. Not a real paying tenant.

## Origin

This was a standalone Cloudflare Worker named `nails`, deployed via the
dashboard's Quick Edit (raw script upload) on 2026-07-08 — no git history,
no wrangler.toml. Mirrored into this repo on 2026-09-19 by fetching the live
rendered `index.html` from `https://nails.drave.sk/` directly, since the
Cloudflare API blocks fetching a Worker's raw script content over an OAuth
session (`wrangler login`) — only an API Token can do that.

`src/index.ts` wraps that same HTML in a minimal Worker so it can be edited
and deployed normally with `wrangler deploy`, same as this account's other
Worker projects.

## Fidelity note

This mirror captures exactly what `GET /` returns (the full HTML) plus the
one other real asset the live Worker serves (`og-image.jpg`, checked by
probing `/api`, `/contact`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico` —
all 404, so there's no hidden backend logic beyond these two responses).
It can't guarantee 100% fidelity to whatever the *original uploaded script*
contains internally (e.g. unused code paths, comments) — only that the
externally observable behavior matches.

## Logo

A real logo (`public/logo.png`) now replaces the placeholder "NL" text in
three spots: the nav bar, the hero section's spinning wheel center, and the
price-menu flipbook's cover page. Served as a static asset the same way as
`og-image.jpg`.

## Known pre-existing issue

`logo.png`, `menu-page-1.jpg`, and `your-logo.png` are referenced inside
`index.html` (see the inline comments marking where to swap in a real
salon's logo / menu photos) but all 404 on the live site — they were never
actually uploaded. Not something this mirror broke; carried over as-is.

## Deploying

```
npx wrangler deploy
```

This has NOT been deployed from here yet — the live `nails.drave.sk` is
still served by the original standalone Worker script. Redeploying from
this project will overwrite that script with the (currently identical)
mirrored version.

<!-- trigger first git-integration build -->
