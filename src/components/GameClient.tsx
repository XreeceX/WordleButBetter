"use client";

import { useCallback, useEffect, useState } from "react";
import { GameGrid } from "./GameGrid";
import { Keyboard, getKeyStatusFromEvaluations } from "./Keyboard";
import type { GameState } from "@/actions/game";
import type { LetterStatus } from "@/lib/game";
import {
  submitGuess,
  startNextLevel,
  getRevealWord,
  hasUnsolvedWordsLeft,
  useLetterHint,
  getPowerHint,
} from "@/actions/game";

type Props = {
  initialState: GameState;
  hasUnsolvedWordsLeft: boolean;
};

export function GameClient({ initialState, hasUnsolvedWordsLeft: initialHasMore }: Props) {
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [wordLength, setWordLength] = useState(initialState.wordLength);
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
  const [hasMoreWords, setHasMoreWords] = useState(initialHasMore);
  const [hintsUsed, setHintsUsed] = useState(initialState.hintsUsed);
  const [powerHintUsed, setPowerHintUsed] = useState(initialState.powerHintUsed);
  const [letterHintResult, setLetterHintResult] = useState<{ letter: string; position: number } | null>(null);
  const [powerHintText, setPowerHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const currentRow = attempts.length;
  const letterHintsLeft = 4 - hintsUsed;

  const handleKey = useCallback(
    (key: string) => {
      if (state !== "playing") return;
      if (key === "Enter") {
        if (currentGuess.length !== wordLength) {
          setMessage("Not enough letters");
          return;
        }
        setMessage(null);
        submitGuess(sessionId, currentGuess).then((result) => {
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
          // Clear animating state after stagger + flip duration (~900ms for 6 tiles)
          const delay = wordLength * 80 + 500;
          setTimeout(() => setAnimatingRow(null), delay);
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
    [state, currentGuess, wordLength, currentRow, sessionId]
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
      getRevealWord(sessionId).then(setRevealedWord);
    }
  }, [state, sessionId]);

  async function handleNextLevel() {
    const next = await startNextLevel();
    if (next) {
      setSessionId(next.sessionId);
      setWordLength(next.wordLength);
      setAttempts(next.attempts);
      setEvaluations(next.evaluations);
      setCurrentGuess("");
      setState("playing");
      setRevealedWord(null);
      setMessage(null);
      setHintsUsed(next.hintsUsed);
      setPowerHintUsed(next.powerHintUsed);
      setLetterHintResult(null);
      setPowerHintText(null);
      const more = await hasUnsolvedWordsLeft();
      setHasMoreWords(more);
    } else {
      setHasMoreWords(false);
    }
  }

  async function handleLetterHint() {
    if (hintLoading || letterHintsLeft <= 0) return;
    setHintLoading(true);
    setMessage(null);
    setLetterHintResult(null);
    const result = await useLetterHint(sessionId);
    setHintLoading(false);
    if (result.ok) {
      setHintsUsed((n) => n + 1);
      setLetterHintResult({ letter: result.letter, position: result.position });
    } else {
      setMessage(result.error);
    }
  }

  async function handlePowerHint() {
    if (hintLoading || powerHintUsed) return;
    setHintLoading(true);
    setMessage(null);
    const result = await getPowerHint(sessionId);
    setHintLoading(false);
    if (result.ok) {
      setPowerHintUsed(true);
      setPowerHintText(result.hint);
    } else {
      setMessage(result.error);
    }
  }

  const keyStatus = getKeyStatusFromEvaluations(attempts, evaluations);

  return (
    <>
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

      {letterHintResult && (
        <p className="mt-4 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium animate-pop">
          Letter at position {letterHintResult.position}: <span className="font-bold text-emerald-200">{letterHintResult.letter.toUpperCase()}</span>
        </p>
      )}
      {powerHintText && (
        <p className="mt-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-200 text-sm italic max-w-md animate-pop">
          &ldquo;{powerHintText}&rdquo;
        </p>
      )}
      {message && (
        <p className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium animate-pop inline-block">
          {message}
        </p>
      )}

      {state === "playing" && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleLetterHint}
            disabled={hintLoading || letterHintsLeft <= 0}
            className="px-4 py-2 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-md shadow-emerald-900/30"
          >
            💡 Hint ({letterHintsLeft} left)
          </button>
          <button
            type="button"
            onClick={handlePowerHint}
            disabled={hintLoading || powerHintUsed}
            className="px-4 py-2 rounded-xl font-medium text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-md shadow-violet-900/30"
          >
            {powerHintUsed ? "Power hint used" : "✨ Power hint"}
          </button>
        </div>
      )}

      {state === "won" && (
        <div className="mt-8 text-center space-y-5">
          <p className="text-2xl font-bold text-[var(--correct)] drop-shadow-[0_0_12px_var(--correct-glow)]">You got it!</p>
          {hasMoreWords ? (
            <button
              type="button"
              onClick={handleNextLevel}
              className="px-7 py-3 rounded-xl font-semibold bg-[var(--correct)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[var(--correct-glow)]"
            >
              Next word
            </button>
          ) : (
            <p className="text-[var(--text-muted)]">You&apos;ve solved all available words.</p>
          )}
        </div>
      )}

      {state === "lost" && (
        <div className="mt-8 text-center space-y-5">
          <p className="text-xl font-bold text-[var(--text-muted)]">Better luck next time</p>
          {revealedWord && (
            <p className="text-lg">
              The word was: <span className="font-bold text-white">{revealedWord}</span>
            </p>
          )}
          {hasMoreWords ? (
            <button
              type="button"
              onClick={handleNextLevel}
              className="px-7 py-3 rounded-xl font-semibold bg-[var(--correct)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[var(--correct-glow)]"
            >
              Next word
            </button>
          ) : (
            <p className="text-[var(--text-muted)]">No more words left to play.</p>
          )}
        </div>
      )}

      {state === "playing" && (
        <Keyboard
          onKey={handleKey}
          keyStatus={keyStatus}
        />
      )}

      {(state === "won" || state === "lost") && (
        <div className="mt-4 opacity-60">
          <Keyboard onKey={() => {}} keyStatus={keyStatus} disabled />
        </div>
      )}
    </>
  );
}
