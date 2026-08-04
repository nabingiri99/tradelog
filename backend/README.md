# TradeLog API

RESTful backend for the TradeLog trading journal application. Built with Node.js, Express, MongoDB, and Mongoose, following a clean layered architecture (routes → controllers → models).

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Example Requests & Responses](#example-requests-and-responses)
- [Error Handling](#error-handling)

## Requirements

- [Node.js](https://nodejs.org/) >= 18
- [MongoDB](https://www.mongodb.com/) (local instance or Atlas cluster)

## Installation

Clone the repository and install dependencies:

```bash
# Install dependencies
npm install
```

Create your environment file from the template:

```bash
# Create .env from the example
cp .env.example .env
```

## Environment Variables

The following variables are read from `.env`:

| Variable     | Description                          | Default                          |
| ------------ | ------------------------------------ | -------------------------------- |
| `NODE_ENV`   | Runtime environment                 | `development`                    |
| `PORT`       | Port the server listens on          | `5000`                           |
| `MONGO_URI`  | MongoDB connection string           | `mongodb://127.0.0.1:27017/tradelog` |

Example `.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/tradelog
```

## Running the Server

```bash
# Production mode
npm start

# Development mode (auto-restart via nodemon)
npm run dev
```

The server connects to MongoDB before it starts listening. Verify it is up by visiting `http://localhost:5000/api/health`.

## Project Structure

```
.
├── server.js              # Entry point, Express app, server bootstrap
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   └── tradeController.js # Trade request handlers
├── middleware/
│   ├── errorHandler.js    # 404 handler + global error handler
│   └── validateTrade.js   # Request body validation
├── models/
│   └── Trade.js           # Mongoose Trade model
├── routes/
│   ├── index.js           # Route aggregator
│   ├── health.routes.js   # Health check
│   └── tradeRoutes.js     # Trade endpoints
├── services/              # Business logic (placeholder)
└── utils/
    └── asyncHandler.js    # Async route wrapper
```

## API Endpoints

### Health & Info

| Method | Endpoint     | Description           |
| ------ | ------------ | --------------------- |
| GET    | `/`          | API info              |
| GET    | `/api/health` | Health check          |

### Trades

| Method | Endpoint         | Description                       |
| ------ | ---------------- | --------------------------------- |
| GET    | `/api/trades`    | List trades with filtering/paging |
| GET    | `/api/trades/:id` | Get a single trade                |
| POST   | `/api/trades`    | Create a trade                    |
| PUT    | `/api/trades/:id` | Update a trade                    |
| DELETE | `/api/trades/:id` | Delete a trade                    |

### Trade Fields

| Field       | Type     | Required | Notes                              |
| ----------- | -------- | -------- | ---------------------------------- |
| `pair`      | String   | Yes      | e.g. `EURUSD`, uppercased          |
| `direction` | String   | Yes      | `long` or `short`                  |
| `entryPrice`| Number   | Yes      | Must be positive                   |
| `exitPrice` | Number   | No       | Cannot be negative                 |
| `stopLoss`  | Number   | No       | Cannot be negative                 |
| `takeProfit`| Number   | No       | Cannot be negative                 |
| `lotSize`   | Number   | No       | Defaults to `0`                    |
| `entryDate` | Date     | No       | Defaults to now                    |
| `exitDate`  | Date     | No       |                                    |
| `pnl`       | Number   | No       |                                    |
| `riskReward`| Number   | No       |                                    |
| `strategy`  | String   | No       |                                    |
| `session`   | String   | No       |                                    |
| `emotion`   | String   | No       |                                    |
| `notes`     | String   | No       |                                    |
| `tags`      | [String] | No       | Defaults to `[]`                   |

### Query Parameters (GET /api/trades)

| Parameter   | Example                       | Description                             |
| ----------- | ----------------------------- | --------------------------------------- |
| `search`    | `?search=EUR`                 | Case-insensitive search on `pair`       |
| `direction` | `?direction=long`             | Filter by direction (`long`/`short`)    |
| `startDate` | `?startDate=2026-01-01`       | Include trades on/after this date       |
| `endDate`   | `?endDate=2026-01-31`         | Include trades on/before this date      |
| `sort`      | `?sort=-createdAt`            | Sort field(s), `-` prefix for descending |
| `page`      | `?page=2`                     | Page number (default `1`)               |
| `limit`     | `?limit=20`                   | Items per page (default `10`)           |

## Example Requests & Responses

### Health Check

```bash
curl http://localhost:5000/api/health
```

Response `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-08-03T03:50:00.000Z"
}
```

### Create a Trade

```bash
curl -X POST http://localhost:5000/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "EURUSD",
    "direction": "long",
    "entryPrice": 1.0850,
    "exitPrice": 1.0900,
    "stopLoss": 1.0800,
    "takeProfit": 1.0950,
    "lotSize": 0.5,
    "strategy": "breakout",
    "session": "london",
    "emotion": "confident",
    "notes": "Clean breakout above resistance.",
    "tags": ["forex", "scalp"]
  }'
```

Response `201`:

```json
{
  "success": true,
  "message": "Trade created successfully",
  "data": {
    "_id": "6720b0c2a1b2c3d4e5f60718",
    "pair": "EURUSD",
    "direction": "long",
    "entryPrice": 1.085,
    "exitPrice": 1.09,
    "stopLoss": 1.08,
    "takeProfit": 1.095,
    "lotSize": 0.5,
    "entryDate": "2026-08-03T03:50:00.000Z",
    "tags": ["forex", "scalp"],
    "strategy": "breakout",
    "session": "london",
    "emotion": "confident",
    "notes": "Clean breakout above resistance.",
    "createdAt": "2026-08-03T03:50:00.000Z",
    "updatedAt": "2026-08-03T03:50:00.000Z",
    "__v": 0
  }
}
```

### List Trades (with filtering and pagination)

```bash
curl "http://localhost:5000/api/trades?search=EUR&direction=long&startDate=2026-01-01&endDate=2026-12-31&sort=-createdAt&page=1&limit=10"
```

Response `200`:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "data": [
    {
      "_id": "6720b0c2a1b2c3d4e5f60718",
      "pair": "EURUSD",
      "direction": "long",
      "entryPrice": 1.085,
      "exitPrice": 1.09,
      "stopLoss": 1.08,
      "takeProfit": 1.095,
      "lotSize": 0.5,
      "entryDate": "2026-08-03T03:50:00.000Z",
      "tags": ["forex", "scalp"],
      "strategy": "breakout",
      "session": "london",
      "emotion": "confident",
      "notes": "Clean breakout above resistance.",
      "createdAt": "2026-08-03T03:50:00.000Z",
      "updatedAt": "2026-08-03T03:50:00.000Z",
      "__v": 0
    }
  ]
}
```

### Get a Single Trade

```bash
curl http://localhost:5000/api/trades/6720b0c2a1b2c3d4e5f60718
```

Response `200` returns a single `data` object. An invalid ID returns `400`, and a missing trade returns `404`.

### Update a Trade

```bash
curl -X PUT http://localhost:5000/api/trades/6720b0c2a1b2c3d4e5f60718 \
  -H "Content-Type: application/json" \
  -d '{"exitPrice": 1.0920, "pnl": 35.0, "riskReward": 1.4}'
```

Response `200`:

```json
{
  "success": true,
  "message": "Trade updated successfully",
  "data": {
    "_id": "6720b0c2a1b2c3d4e5f60718",
    "pair": "EURUSD",
    "direction": "long",
    "entryPrice": 1.085,
    "exitPrice": 1.092,
    "pnl": 35,
    "riskReward": 1.4,
    "createdAt": "2026-08-03T03:50:00.000Z",
    "updatedAt": "2026-08-03T04:00:00.000Z",
    "__v": 0
  }
}
```

### Delete a Trade

```bash
curl -X DELETE http://localhost:5000/api/trades/6720b0c2a1b2c3d4e5f60718
```

Response `200`:

```json
{
  "success": true,
  "message": "Trade deleted successfully"
}
```

## Error Handling

All errors are returned in a consistent JSON shape:

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
| `404`  | Resource not found                                   |
| `409`  | Duplicate value (e.g. unique index violation)        |
| `500`  | Internal server error                                |

In `NODE_ENV=production`, the `stack` trace is omitted from error responses.
