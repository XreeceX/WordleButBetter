"use server";

import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { words, dailySessions, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { isWordValid } from "@/lib/wordCheck";
import { evaluateGuess, isWordLengthValid } from "@/lib/game";
import { fetchMeaningHint } from "@/actions/game";
import { revalidatePath } from "next/cache";

export type DailyGameState = {
  sessionId: string;
  wordLength: number;
  attempts: string[];
  evaluations: Array<Array<"correct" | "present" | "absent">>;
  state: "playing" | "won" | "lost";
  maxAttempts: number;
  hintsUsed: number;
  powerHintUsed: boolean;
  powerHintText: string | null;
};

export type DailyRankEntry = {
  rank: number;
  userId: string;
  displayName: string;
  attempts: number;
  completedAt: Date;
  isCurrentUser?: boolean;
};

/** Deterministic word id for a given date (same for everyone). Uses 5-letter words only. */
export async function getDailyWordId(date: string): Promise<string | null> {
  const list = await db
    .select({ id: words.id })
    .from(words)
    .where(eq(words.length, 5))
    .orderBy(words.word);
  if (list.length === 0) return null;
  const hash = createHash("sha256").update(date).digest();
  const index = hash.readUInt32BE(0) % list.length;
  return list[index].id;
}

/** Get or create daily session for the current user and date. */
export async function getOrCreateDailyState(
  date: string
): Promise<DailyGameState | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const wordId = await getDailyWordId(date);
  if (!wordId) return null;

  const [wordRow] = await db
    .select({ length: words.length })
    .from(words)
    .where(eq(words.id, wordId))
    .limit(1);
  const wordLength = wordRow?.length ?? 5;

  const existing = await db
    .select()
    .from(dailySessions)
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const s = existing[0];
    const attempts: string[] = s.guessHistory ? JSON.parse(s.guessHistory) : [];
    const evaluations: Array<Array<"correct" | "present" | "absent">> =
      s.evaluationHistory ? JSON.parse(s.evaluationHistory) : [];
    return {
      sessionId: `daily:${date}`,
      wordLength,
      attempts,
      evaluations,
      state: s.state as "playing" | "won" | "lost",
      maxAttempts: s.maxAttempts,
      hintsUsed: s.hintsUsed ?? 0,
      powerHintUsed: (s.powerHintUsed ?? 0) === 1,
      powerHintText: s.powerHintText ?? null,
    };
  }

  await db.insert(dailySessions).values({
    userId,
    date,
    wordId,
    attempts: 0,
    maxAttempts: 6,
    state: "playing",
  });

  return {
    sessionId: `daily:${date}`,
    wordLength,
    attempts: [],
    evaluations: [],
    state: "playing",
    maxAttempts: 6,
    hintsUsed: 0,
    powerHintUsed: false,
    powerHintText: null,
  };
}

/** Submit a guess for the daily challenge. */
export async function submitDailyGuess(
  date: string,
  guess: string
): Promise<
  | { ok: true; evaluation: ("correct" | "present" | "absent")[]; state: "playing" | "won" | "lost" }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const g = guess.trim().toLowerCase();
  if (!isWordLengthValid(g) || g.length !== 5)
    return { ok: false, error: "Daily word is 5 letters" };

  const [daily] = await db
    .select()
    .from(dailySessions)
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    )
    .limit(1);

  if (!daily || daily.state !== "playing")
    return { ok: false, error: "No active daily game" };

  if (daily.attempts >= daily.maxAttempts)
    return { ok: false, error: "No attempts left" };

  const [wordRow] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, daily.wordId))
    .limit(1);
  if (!wordRow) return { ok: false, error: "Word not found" };

  const inDictionary = await isWordValid(g, 5);
  if (!inDictionary) return { ok: false, error: "Not in dictionary" };

  const target = wordRow.word;
  const evaluation = evaluateGuess(g, target);
  const won = evaluation.every((s) => s === "correct");
  const newAttempts = daily.attempts + 1;
  const lost = !won && newAttempts >= daily.maxAttempts;
  const newState = won ? "won" : lost ? "lost" : "playing";

  const prevGuesses: string[] = daily.guessHistory ? JSON.parse(daily.guessHistory) : [];
  const prevEvals: Array<Array<"correct" | "present" | "absent">> =
    daily.evaluationHistory ? JSON.parse(daily.evaluationHistory) : [];

  await db
    .update(dailySessions)
    .set({
      attempts: newAttempts,
      state: newState,
      guessHistory: JSON.stringify([...prevGuesses, g]),
      evaluationHistory: JSON.stringify([...prevEvals, evaluation]),
      completedAt: won || lost ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    );

  revalidatePath("/daily");
  return { ok: true, evaluation, state: newState };
}

/** Get power hint for daily challenge (one per day). */
export async function getDailyPowerHint(
  date: string
): Promise<{ ok: true; hint: string } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const [daily] = await db
    .select()
    .from(dailySessions)
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    )
    .limit(1);

  if (!daily || daily.state !== "playing")
    return { ok: false, error: "No active daily game" };

  if ((daily.powerHintUsed ?? 0) === 1)
    return { ok: false, error: "Hint already used today" };

  const [wordRow] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, daily.wordId))
    .limit(1);
  if (!wordRow) return { ok: false, error: "Word not found" };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "Hint not configured" };

  const hint = await fetchMeaningHint(wordRow.word, apiKey);
  if (!hint) return { ok: false, error: "Could not get hint" };

  await db
    .update(dailySessions)
    .set({
      powerHintUsed: 1,
      powerHintText: hint,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    );

  revalidatePath("/daily");
  return { ok: true, hint };
}

/** Get the target word for daily (after game ended). */
export async function getDailyRevealWord(date: string): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [daily] = await db
    .select({ wordId: dailySessions.wordId, state: dailySessions.state })
    .from(dailySessions)
    .where(
      and(
        eq(dailySessions.userId, userId),
        eq(dailySessions.date, date)
      )
    )
    .limit(1);
  if (!daily || daily.state === "playing") return null;

  const [w] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, daily.wordId))
    .limit(1);
  return w?.word ?? null;
}

/** Rankings for the daily challenge (winners only, by attempts then completedAt). */
export async function getDailyRankings(
  date: string,
  currentUserId: string | undefined
): Promise<DailyRankEntry[]> {
  const rows = await db
    .select({
      userId: dailySessions.userId,
      attempts: dailySessions.attempts,
      completedAt: dailySessions.completedAt,
      name: users.name,
      email: users.email,
    })
    .from(dailySessions)
    .innerJoin(users, eq(dailySessions.userId, users.id))
    .where(
      and(
        eq(dailySessions.date, date),
        eq(dailySessions.state, "won")
      )
    )
    .orderBy(asc(dailySessions.attempts), asc(dailySessions.completedAt))
    .limit(100);

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: r.name?.trim() || r.email?.split("@")[0] || "Player",
    attempts: r.attempts,
    completedAt: r.completedAt!,
    isCurrentUser: r.userId === currentUserId,
  }));
}
