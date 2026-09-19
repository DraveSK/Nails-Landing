-- One row per agency ("đại lý"). Resolved by `slug` from the request's
-- subdomain (slug.nails.drave.sk) or by `custom_domain` if they later point
-- their own domain at this Worker — same resolution idea as the main
-- Nail-Core product's tenant lookup, just backed by D1 instead of
-- Firestore since this product has no need for Firestore's realtime/nested
-- collections (a handful of flat fields + a short service list).
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  admin_password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,

  -- Branding
  brand_name TEXT NOT NULL DEFAULT 'Nail Salón',
  logo_data_url TEXT,               -- base64 data: URL, kept inline in D1 (no R2 needed for this product)
  color_primary TEXT NOT NULL DEFAULT '#FF3D8A',
  color_secondary TEXT NOT NULL DEFAULT '#8B2FF0',

  -- Hero / header content
  eyebrow_text TEXT NOT NULL DEFAULT '💅 Nail salón',
  hero_title TEXT NOT NULL DEFAULT 'Nechty, čo žiaria tak ako vy.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Farebné gél nechty, nail art a starostlivosť, po ktorej sa budete cítiť ako hviezda.',

  -- Contact / footer content
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',   -- digits only, e.g. 421900123456 — used for wa.me links
  email TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  calendly_url TEXT NOT NULL DEFAULT '',      -- the agency's own Calendly link; booking is entirely Calendly's job, not ours
  hours_weekday TEXT NOT NULL DEFAULT '9:00 – 19:00',
  hours_saturday TEXT NOT NULL DEFAULT '9:00 – 15:00',
  hours_sunday TEXT NOT NULL DEFAULT 'Zatvorené',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT NOT NULL,     -- text, not a number: lets an agency write "od 25€" / "25-40€" freely
  icon TEXT NOT NULL DEFAULT '💅',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_services_tenant ON services(tenant_id, sort_order);

-- The operator's own login (super-admin, creates/manages every agency) —
-- a single shared password, not per-agency. Seeded separately via a
-- one-off script, not part of this migration, so the real password never
-- sits in migration history.
CREATE TABLE super_admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL
);
