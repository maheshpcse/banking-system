import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  /** Short page-specific message shown under the illustration. */
  @Input() message = 'No data found.';
  /** Optional eyebrow above the illustration. */
  @Input() title = 'No data';
  /** Visual tone — banking mint or billing saffron. */
  @Input() tone: 'banking' | 'billing' = 'banking';
}
