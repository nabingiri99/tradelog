# TradeLog API

RESTful backend for the TradeLog trading journal application. Built with Node.js, Express, MongoDB, Mongoose, and JWT authentication, following a clean layered architecture (routes → controllers → models → middleware).

## Requirements

- Node.js >= 20
- MongoDB (local instance or Atlas cluster)

## Installation

```bash
npm install
cp .env.example .env
```

## Environment Variables

| Variable          | Description                       | Default                          |
| ----------------- | --------------------------------- | -------------------------------- |
| `NODE_ENV`        | Runtime environment               | `development`                    |
| `PORT`            | Port the server listens on        | `5000`                           |
| `MONGO_URI`       | MongoDB connection string         | `mongodb://127.0.0.1:27017/tradelog` |
| `CORS_ORIGIN`     | Comma-separated allowed origins   | any origin                       |
| `JWT_SECRET`      | Secret used to sign JWT tokens    | required                         |
| `JWT_EXPIRES_IN`  | Token lifetime                    | `7d`                             |

**Important:** `JWT_SECRET` must be set or the server will refuse to start. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## Running the Server

```bash
npm start        # production mode
npm run dev      # development mode (nodemon)
```

The server connects to MongoDB before listening. Health check: `http://localhost:5000/api/health`.

## Auth Flow

Every request to `/api/trades` requires a `Bearer` token returned by register/login.

1. `POST /api/auth/register` — create an account
2. `POST /api/auth/login` — log in, receive a token
3. Send the token on every subsequent request:

```bash
curl http://localhost:5000/api/trades -H "Authorization: Bearer <token>"
```

## Project Structure

```
.
├── server.js              # Entry point, Express app, server bootstrap
├── config/db.js           # MongoDB connection
├── controllers/
│   ├── authController.js  # register / login / profile / password
│   └── tradeController.js # Trade request handlers (scoped per user)
├── middleware/
│   ├── auth.js            # JWT protect middleware
│   ├── errorHandler.js    # 404 handler + global error handler
│   └── validateTrade.js   # Request body validation
├── models/
│   ├── User.js            # Mongoose User model (bcrypt password hash)
│   └── Trade.js           # Mongoose Trade model (string _id = client UUID)
└── routes/
    ├── index.js           # Route aggregator
    ├── health.routes.js   # Health check
    ├── auth.routes.js     # Auth endpoints
    └── tradeRoutes.js     # Trade endpoints
```

## API Endpoints

### Auth

| Method | Endpoint               | Auth | Description            |
| ------ | ---------------------- | ---- | ---------------------- |
| POST   | `/api/auth/register`   | No   | Register an account    |
| POST   | `/api/auth/login`      | No   | Log in and get a token |
| GET    | `/api/auth/me`         | Yes  | Current user profile   |
| PUT    | `/api/auth/profile`    | Yes  | Update display name    |
| PUT    | `/api/auth/password`   | Yes  | Change password        |

### Trades (all require a Bearer token)

| Method   | Endpoint              | Description                     |
| -------- | --------------------- | ------------------------------- |
| GET      | `/api/trades`         | List current user's trades      |
| GET      | `/api/trades/:id`     | Get a single trade              |
| POST     | `/api/trades`         | Create a trade                  |
| PUT      | `/api/trades/:id`     | Update a trade                  |
| DELETE   | `/api/trades/:id`     | Delete a trade                  |
| DELETE   | `/api/trades`         | Delete all current user trades  |
| POST     | `/api/trades/bulk`    | Import an array of trades       |

### Trade Fields

The API mirrors the frontend `Trade` type. `id` is a client-generated UUID stored as the MongoDB `_id`.

| Field           | Type    | Required | Notes                                    |
| --------------- | ------- | -------- | ---------------------------------------- |
| `id`            | String  | No       | Client UUID; generated if omitted        |
| `date`          | String  | Yes      | `YYYY-MM-DD`                             |
| `entryTime`     | String  | No       | `HH:mm`                                  |
| `pair`          | String  | Yes      | e.g. `EURUSD`, uppercased                |
| `session`       | String  | No       | `London`, `NewYork`, `Overlap`, `Other`  |
| `direction`     | String  | Yes      | `Buy` or `Sell`                          |
| `entry`         | Number  | Yes      | Positive                                 |
| `stopLoss`      | Number  | Yes      | Positive                                 |
| `target`        | Number  | Yes      | Positive                                 |
| `result`        | String  | No       | `Win`, `Loss`, `BreakEven`, `Open`       |
| `rr`            | Number  | No       | Auto-calculated from entry / stop loss / target; defaults to `0` |
| `positionSize`  | Number  | No       | Units/lots traded; positive              |
| `riskAmount`    | Number  | No       | Dollar amount risked; non-negative       |
| `pnlAmount`     | Number  | No       | Realized dollar P&L (signed)             |
| `notes`         | String  | No       |                                          |
| `tags`          | [String]| No       | Defaults to `[]`                         |
| `mindset`       | Object  | No       | `{ before, after }`                      |
| `emotion`       | String  | No       |                                          |
| `reason`        | String  | No       |                                          |
| `screenshot`    | String  | No       | Data URL (compressed)                    |
| `isValidRuleTrade` | Boolean | No    | Defaults to `false`                      |

### Query Parameters (GET /api/trades)

| Parameter   | Example                | Description                          |
| ----------- | ---------------------- | ------------------------------------ |
| `search`    | `?search=EUR`          | Case-insensitive search on `pair`    |
| `direction` | `?direction=Buy`       | Filter by direction                  |
| `result`    | `?result=Win`          | Filter by result                     |
| `startDate` | `?startDate=2026-01-01`| Trades on/after this date            |
| `endDate`   | `?endDate=2026-01-31`  | Trades on/before this date           |
| `sort`      | `?sort=-createdAt`     | Sort field(s), `-` for descending    |

## Example: Register, Login, Create a Trade

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123"}'

# Login (returns a token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"secret123"}'

# Create a trade
curl -X POST http://localhost:5000/api/trades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-08-01",
    "entryTime": "09:30",
    "pair": "EURUSD",
    "session": "London",
    "direction": "Buy",
    "entry": 1.085,
    "stopLoss": 1.08,
    "target": 1.095,
    "result": "Win",
    "rr": 2.0,
    "notes": "Clean breakout",
    "tags": ["forex", "scalp"],
    "isValidRuleTrade": true
  }'
```

## Error Handling

All errors return a consistent shape:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": ["Field-specific messages, when applicable"]
}
```

Common status codes:

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| `400`  | Invalid request body or invalid trade ID             |
| `401`  | Missing/invalid token or wrong credentials           |
| `404`  | Resource not found                                   |
| `409`  | Duplicate value (e.g. email already registered)      |
| `500`  | Internal server error                                |

In `NODE_ENV=production`, the `stack` trace is omitted from error responses.
