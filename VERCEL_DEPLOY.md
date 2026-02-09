# Deploy Wordle But Better to Vercel

## 1. Push your code to GitHub

```bash
cd WordleButBetter
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(If the project already lives in a repo, just push the latest changes.)

---

## 2. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign in (or create an account).
2. Create a new project (e.g. "wordle-but-better").
3. Copy the **connection string** (Connection string → **Pooled connection**). It looks like:
   ```text
   postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this for the next step and for running migrations/seed locally.

---

## 3. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. Import your GitHub repo (e.g. `WordleButBetter`).
4. Leave **Framework Preset** as Next.js and **Root Directory** as `.` unless you changed them.
5. Do **not** deploy yet—add environment variables first.

---

## 4. Set environment variables in Vercel

In the project import screen (or later: **Project → Settings → Environment Variables**), add:

| Name            | Value                    | Notes |
|-----------------|--------------------------|--------|
| `DATABASE_URL`  | Your Neon connection string | Required. Use the **pooled** connection string from Neon. |
| `AUTH_SECRET`   | Random secret            | Required. Generate with: `openssl rand -base64 32` (run in terminal). |
| `NEXTAUTH_URL`  | `https://your-app.vercel.app` | **After first deploy**, set this to your real Vercel URL (e.g. `https://wordle-but-better.vercel.app`). For the first deploy you can use a placeholder like `https://wordle-but-better.vercel.app` (your actual subdomain). |

Optional (for Google sign-in):

| Name                 | Value |
|----------------------|--------|
| `AUTH_GOOGLE_ID`     | From Google Cloud Console (OAuth 2.0 Client ID). |
| `AUTH_GOOGLE_SECRET` | From Google Cloud Console (OAuth 2.0 Client Secret). |

Apply to **Production** (and Preview if you want the same env for previews). Then deploy.

---

## 5. Deploy

Click **Deploy**. Vercel will run `npm run build` and deploy. Wait for the first deployment to finish.

---

## 6. Set the real NEXTAUTH_URL (if needed)

1. After the first deploy, open your project on Vercel.
2. Note the URL (e.g. `https://wordle-but-better-xxx.vercel.app`).
3. Go to **Settings → Environment Variables**.
4. Edit `NEXTAUTH_URL` and set it to that URL (e.g. `https://wordle-but-better-xxx.vercel.app`).
5. Redeploy: **Deployments** → ⋮ on latest → **Redeploy**.

---

## 7. Run database migrations and seed (one time)

The app needs the schema and word list in Neon. Run these **once** from your machine using the **same** `DATABASE_URL` as in Vercel:

```bash
cd WordleButBetter
# Use the same DATABASE_URL as in Vercel (e.g. in .env)
npm run db:push
npm run db:seed
```

If you don’t have a local `.env` yet:

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your Neon **pooled** connection string (same as in Vercel).
3. Then run `npm run db:push` and `npm run db:seed`.

After that, your Vercel app will use the same database and words.

---

## 8. Open the app

Visit your Vercel URL (e.g. `https://wordle-but-better-xxx.vercel.app`). You should see the login page. Sign up or log in and play.

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Neon project created and connection string copied
- [ ] Vercel project created and repo imported
- [ ] `DATABASE_URL` set in Vercel (pooled Neon URL)
- [ ] `AUTH_SECRET` set (e.g. `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` set to your Vercel app URL (and redeploy after first deploy if you used a placeholder)
- [ ] `npm run db:push` and `npm run db:seed` run once with production `DATABASE_URL`
