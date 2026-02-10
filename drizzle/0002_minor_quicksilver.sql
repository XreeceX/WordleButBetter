CREATE TABLE "daily_sessions" (
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"word_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 6 NOT NULL,
	"state" text DEFAULT 'playing' NOT NULL,
	"guess_history" text,
	"evaluation_history" text,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"hint_positions" text,
	"power_hint_used" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_sessions_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_sessions_date_idx" ON "daily_sessions" USING btree ("date");