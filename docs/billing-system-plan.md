# NovaBank dual-app architecture (Banking + Billing)

## Decision

**One frontend repo, two application shells**, one shared API + MongoDB + JWT.

| | Banking System | Billing System |
| --- | --- | --- |
| URL | `/`, `/dashboard`, `/manager`, … | `/billing/*` |
| Chrome | NovaBank navbar + vault ambient | Own bottom dock + glass fintech theme |
| Purpose | Identity, money, RBAC, **billing monitoring** | Store POS: products, customers, invoices, fake gateway |
| Who operates | All roles (scoped) | **Manager + Admin only** (not Super Admin) |
| Who monitors | Customer / Manager / Admin / Super Admin | — |

This is smoother than a second GitHub repo: same login token, same alerts, one deploy, clear “Enter Billing System” / “Return to Banking” bridges.

Separate repo later remains possible — API is already namespaced under `/api/billing`.

## Theme (Billing System)

- Soft white / light gray glass panels
- Subtle blue neon accents (`#3b82f6` / `#60a5fa`)
- Bottom-centered dock navigation (no classic sidebar)
- Three.js lightweight dashboard stage (CDN, auto-pause when hidden)
- Bootstrap 5 utilities loaded only while Billing shell is active
- Premium shimmers + micro-loaders on every Billing panel

## Role matrix

| Capability | Customer | Manager | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| Banking controls | Own vault | Desk ops | Ops | Full override |
| Open Billing System app | — | Yes | Yes | — (monitor only) |
| Products / stock / gateway settings | — | Write | Write | Read via Banking monitor |
| Create bills + fake payments | — | Yes | Yes | — |
| Track invoices / disputes in Banking | Own invoices (next) | Monitor queue | Monitor | Monitor + escalation |

## Navigation bridges

1. Home → **Open Billing System** (staff login → `/billing`)
2. Banking Manager → **Billing monitor** → **Launch Billing System**
3. Billing dock → **Return to Banking**

## Notifications

Invoice paid / complaint events still fan out through NovaBank Alerts (`billing`, `complaint` kinds) so Banking monitors stay live without opening the POS UI.
