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
  updateTenantFields, updateTenantAdminFields, createTenant, createService, deleteService,
  getSuperAdminPasswordHash,
} from './db';
import { renderTenantSite, renderNotFound } from './site';
import { loginPage, tenantAdminPage, superAdminPage } from './ui';

const ROOT_DOMAIN = 'nails.drave.sk';

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

    // ── Super-admin (operator only, lives on the bare domain) ──────────────
    if (path === '/super-admin' || path === '/super-admin/') {
      return html(loginPage('Super Admin', '/super-admin/api/login', 'super_token', '/super-admin/app'));
    }
    if (path === '/super-admin/app') {
      return html(superAdminPage());
    }
    if (path === '/super-admin/api/login' && req.method === 'POST') {
      const { password } = await req.json<{ password: string }>().catch(() => ({ password: '' }));
      const hash = await getSuperAdminPasswordHash(env);
      if (!hash || !password || !(await verifyPassword(password, hash))) {
        return json({ success: false, message: 'Nesprávne heslo' }, 401);
      }
      const token = await signToken(env, { role: 'super' });
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
      if (existing) return json({ success: false, message: 'Slug už existuje' }, 409);
      const admin_password_hash = await hashPassword(body.password);
      const tenant = await createTenant(env, { slug, brand_name: body.brand_name, admin_password_hash });
      return json({ success: true, tenant });
    }
    const superTenantMatch = path.match(/^\/super-admin\/api\/tenants\/([^/]+)$/);
    if (superTenantMatch && req.method === 'PUT') {
      if (!(await requireSuperAuth(req, env))) return json({ success: false, message: 'Unauthorized' }, 401);
      const fields = await req.json<Record<string, any>>().catch(() => ({}));
      await updateTenantAdminFields(env, superTenantMatch[1], fields);
      return json({ success: true });
    }

    // ── Tenant resolution ───────────────────────────────────────────────────
    const slug = slugFromHost(host);
    let tenant = slug ? await getTenantBySlug(env, slug) : await getTenantByCustomDomain(env, host.split(':')[0]);

    // ── Per-tenant admin (only reachable on a resolved tenant host) ────────
    if (tenant && (path === '/admin' || path === '/admin/')) {
      return html(loginPage(`${tenant.brand_name} — Admin`, '/admin/api/login', 'tenant_token', '/admin/app'));
    }
    if (tenant && path === '/admin/app') {
      return html(tenantAdminPage());
    }
    if (tenant && path === '/admin/api/login' && req.method === 'POST') {
      const { password } = await req.json<{ password: string }>().catch(() => ({ password: '' }));
      if (!password || !(await verifyPassword(password, tenant.admin_password_hash))) {
        return json({ success: false, message: 'Nesprávne heslo' }, 401);
      }
      const token = await signToken(env, { role: 'tenant', tenantId: tenant.id });
      return json({ success: true, token });
    }
    if (tenant && path === '/admin/api/me' && req.method === 'GET') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const services = await listServices(env, tenant.id);
      return json({ success: true, tenant, services });
    }
    if (tenant && path === '/admin/api/tenant' && req.method === 'PUT') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const fields = await req.json<Record<string, any>>().catch(() => ({}));
      await updateTenantFields(env, tenant.id, fields);
      return json({ success: true });
    }
    if (tenant && path === '/admin/api/services' && req.method === 'POST') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      const body = await req.json<{ name: string; price: string; icon: string }>().catch(() => null);
      if (!body?.name || !body?.price) return json({ success: false, message: 'Missing fields' }, 400);
      const service = await createService(env, tenant.id, { name: body.name, price: body.price, icon: body.icon || '💅' });
      return json({ success: true, service });
    }
    const svcMatch = path.match(/^\/admin\/api\/services\/([^/]+)$/);
    if (tenant && svcMatch && req.method === 'DELETE') {
      if (!(await requireTenantAuth(req, env, tenant.id))) return json({ success: false, message: 'Unauthorized' }, 401);
      await deleteService(env, tenant.id, svcMatch[1]);
      return json({ success: true });
    }

    // ── Public site ──────────────────────────────────────────────────────
    if (tenant) {
      if (!tenant.active) return html(renderNotFound(), 404);
      const services = await listServices(env, tenant.id);
      return html(renderTenantSite(tenant, services));
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
