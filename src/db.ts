import type { Env } from './env';

export interface Tenant {
  id: string;
  slug: string;
  custom_domain: string | null;
  admin_password_hash: string;
  active: number;
  brand_name: string;
  logo_data_url: string | null;
  color_primary: string;
  color_secondary: string;
  eyebrow_text: string;
  hero_title: string;
  hero_subtitle: string;
  eyebrow_text_vi: string;
  eyebrow_text_en: string;
  hero_title_vi: string;
  hero_title_en: string;
  hero_subtitle_vi: string;
  hero_subtitle_en: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  maps_url: string;
  calendly_url: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  price: string;
  icon: string;
  description: string;
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  sort_order: number;
}

// Fields a tenant's own /admin is allowed to edit — deliberately excludes
// id/slug/custom_domain/admin_password_hash/active, which only the
// super-admin can change.
export const TENANT_EDITABLE_FIELDS = [
  'brand_name', 'logo_data_url', 'color_primary', 'color_secondary',
  'eyebrow_text', 'hero_title', 'hero_subtitle',
  'eyebrow_text_vi', 'eyebrow_text_en', 'hero_title_vi', 'hero_title_en', 'hero_subtitle_vi', 'hero_subtitle_en',
  'address', 'phone', 'whatsapp_number', 'email',
  'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url', 'maps_url', 'calendly_url',
  'hours_weekday', 'hours_saturday', 'hours_sunday',
] as const;

export async function getTenantBySlug(env: Env, slug: string): Promise<Tenant | null> {
  return env.DB.prepare('SELECT * FROM tenants WHERE slug = ?').bind(slug).first<Tenant>();
}

export async function getTenantByCustomDomain(env: Env, domain: string): Promise<Tenant | null> {
  return env.DB.prepare('SELECT * FROM tenants WHERE custom_domain = ?').bind(domain).first<Tenant>();
}

export async function getTenantById(env: Env, id: string): Promise<Tenant | null> {
  return env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first<Tenant>();
}

export async function listTenants(env: Env): Promise<Tenant[]> {
  const { results } = await env.DB.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all<Tenant>();
  return results;
}

export async function listServices(env: Env, tenantId: string): Promise<Service[]> {
  const { results } = await env.DB.prepare('SELECT * FROM services WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC').bind(tenantId).all<Service>();
  return results;
}

export interface ServiceInput {
  name: string;
  price: string;
  icon: string;
  description?: string;
  name_vi?: string;
  name_en?: string;
  description_vi?: string;
  description_en?: string;
}

export async function createService(env: Env, tenantId: string, s: ServiceInput): Promise<Service> {
  const id = crypto.randomUUID();
  const { results } = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM services WHERE tenant_id = ?').bind(tenantId).all<{ n: number }>();
  const sortOrder = results[0]?.n ?? 0;
  const description = s.description || '';
  const name_vi = s.name_vi || '';
  const name_en = s.name_en || '';
  const description_vi = s.description_vi || '';
  const description_en = s.description_en || '';
  await env.DB.prepare('INSERT INTO services (id, tenant_id, name, price, icon, description, name_vi, name_en, description_vi, description_en, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, tenantId, s.name, s.price, s.icon, description, name_vi, name_en, description_vi, description_en, sortOrder).run();
  return { id, tenant_id: tenantId, name: s.name, price: s.price, icon: s.icon, description, name_vi, name_en, description_vi, description_en, sort_order: sortOrder };
}

const SERVICE_UPDATABLE_FIELDS = ['name', 'price', 'icon', 'description', 'name_vi', 'name_en', 'description_vi', 'description_en'] as const;

export async function updateService(env: Env, tenantId: string, serviceId: string, fields: Partial<ServiceInput>): Promise<void> {
  const keys = SERVICE_UPDATABLE_FIELDS.filter(k => (fields as Record<string, any>)[k] !== undefined);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (fields as Record<string, any>)[k]);
  await env.DB.prepare(`UPDATE services SET ${setClause} WHERE id = ? AND tenant_id = ?`).bind(...values, serviceId, tenantId).run();
}

export async function deleteService(env: Env, tenantId: string, serviceId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM services WHERE id = ? AND tenant_id = ?').bind(serviceId, tenantId).run();
}

export interface GalleryImage {
  id: string;
  tenant_id: string;
  r2_key: string;
  caption: string;
  sort_order: number;
}

