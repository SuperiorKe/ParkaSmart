import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "parkasmart.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    shop_number TEXT,
    floor_code TEXT,
    building TEXT NOT NULL,
    monthly_rate INTEGER DEFAULT 300,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS parking_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT NOT NULL,
    driver_name TEXT,
    phone TEXT,
    shop_number TEXT,
    building TEXT,
    tenant_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount_paid INTEGER NOT NULL,
    is_paid INTEGER DEFAULT 0,
    entry_time TEXT NOT NULL,
    reference_code TEXT NOT NULL
  );
`);
