# Billing System ↔ Banking System Integration

This document captures the **planned Billing System** linkage. Banking lifecycle (account opening, cards, RBAC, admin, transfer push notifications) ships first; billing is designed here for a follow-up build.

## Goals

- Surface billing invoices, settlements, and dispute status inside NovaBank dashboards.
- Monitor money movement across banking ledgers and billing charges with shared references.
- Produce daily / weekly / bi-weekly / monthly operational reports with graphical views.
- Route complaints to Admin/Manager queues for accept / reject / resolve workflows.

## High-level architecture

```mermaid
flowchart LR
  Customer[Customer App] --> BankingAPI[Banking API]
  Customer --> BillingAPI[Billing API]
  BankingAPI --> Ledger[(Ledger DB)]
  BillingAPI --> Invoices[(Invoices DB)]
  BankingAPI <-->|Settlement events| BillingAPI
  Admin[Admin / Manager Console] --> BankingAPI
  Admin --> BillingAPI
  BillingAPI --> Reports[Report Engine]
  Reports --> Dashboard[Ops Dashboard Graphs]
```

## Account opening before money movement

```mermaid
sequenceDiagram
  participant U as Customer
  participant B as Banking UI
  participant A as API
  participant M as Manager
  U->>B: Signup / Login
  B->>A: Create identity (no account number yet)
  U->>B: Submit address + card application
  B->>A: under_review
  M->>A: Verify KYC / approve or reject
  alt Approved
    A->>A: Generate account number + activate card
    A->>U: Notification: Account active
  else Rejected
    A->>U: Notification: Correction required
  end
  Note over U,A: Deposit / Withdraw / Transfer blocked until account number exists
```

## Transfer + push notification

```mermaid
sequenceDiagram
  participant S as Sender
  participant API as Banking API
  participant R as Recipient
  participant N as Notification Service
  S->>API: POST /account/transfer
  API->>API: Validate active account numbers
  API->>API: Move balances + ledger rows
  API->>N: Emit transfer event
  N->>S: Push + in-app alert
  N->>R: Push + in-app alert (when online)
```

## Billing complaint & approval loop

```mermaid
flowchart TD
  Tx[Banking / Billing transaction anomaly] --> Complaint[Customer files complaint]
  Complaint --> Queue[Manager / Admin queue]
  Queue --> Review{Review}
  Review -->|Accept / Adjust| Resolve[Resolve + notify customer]
  Review -->|Reject| RejectNote[Reject with reason]
  Review -->|Escalate| Director[Director / Compliance]
  Resolve --> Report[Include in period reports]
  RejectNote --> Report
  Director --> Report
```

## Reporting cadence

Managers schedule banking ledger reports on `/manager/reports`. Billing System later merges invoice / settlement graphs into the same cadence. See `docs/manager-portal-roadmap.md`.

## Manager + Billing bridge

- Manager portal pages (`/manager`, Approvals, Reports, Billing) are the UI shell until Billing APIs ship.
- Shared settlement references connect banking transfers to Billing invoices.
- Complaint accept / reject / escalate lands on the Manager Billing queue with Admin escalation.

| Cadence | Banking view | Billing view |
| --- | --- | --- |
| Daily | Deposits, withdrawals, transfers, failed attempts | Settlements posted, open invoices |
| Weekly | Net flow, top counterparties | Aging buckets, dispute SLA |
| Bi-weekly | Exception queue burn-down | Chargeback / credit memos |
| Monthly | Statement-ready ledger export | Revenue recognition + fee schedule |

## Shared data contract (planned)

- `billingReference` on banking transactions
- `bankingAccountNumber` on billing invoices
- `complaintId` shared across both systems
- Webhook topics: `transfer.completed`, `invoice.paid`, `complaint.opened`, `complaint.resolved`

## Implementation order (agreed)

1. Banking: account lifecycle, card UX, RBAC admin, notifications, money locks ✅ (this PR)
2. Billing service scaffold + auth SSO with banking roles
3. Cross-system settlement events + dashboard widgets
4. Complaint workflows + graphical period reports
