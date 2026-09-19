-- The map embed/directions links were only ever derived from geocoding the
-- free-text `address` field, which can pin the wrong spot for an
-- ambiguous address. This lets an agency paste their own Google Maps
-- share link instead, for the two clickable links (the iframe embed still
-- uses the address — a full custom embed URL requires Google's own
-- "Share > Embed a map" flow, which isn't something to ask an agency to
-- go find).
ALTER TABLE tenants ADD COLUMN maps_url TEXT NOT NULL DEFAULT '';
