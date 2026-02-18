-- Run once on your Neon DB so the hint text persists across login (game + daily).
-- In Neon Console → SQL Editor, paste and run this.

ALTER TABLE "game_sessions"
  ADD COLUMN IF NOT EXISTS "power_hint_text" text;

ALTER TABLE "daily_sessions"
  ADD COLUMN IF NOT EXISTS "power_hint_text" text;
