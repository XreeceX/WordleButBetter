# Wordle But Better

A production-ready Wordle-style word guessing game with 5–7 letter words, built with Next.js (App Router), TypeScript, Tailwind CSS, Neon PostgreSQL, and Drizzle ORM. Deployable to Vercel.

## Features

- **Random word per level** (5–7 letters) from the database, never repeated for that user once solved
- **Wordle-style rules**: 6 attempts, green/yellow/gray feedback, duplicate-letter rules
- **Broader dictionary**: Guesses can be validated with a free LLM (Groq/Llama) when not in the seed list (e.g. “locate”); results are cached
- **Staggered tile flip** and row shake animations on submit
- **On-screen + physical keyboard** with dynamic key states (green overrides yellow/gray; gray disabled)
- **Daily Challenge**: One word per day (same for everyone), resets at midnight UTC; rankings by fewest attempts
- **Auth**: Email/password and Google OAuth via NextAuth.js
- **User stats**: Games played, words solved, current and max streak
- **Dark theme**, minimal UI, tile flip animations, responsive layout

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Neon** (PostgreSQL)
- **Drizzle ORM**
- **NextAuth.js** (credentials + Google)
- **Vercel** (deployment)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and set:

- **`DATABASE_URL`** – Neon PostgreSQL connection string (required)
- **`AUTH_SECRET`** – NextAuth secret, e.g. `openssl rand -base64 32`
- **`NEXTAUTH_URL`** – App URL (`http://localhost:3000` locally; production URL on Vercel)
- **`AUTH_GOOGLE_ID`** / **`AUTH_GOOGLE_SECRET`** – Optional; omit for email-only auth
- **`GROQ_API_KEY`** – Optional; if set, guesses not in the word list are checked with Groq’s free Llama model and cached so more words are accepted (get a free key at [console.groq.com](https://console.groq.com))

### 3. Database

Push the schema and run the word seed:

```bash
npm run db:push
npm run db:seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in, then play.

## Deploy to Vercel

**Important:** This repo is public. All secrets (database URL, API keys, auth secrets) must be set in **Vercel → Project → Settings → Environment Variables**, not in the codebase.

1. Push the repo to GitHub and import the project in Vercel.
2. Create a Neon database and add **`DATABASE_URL`** in Vercel env (pooled connection string).
3. Set **`AUTH_SECRET`** and **`NEXTAUTH_URL`** (e.g. `https://your-app.vercel.app`) in Vercel.
4. Optionally add **`AUTH_GOOGLE_ID`**, **`AUTH_GOOGLE_SECRET`**, and **`GROQ_API_KEY`** in Vercel.
5. Deploy. After the first deploy, run migrations and seed from your machine (with production `DATABASE_URL` in local `.env`) or use a one-off script/CI step:
   - `npm run db:push`
   - `npm run db:seed`

## Project structure

- **`src/app/`** – App Router pages (home, login, register) and API route for NextAuth
- **`src/actions/`** – Server Actions (auth, game logic)
- **`src/components/`** – Game grid, keyboard, game client, session provider
- **`src/db/`** – Drizzle schema and Neon client
- **`src/lib/`** – Auth config, game evaluation helpers
- **`src/data/words.ts`** – Curated 5–7 letter word lists
- **`src/scripts/seed-words.ts`** – Seed script for the `words` table

## Database schema

- **user**, **account**, **session**, **verification_token** – NextAuth (Drizzle adapter)
- **words** – Dictionary words (5–7 letters)
- **valid_guesses** – LLM-approved guess words (cache so we don’t call the API repeatedly)
- **user_word_progress** – Per-user solved/attempted words
- **user_stats** – Games played, words solved, streaks
- **game_sessions** – Active game (word reference, attempts, guess/evaluation history)
- **daily_sessions** – Daily challenge (one row per user per UTC date; same word for everyone)

Word selection is server-side only; the target word is never sent to the client until the game is over (win or lose).
