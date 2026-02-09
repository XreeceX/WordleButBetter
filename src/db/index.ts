import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

/** Normalize DATABASE_URL: strip Neon's "psql '...'" shell wrapper if present. */
function getConnectionString(): string {
  let raw =
    process.env.DATABASE_URL ||
    "postgresql://placeholder:placeholder@placeholder.region.aws.neon.tech/placeholder?sslmode=require";
  raw = raw.trim();
  if (raw.startsWith("psql ")) raw = raw.slice(5).trim();
  if (raw.startsWith("'")) raw = raw.slice(1);
  if (raw.endsWith("'")) raw = raw.slice(0, -1);
  return raw;
}

const connectionString = getConnectionString();
const sql = neon(connectionString);
export const db = drizzle(sql);
