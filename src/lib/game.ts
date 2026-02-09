/**
 * Wordle-style letter evaluation.
 * Duplicate letters: green counts first, then yellow up to occurrences in target.
 */
export type LetterStatus = "correct" | "present" | "absent";

export function evaluateGuess(guess: string, target: string): LetterStatus[] {
  const len = target.length;
  const result: LetterStatus[] = new Array(len).fill("absent");
  const targetCounts = new Map<string, number>();
  for (const c of target) {
    targetCounts.set(c, (targetCounts.get(c) ?? 0) + 1);
  }
  const used = new Map<string, number>();

  // First pass: correct position
  for (let i = 0; i < len; i++) {
    const g = guess[i];
    const t = target[i];
    if (g === t) {
      result[i] = "correct";
      used.set(g, (used.get(g) ?? 0) + 1);
    }
  }

  // Second pass: present (wrong position)
  for (let i = 0; i < len; i++) {
    if (result[i] === "correct") continue;
    const g = guess[i];
    const maxAllowed = targetCounts.get(g) ?? 0;
    const soFar = used.get(g) ?? 0;
    if (soFar < maxAllowed) {
      result[i] = "present";
      used.set(g, soFar + 1);
    }
  }

  return result;
}

export function isWordLengthValid(word: string): boolean {
  const len = word.length;
  return len >= 5 && len <= 7;
}
