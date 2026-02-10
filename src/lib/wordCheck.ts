import { db } from "@/db";
import { words, validGuesses } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Check if a word is valid: first in game words, then in LLM-approved cache, then ask Groq (free LLM).
 * When the LLM says yes, we cache it in valid_guesses so we don't call the API again.
 */
export async function isWordValid(word: string, length: number): Promise<boolean> {
  const w = word.trim().toLowerCase();
  if (w.length !== length) return false;

  // 1) In target word list (words table)
  const inWords = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, w), eq(words.length, length)))
    .limit(1);
  if (inWords.length > 0) return true;

  // 2) In LLM cache (valid_guesses)
  const inCache = await db
    .select({ word: validGuesses.word })
    .from(validGuesses)
    .where(and(eq(validGuesses.word, w), eq(validGuesses.length, length)))
    .limit(1);
  if (inCache.length > 0) return true;

  // 3) Ask Groq free LLM (if configured)
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return false;

  const valid = await checkWordWithGroq(w, apiKey);
  if (valid) {
    await db.insert(validGuesses).values({ word: w, length }).onConflictDoNothing({ target: validGuesses.word });
  }
  return valid;
}

async function checkWordWithGroq(word: string, apiKey: string): Promise<boolean> {
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
            content: `Is "${word}" a valid English word (as used in word games like Scrabble or Wordle)? \
Accept: plurals (e.g. words, cats, boxes), past tense (e.g. walked, tried), -ing forms (e.g. running), \
comparatives (e.g. bigger), and other standard inflections. Only reject if it is not a real English word. \
Answer only YES or NO.`,
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "";
    return text.startsWith("YES");
  } catch {
    return false;
  }
}
