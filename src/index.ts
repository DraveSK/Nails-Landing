// Mirrored from the live Cloudflare Worker "nails" (nails.drave.sk) on
// 2026-09-19 — that Worker was originally deployed via the dashboard's
// Quick Edit / raw upload (no wrangler.toml, no git history), so this
// wraps the exact same HTML in a minimal Worker so it can be edited and
// redeployed with `wrangler deploy` like every other project here.
//
// It's a sales/demo template for the Dragon Nail Studio SaaS product
// (see the "DEMO page" / "replace with real ... " comments inside
// index.html) — not a real paying tenant's site.
//
// Known pre-existing issue (not introduced by this mirror): logo.png,
// menu-page-1.jpg and your-logo.png are referenced in index.html but
// all 404 on the live site — they were never actually uploaded.
import html from '../index.html';

export default {
  async fetch(): Promise<Response> {
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
