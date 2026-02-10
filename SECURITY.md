# Security

## Keeping secrets out of the repo

This repository is **public**. Never commit:

- `.env` or any file containing real API keys, passwords, or connection strings
- `AUTH_SECRET`, `DATABASE_URL`, `GROQ_API_KEY`, `AUTH_GOOGLE_SECRET`, or similar values

**Local development:** Copy `.env.example` to `.env` and fill in your own values. `.env` is gitignored.

**Production (Vercel):** Set all environment variables in the [Vercel dashboard](https://vercel.com) under your project → Settings → Environment Variables. The app reads them at build and runtime; nothing secret is stored in the repo.

If you accidentally commit a secret:

1. Rotate/revoke the exposed key or password immediately.
2. Remove it from git history (e.g. `git filter-branch` or BFG Repo-Cleaner) or use GitHub’s secret scanning and follow their guidance.
