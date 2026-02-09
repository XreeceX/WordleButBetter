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
      const more = await hasUnsolvedWordsLeft();
      setHasMoreWords(more);
    } else {
      setHasMoreWords(false);
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

      {message && (
        <p className="mt-4 px-4 py-2 rounded-lg bg-[#2a2a2c] border border-[#3a3a3c] text-[#e8c547] text-sm font-medium animate-pop inline-block">
          {message}
        </p>
      )}

      {state === "won" && (
        <div className="mt-8 text-center space-y-5">
          <p className="text-2xl font-bold text-[#538d4e]">You got it!</p>
          {hasMoreWords ? (
            <button
              type="button"
              onClick={handleNextLevel}
              className="px-7 py-3 rounded-lg font-semibold bg-[#538d4e] text-white hover:bg-[#4a7d45] active:scale-[0.98] transition-all shadow-lg shadow-[#538d4e]/20"
            >
              Next word
            </button>
          ) : (
            <p className="text-[#86888a]">You&apos;ve solved all available words.</p>
          )}
        </div>
      )}

      {state === "lost" && (
        <div className="mt-8 text-center space-y-5">
          <p className="text-xl font-bold text-[#86888a]">Better luck next time</p>
          {revealedWord && (
            <p className="text-lg">
              The word was: <span className="font-bold text-white">{revealedWord}</span>
            </p>
          )}
          {hasMoreWords ? (
            <button
              type="button"
              onClick={handleNextLevel}
              className="px-7 py-3 rounded-lg font-semibold bg-[#538d4e] text-white hover:bg-[#4a7d45] active:scale-[0.98] transition-all shadow-lg shadow-[#538d4e]/20"
            >
              Next word
            </button>
          ) : (
            <p className="text-[#86888a]">No more words left to play.</p>
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
