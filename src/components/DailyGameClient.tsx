"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameGrid } from "./GameGrid";
import { Keyboard, getKeyStatusFromEvaluations } from "./Keyboard";
import type { DailyGameState, DailyRankEntry } from "@/actions/daily";
import type { LetterStatus } from "@/lib/game";
import { submitDailyGuess, getDailyRevealWord } from "@/actions/daily";

type Props = {
  date: string;
  initialState: DailyGameState;
  rankings: DailyRankEntry[];
};

export function DailyGameClient({ date, initialState, rankings: initialRankings }: Props) {
  const router = useRouter();
  const [wordLength] = useState(initialState.wordLength);
  const [attempts, setAttempts] = useState<string[]>(initialState.attempts);
  const [evaluations, setEvaluations] = useState<Array<Array<LetterStatus>>>(
    initialState.evaluations
  );
  const [currentGuess, setCurrentGuess] = useState("");
  const [state, setState] = useState<"playing" | "won" | "lost">(initialState.state);
  const [maxAttempts] = useState(initialState.maxAttempts);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [animatingRow, setAnimatingRow] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);

  const currentRow = attempts.length;

  const handleKey = useCallback(
    (key: string) => {
      if (state !== "playing") return;
      if (key === "Enter") {
        if (currentGuess.length !== wordLength) {
          setMessage("Not enough letters");
          return;
        }
        setMessage(null);
        submitDailyGuess(date, currentGuess).then((result) => {
          if (!result.ok) {
            setMessage(result.error);
            setShakeRow(currentRow);
            setTimeout(() => setShakeRow(null), 400);
            return;
          }
          setAnimatingRow(currentRow);
          setAttempts((p) => [...p, currentGuess]);
          setEvaluations((p) => [...p, result.evaluation]);
          setCurrentGuess("");
          setState(result.state);
          const delay = wordLength * 80 + 500;
          setTimeout(() => setAnimatingRow(null), delay);
          if (result.state === "won") {
            router.refresh();
          }
        });
        return;
      }
      if (key === "Backspace") {
        setCurrentGuess((p) => p.slice(0, -1));
        setMessage(null);
        return;
      }
      if (key.length === 1 && /[a-z]/i.test(key) && currentGuess.length < wordLength) {
        setCurrentGuess((p) => p + key.toLowerCase());
        setMessage(null);
      }
    },
    [state, currentGuess, wordLength, currentRow, date]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleKey("Enter");
        return;
      }
      if (e.key === "Backspace") {
        handleKey("Backspace");
        return;
      }
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        handleKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  useEffect(() => {
    if (state === "lost") {
      getDailyRevealWord(date).then(setRevealedWord);
    }
  }, [state, date]);

  const keyStatus = getKeyStatusFromEvaluations(attempts, evaluations);

  return (
    <div className="flex flex-col items-center max-h-full overflow-hidden py-1 gap-[min(0.5rem,1.5vh)]">
      <GameGrid
        wordLength={wordLength}
        maxAttempts={maxAttempts}
        attempts={attempts}
        evaluations={evaluations}
        currentGuess={currentGuess}
        currentRow={currentRow}
        animatingRow={animatingRow}
        shakeRow={shakeRow}
      />

      {message && (
        <p className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium animate-pop inline-block">
          {message}
        </p>
      )}

      {state === "won" && (
        <div className="shrink-0 mt-4 text-center space-y-4">
          <p className="text-2xl font-bold text-[var(--correct)] drop-shadow-[0_0_12px_var(--correct-glow)]">
            You got it in {attempts.length} {attempts.length === 1 ? "try" : "tries"}!
          </p>
          <Link
            href="/"
            className="inline-block px-7 py-3 rounded-xl font-semibold bg-[var(--correct)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[var(--correct-glow)]"
          >
            Back to game
          </Link>
        </div>
      )}

      {state === "lost" && (
        <div className="shrink-0 mt-4 text-center space-y-4">
          <p className="text-xl font-bold text-[var(--text-muted)]">Better luck tomorrow</p>
          {revealedWord && (
            <p className="text-lg">
              The word was: <span className="font-bold text-white">{revealedWord}</span>
            </p>
          )}
          <Link
            href="/"
            className="inline-block px-7 py-3 rounded-xl font-semibold bg-[var(--correct)] text-white hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Back to game
          </Link>
        </div>
      )}

      {state === "playing" && (
        <Keyboard onKey={handleKey} keyStatus={keyStatus} />
      )}

      {(state === "won" || state === "lost") && (
        <div className="shrink-0 opacity-60">
          <Keyboard onKey={() => {}} keyStatus={keyStatus} disabled />
        </div>
      )}

      <div className="shrink-0 w-full max-w-md mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Today&apos;s rankings
        </h3>
        {initialRankings.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No one has solved it yet. Be the first!</p>
        ) : (
          <ul className="rounded-xl bg-[var(--surface)]/80 border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {initialRankings.slice(0, 10).map((entry) => (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-2 text-sm ${
                  entry.isCurrentUser ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]" : ""
                }`}
              >
                <span className={`w-6 text-center font-bold ${entry.rank <= 3 ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
                  {entry.rank}
                </span>
                <span className="flex-1 truncate font-medium text-white">
                  {entry.displayName}
                  {entry.isCurrentUser && <span className="ml-1 text-[var(--accent)] text-xs">(you)</span>}
                </span>
                <span className="tabular-nums text-[var(--correct)]">{entry.attempts} tries</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
