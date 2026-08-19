## Roles & admin access

| Role | How created | After login |
| --- | --- | --- |
| `customer` | Public **Sign up** | `/dashboard` |
| `manager` / `admin` | `/auth/staff-signup` → Super Admin approval on `/admin/staff` | `/manager` or `/admin` |
| Super Admin | **Seed only** (`npm run seed:admin` in **banking-system-server**) | `/admin` (+ Manager Limits override) |

**Canonical backend repo:** [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server).  
This `server-integration/` folder is a **mirror / patch reference** only — push API changes to the server repo, do not treat this folder as the live API.

- Pending staff cannot log in; they use `/auth/staff-status`.
- Limit approvals: **Manager-only** API (`requireManagerOrSuperAdmin`); Super Admin may open `/manager/limits` as override.

### Seed Super Admin

```bash
# From banking-system-server
npm run seed:admin
# or: node src/config/scripts/seed-admin.js
# wrapper: node scripts/seed-admin.js
```

Default: `admin` / `Admin@12345` (Super Admin).

### Key API additions

- `POST /auth/staff-register`, `POST /auth/staff-status`
- `GET/POST /admin/staff-pending`, `/admin/staff/:id/approve|reject`
- `POST /account/limits/request`, `GET/POST /admin/limit-requests` (manager + Super Admin)
- `GET /admin/analytics`, `GET /account/directory`
- `PATCH /account/card-controls`
- Money routes enforce full `moneyGate` channels + rolling 24h limits
- PAN/CVV encrypted at rest (`card-crypto.js`) + unique `card.comboHash` index
