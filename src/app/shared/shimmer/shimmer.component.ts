import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-shimmer',
  templateUrl: './shimmer.component.html',
  styleUrls: ['./shimmer.component.scss']
})
export class ShimmerComponent {
  @Input() variant:
    | 'dashboard'
    | 'history'
    | 'history-ledger'
    | 'tx-timeline'
    | 'tx-chart'
    | 'tx-table'
    | 'form'
    | 'transfer'
    | 'settings'
    | 'settings-panel'
    | 'notifications'
    | 'notifications-list'
    | 'notifications-grid'
    | 'admin-overview'
    | 'admin-customers'
    | 'admin-customers-table'
    | 'data-table'
    | 'admin-requests'
    | 'admin-requests-list'
    | 'manager-overview'
    | 'manager-flow-chart'
    | 'manager-flow-table'
    | 'manager-billing-chart'
    | 'manager-billing-table'
    | 'manager-sales-card'
    | 'manager-sales-chart'
    | 'manager-sales-targets'
    | 'manager-reports'
    | 'manager-billing'
    | 'home'
    | 'auth'
    | 'contact-admin'
    | 'drawer-profile' = 'dashboard';

  /** Settings tab or auth page layout when variant is settings-panel / auth */
  @Input() panel:
    | 'identity'
    | 'presence'
    | 'banking'
    | 'cardinfo'
    | 'limits'
    | 'security'
    | 'experience'
    | 'login'
    | 'register'
    | 'forgot'
    | 'reset'
    | 'staff-signup'
    | 'staff-status'
    | 'contact-admin'
    | '' = '';

  /** Column count for data-table shimmer (Customers / Staff grids). */
  @Input() columns = 6;

  /** Row count for data-table shimmer body. */
  @Input() rows = 6;

  readonly barWidths = [72, 54, 88, 40];

  get columnIndexes(): number[] {
    const n = Math.max(1, Math.min(12, Math.floor(Number(this.columns) || 6)));
    return Array.from({ length: n }, (_, i) => i);
  }

  get rowIndexes(): number[] {
    const n = Math.max(1, Math.min(20, Math.floor(Number(this.rows) || 6)));
    return Array.from({ length: n }, (_, i) => i);
  }

  get tableGridTemplate(): string {
    return `repeat(${this.columnIndexes.length}, minmax(0, 1fr))`;
  }
}
