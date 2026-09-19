// Mirrored from the live Cloudflare Worker "nails" (nails.drave.sk) on
// 2026-09-19, then grown into the real multi-tenant product: one Worker +
// one D1 database serving every agency's site at <slug>.nails.drave.sk,
// plus two admin surfaces (super-admin for the operator, /admin per
// agency). See README for the full picture.
import demoHtml from '../index.html';
import type { Env } from './env';
import { signToken, verifyToken, hashPassword, verifyPassword, getBearerToken } from './auth';
import {
  getTenantBySlug, getTenantByCustomDomain, getTenantById, listTenants, listServices,
  updateTenantFields, updateTenantAdminFields, createTenant, createService, updateService, deleteService,
  getSuperAdminPasswordHash, updateSuperAdminPasswordHash, updateTenantPasswordHash,
  listGalleryImages, addGalleryImage, getGalleryImage, deleteGalleryImage,
  countGalleryImages, MAX_GALLERY_IMAGES_PER_TENANT,
} from './db';
import { renderTenantSite, renderNotFound } from './site';
import { renderManifest, renderServiceWorker } from './pwa';
import { loginPage, tenantAdminPage, superAdminPage, superAdminLoginPage } from './ui';

const ROOT_DOMAIN = 'nails.drave.sk';
// 180 days — both admin surfaces are meant to be installed as a PWA and
// left logged in, not re-authenticated constantly. Still password-gated
// per device on first install.
const ADMIN_SESSION_TTL = 86400 * 180;

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function slugFromHost(host: string): string | null {
  const bare = host.split(':')[0];
  if (bare === ROOT_DOMAIN || bare === `www.${ROOT_DOMAIN}`) return null;
  if (bare.endsWith(`.${ROOT_DOMAIN}`)) return bare.slice(0, -(`.${ROOT_DOMAIN}`.length));
  return null; // resolved separately via custom_domain lookup below
}

async function requireTenantAuth(req: Request, env: Env, tenantId: string): Promise<boolean> {
  const token = getBearerToken(req);
  if (!token) return false;
  const payload = await verifyToken(env, token);
  return !!payload && payload.role === 'tenant' && payload.tenantId === tenantId;
}

