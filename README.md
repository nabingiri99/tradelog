# TradeLog

A trading journal web app. React + TypeScript + Vite frontend with an Express + MongoDB (Mongoose) backend and JWT authentication.

## Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS, Recharts, React Router
- **Backend**: Node.js, Express 5, Mongoose 9, MongoDB, JWT (jsonwebtoken), bcryptjs

## Features

- User registration / login with JWT auth (bcrypt password hashing on the server)
- Trade journal: add, edit, delete, duplicate, import (CSV/JSON), export (CSV)
- Per-user data: each account only sees its own trades
- Dashboard, analytics, rules checklist, backtest progress and chart backtest
- Dark / light theme

## Project Layout

```
├── frontend/       # Frontend (React + Vite)
├── backend/        # Backend API (Express + MongoDB)
└── vite.config.ts  # (in frontend/) dev server + /api proxy to backend
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then set MONGO_URI and JWT_SECRET
npm run dev            # http://localhost:5000
```

### 2. Frontend

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

## Using MongoDB Atlas

To point the backend at a MongoDB Atlas cluster, set `MONGO_URI` in `backend/.env` to:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tradelog?retryWrites=true&w=majority&appName=Cluster0
```

Notes:

- Add your machine's public IP (or `0.0.0.0/0`) to Atlas → **Network Access**.
- This sandbox preview environment cannot reach Atlas (its outbound TLS is intercepted and the MongoDB handshake fails), so the preview here runs on a local MongoDB. The same code connects to Atlas normally from your own machine.

## API

Full API reference: [backend/README.md](backend/README.md)
