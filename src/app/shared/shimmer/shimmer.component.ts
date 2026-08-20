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
    | 'form'
    | 'transfer'
    | 'settings'
    | 'settings-panel'
    | 'notifications'
    | 'admin-overview'
    | 'admin-customers'
    | 'admin-customers-table'
    | 'admin-requests'
    | 'manager-overview'
    | 'manager-reports'
    | 'manager-billing'
    | 'home'
    | 'auth'
    | 'drawer-profile' = 'dashboard';

  /** Account settings panel tab layout when variant is settings-panel */
  @Input() panel:
    | 'identity'
    | 'presence'
    | 'banking'
    | 'cardinfo'
    | 'limits'
    | 'security'
    | 'experience'
    | '' = '';
}