async function requireSuperAuth(req: Request, env: Env): Promise<boolean> {
  const token = getBearerToken(req);
  if (!token) return false;
  const payload = await verifyToken(env, token);
  return !!payload && payload.role === 'super';
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const host = req.headers.get('Host') || url.host;
    const path = url.pathname;

    // ── Gallery photo bytes (public, any host — served straight from R2) ───
    const imgMatch = path.match(/^\/img\/([a-f0-9-]+\/[a-zA-Z0-9_.-]+)$/);
    if (imgMatch && req.method === 'GET') {
      const obj = await env.GALLERY.get(imgMatch[1]);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Same static content everywhere, so this doesn't need tenant/host
    // resolution — matters for /super-admin and /admin, which both want an
    // installable PWA too (fewer re-logins on the phone they manage from).
    if (path === '/sw.js') {
      return new Response(renderServiceWorker(), { headers: { 'Content-Type': 'application/javascript' } });
    }
    if (path === '/super-admin/manifest.json') {
      return new Response(JSON.stringify({
        name: 'Super Admin — Nails',
        short_name: 'Super Admin',
        start_url: '/super-admin/app',
        scope: '/super-admin/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f1f2e',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      }), { headers: { 'Content-Type': 'application/manifest+json' } });
    }

    // ── Super-admin (operator only, lives on the bare domain) ──────────────
    if (path === '/super-admin' || path === '/super-admin/') {
      return html(superAdminLoginPage());
    }
    if (path === '/super-admin/app') {
      return html(superAdminPage());
    }
    if (path === '/super-admin/api/login' && req.method === 'POST') {
      const { password } = await req.json<{ password: string }>().catch(() => ({ password: '' }));
      const hash = await getSuperAdminPasswordHash(env);
      if (!hash || !password || !(await verifyPassword(password, hash))) {
        return json({ success: false, message: 'Sai mật khẩu' }, 401);
      }
      // Long-lived — this is meant to be installed as a PWA on the
      // operator's own phone, where re-typing a password every 7 days
      // defeats the point.
      const token = await signToken(env, { role: 'super' }, ADMIN_SESSION_TTL);
      return json({ success: true, token });
    }
    if (path === '/super-admin/api/tenants' && req.method === 'GET') {
      if (!(await requireSuperAuth(req, env))) return json({ success: false, message: 'Unauthorized' }, 401);
      const tenants = await listTenants(env);
      return json({ success: true, tenants });
    }
    if (path === '/super-admin/api/tenants' && req.method === 'POST') {
      if (!(await requireSuperAuth(req, env))) return json({ success: false, message: 'Unauthorized' }, 401);
      const body = await req.json<{ slug: string; brand_name: string; password: string }>().catch(() => null);
      if (!body?.slug || !body?.brand_name || !body?.password) return json({ success: false, message: 'Missing fields' }, 400);
      const slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!slug) return json({ success: false, message: 'Invalid slug' }, 400);
      const existing = await getTenantBySlug(env, slug);
      if (existing) return json({ success: false, message: 'Slug đã tồn tại' }, 409);
      const admin_password_hash = await hashPassword(body.password);
      const tenant = await createTenant(env, { slug, brand_name: body.brand_name, admin_password_hash });
      return json({ success: true, tenant });
    }
    if (path === '/super-admin/api/change-password' && req.method === 'POST') {
      if (!(await requireSuperAuth(req, env))) return json({ success: false, message: 'Unauthorized' }, 401);
      const body = await req.json<{ currentPassword: string; newPassword: string }>().catch(() => null);
      if (!body?.currentPassword || !body?.newPassword) return json({ success: false, message: 'Thiếu thông tin' }, 400);
      if (body.newPassword.length < 6) return json({ success: false, message: 'Mật khẩu mới quá ngắn' }, 400);
      const hash = await getSuperAdminPasswordHash(env);
      if (!hash || !(await verifyPassword(body.currentPassword, hash))) {
        return json({ success: false, message: 'Mật khẩu hiện tại không đúng' }, 401);
      }
      await updateSuperAdminPasswordHash(env, await hashPassword(body.newPassword));
      return json({ success: true });
    }
    const superTenantMatch = path.match(/^\/super-admin\/api\/tenants\/([^/]+)$/);
    if (superTenantMatch && req.method === 'PUT') {
      if (!(await requireSuperAuth(req, env))) return json({ success: false, message: 'Unauthorized' }, 401);
      const fields = await req.json<Record<string, any>>().catch(() => ({}));
      try {
        await updateTenantAdminFields(env, superTenantMatch[1], fields);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (msg.includes('UNIQUE')) return json({ success: false, message: 'Domain này đã được gán cho đại lý khác' }, 409);
        throw e;
      }
      return json({ success: true });
    }

    // ── Tenant resolution ───────────────────────────────────────────────────
    const slug = slugFromHost(host);
    let tenant = slug ? await getTenantBySlug(env, slug) : await getTenantByCustomDomain(env, host.split(':')[0]);

    // ── Per-tenant admin (only reachable on a resolved tenant host) ────────
    if (tenant && (path === '/admin' || path === '/admin/')) {
      return html(loginPage(`${tenant.brand_name} — Admin`, '/admin/api/login', 'tenant_token', '/admin/app', tenant.logo_data_url || '/logo.png', tenant.brand_name, tenant.color_primary));
    }
    if (tenant && path === '/admin/app') {
      return html(tenantAdminPage(tenant.brand_name, tenant.logo_data_url || '/logo.png', tenant.color_primary));
    }
    if (tenant && path === '/admin/manifest.json') {
      const icon = tenant.logo_data_url || '/logo.png';
      return new Response(JSON.stringify({
        name: `${tenant.brand_name} — Admin`,
        short_name: 'Admin',
        start_url: '/admin/app',
        scope: '/admin/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: tenant.color_primary || '#FF3D8A',
        icons: [
          { src: icon, sizes: '192x192', type: 'image/png' },
          { src: icon, sizes: '512x512', type: 'image/png' },
        ],
      }), { headers: { 'Content-Type': 'application/manifest+json' } });
    }
    if (tenant && path === '/admin/api/login' && req.method === 'POST') {
      const { password } = await req.json<{ password: string }>().catch(() => ({ password: '' }));
      if (!password || !(await verifyPassword(password, tenant.admin_password_hash))) {
        return json({ success: false, message: 'Sai mật khẩu' }, 401);
      }
      const token = await signToken(env, { role: 'tenant', tenantId: tenant.id }, ADMIN_SESSION_TTL);
      return json({ success: true, token });
    }
    if (tenant && path === '/admin/api/me' && req.method === 'GET') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const services = await listServices(env, tenant.id);
      return json({ success: true, tenant, services });
    }
    if (tenant && path === '/admin/api/change-password' && req.method === 'POST') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const body = await req.json<{ currentPassword: string; newPassword: string }>().catch(() => null);
      if (!body?.currentPassword || !body?.newPassword) return json({ success: false, message: 'Thiếu thông tin' }, 400);
      if (body.newPassword.length < 6) return json({ success: false, message: 'Mật khẩu mới quá ngắn' }, 400);
      if (!(await verifyPassword(body.currentPassword, tenant.admin_password_hash))) {
        return json({ success: false, message: 'Mật khẩu hiện tại không đúng' }, 401);
      }
      await updateTenantPasswordHash(env, tenant.id, await hashPassword(body.newPassword));
      return json({ success: true });
    }
    if (tenant && path === '/admin/api/tenant' && req.method === 'PUT') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const fields = await req.json<Record<string, any>>().catch(() => ({}));
      await updateTenantFields(env, tenant.id, fields);
      return json({ success: true });
    }
    if (tenant && path === '/admin/api/services' && req.method === 'POST') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const body = await req.json<{ name: string; price: string; icon: string; description?: string; name_vi?: string; name_en?: string; description_vi?: string; description_en?: string }>().catch(() => null);
      if (!body?.name || !body?.price) return json({ success: false, message: 'Thiếu thông tin' }, 400);
      const service = await createService(env, tenant.id, {
        name: body.name, price: body.price, icon: body.icon || '💅', description: body.description,
        name_vi: body.name_vi, name_en: body.name_en, description_vi: body.description_vi, description_en: body.description_en,
      });
      return json({ success: true, service });
    }
    const svcMatch = path.match(/^\/admin\/api\/services\/([^/]+)$/);
    if (tenant && svcMatch && req.method === 'DELETE') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      await deleteService(env, tenant.id, svcMatch[1]);
      return json({ success: true });
    }
    if (tenant && svcMatch && req.method === 'PUT') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const fields = await req.json<Record<string, any>>().catch(() => ({}));
      await updateService(env, tenant.id, svcMatch[1], fields);
      return json({ success: true });
    }
    if (tenant && path === '/admin/api/gallery' && req.method === 'GET') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const images = await listGalleryImages(env, tenant.id);
      return json({ success: true, images });
    }
    if (tenant && path === '/admin/api/gallery' && req.method === 'POST') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const count = await countGalleryImages(env, tenant.id);
      if (count >= MAX_GALLERY_IMAGES_PER_TENANT) {
        return json({ success: false, message: `Đã đạt tối đa ${MAX_GALLERY_IMAGES_PER_TENANT} ảnh` }, 400);
      }
      const body = await req.json<{ data: string; caption?: string }>().catch(() => null);
      const match = body?.data?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if (!match) return json({ success: false, message: 'Ảnh không hợp lệ (chỉ JPEG/PNG/WebP)' }, 400);
      const [, mime, b64] = match;
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      // Client already compresses before upload; this is a hard server-side
      // backstop so a modified client (or bug) can't fill up R2/D1 anyway.
      if (bytes.byteLength > 4 * 1024 * 1024) {
        return json({ success: false, message: 'Ảnh quá lớn (tối đa 4MB)' }, 400);
      }
      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const r2Key = `${tenant.id}/${crypto.randomUUID()}.${ext}`;
      await env.GALLERY.put(r2Key, bytes, { httpMetadata: { contentType: mime } });
      const image = await addGalleryImage(env, tenant.id, r2Key, body?.caption?.slice(0, 200) || '');
      return json({ success: true, image });
    }
    const galMatch = path.match(/^\/admin\/api\/gallery\/([^/]+)$/);
    if (tenant && galMatch && req.method === 'DELETE') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const image = await getGalleryImage(env, tenant.id, galMatch[1]);
      if (image) {
        await env.GALLERY.delete(image.r2_key);
        await deleteGalleryImage(env, tenant.id, image.id);
      }
      return json({ success: true });
    }

    // ── Public site ──────────────────────────────────────────────────────
    if (tenant && path === '/manifest.json') {
      return new Response(renderManifest(tenant), { headers: { 'Content-Type': 'application/manifest+json' } });
    }
    if (tenant) {
      if (!tenant.active) return html(renderNotFound(), 404);
      const services = await listServices(env, tenant.id);
      const gallery = await listGalleryImages(env, tenant.id);
      return html(renderTenantSite(tenant, services, gallery));
    }

    // A path meant for a tenant (/admin/*, /admin/api/*) that didn't match
    // above — either the host has no tenant, or the tenant is inactive.
    // Never fall through to the demo page for these; that would silently
    // swallow real errors (e.g. return 200 HTML for a failed login POST).
    if (path.startsWith('/admin')) {
      return json({ success: false, message: 'Not found' }, 404);
    }

    // Bare nails.drave.sk (and any other unmatched host) — the original
    // sales/demo page.
    return html(demoHtml);
  },
};
