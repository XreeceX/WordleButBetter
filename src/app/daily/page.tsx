import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTodayUTC } from "@/lib/daily";
import { getOrCreateDailyState, getDailyRankings } from "@/actions/daily";
import { DailyGameClient } from "@/components/DailyGameClient";

export default async function DailyChallengePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const today = getTodayUTC();
  const [dailyState, rankings] = await Promise.all([
    getOrCreateDailyState(today),
    getDailyRankings(today, session.user.id),
  ]);

  if (!dailyState) {
    return (
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-[var(--text-muted)]">Unable to load daily challenge. Try again later.</p>
        <Link href="/" className="mt-4 text-[var(--accent)] hover:underline">
          Back to game
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 h-screen overflow-hidden flex flex-col">
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            Daily Challenge
          </h1>
        </div>
        <p className="hidden sm:block text-sm text-[var(--text-muted)]">Resets midnight UTC</p>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 lg:p-4 max-w-7xl w-full mx-auto overflow-hidden">
        <aside className="flex-shrink-0 order-2 lg:order-1 w-full lg:w-56 overflow-auto">
          <div className="rounded-xl bg-[var(--surface)]/80 border border-[var(--border)] overflow-hidden shadow-xl shadow-black/20">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Today&apos;s rankings
              </h2>
            </div>
            {rankings.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--text-muted)]">No one has solved it yet. Be the first!</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {rankings.slice(0, 10).map((entry) => (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                      entry.isCurrentUser ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]" : ""
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 text-center font-bold ${entry.rank <= 3 ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
                      {entry.rank}
                    </span>
                    <span className="flex-1 truncate font-medium text-white">
                      {entry.displayName}
                      {entry.isCurrentUser && <span className="ml-1 text-[var(--accent)] text-xs">(you)</span>}
                    </span>
                    <span className="flex-shrink-0 tabular-nums text-[var(--correct)]">{entry.attempts}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <main className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center order-1 lg:order-2 overflow-hidden">
          <DailyGameClient date={today} initialState={dailyState} />
        </main>
      </div>
    </div>
  );
}
