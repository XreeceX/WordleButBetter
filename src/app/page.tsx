import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrCreateGameState, hasUnsolvedWordsLeft } from "@/actions/game";
import { db } from "@/db";
import { userStats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GameClient } from "@/components/GameClient";
import { SessionProvider } from "@/components/SessionProvider";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [gameState, hasMoreWords, statsRow] = await Promise.all([
    getOrCreateGameState(),
    hasUnsolvedWordsLeft(),
    db.select().from(userStats).where(eq(userStats.userId, session.user.id)).limit(1),
  ]);

  const stats = statsRow[0] ?? null;

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
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

        <main className="flex-1 flex flex-col items-center pt-8 pb-10 px-4">
          {gameState === null && !hasMoreWords ? (
            <div className="text-center max-w-md mx-auto space-y-4 py-12">
              <h2 className="text-2xl font-bold">You&apos;ve solved all available words!</h2>
              <p className="text-[#86888a]">
                Check back later for more words, or enjoy your stats above.
              </p>
            </div>
          ) : gameState === null ? (
            <div className="text-center py-12 text-[#86888a]">
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
    </SessionProvider>
  );
}
