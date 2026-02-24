import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

config({
  path: ".env.local",
});

const dbPath = process.env.DATABASE_PATH ?? "./data/pi-chat.sqlite";

const runMigrate = () => {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite);

  console.log("Running SQLite migrations...");
  const start = Date.now();
  migrate(db, { migrationsFolder: "./lib/db/migrations-sqlite" });
  sqlite.close();
  const end = Date.now();
  console.log("Migrations completed in", end - start, "ms");
  process.exit(0);
};

try {
  runMigrate();
} catch (err) {
  console.error("Migration failed");
  console.error(err);
  process.exit(1);
}
