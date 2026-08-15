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

## Fixes included

### Standalone MongoDB (`account.js`)
`POST /api/account/deposit`, `withdraw`, and `transfer` no longer use `startSession()` / `startTransaction()` (fails outside a replica set).

### Profile avatar (`User.js` + `auth.js` + `index.js`)
- `avatar.image` field + `PATCH /api/auth/profile` accepts image data URLs
- `express.json({ limit: '2mb' })` so avatar payloads are not rejected by the default 100kb body limit

## API contract used by the UI

- `POST /api/auth/register` → `{ fullName, username, email, password }`
- `POST /api/auth/login` → `{ identifier, password }`
- `POST /api/auth/forgot-password` → `{ identifier }`
- `POST /api/auth/reset-password` → `{ resetToken, password, confirmPassword }`
- `PATCH /api/auth/profile` (Bearer) → profile / avatar (incl. image) / settings
- `POST /api/auth/change-password` (Bearer)
- `POST /api/account/deposit` | `withdraw` | `transfer`

After you grant Cursor write access to `banking-system-server`, ask again and these can be pushed as a server PR automatically.
