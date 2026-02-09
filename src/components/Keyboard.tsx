"use client";

import type { LetterStatus } from "@/lib/game";

const ROW1 = "qwertyuiop";
const ROW2 = "asdfghjkl";
const ROW3 = "zxcvbnm";

type KeyStatus = Record<string, LetterStatus>;

type Props = {
  onKey: (key: string) => void;
  keyStatus: KeyStatus;
  disabled?: boolean;
};

export function Keyboard({ onKey, keyStatus, disabled }: Props) {
  const keyClass = (key: string) => {
    const status = keyStatus[key];
    const base =
      "min-w-[2rem] h-14 rounded font-medium text-sm uppercase transition-colors flex items-center justify-center select-none";
    if (disabled) return `${base} bg-[#3a3a3c] text-[#86888a] cursor-not-allowed`;
    if (status === "correct") return `${base} bg-[#538d4e] text-white hover:bg-[#4a7d45] cursor-pointer`;
    if (status === "present") return `${base} bg-[#b59f3b] text-white hover:bg-[#a08d34] cursor-pointer`;
    if (status === "absent") return `${base} bg-[#3a3a3c] text-[#86888a] cursor-not-allowed`;
    return `${base} bg-[#818384] text-white hover:bg-[#6b6b6d] cursor-pointer`;
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-6 space-y-2 px-2">
      <div className="flex justify-center gap-1">
        {ROW1.split("").map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKey(k)}
            disabled={disabled}
            className={keyClass(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1">
        {ROW2.split("").map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKey(k)}
            disabled={disabled}
            className={keyClass(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1">
        <button
          type="button"
          onClick={() => onKey("Enter")}
          disabled={disabled}
          className="min-w-[3rem] h-14 px-4 rounded font-medium text-sm bg-[#818384] text-white hover:bg-[#6b6b6d] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Enter
        </button>
        {ROW3.split("").map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKey(k)}
            disabled={disabled}
            className={keyClass(k)}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onKey("Backspace")}
          disabled={disabled}
          className="min-w-[3rem] h-14 px-4 rounded font-medium text-sm bg-[#818384] text-white hover:bg-[#6b6b6d] cursor-pointer"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

export function getKeyStatusFromEvaluations(
  attempts: string[],
  evaluations: Array<Array<LetterStatus>>
): KeyStatus {
  const status: KeyStatus = {};
  for (let r = 0; r < attempts.length; r++) {
    const word = attempts[r];
    const ev = evaluations[r] ?? [];
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const s = ev[i];
      if (!s) continue;
      const existing = status[letter];
      if (s === "correct") status[letter] = "correct";
      else if (s === "present" && existing !== "correct") status[letter] = "present";
      else if (s === "absent" && !existing) status[letter] = "absent";
    }
  }
  return status;
}
