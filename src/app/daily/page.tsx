import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTodayUTC,
  getOrCreateDailyState,
  getDailyRankings,
} from "@/actions/daily";
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

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden p-4">
        <DailyGameClient
          date={today}
          initialState={dailyState}
          rankings={rankings}
        />
      </main>
    </div>
  );
}
