-- Login rate limiting. PBKDF2 (100k iterations) already makes each guess
-- somewhat slow, but that alone doesn't stop a script from hammering the
-- endpoint — no lockout existed at all before this.
CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,      -- "<scope>:<ip or tenant/global>"
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);
