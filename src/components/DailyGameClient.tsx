"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameGrid } from "./GameGrid";
import { Keyboard, getKeyStatusFromEvaluations } from "./Keyboard";
import type { DailyGameState } from "@/actions/daily";
import type { LetterStatus } from "@/lib/game";
import { submitDailyGuess, getDailyRevealWord, getDailyPowerHint } from "@/actions/daily";

type Props = {
  date: string;
  initialState: DailyGameState;
};

export function DailyGameClient({ date, initialState }: Props) {
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
  const [powerHintUsed, setPowerHintUsed] = useState(initialState.powerHintUsed);
  const [powerHintText, setPowerHintText] = useState<string | null>(initialState.powerHintText ?? null);
  const [hintLoading, setHintLoading] = useState(false);

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
          const delay = 700;
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

  const handlePowerHint = useCallback(async () => {
    if (hintLoading || powerHintUsed) return;
    setHintLoading(true);
    const result = await getDailyPowerHint(date);
    setHintLoading(false);
    if (result.ok) {
      setPowerHintUsed(true);
      setPowerHintText(result.hint);
    } else {
      setMessage(result.error);
    }
  }, [date, hintLoading, powerHintUsed]);

  const keyStatus = getKeyStatusFromEvaluations(attempts, evaluations);

  const animatingEvaluation = animatingRow !== null && evaluations[animatingRow] ? evaluations[animatingRow] : [];
  const correctCountInAnimatingRow = animatingEvaluation.filter((s) => s === "correct").length;
  const boardShakeClass =
    animatingRow !== null && correctCountInAnimatingRow > 0
      ? `board-shake-${Math.min(correctCountInAnimatingRow, 7)}`
      : "";

  return (
    <div
      key={animatingRow !== null ? `shake-${animatingRow}-${attempts.length}` : "idle"}
      className={`flex flex-col items-center min-h-0 w-full py-1 gap-[min(0.5rem,1.5vh)] ${boardShakeClass}`}
    >
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

      {powerHintText && (
        <p className="shrink-0 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-200 text-sm italic max-w-md animate-pop">
          &ldquo;{powerHintText}&rdquo;
        </p>
      )}
      {message && (
        <p className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium animate-pop inline-block">
          {message}
        </p>
      )}

      {state === "playing" && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handlePowerHint}
            disabled={hintLoading || powerHintUsed}
            className="px-4 py-2 rounded-xl font-medium text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-md shadow-violet-900/30"
          >
            {powerHintUsed ? "Hint used" : "✨ Hint"}
          </button>
        </div>
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
    </div>
  );
}
