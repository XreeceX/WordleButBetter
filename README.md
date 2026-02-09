# Wordle But Better

A production-ready Wordle-style word guessing game with 5–7 letter words, built with Next.js (App Router), TypeScript, Tailwind CSS, Neon PostgreSQL, and Drizzle ORM. Deployable to Vercel.

## Features

- **Random word per level** (5–7 letters) from the database, never repeated for that user once solved
- **Wordle-style rules**: 6 attempts, green/yellow/gray feedback, duplicate-letter rules
- **On-screen + physical keyboard** with dynamic key states (green overrides yellow/gray; gray disabled)
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

1. Push the repo to GitHub and import the project in Vercel.
2. Create a Neon database and add **`DATABASE_URL`** to Vercel env.
3. Set **`AUTH_SECRET`** and **`NEXTAUTH_URL`** (e.g. `https://your-app.vercel.app`).
4. Optionally add **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`** for Google sign-in.
5. Deploy. After the first deploy, run migrations and seed from your machine (with production `DATABASE_URL` in `.env`) or use a one-off script/CI step:
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
- **user_word_progress** – Per-user solved/attempted words
- **user_stats** – Games played, words solved, streaks
- **game_sessions** – Active game (word reference, attempts, guess/evaluation history)

Word selection is server-side only; the target word is never sent to the client until the game is over (win or lose).
