# Deploying TradeLog to Vercel

TradeLog is a full-stack app (React + Vite frontend, Express + MongoDB backend). Vercel is serverless, so:

- The frontend is served as static files from `frontend/dist`.
- The Express API runs as a single serverless function via `api/index.js`.
- **MongoDB must be a cloud database** (MongoDB Atlas free tier) — Vercel cannot see your local MongoDB.

## Prerequisites

1. A [Vercel account](https://vercel.com) (free).
2. A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free M0 cluster) — or any hosted MongoDB.
3. Your code pushed to GitHub / GitLab / Bitbucket (Vercel imports from Git).

## Step 1 — Create a cloud MongoDB (Atlas)

1. Sign in to MongoDB Atlas → click **Build a Database** → choose the **FREE M0** cluster.
2. Keep the default region near you → **Create Cluster**.
3. When prompted, create a database **user** (remember the password) and allow network access from **0.0.0.0/0** (anywhere).
4. In your cluster, click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tradelog?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Replace `<username>` and `<password>` with your database user credentials.

## Step 2 — Generate a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Step 3 — Import the project on Vercel

1. Go to https://vercel.com/new → **Import Project** from your Git provider.
2. Pick the `tradelog` repository.
3. In the **Configure Project** screen:
   - **Root Directory**: leave at `.` (repo root).
   - **Framework Preset**: leave as **Other** (the provided `vercel.json` handles the build).
   - Vercel auto-detects `vercel.json` (build command, output directory and rewrites).

## Step 4 — Set environment variables

Click **Environment Variables** and add (for **Production** and **Preview**):

| Name             | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `MONGO_URI`      | Your Atlas connection string (from Step 1)                   |
| `JWT_SECRET`     | The random string from Step 2                                |
| `JWT_EXPIRES_IN` | `7d`                                                         |
| `CORS_ORIGIN`    | `https://<your-app>.vercel.app` (or leave unset)             |
| `NODE_ENV`       | `production`                                                 |
| `BACKUP_ENABLED` | `false` (file backups are disabled on serverless)            |

Optional: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` if you want real email verification / password reset emails. Without them, emails are skipped (registration still works).

## Step 5 — Deploy

Click **Deploy**. Vercel runs:

```bash
npm install                                # root (no deps, fast)
npm run vercel-build                       # installs backend+frontend deps, builds frontend
```

Then it bundles `api/index.js` as a serverless function and serves `frontend/dist` as static files. The `vercel.json` rewrites route `/api/*` to the function and everything else to `index.html` (SPA fallback).

Your app is live at `https://<your-app>.vercel.app`.

## Deploying with the Vercel CLI (alternative)

If you prefer the CLI instead of the dashboard:

```bash
npm i -g vercel
cd /path/to/tradelog
vercel login
vercel env add MONGO_URI
vercel env add JWT_SECRET
vercel --prod
```

## After deploy

- Register a new account in the deployed app (data is now in Atlas).
- News calendar may be slow on first load (it scrapes forex factory and caches in memory).
- File-based backups are disabled on serverless. Use the CSV export feature or the Atlas UI to back up your data.

## Local vs deployed differences

| Concern        | Local dev                           | Vercel (serverless)                    |
| -------------- | ----------------------------------- | -------------------------------------- |
| MongoDB        | Local `mongodb://127.0.0.1:27017`   | Atlas connection string (`MONGO_URI`)  |
| Backups        | Writes to `backups/`                | Disabled (`BACKUP_ENABLED=false`)      |
| Emails         | Printed to console                  | Skipped without SMTP                   |
| API base URL   | Vite proxy `/api` → :5000           | Vercel rewrite `/api` → function       |
