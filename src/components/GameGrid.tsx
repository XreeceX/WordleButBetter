"use client";

import type { LetterStatus } from "@/lib/game";

type Props = {
  wordLength: number;
  maxAttempts: number;
  attempts: string[];
  evaluations: LetterStatus[][];
  currentGuess: string;
  currentRow: number;
  animatingRow: number | null;
  shakeRow?: number | null;
};

export function GameGrid({
  wordLength,
  maxAttempts,
  attempts,
  evaluations,
  currentGuess,
  currentRow,
  animatingRow,
  shakeRow = null,
}: Props) {
  const rows = maxAttempts;
  const cols = wordLength;

  return (
    <div className="flex flex-col gap-3 mx-auto w-full max-w-xl" style={{ perspective: "1000px" }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex justify-center gap-2 ${shakeRow === rowIndex ? "animate-shake" : ""}`}
        >
          {Array.from({ length: cols }).map((_, colIndex) => {
            const isFilled = rowIndex < attempts.length || (rowIndex === currentRow && currentGuess.length > colIndex);
            const letter =
              rowIndex < attempts.length
                ? attempts[rowIndex][colIndex]
                : rowIndex === currentRow
                  ? currentGuess[colIndex]
                  : "";
            const status: LetterStatus | null =
              rowIndex < evaluations.length ? evaluations[rowIndex][colIndex] ?? null : null;
            const isAnimating = animatingRow === rowIndex;
            const staggerClass = isAnimating && status ? `animate-flip-in stagger-${colIndex}` : "";

            return (
              <div
                key={colIndex}
                className={`
                  flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl font-bold uppercase
                  border-2 rounded-lg
                  transition-all duration-150
                  ${staggerClass}
                  ${
                    status === "correct"
                      ? "tile-correct text-white border-[var(--correct)]"
                      : status === "present"
                        ? "tile-present text-white border-[var(--present)]"
                        : status === "absent"
                          ? "tile-absent text-white border-[var(--border)]"
                          : "bg-[var(--surface)] border-[var(--border)] text-white"
                  }
                `}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
