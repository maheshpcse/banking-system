## Roles & admin access

| Role | How created | After login |
| --- | --- | --- |
| `customer` | Public **Sign up** | `/dashboard` |
| `manager` / `admin` | `/auth/staff-signup` → Super Admin approval on `/admin/staff` | `/manager` or `/admin` |
| Super Admin | **Seed only** (`seed-admin.js`, `isSuperAdmin: true`) | `/admin` |

- Pending staff cannot log in; they use `/auth/staff-status`.
- Apply `server-integration` overlays into [`banking-system-api`](https://github.com/maheshpcse/banking-system-api) and redeploy.

### Seed Super Admin

```bash
node scripts/seed-admin.js
```

Default: `admin` / `Admin@12345` (Super Admin).

### Key API additions

- `POST /auth/staff-register`, `POST /auth/staff-status`
- `GET/POST /admin/staff-pending`, `/admin/staff/:id/approve|reject`
- `POST /account/limits/request`, `GET/POST /admin/limit-requests`
- `GET /admin/analytics`, `GET /account/directory`
- Money routes enforce `moneyGate` (card/account status + expiry) and daily limits
