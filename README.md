# TradeLog

A trading journal web app. React + TypeScript + Vite frontend with an Express + MongoDB (Mongoose) backend and JWT authentication.

The project runs fully **locally** — including MongoDB. No cloud account is required (MongoDB Atlas is optional).

## Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS, Recharts, React Router
- **Backend**: Node.js, Express 5, Mongoose 9, MongoDB, JWT (jsonwebtoken), bcryptjs

## Features

- User registration / login with JWT auth (bcrypt password hashing on the server)
- Trade journal: add, edit, delete, duplicate, import (CSV/JSON), export (CSV)
- Open trades view: track live positions and close them with a final P&L
- Auto-calculated R:R from entry / stop loss / target
- Position size calculator: balance + risk % → risk amount and size
- Daily journal with mood, performance score and reflection prompts
- Track position size, dollar risk amount and realized P&L per trade
- Per-user data: each account only sees its own trades
- Dashboard, analytics and rules checklist
- Dark / light theme

## Project Layout

```
├── frontend/       # Frontend (React + Vite)
├── backend/        # Backend API (Express + MongoDB)
├── scripts/        # Local dev helpers (MongoDB + one-command start/stop)
└── vite.config.ts  # (in frontend/) dev server + /api proxy to backend
```

## Troubleshooting (local MongoDB)

- **`backend` fails with "MongoDB connection failed"** — MongoDB is not running. Run `./scripts/setup-local-db.sh --ensure` and try again.
- **Port 5000 / 5173 already in use** — the dev servers may already be running; `./scripts/start-all.sh` detects this and reuses them. Otherwise stop the processes and re-run.
- **Wrong data / empty trade list** — you are logged in as a different user. Each account only sees its own trades.
- **Inspect the database** — `mongosh tradelog --eval 'db.trades.countDocuments()'` (or connect with any MongoDB GUI to `mongodb://127.0.0.1:27017/tradelog`).

## Getting Started

### Quick start (one command)

```bash
./scripts/setup-local-db.sh   # optional: install + start local MongoDB (Linux/macOS)
./scripts/start-all.sh        # starts MongoDB, backend (:5000) and frontend (:5173)
```

- Windows: run `powershell -ExecutionPolicy Bypass -File scripts\setup-local-db.ps1` first, then start the two servers manually (below).
- Stop everything with `./scripts/stop-all.sh` (MongoDB stays running; stop it with `./scripts/setup-local-db.sh --stop`).
- The scripts are idempotent — safe to re-run; already-running services are left untouched.
- Logs are written to `logs/backend.log` and `logs/frontend.log`.

### Manual start

#### 1. Local MongoDB (no cloud needed)

The app stores all data in a **local MongoDB** by default:

```bash
./scripts/setup-local-db.sh   # installs (if needed) and starts MongoDB on 127.0.0.1:27017
```

Alternatively, install MongoDB yourself and make sure it is running on `mongodb://127.0.0.1:27017` (see https://www.mongodb.com/docs/manual/installation/).

#### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # default MONGO_URI already points to local MongoDB
npm run dev            # http://localhost:5000
```

On first start `./scripts/start-all.sh` generates a random `JWT_SECRET` into `backend/.env` automatically if you use the scripts.

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so the frontend can call the API without CORS issues.

## Environment Variables

See `backend/.env.example`:

| Variable         | Description                     |
| ---------------- | ------------------------------- |
| `PORT`           | API port (default `5000`)       |
| `MONGO_URI`      | MongoDB connection string       |
| `CORS_ORIGIN`    | Allowed frontend origin(s)      |
| `JWT_SECRET`     | Secret for signing JWTs (required) |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`)   |

The frontend reads an optional `VITE_API_URL`. When unset it uses `/api` (which works with the Vite proxy in development).

## Using MongoDB Atlas (optional)

The project defaults to local MongoDB. If you prefer the cloud instead, point `MONGO_URI` in `backend/.env` at your Atlas cluster:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tradelog?retryWrites=true&w=majority&appName=Cluster0
```

Notes:

- Add your machine's public IP (or `0.0.0.0/0`) to Atlas → **Network Access**.
- This sandbox preview environment cannot reach Atlas (its outbound TLS is intercepted and the MongoDB handshake fails), so the preview here runs on a local MongoDB. The same code connects to Atlas normally from your own machine.

## API

Full API reference: [backend/README.md](backend/README.md)
