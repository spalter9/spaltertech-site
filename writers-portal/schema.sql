-- Spalter Rights Portal — D1 schema
-- Run once against your D1 database:
--   wrangler d1 execute <DB_NAME> --file=writers-portal/schema.sql --remote
-- Then bind it to the Pages project as "DB" (Settings -> Functions -> D1 database bindings).

CREATE TABLE IF NOT EXISTS writers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'writer',        -- 'writer' | 'staff'
  ipi TEXT,
  pro TEXT,
  mogul_asset_owner_id TEXT,                  -- filled in by staff once linked to a Mogul PUBLISHING asset owner
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  writer_id TEXT NOT NULL REFERENCES writers(id),
  title TEXT NOT NULL,
  isrc TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',   -- submitted | in_review | approved | registered | rejected
  staff_note TEXT,
  mogul_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS splits (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id),
  writer_id TEXT NOT NULL REFERENCES writers(id),
  role TEXT NOT NULL DEFAULT 'writer',        -- writer | publisher
  percentage REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',    -- proposed | confirmed | approved | rejected
  staff_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  writer_id TEXT NOT NULL REFERENCES writers(id),
  sender TEXT NOT NULL,                       -- 'writer' | 'staff'
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_writer ON tracks(writer_id);
CREATE INDEX IF NOT EXISTS idx_splits_track ON splits(track_id);
CREATE INDEX IF NOT EXISTS idx_splits_writer ON splits(writer_id);
CREATE INDEX IF NOT EXISTS idx_messages_writer ON messages(writer_id);
