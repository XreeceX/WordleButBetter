export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  wordsSolved: number;
  maxStreak: number;
  isCurrentUser?: boolean;
};

type Props = {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
};

export function Leaderboard({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center text-[var(--text-muted)] text-sm">
        No players yet. Be the first!
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)]/80 border border-[var(--border)] overflow-hidden shadow-xl shadow-black/20">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Top 10
        </h2>
        <span className="text-xs text-[var(--text-muted)]">solved · streak</span>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {entries.map((entry) => (
          <li
            key={entry.userId}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
              entry.isCurrentUser ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]" : ""
            }`}
          >
            <span
              className={`flex-shrink-0 w-6 text-center font-bold ${
                entry.rank <= 3 ? "text-amber-400" : "text-[var(--text-muted)]"
              }`}
            >
              {entry.rank}
            </span>
            <span className="flex-1 truncate font-medium text-white" title={entry.displayName}>
              {entry.displayName}
              {entry.isCurrentUser && (
                <span className="ml-1 text-[var(--accent)] text-xs">(you)</span>
              )}
            </span>
            <span className="flex-shrink-0 tabular-nums text-[var(--correct)] font-semibold" title="Words solved">
              {entry.wordsSolved}
            </span>
            <span className="flex-shrink-0 text-[var(--text-muted)] text-xs" title="Best streak">
              🔥{entry.maxStreak}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
