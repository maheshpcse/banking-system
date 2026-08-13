# NovaBank API (Express + MongoDB)

Backend for the NovaBank minimal banking system (MEAN stack).

Frontend UI: [`maheshpcse/banking-system`](https://github.com/maheshpcse/banking-system)

## Features

- JWT register / login
- Account summary
- Deposit / withdraw
- Peer transfers
- Paginated transaction history
- In-memory MongoDB replica set for local demo (or real `MONGODB_URI`)

## Requirements

- Node.js **16.20+**
- npm 8+

## Quick start

```bash
cp .env.example .env
npm install
npm start
```

API: [http://localhost:3000](http://localhost:3000)  
Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

> On Ubuntu 24.04+, `npm start` auto-fetches local OpenSSL 1.1 libs so the in-memory MongoDB binary can start.

## Configuration

| Variable | Description |
|---|---|
| `PORT` | API port (default `3000`) |
| `JWT_SECRET` | JWT signing secret |
| `USE_MEMORY_DB` | `true` uses embedded MongoDB (default) |
| `MONGODB_URI` | Real MongoDB URI when `USE_MEMORY_DB=false` |
| `CLIENT_ORIGIN` | CORS origin (default `http://localhost:4200`) |

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/account/summary`
- `POST /api/account/deposit`
- `POST /api/account/withdraw`
- `POST /api/account/transfer`
- `GET /api/transactions`

## Docker

```bash
docker build -t banking-server .
docker run --rm -p 3000:3000 \
  -e USE_MEMORY_DB=true \
  -e JWT_SECRET=dev-secret \
  -e CLIENT_ORIGIN=http://localhost:4200 \
  banking-server
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start API (`start.sh`) |
| `npm run dev` | Nodemon + `start.sh` |
| `npm run start:raw` | `node src/index.js` without OpenSSL helper |
