import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

const dbPath = process.env.DATABASE_PATH ?? "./data/pi-chat.sqlite";
const url = dbPath.startsWith("/") ? `file:${dbPath}` : `file:${dbPath}`;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url,
  },
});
