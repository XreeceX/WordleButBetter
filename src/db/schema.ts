import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// NextAuth.js required tables (for Drizzle adapter)
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("account_user_id_idx").on(table.userId),
  ]
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const verificationTokens = pgTable("verification_token", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// Game domain tables

/** Dictionary words (5–7 letters). Seeded once. */
export const words = pgTable(
  "words",
  {
    id: text("id").primaryKey(),
    word: text("word").notNull(),
    length: integer("length").notNull(),
  },
  (table) => [
    uniqueIndex("words_word_idx").on(table.word),
    index("words_length_idx").on(table.length),
  ]
);

/** LLM-approved guess words (not necessarily in target list). Caches so we don't call API repeatedly. */
export const validGuesses = pgTable(
  "valid_guesses",
  {
    word: text("word").primaryKey(),
    length: integer("length").notNull(),
  },
  (table) => [index("valid_guesses_length_idx").on(table.length)]
);

/** Per-user progress: which words they've solved or attempted. */
export const userWordProgress = pgTable(
  "user_word_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    solved: integer("solved").notNull().default(0), // 1 = solved, 0 = attempted only
    attemptedAt: timestamp("attempted_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_word_progress_user_word_idx").on(table.userId, table.wordId),
    index("user_word_progress_user_id_idx").on(table.userId),
    index("user_word_progress_word_id_idx").on(table.wordId),
  ]
);

/** User stats: games played, solved, streaks. */
export const userStats = pgTable(
  "user_stats",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    gamesPlayed: integer("games_played").notNull().default(0),
    wordsSolved: integer("words_solved").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    maxStreak: integer("max_streak").notNull().default(0),
    lastPlayedAt: timestamp("last_played_at", { mode: "date" }),
  },
  (table) => [index("user_stats_user_id_idx").on(table.userId)]
);

/** Active game sessions: current level word (server-only reference), attempts. */
export const gameSessions = pgTable(
  "game_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(6),
    state: text("state").notNull().default("playing"), // playing | won | lost
    guessHistory: text("guess_history"), // JSON string[] of guesses
    evaluationHistory: text("evaluation_history"), // JSON array of LetterStatus[]
    hintsUsed: integer("hints_used").notNull().default(0), // letter hints used (max 4)
    hintPositions: text("hint_positions"), // JSON number[] of revealed positions
    powerHintUsed: integer("power_hint_used").notNull().default(0), // 0 or 1
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("game_sessions_user_id_idx").on(table.userId),
    index("game_sessions_user_state_idx").on(table.userId, table.state),
  ]
);

/** Daily challenge: one row per user per day (UTC date). Same word for everyone. */
export const dailySessions = pgTable(
  "daily_sessions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD UTC
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(6),
    state: text("state").notNull().default("playing"),
    guessHistory: text("guess_history"),
    evaluationHistory: text("evaluation_history"),
    hintsUsed: integer("hints_used").notNull().default(0),
    hintPositions: text("hint_positions"),
    powerHintUsed: integer("power_hint_used").notNull().default(0),
    completedAt: timestamp("completed_at", { mode: "date" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    index("daily_sessions_date_idx").on(table.date),
  ]
);

// Types for schema
export type User = typeof users.$inferSelect;
export type Word = typeof words.$inferSelect;
export type UserWordProgress = typeof userWordProgress.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type DailySession = typeof dailySessions.$inferSelect;
