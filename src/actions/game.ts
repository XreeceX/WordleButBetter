"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  words,
  userWordProgress,
  userStats,
  gameSessions,
} from "@/db/schema";
import { isWordValid } from "@/lib/wordCheck";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { evaluateGuess, isWordLengthValid } from "@/lib/game";
import { revalidatePath } from "next/cache";

const WORD_LENGTHS = [5, 6, 7] as const;

export type GameState = {
  sessionId: string;
  wordLength: number;
  attempts: string[];
  evaluations: Array<Array<"correct" | "present" | "absent">>;
  state: "playing" | "won" | "lost";
  maxAttempts: number;
  hintsUsed: number;
  powerHintUsed: boolean;
};

/** Get random length 5–7 for this level. */
function randomLength(): number {
  return WORD_LENGTHS[Math.floor(Math.random() * WORD_LENGTHS.length)];
}

/** Fetch a random word that the user has not solved (by length). */
export async function getRandomWordForUser(
  userId: string,
  length: number
): Promise<{ wordId: string; length: number } | null> {
  const solved = await db
    .select({ wordId: userWordProgress.wordId })
    .from(userWordProgress)
    .where(
      and(
        eq(userWordProgress.userId, userId),
        eq(userWordProgress.solved, 1)
      )
    );

  const solvedIds = solved.length ? solved.map((r) => r.wordId) : ["__none__"];

  const pool = await db
    .select({ id: words.id, length: words.length })
    .from(words)
    .where(
      and(
        eq(words.length, length),
        notInArray(words.id, solvedIds)
      )
    )
    .limit(500);

  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return { wordId: chosen.id, length: chosen.length };
}

/** Get or create current game session and return public state (no word). */
export async function getOrCreateGameState(): Promise<GameState | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const existing = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.state, "playing")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const s = existing[0];
    const [wordRow] = await db
      .select({ length: words.length })
      .from(words)
      .where(eq(words.id, s.wordId))
      .limit(1);
    const wordLength = wordRow?.length ?? 5;
    const attempts: string[] = s.guessHistory ? JSON.parse(s.guessHistory) : [];
    const evaluations: Array<Array<"correct" | "present" | "absent">> =
      s.evaluationHistory ? JSON.parse(s.evaluationHistory) : [];
    return {
      sessionId: s.id,
      wordLength,
      attempts,
      evaluations,
      state: s.state as "playing" | "won" | "lost",
      maxAttempts: s.maxAttempts,
      hintsUsed: s.hintsUsed ?? 0,
      powerHintUsed: (s.powerHintUsed ?? 0) === 1,
    };
  }

  const length = randomLength();
  const wordResult = await getRandomWordForUser(userId, length);
  if (!wordResult) {
    return null; // no words left — caller should show "all solved"
  }

  const sessionId = randomUUID();
  await db.insert(gameSessions).values({
    id: sessionId,
    userId,
    wordId: wordResult.wordId,
    attempts: 0,
    maxAttempts: 6,
    state: "playing",
  });

  // Do not call revalidatePath here: getOrCreateGameState can run during page render,
  // and revalidatePath during render is not allowed. The response already has the new state.
  return {
    sessionId,
    wordLength: wordResult.length,
    attempts: [],
    evaluations: [],
    state: "playing",
    maxAttempts: 6,
    hintsUsed: 0,
    powerHintUsed: false,
  };
}

