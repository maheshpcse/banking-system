import { Component, Input } from '@angular/core';

export type EmptyStateKind =
  | 'products'
  | 'customers'
  | 'invoices'
  | 'cart'
  | 'spotlight'
  | 'transactions'
  | 'notifications'
  | 'requests'
  | 'staff'
  | 'generic';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  /** Short page-specific message shown under the illustration. */
  @Input() message = 'Nothing to show here yet.';
  /** Visual tone — banking mint or billing saffron. */
  @Input() tone: 'banking' | 'billing' = 'banking';
  /** Page-specific illustration. */
  @Input() kind: EmptyStateKind = 'generic';
  /** Fill and center inside a parent card/panel. */
  @Input() fill = false;
}
