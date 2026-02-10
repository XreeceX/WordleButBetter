ALTER TABLE "game_sessions" ADD COLUMN "hints_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "hint_positions" text;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "power_hint_used" integer DEFAULT 0 NOT NULL;