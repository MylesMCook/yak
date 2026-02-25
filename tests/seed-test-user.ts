/**
 * One-off script to create the e2e test user in SQLite.
 * Run: TEST_EMAIL=test@example.com TEST_PASSWORD=yourpassword pnpm exec tsx tests/seed-test-user.ts
 * Then set the same TEST_EMAIL and TEST_PASSWORD when running Playwright.
 */
import { config } from "dotenv";
import Database from "better-sqlite3";
import { hashSync, genSaltSync } from "bcrypt-ts";
config({ path: ".env.local" });

const dbPath = process.env.DATABASE_PATH ?? "./data/yak.sqlite";
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

if (!email || !password) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD");
  process.exit(1);
}

const db = new Database(dbPath);
const testUserId = "e2e-test-user-00000000-0000-0000-0000-000000000001";
const hash = hashSync(password, genSaltSync(10));

try {
  db.prepare(
    "INSERT OR REPLACE INTO users (id, email, password) VALUES (?, ?, ?)"
  ).run(testUserId, email, hash);
  console.log("Test user created:", email);
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  db.close();
}
