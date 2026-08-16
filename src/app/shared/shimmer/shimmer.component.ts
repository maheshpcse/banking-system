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
    | 'auth' = 'dashboard';
}
