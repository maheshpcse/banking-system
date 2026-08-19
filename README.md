# NovaBank UI (Angular 14)

Angular frontend for the NovaBank minimal banking system.

Backend API lives in a separate repository: [`maheshpcse/banking-system-api`](https://github.com/maheshpcse/banking-system-api)  
(legacy mirror: [`banking-system-server`](https://github.com/maheshpcse/banking-system-server)).

## Features

- Register / login (JWT via API)
- Dashboard with balance and monthly totals
- Deposit & withdraw
- Instant transfers
- Paginated transaction history
- Light premium UI with soft motion

## Requirements

- Node.js **16.20+** (recommended for Angular 14)
- npm 8+
- Running banking API (see server repo)

## Quick start

```bash
npm install
npm start
```

App: [http://localhost:4200](http://localhost:4200)

Configure API base URL in `src/environments/environment.ts` (default `http://localhost:3000/api`).

## Scripts

| Command | Description |
|---|---|
| `npm start` | Dev server on `:4200` |
| `npm run build` | Production build |
| `npm test` | Unit tests |

## Docker

```bash
docker build -t banking-client .
docker run --rm -p 8080:80 banking-client
```

Or with Compose (expects API at `http://localhost:3000`):

```bash
docker compose up -d --build
```

Frontend: [http://localhost:8080](http://localhost:8080)

## Backend repository

Canonical API: [`maheshpcse/banking-system-api`](https://github.com/maheshpcse/banking-system-api)

Legacy: [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server)

Point UI `environment.apiUrl` at the deployed `banking-system-api` service.

