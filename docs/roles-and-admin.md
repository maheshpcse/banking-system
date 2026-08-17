# Roles & admin access

NovaBank uses role-based access control (`customer` | `manager` | `admin`).

## How it works

- Public **Sign up** always creates a **`customer`**. There is no role picker on registration.
- The same **Login** page is used for everyone.
  - Customers → `/dashboard`
  - `manager` → `/manager`
  - `admin` → `/admin`
- `/admin/*` requires role `admin`. `/manager/*` requires role `manager`.
- Staff and customers share `/settings` (profile, avatar, password, preferences / theme / font) and `/notifications`.

There is **no separate admin or manager login URL**.

## Creating staff accounts

Staff roles are **not** self-service. Create or promote them in MongoDB:

```bash
# From banking-system-server (MONGODB_URI required)
ADMIN_ROLE=admin node scripts/seed-admin.js
ADMIN_ROLE=manager ADMIN_USERNAME=manager ADMIN_EMAIL=manager@novabank.local node scripts/seed-admin.js
```

Default seeded admin credentials:

| Field | Value |
| --- | --- |
| Username | `admin` |
| Email | `admin@novabank.local` |
| Password | `Admin@12345` |
| Role | `admin` |

Or promote an existing user:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "manager" } })
```

## Manager portal

See **`docs/manager-portal-roadmap.md`** for Manager pages, Admin/Customer relationships, and the Manager + Billing System workflow plan.

Copy `server-integration/scripts/seed-admin.js` into the server repo if it is not there yet, then redeploy/restart the API.
