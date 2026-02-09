-- Run this once on your Neon database if you get: relation "valid_guesses" does not exist
-- Option A: In Neon Console → SQL Editor, paste and run this.
-- Option B: From your machine with DATABASE_URL in .env: npx drizzle-kit push (or run this file with psql)

CREATE TABLE IF NOT EXISTS "valid_guesses" (
  "word" text PRIMARY KEY NOT NULL,
  "length" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "valid_guesses_length_idx" ON "valid_guesses" USING btree ("length");
