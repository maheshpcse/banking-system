# Roles & admin access

NovaBank uses role-based access control (`customer` | `manager` | `admin`).

**Canonical API:** [`maheshpcse/banking-system-server`](https://github.com/maheshpcse/banking-system-server)  
(`server-integration/` in this UI repo is a reference mirror only.)

## How it works

- Public **Sign up** (`/auth/register`) always creates a **`customer`**.
- Staff use a **separate** form at `/auth/staff-signup` (Manager or Admin role).
- The first **Super Admin** is **seed-only** (`isSuperAdmin: true`). Later managers/admins stay `pending_approval` until Super Admin activates them on `/admin/staff`.
- Pending staff **cannot log in**. They check status at `/auth/staff-status`.
- Login destinations:
  - Customers → `/dashboard`
  - `manager` → `/manager`
  - `admin` → `/admin`
  - Super Admin may also open `/manager` (including Limits) as an override

## Creating the Super Admin (seed only)

```bash
# From banking-system-server (MONGODB_URI required)
npm run seed:admin
# Equivalent:
#   node src/config/scripts/seed-admin.js
#   node scripts/seed-admin.js
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

## Card controls & secrets

- Customer Account → Card controls: freeze, online, contactless, international, ATM.
- API `moneyGate` enforces **all** flags by channel (`online` / `atm` / `contactless` / `international`).
- PAN/CVV are **encrypted at rest** (AES-256-GCM); UI reveal is masking + controlled decrypt for authorized views — not “encryption by hiding.”
- Unique `card.comboHash` index prevents duplicate Card Number + CVV races.

## 24-hour limits

- Customers request deposit / withdraw / transfer caps under Account → **Limits**.
- Usage is a **rolling 24-hour** window (not calendar midnight).
- Manager reviews on `/manager/limits` (Super Admin override allowed).
- Money APIs enforce card + account status/expiry, controls, and caps via `banking-rules`.

## Manager portal

See **`docs/manager-portal-roadmap.md`** for desk charts, Billing bridge, and workflow phases.
