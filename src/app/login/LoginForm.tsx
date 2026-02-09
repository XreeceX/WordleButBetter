"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    if (result?.url) window.location.href = result.url;
  }

  async function handleGoogle() {
    setError(null);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#121213]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Wordle But Better</h1>
          <p className="mt-2 text-[#86888a]">Sign in to play</p>
        </div>

        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#86888a] mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2.5 rounded bg-[#1a1a1b] border border-[#3a3a3c] text-white placeholder-[#86888a] focus:outline-none focus:ring-2 focus:ring-[#538d4e] focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#86888a] mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 rounded bg-[#1a1a1b] border border-[#3a3a3c] text-white placeholder-[#86888a] focus:outline-none focus:ring-2 focus:ring-[#538d4e] focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded font-medium bg-[#538d4e] text-white hover:bg-[#4a7d45] disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#3a3a3c]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#121213] text-[#86888a]">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-2.5 rounded font-medium bg-[#1a1a1b] border border-[#3a3a3c] text-white hover:bg-[#262628] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <p className="text-center text-sm text-[#86888a]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#538d4e] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
