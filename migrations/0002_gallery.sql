-- Shop + service photo album, shown on the tenant site as a page-flip
-- book. Actual image bytes live in R2 (bucket "nails-landing-gallery",
-- binding GALLERY); this table is just the ordered index of what each
-- tenant has uploaded.
CREATE TABLE gallery_images (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,       -- e.g. "<tenant_id>/<uuid>.jpg"
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gallery_tenant ON gallery_images(tenant_id, sort_order);
