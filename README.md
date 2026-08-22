# NovaBank UI (Angular 14)

Angular frontend for the NovaBank minimal banking system.

Backend API lives in a separate repository: [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server).

## Features

- Register / login (JWT via API)
- Dashboard with balance, monthly totals, and rolling 24h limit meters
- Deposit & withdraw (card controls + moneyGate enforced)
- Instant transfers with recipient autocomplete and transfer usage meters
- Paginated transaction history
- Staff signup / Super Admin approval / Manager analytics
- **Billing System desk** (Manager → Billing): POS invoices, catalog, fake payments, disputes
- Light premium UI with soft motion

## Requirements

- Node.js **16.20+** (recommended for Angular 14)
- npm 8+
- Running banking API: [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server)

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

## Docs

- `docs/roles-and-admin.md` — staff seed, limits, card security
- `docs/manager-portal-roadmap.md` — Manager desk + Billing bridge (Billing remains roadmap-only)
- `server-integration/` — reference mirror of API patches; **live API is banking-system-server**

