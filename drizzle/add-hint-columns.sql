-- Run once on your Neon DB to add hint columns to game_sessions (if you get errors about hints_used etc.)
-- In Neon Console → SQL Editor, paste and run this.

ALTER TABLE "game_sessions"
  ADD COLUMN IF NOT EXISTS "hints_used" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hint_positions" text,
  ADD COLUMN IF NOT EXISTS "power_hint_used" integer NOT NULL DEFAULT 0;
