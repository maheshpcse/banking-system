# Minimal Banking System (MEAN)

NovaBank is a lightweight banking web app built with the **MEAN** stack:

- **MongoDB** (in-memory replica set for local demo, or your own URI)
- **Express** API
- **Angular 14** frontend
- **Node.js** runtime

## Features

- Register / login with JWT
- Account dashboard with balance and monthly totals
- Deposit & withdraw
- Instant transfers between accounts
- Paginated transaction history
- Light premium UI with soft 2D motion and light 3D card depth

## Requirements

- Node.js **16.20+** (recommended for Angular 14)
- npm 8+

## Quick start

```bash
# Install dependencies
npm run install:all

# Use Node 16+ (recommended for Angular 14)
# Terminal 1 — API (http://localhost:3000)
npm run server

# Terminal 2 — Angular (http://localhost:4200)
npm run client
```

> On Ubuntu 24.04+, `npm run server` auto-fetches local OpenSSL 1.1 libs so the in-memory MongoDB binary can start.

Open [http://localhost:4200](http://localhost:4200), create an account (starter balance **$1,000**), then deposit, withdraw, or transfer.

## Configuration

Server env file: `server/.env`

| Variable | Description |
|---|---|
| `PORT` | API port (default `3000`) |
| `JWT_SECRET` | JWT signing secret |
| `USE_MEMORY_DB` | `true` uses embedded MongoDB (default) |
| `MONGODB_URI` | Real MongoDB URI when `USE_MEMORY_DB=false` |
| `CLIENT_ORIGIN` | CORS origin (default `http://localhost:4200`) |

## Project structure

```
client/   Angular 14 SPA
server/   Express + Mongoose API
```

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/account/summary`
- `POST /api/account/deposit`
- `POST /api/account/withdraw`
- `POST /api/account/transfer`
- `GET /api/transactions`
