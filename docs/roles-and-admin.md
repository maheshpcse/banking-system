# Roles & admin access

NovaBank uses role-based access control (`customer` | `manager` | `admin`).

## How it works

- Public **Sign up** (`/auth/register`) always creates a **`customer`**.
- Staff use a **separate** form at `/auth/staff-signup` (Manager or Admin role).
- The first **Super Admin** is **seed-only** (`isSuperAdmin: true`). Later managers/admins stay `pending_approval` until Super Admin activates them on `/admin/staff`.
- Pending staff **cannot log in**. They check status at `/auth/staff-status`.
- Login destinations:
  - Customers → `/dashboard`
  - `manager` → `/manager`
  - `admin` → `/admin`

## Creating the Super Admin (seed only)

```bash
# From banking-system-server (MONGODB_URI required)
ADMIN_ROLE=admin node scripts/seed-admin.js
```

| Field | Value |
| --- | --- |
| Username | `admin` |
| Email | `admin@novabank.local` |
| Password | `Admin@12345` |
| Role | `admin` + `isSuperAdmin` |

Do **not** use public signup for the first admin.

## Registering additional Manager / Admin users

1. Open `/auth/staff-signup` (linked from Login).
2. Choose role **Manager** or **Admin**.
3. After submit, account is `pending_approval` — login is blocked.
4. Super Admin opens **Staff** in the admin navbar → Activate or Decline.
5. Applicant can poll `/auth/staff-status` for polished status messaging (≈24h verification copy).

## Daily limits

- Customers request deposit / withdraw / transfer caps under Account → **Limits**.
- Manager reviews on `/manager/limits`.
- Money APIs enforce card + account status/expiry and daily caps via `banking-rules`.

## Manager portal

See **`docs/manager-portal-roadmap.md`** for desk charts, Billing bridge, and workflow phases.

Copy `server-integration` into `banking-system-server` and redeploy the API.