export async function listGalleryImages(env: Env, tenantId: string): Promise<GalleryImage[]> {
  const { results } = await env.DB.prepare('SELECT * FROM gallery_images WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC').bind(tenantId).all<GalleryImage>();
  return results;
}

// A generous but firm cap — this is a photo album for a small salon, not
// unlimited cloud storage; keeps R2 usage/cost predictable per tenant.
export const MAX_GALLERY_IMAGES_PER_TENANT = 40;

export async function countGalleryImages(env: Env, tenantId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM gallery_images WHERE tenant_id = ?').bind(tenantId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function addGalleryImage(env: Env, tenantId: string, r2Key: string, caption: string): Promise<GalleryImage> {
  const id = crypto.randomUUID();
  const { results } = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM gallery_images WHERE tenant_id = ?').bind(tenantId).all<{ n: number }>();
  const sortOrder = results[0]?.n ?? 0;
  await env.DB.prepare('INSERT INTO gallery_images (id, tenant_id, r2_key, caption, sort_order) VALUES (?, ?, ?, ?, ?)')
    .bind(id, tenantId, r2Key, caption, sortOrder).run();
  return { id, tenant_id: tenantId, r2_key: r2Key, caption, sort_order: sortOrder };
}

export async function getGalleryImage(env: Env, tenantId: string, imageId: string): Promise<GalleryImage | null> {
  return env.DB.prepare('SELECT * FROM gallery_images WHERE id = ? AND tenant_id = ?').bind(imageId, tenantId).first<GalleryImage>();
}

export async function deleteGalleryImage(env: Env, tenantId: string, imageId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM gallery_images WHERE id = ? AND tenant_id = ?').bind(imageId, tenantId).run();
}

export async function updateTenantFields(env: Env, id: string, fields: Record<string, any>): Promise<void> {
  const keys = Object.keys(fields).filter(k => (TENANT_EDITABLE_FIELDS as readonly string[]).includes(k));
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await env.DB.prepare(`UPDATE tenants SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...values, id).run();
}

// Fields only the operator's super-admin may change — lifecycle/identity,
// not branding content (that stays the agency's own job via /admin).
const SUPER_ADMIN_FIELDS = ['active', 'custom_domain'] as const;

export async function updateTenantAdminFields(env: Env, id: string, fields: Record<string, any>): Promise<void> {
  const keys = Object.keys(fields).filter(k => (SUPER_ADMIN_FIELDS as readonly string[]).includes(k));
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await env.DB.prepare(`UPDATE tenants SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...values, id).run();
}

export async function createTenant(env: Env, opts: { slug: string; brand_name: string; admin_password_hash: string }): Promise<Tenant> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO tenants (id, slug, admin_password_hash, brand_name) VALUES (?, ?, ?, ?)`
  ).bind(id, opts.slug, opts.admin_password_hash, opts.brand_name).run();
  const created = await getTenantById(env, id);
  if (!created) throw new Error('Tenant creation failed');
  return created;
}

export async function getSuperAdminPasswordHash(env: Env): Promise<string | null> {
  const row = await env.DB.prepare('SELECT password_hash FROM super_admin WHERE id = 1').first<{ password_hash: string }>();
  return row?.password_hash ?? null;
}

export async function updateSuperAdminPasswordHash(env: Env, hash: string): Promise<void> {
  await env.DB.prepare('UPDATE super_admin SET password_hash = ? WHERE id = 1').bind(hash).run();
}

export async function updateTenantPasswordHash(env: Env, tenantId: string, hash: string): Promise<void> {
  await env.DB.prepare("UPDATE tenants SET admin_password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(hash, tenantId).run();
}

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

// Returns true if this key (scope + IP, e.g. "tenant:<id>:1.2.3.4") is
// currently locked out from further login attempts.
export async function isLoginLocked(env: Env, key: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT count, window_start FROM login_attempts WHERE key = ? AND window_start > datetime('now', ?)`
  ).bind(key, `-${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes`).first<{ count: number }>();
  return !!row && row.count >= LOGIN_ATTEMPT_LIMIT;
}

export async function recordFailedLogin(env: Env, key: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO login_attempts (key, count, window_start) VALUES (?, 1, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start > datetime('now', ?) THEN count + 1 ELSE 1 END,
       window_start = CASE WHEN window_start > datetime('now', ?) THEN window_start ELSE datetime('now') END`
  ).bind(key, `-${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes`, `-${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes`).run();
}

export async function clearLoginAttempts(env: Env, key: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM login_attempts WHERE key = ?`).bind(key).run();
}
