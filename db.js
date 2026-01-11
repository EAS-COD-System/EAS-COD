import Database from "better-sqlite3";

export const db = new Database("data.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  shop TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  shop TEXT PRIMARY KEY,
  thank_you_url TEXT,
  sheets_webhook_url TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  shop TEXT,
  country TEXT,
  currency TEXT,
  total REAL,
  created_at TEXT
);
`);
