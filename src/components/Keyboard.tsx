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
      "keyboard-key rounded-lg font-medium text-base uppercase transition-all duration-150 flex items-center justify-center select-none active:scale-95";
    if (disabled) return `${base} bg-[var(--absent)] text-[var(--text-muted)] cursor-not-allowed`;
    if (status === "correct") return `${base} bg-[var(--correct)] text-white hover:opacity-90 cursor-pointer shadow-sm shadow-[var(--correct-glow)]`;
    if (status === "present") return `${base} bg-[var(--present)] text-white hover:opacity-90 cursor-pointer shadow-sm shadow-[var(--present-glow)]`;
    if (status === "absent") return `${base} bg-[var(--absent)] text-[var(--text-muted)] cursor-not-allowed`;
    return `${base} bg-[var(--key-bg)] text-white hover:bg-[#52525b] cursor-pointer`;
  };

  const specialKeyClass =
    "keyboard-key keyboard-key-special rounded-lg font-medium bg-[var(--key-bg)] text-white hover:bg-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 active:scale-95";

  return (
    <div className="keyboard-container w-full mx-auto shrink-0 px-1 keyboard-rows">
      <div className="flex justify-center keyboard-row">
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
      <div className="flex justify-center keyboard-row">
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
      <div className="flex justify-center keyboard-row">
        <button
          type="button"
          onClick={() => onKey("Enter")}
          disabled={disabled}
          className={specialKeyClass}
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
          className={specialKeyClass}
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
