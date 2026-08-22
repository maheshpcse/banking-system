# NovaBank Billing System — Combined Plan

This plan merges:

1. `docs/billing-system-integration.md` (banking ↔ billing bridge)
2. `docs/manager-portal-roadmap.md` Phase 3 (Manager Billing)
3. The Minimal Billing System (MEAN + POS) product brief

## Architecture decision

| Brief asks for | NovaBank ships |
| --- | --- |
| Separate MEAN app + MySQL | **Same Angular 14 app + Express API + MongoDB** |
| Bootstrap 5 CDN | Existing NovaBank design system (premium vault chrome) |
| Three.js CDN scene | Lightweight CSS 3D billing stage (performance-safe) |
| Separate admin login | **SSO** via existing JWT / `manager` + Super Admin |

Billing is a **staff mode** inside NovaBank, entered from:

- Navbar → **Billing** (`/manager/billing`)
- Manager desk → Billing card
- Home → **Staff desk** (login; managers land on `/manager`)

## Domains

### POS / commerce (from product brief)

- Products (CRUD, stock, GST %)
- Billing customers (CRUD; optional `bankingAccountNumber`)
- Bill builder (line items, discount, tax, grand total)
- Fake payments: cash / card / UPI / QR simulation
- Invoice print view
- Bill history (filter by date, customer, bill id)

### Banking bridge (from docs)

- Shared refs: `bankingAccountNumber` on invoices, `billingReference` on ledger txs (optional)
- Complaint queue: open → accept / adjust / reject / escalate
- Period reporting handoff (Reports page remains banking; Billing stats on Billing desk)
- Role notifications for invoice paid, complaint opened/resolved/escalated

## API surface (`/api/billing`)

- `GET /dashboard/stats`
- Products: `GET|POST /products`, `PUT|DELETE /products/:id`
- Customers: `GET|POST /customers`, `PUT|DELETE /customers/:id`
- Bills: `GET|POST /bills`, `GET /bills/:id`
- Payments: `POST /payments`, `GET /payments`
- Complaints: `GET|POST /complaints`, `PATCH /complaints/:id`
- `POST /seed` (manager) — sample catalog when empty

## Roles

| Action | Manager | Super Admin | Customer |
| --- | --- | --- | --- |
| POS / products / invoices | Yes | Yes | — |
| Dispute queue | Yes | Yes | File later |
| Escalations | — | Yes | — |
| Alerts | invoice + dispute | escalation | invoice / dispute status |

## Implementation phases

1. **Now** — API + Manager Billing workspace (dashboard, catalog, POS, history, disputes, seed, notifications)
2. **Next** — Customer self-serve invoices / file complaint from dashboard
3. **Later** — Auto settlement webhooks from transfers + merged period graphs on Reports
