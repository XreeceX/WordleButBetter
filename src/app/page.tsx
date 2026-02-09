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
      <div className="min-h-screen flex flex-col bg-[#121213]">
        <header className="border-b border-[#3a3a3c] px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Wordle But Better</h1>
          <div className="flex items-center gap-4">
            {stats && (
              <div className="hidden sm:flex gap-4 text-sm text-[#86888a]">
                <span>Played: {stats.gamesPlayed}</span>
                <span>Solved: {stats.wordsSolved}</span>
                <span>Streak: {stats.currentStreak}</span>
                <span>Max: {stats.maxStreak}</span>
              </div>
            )}
            <Link
              href="/api/auth/signout"
              className="text-sm text-[#86888a] hover:text-white transition-colors"
            >
              Sign out
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center pt-6 pb-8 px-4">
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
