# Avatar presets

Role-scoped professional preset **values** (stored on `avatar.presetId`):

- Customer: `customer/preset-01` … `customer/preset-03`
- Manager: `manager/preset-01` … `manager/preset-03`
- Admin / Super Admin: `admin/preset-01` … `admin/preset-03`

Account → Presence exposes these as a dropdown (`Select preset` / Professional 1–3).
They are saved as string IDs only — not rendered as portrait images in the UI.
A custom profile upload still uses `avatar.image` and clears `presetId`.
