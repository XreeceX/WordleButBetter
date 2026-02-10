import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrCreateGameState, hasUnsolvedWordsLeft } from "@/actions/game";
import { db } from "@/db";
import { userStats, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { GameClient } from "@/components/GameClient";
import { SessionProvider } from "@/components/SessionProvider";
import { Leaderboard, type LeaderboardEntry } from "@/components/Leaderboard";

async function getTopPlayers(currentUserId: string | undefined): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      userId: userStats.userId,
      wordsSolved: userStats.wordsSolved,
      maxStreak: userStats.maxStreak,
      name: users.name,
      email: users.email,
    })
    .from(userStats)
    .innerJoin(users, eq(userStats.userId, users.id))
    .orderBy(desc(userStats.wordsSolved), desc(userStats.maxStreak))
    .limit(10);

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: r.name?.trim() || r.email?.split("@")[0] || "Player",
    wordsSolved: r.wordsSolved,
    maxStreak: r.maxStreak,
    isCurrentUser: r.userId === currentUserId,
  }));
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [gameState, hasMoreWords, statsRow, leaderboardEntries] = await Promise.all([
    getOrCreateGameState(),
    hasUnsolvedWordsLeft(),
    db.select().from(userStats).where(eq(userStats.userId, session.user.id)).limit(1),
    getTopPlayers(session.user.id),
  ]);

  const stats = statsRow[0] ?? null;

  return (
    <SessionProvider>
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">Wordle But Better</h1>
          <div className="flex items-center gap-4">
            {stats && (
              <div className="hidden sm:flex gap-5 text-sm text-[var(--text-muted)]">
                <span className="tabular-nums">Played: {stats.gamesPlayed}</span>
                <span className="tabular-nums">Solved: {stats.wordsSolved}</span>
                <span className="tabular-nums">Streak: {stats.currentStreak}</span>
                <span className="tabular-nums">Max: {stats.maxStreak}</span>
              </div>
            )}
            <Link
              href="/api/auth/signout"
              className="text-sm text-[var(--text-muted)] hover:text-white transition-colors rounded-lg px-2 py-1 -m-1"
            >
              Sign out
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          <aside className="w-full lg:w-64 flex-shrink-0 order-2 lg:order-1">
            <div className="lg:sticky lg:top-6">
              <Leaderboard entries={leaderboardEntries} currentUserId={session.user.id} />
            </div>
          </aside>
          <main className="flex-1 min-w-0 flex flex-col items-center pt-4 pb-10 lg:pt-8 order-1 lg:order-2">
            {gameState === null && !hasMoreWords ? (
              <div className="text-center max-w-md mx-auto space-y-4 py-12">
                <h2 className="text-2xl font-bold">You&apos;ve solved all available words!</h2>
                <p className="text-[var(--text-muted)]">
                  Check back later for more words, or enjoy your stats above.
                </p>
              </div>
            ) : gameState === null ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                Loading your game…
              </div>
            ) : (
              <GameClient
                initialState={gameState}
                hasUnsolvedWordsLeft={hasMoreWords}
              />
            )}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
