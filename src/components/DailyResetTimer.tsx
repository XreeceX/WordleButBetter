"use client";

import { useEffect, useState } from "react";

function getNextMidnightUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function DailyResetTimer() {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    function tick() {
      const next = getNextMidnightUTC();
      const ms = next.getTime() - Date.now();
      setTimeLeft(formatTimeLeft(ms));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-sm text-[var(--text-muted)]">
      Resets in <span className="font-medium tabular-nums text-white">{timeLeft || "—"}</span>
    </p>
  );
}
