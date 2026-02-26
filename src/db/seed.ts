import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "parkasmart.db");
const sqlite = new Database(dbPath);

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
`);

const insert = sqlite.prepare(`
  INSERT OR IGNORE INTO tenants (plate_number, name, phone, shop_number, floor_code, building, monthly_rate, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);

const tenants = [
  ["KDA 456B", "James Mwangi", "+254712345678", "015", "F2B", "OTC Mall", 300],
  ["KBZ 789C", "Mary Wanjiku", "+254723456789", "051", "GA", "OTC Mall", 300],
  ["KCE 123A", "Peter Ochieng", "+254734567890", "012", "GC", "Mathai S", 300],
  ["KDF 321D", "Alice Njeri", "+254745678901", "008", "F4", "OTC Mall", 300],
  ["KAA 654E", "Samuel Kiprop", "+254756789012", "023", "GA", "Mathai S", 300],
];

for (const t of tenants) {
  insert.run(...t);
}

console.log("Seeded 5 tenants successfully.");
sqlite.close();
