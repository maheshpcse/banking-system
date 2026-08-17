# Roles & admin access

NovaBank uses role-based access control (`customer` | `manager` | `admin`).

## How it works

- Public **Sign up** always creates a **`customer`**. There is no role picker on registration.
- The same **Login** page is used for everyone.
  - Customers → `/dashboard`
  - `admin` / `manager` → `/admin`
- `/admin/*` is protected by `RoleGuard` (UI) and `/api/admin/*` checks role on the server.

There is **no separate admin login URL**.

## Creating staff accounts

Staff roles are **not** self-service. Create or promote them in MongoDB:

```bash
# From banking-system-server (MONGODB_URI required)
node scripts/seed-admin.js
```

Default seeded credentials:

| Field | Value |
| --- | --- |
| Username | `admin` |
| Email | `admin@novabank.local` |
| Password | `Admin@12345` |
| Role | `admin` |

Or promote an existing user:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

Copy `server-integration/scripts/seed-admin.js` into the server repo if it is not there yet, then redeploy/restart the API.