/** Validate guess: length, dictionary. Returns evaluation or error. */
export async function submitGuess(
  sessionId: string,
  guess: string
): Promise<
  | { ok: true; evaluation: ("correct" | "present" | "absent")[]; state: "playing" | "won" | "lost" }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const g = guess.trim().toLowerCase();
  if (!isWordLengthValid(g))
    return { ok: false, error: "Word must be 5–7 letters" };

  const [game] = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.userId, userId)
      )
    )
    .limit(1);

  if (!game || game.state !== "playing")
    return { ok: false, error: "Invalid or finished game" };

  if (game.attempts >= game.maxAttempts)
    return { ok: false, error: "No attempts left" };

  const [wordRow] = await db
    .select({ word: words.word, length: words.length })
    .from(words)
    .where(eq(words.id, game.wordId))
    .limit(1);

  if (!wordRow || wordRow.length !== g.length)
    return { ok: false, error: "Wrong word length" };

  const target = wordRow.word;
  const inDictionary = await isWordValid(g, target.length);
  if (!inDictionary)
    return { ok: false, error: "Not in dictionary" };

  const evaluation = evaluateGuess(g, target);
  const won = evaluation.every((s) => s === "correct");
  const newAttempts = game.attempts + 1;
  const lost = !won && newAttempts >= game.maxAttempts;

  const newState = won ? "won" : lost ? "lost" : "playing";

  const prevGuesses: string[] = game.guessHistory ? JSON.parse(game.guessHistory) : [];
  const prevEvals: Array<Array<"correct" | "present" | "absent">> =
    game.evaluationHistory ? JSON.parse(game.evaluationHistory) : [];
  await db
    .update(gameSessions)
    .set({
      attempts: newAttempts,
      state: newState,
      guessHistory: JSON.stringify([...prevGuesses, g]),
      evaluationHistory: JSON.stringify([...prevEvals, evaluation]),
      updatedAt: new Date(),
    })
    .where(eq(gameSessions.id, sessionId));

  if (won || lost) {
    await db.insert(userWordProgress).values({
      id: randomUUID(),
      userId,
      wordId: game.wordId,
      solved: won ? 1 : 0,
    }).onConflictDoUpdate({
      target: [userWordProgress.userId, userWordProgress.wordId],
      set: { solved: won ? 1 : 0, attemptedAt: new Date() },
    });

    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    const now = new Date();
    const lastPlayed = stats?.lastPlayedAt;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const sameDay = lastPlayed && (
      lastPlayed.getFullYear() === yesterday.getFullYear() &&
      lastPlayed.getMonth() === yesterday.getMonth() &&
      lastPlayed.getDate() === yesterday.getDate()
    );
    const currentStreak = stats
      ? (sameDay || !lastPlayed ? stats.currentStreak + 1 : 1)
      : 1;
    const maxStreak = stats
      ? Math.max(stats.maxStreak, currentStreak)
      : currentStreak;

    await db
      .insert(userStats)
      .values({
        userId,
        gamesPlayed: (stats?.gamesPlayed ?? 0) + 1,
        wordsSolved: (stats?.wordsSolved ?? 0) + (won ? 1 : 0),
        currentStreak: won ? currentStreak : 0,
        maxStreak,
        lastPlayedAt: now,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          gamesPlayed: sql`${userStats.gamesPlayed} + 1`,
          wordsSolved: won ? sql`${userStats.wordsSolved} + 1` : userStats.wordsSolved,
          currentStreak: won ? currentStreak : 0,
          maxStreak: sql`GREATEST(${userStats.maxStreak}, ${maxStreak})`,
          lastPlayedAt: now,
        },
      });
  }

  revalidatePath("/");
  return {
    ok: true,
    evaluation,
    state: newState,
  };
}

/** Get target word for display (after game ended). */
export async function getRevealWord(sessionId: string): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [game] = await db
    .select({ wordId: gameSessions.wordId, state: gameSessions.state })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.userId, userId)
      )
    )
    .limit(1);

  if (!game || game.state === "playing") return null;

  const [w] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, game.wordId))
    .limit(1);

  return w?.word ?? null;
}

/** Start next level: create new session. */
export async function startNextLevel(): Promise<GameState | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const length = randomLength();
  const wordResult = await getRandomWordForUser(userId, length);
  if (!wordResult) return null;

  const sessionId = randomUUID();
  await db.insert(gameSessions).values({
    id: sessionId,
    userId,
    wordId: wordResult.wordId,
    attempts: 0,
    maxAttempts: 6,
    state: "playing",
  });

  revalidatePath("/");
  return {
    sessionId,
    wordLength: wordResult.length,
    attempts: [],
    evaluations: [],
    state: "playing",
    maxAttempts: 6,
    hintsUsed: 0,
    powerHintUsed: false,
  };
}

