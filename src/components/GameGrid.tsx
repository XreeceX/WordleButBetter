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
    <div
      className="flex flex-col mx-auto w-full max-w-xl shrink-0"
      style={{ perspective: "1200px", gap: "min(0.4rem, 1.2vh)" }}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex justify-center ${shakeRow === rowIndex ? "animate-shake" : ""}`}
          style={{ gap: "min(0.35rem, 1vh)", transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => {
            const letter =
              rowIndex < attempts.length
                ? attempts[rowIndex][colIndex]
                : rowIndex === currentRow
                  ? currentGuess[colIndex]
                  : "";
            const status: LetterStatus | null =
              rowIndex < evaluations.length ? evaluations[rowIndex][colIndex] ?? null : null;
            const staggerClass = animatingRow === rowIndex && status ? `animate-flip-in stagger-${colIndex}` : "";

            return (
              <div
                key={colIndex}
                className={`
                  flex items-center justify-center font-bold uppercase border-2 rounded-lg
                  transition-all duration-150 game-tile ${staggerClass}
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
                style={{
                  width: "var(--tile-size)",
                  height: "var(--tile-size)",
                  fontSize: "min(1.5rem, calc(var(--tile-size) * 0.55))",
                }}
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
