# Backend sync for `banking-system-server`

Cursor cannot push to https://github.com/maheshpcse/banking-system-server with the current GitHub App token (`403`).

## Apply these files

Copy into the server repo and redeploy / restart the API:

| This folder | Target in server repo |
| --- | --- |
| `src/index.js` | `src/index.js` |
| `src/models/User.js` | `src/models/User.js` |
| `src/models/Notification.js` | `src/models/Notification.js` **(new)** |
| `src/routes/auth.js` | `src/routes/auth.js` |
| `src/routes/account.js` | `src/routes/account.js` |
| `src/routes/notifications.js` | `src/routes/notifications.js` **(new)** |
| `src/routes/admin.js` | `src/routes/admin.js` **(new)** |

## MongoDB collections used

| Collection | Written by |
| --- | --- |
| `users` | register, login/profile updates, card application, deposit/withdraw/transfer balances, admin approve/status |
| `transactions` | deposit, withdraw, transfer ledger rows |
| `notifications` | application submit, money moves, transfers, admin approve/reject/status |

## Account money moves (`account.js`)

Standalone MongoDB rejects multi-document sessions:

`Transaction numbers are only allowed on a replica set member or mongos`

`POST /api/account/deposit`, `POST /api/account/withdraw`, and `POST /api/account/transfer` do not use `startSession()` / `startTransaction()`. They update balances then write ledger rows, with a best-effort balance rollback if ledger create fails.

## API contract used by the UI

### Auth
- `POST /api/auth/register` → `{ fullName, username, email, password }`
- `POST /api/auth/login` → `{ identifier, password }`
- `POST /api/auth/forgot-password` → `{ identifier }`
- `POST /api/auth/reset-password` → `{ resetToken, password, confirmPassword }`
- `PATCH /api/auth/profile` (Bearer) → profile / avatar / settings
- `POST /api/auth/change-password` (Bearer)

### Account
- `GET /api/account/summary`
- `POST /api/account/deposit` → `{ amount, description? }`
- `POST /api/account/withdraw` → `{ amount, description? }`
- `POST /api/account/transfer` → `{ toAccountNumber, amount, description? }`
- `POST /api/account/application` → address + card (persists on `users`, creates `notifications`)

### Notifications
- `GET /api/notifications`
- `POST /api/notifications` → `{ kind, title, body, href? }`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`

### Admin (manager/admin role)
- `GET /api/admin/customers?page=1&limit=5` → paginated customers (`pagination: { page, limit, total, pages }`)
- `GET /api/admin/customers/:id` → single customer profile
- `GET /api/admin/requests`
- `PATCH /api/admin/customers/:id/status` → `{ status }`
- `DELETE /api/admin/customers/:id`
- `POST /api/admin/requests/:userId/approve`
- `POST /api/admin/requests/:userId/reject` → `{ reviewNote? }`

## Account lifecycle
- New customers may have `accountNumber: null` and `accountStatus: address_required|under_review`
- `POST /api/account/application` submits address + card for approval (MongoDB `users` + `notifications`)
- Deposit / withdraw / transfer return 403 until an active account number exists
- Admin approve issues `accountNumber` and writes an account notification

## Roles & admin access

Role-based access is already in place:

| Role | How created | After login |
| --- | --- | --- |
| `customer` | Public **Sign up** (`POST /api/auth/register` always sets `role: 'customer'`) | `/dashboard` |
| `manager` / `admin` | **Not** available in public signup. Seed or promote in MongoDB | `/admin` (same Login page) |

- There is **no separate admin login page**. Use `/login` (or home login).
- UI guard: `RoleGuard` on `/admin/*` allows only `admin` and `manager`.
- API guard: `/api/admin/*` returns 403 for customers.

### Seed default admin

From the server repo (with `MONGODB_URI` in `.env`):

```bash
node scripts/seed-admin.js
# or from this UI repo after copying the script:
# node server-integration/scripts/seed-admin.js
```

Default credentials (override with env vars):

- Username: `admin`
- Email: `admin@novabank.local`
- Password: `Admin@12345`
- Role: `admin`

Promote an existing user in MongoDB Compass / shell:

```js
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { role: "admin" } }
)
```

After you grant Cursor write access to `banking-system-server`, ask again and these can be pushed as a server PR automatically.
