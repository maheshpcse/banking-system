# Backend sync for `banking-system-server`

Cursor cannot push to https://github.com/maheshpcse/banking-system-server with the current GitHub App token (`403` for `cursor[bot]`).

## Apply these files

Copy into the server repo:

| This folder | Target in server repo |
| --- | --- |
| `src/index.js` | `src/index.js` |
| `src/models/User.js` | `src/models/User.js` |
| `src/routes/auth.js` | `src/routes/auth.js` |
| `src/routes/account.js` | `src/routes/account.js` |

Then redeploy / restart the API.

## Account money moves (`account.js`)

Standalone MongoDB rejects multi-document sessions:

`Transaction numbers are only allowed on a replica set member or mongos`

`POST /api/account/deposit`, `POST /api/account/withdraw`, and `POST /api/account/transfer` no longer use `startSession()` / `startTransaction()`. They update balances then write ledger rows, with a best-effort balance rollback if ledger create fails.

## API contract used by the UI

- `POST /api/auth/register` → `{ fullName, username, email, password }`
- `POST /api/auth/login` → `{ identifier, password }`
- `POST /api/auth/forgot-password` → `{ identifier }`
- `POST /api/auth/reset-password` → `{ resetToken, password, confirmPassword }`
- `PATCH /api/auth/profile` (Bearer) → profile / avatar / settings
- `POST /api/auth/change-password` (Bearer) → `{ currentPassword, newPassword, confirmPassword }`
- `POST /api/account/deposit` → `{ amount, description? }`
- `POST /api/account/withdraw` → `{ amount, description? }`
- `POST /api/account/transfer` → `{ toAccountNumber, amount, description? }`

After you grant Cursor write access to `banking-system-server`, ask again and these can be pushed as a server PR automatically.


## Account lifecycle
- New customers may have `accountNumber: null` and `accountStatus: address_required|under_review`
- `POST /api/account/application` submits address + card for approval
- Deposit / withdraw / transfer return 403 until an active account number exists
