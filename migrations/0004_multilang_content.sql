-- The site's language switcher (SK/VI/EN) previously only ever showed real
-- tenant data in Slovak — switching language reverted to the original
-- demo's placeholder text. These columns let an agency fill in all three
-- languages themselves; price stays a single field (not translated, just
-- a number+currency).
ALTER TABLE tenants ADD COLUMN eyebrow_text_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN eyebrow_text_en TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN hero_title_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN hero_title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN hero_subtitle_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN hero_subtitle_en TEXT NOT NULL DEFAULT '';

ALTER TABLE services ADD COLUMN name_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN name_en TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN description_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN description_en TEXT NOT NULL DEFAULT '';
