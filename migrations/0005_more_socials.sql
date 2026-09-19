-- Facebook/Instagram existed in the schema already (instagram_url was
-- never actually wired into the template — dead field). Adding TikTok and
-- YouTube too, and this migration is also what finally makes Instagram
-- show up on the live site.
ALTER TABLE tenants ADD COLUMN tiktok_url TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN youtube_url TEXT NOT NULL DEFAULT '';
