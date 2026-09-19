-- The original template's service cards show a short description under the
-- title (e.g. "Trvácne a lesklé, vydržia až 4 týždne bez odlupovania.") —
-- needed now that the tenant site is rendered from that same template
-- instead of a simplified rebuild.
ALTER TABLE services ADD COLUMN description TEXT NOT NULL DEFAULT '';
