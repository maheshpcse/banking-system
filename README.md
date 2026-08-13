# NovaBank UI (Angular 14)

Angular frontend for the NovaBank minimal banking system.

Backend API lives in a separate repository: [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server).

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

## Publish backend repo

The Express API export lives on branch [`cursor/server-export-cb7f`](https://github.com/maheshpcse/banking-system/tree/cursor/server-export-cb7f).

**Option A — local push**

```bash
git clone --branch cursor/server-export-cb7f --single-branch https://github.com/maheshpcse/banking-system.git banking-system-server-tmp
cd banking-system-server-tmp
git checkout -B main
git remote set-url origin https://github.com/maheshpcse/banking-system-server.git
git push -u origin main
```

**Option B — GitHub Actions mirror**

1. Add repo secret `BANKING_SYSTEM_SERVER_PUSH_TOKEN` (PAT with write access to `banking-system-server`)
2. Run workflow **Mirror backend to banking-system-server**