const HINT_MAX = 4;

/** Request a letter hint: reveals one random letter and its position (1-based). Max 4 per game. */
export async function requestLetterHint(
  sessionId: string
): Promise<
  | { ok: true; letter: string; position: number }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const [game] = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.userId, userId)
      )
    )
    .limit(1);

  if (!game || game.state !== "playing")
    return { ok: false, error: "No active game" };

  const hintsUsed = game.hintsUsed ?? 0;
  if (hintsUsed >= HINT_MAX)
    return { ok: false, error: `No hints left (${HINT_MAX} max)` };

  const [wordRow] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, game.wordId))
    .limit(1);
  if (!wordRow) return { ok: false, error: "Word not found" };

  const target = wordRow.word;
  const wordLength = target.length;
  const hintPositions: number[] = game.hintPositions ? JSON.parse(game.hintPositions) : [];
  const evaluationHistory: Array<Array<"correct" | "present" | "absent">> =
    game.evaluationHistory ? JSON.parse(game.evaluationHistory) : [];
  const correctPositions = new Set<number>();
  for (const row of evaluationHistory) {
    for (let col = 0; col < row.length && col < wordLength; col++) {
      if (row[col] === "correct") correctPositions.add(col);
    }
  }
  const available = Array.from({ length: wordLength }, (_, i) => i).filter(
    (i) => !hintPositions.includes(i) && !correctPositions.has(i)
  );
  if (available.length === 0)
    return { ok: false, error: "No hintable positions left (rest are correct or already hinted)" };

  const pos = available[Math.floor(Math.random() * available.length)];
  const letter = target[pos];
  const newPositions = [...hintPositions, pos];

  await db
    .update(gameSessions)
    .set({
      hintsUsed: hintsUsed + 1,
      hintPositions: JSON.stringify(newPositions),
      updatedAt: new Date(),
    })
    .where(eq(gameSessions.id, sessionId));

  return { ok: true, letter, position: pos + 1 };
}

/** Get power hint: one per game, returns a cryptic meaning hint via Groq. */
export async function getPowerHint(
  sessionId: string
): Promise<{ ok: true; hint: string } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const [game] = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.userId, userId)
      )
    )
    .limit(1);

  if (!game || game.state !== "playing")
    return { ok: false, error: "No active game" };

  if ((game.powerHintUsed ?? 0) === 1)
    return { ok: false, error: "Power hint already used this game" };

  const [wordRow] = await db
    .select({ word: words.word })
    .from(words)
    .where(eq(words.id, game.wordId))
    .limit(1);
  if (!wordRow) return { ok: false, error: "Word not found" };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "Power hint not configured" };

  const hint = await fetchMeaningHint(wordRow.word, apiKey);
  if (!hint) return { ok: false, error: "Could not get hint" };

  await db
    .update(gameSessions)
    .set({
      powerHintUsed: 1,
      updatedAt: new Date(),
    })
    .where(eq(gameSessions.id, sessionId));

  return { ok: true, hint };
}

async function fetchMeaningHint(word: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Give a single brief cryptic hint about what the word "${word}" means (for a word-guessing game). Do not say the word or spell any letters. One short sentence only.`,
          },
        ],
        max_tokens: 60,
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Check if user has any unsolved words left (for "all solved" state). */
export async function hasUnsolvedWordsLeft(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;

  const solved = await db
    .select({ wordId: userWordProgress.wordId })
    .from(userWordProgress)
    .where(
      and(
        eq(userWordProgress.userId, userId),
        eq(userWordProgress.solved, 1)
      )
    );
  const solvedIds = solved.map((r) => r.wordId);
  if (solvedIds.length === 0) return true;

  const total = await db
    .select({ id: words.id })
    .from(words)
    .where(notInArray(words.id, solvedIds))
    .limit(1);

  return total.length > 0;
}
