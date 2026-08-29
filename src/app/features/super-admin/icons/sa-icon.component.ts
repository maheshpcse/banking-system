import { Component, Input } from '@angular/core';

export type SaIconName =
  | 'ops'
  | 'directory'
  | 'requests'
  | 'staff'
  | 'alerts'
  | 'lab'
  | 'account'
  | 'signout'
  | 'shield-key'
  | 'spark'
  | 'users'
  | 'box'
  | 'ticket'
  | 'check'
  | 'trash'
  | 'clear';

/**
 * Apex Console icon set — sharp, angular, stroke-based glyphs distinct from
 * the rounded `app-nb-icon` banking set. Used across the Super Admin bottom
 * command dock and console pages.
 */
@Component({
  selector: 'app-sa-icon',
  template: `
    <svg class="sa-icon" viewBox="0 0 24 24" aria-hidden="true" [attr.data-name]="name">
      <ng-container [ngSwitch]="name">
        <g *ngSwitchCase="'ops'">
          <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7Z"></path>
          <path d="M12 8.25v7.5"></path>
          <path d="M8.5 10 12 8.25 15.5 10"></path>
          <path d="M8.5 14 12 15.75 15.5 14"></path>
        </g>
        <g *ngSwitchCase="'directory'">
          <path d="M4 4.5h6.5L12.5 7H20v12.5H4Z"></path>
          <path d="M4 9.5h16"></path>
        </g>
        <g *ngSwitchCase="'requests'">
          <path d="M6 3.5h9l3.5 3.5v13.5H6Z"></path>
          <path d="M15 3.5V7h3.5"></path>
          <path d="M9 12.5h6"></path>
          <path d="M9 16h6"></path>
        </g>
        <g *ngSwitchCase="'staff'">
          <circle cx="9" cy="8" r="3"></circle>
          <path d="M3.5 19c1-3.4 3-5 5.5-5s4.5 1.6 5.5 5"></path>
          <path d="M15.5 6.5a2.75 2.75 0 0 1 0 5.4"></path>
          <path d="M17 14.3c2 .5 3 1.9 3.6 4.2"></path>
        </g>
        <g *ngSwitchCase="'alerts'">
          <path d="M12 2.75 4 7v6.2c0 4.35 3.35 7.35 8 8.05 4.65-.7 8-3.7 8-8.05V7Z"></path>
          <path d="M12 8v4.5"></path>
          <circle cx="12" cy="15.75" r="0.9" fill="currentColor" stroke="none"></circle>
        </g>
        <g *ngSwitchCase="'lab'">
          <path d="M9.5 2.75h5"></path>
          <path d="M10.25 3v6.4L4.8 18.3a1.6 1.6 0 0 0 1.36 2.45h11.68a1.6 1.6 0 0 0 1.36-2.45L13.75 9.4V3"></path>
          <path d="M7.5 15h9"></path>
        </g>
        <g *ngSwitchCase="'account'">
          <path d="M12 2.5 19.5 6v6.4c0 5-3.15 8.35-7.5 9.6-4.35-1.25-7.5-4.6-7.5-9.6V6Z"></path>
          <circle cx="12" cy="10.4" r="2.35"></circle>
          <path d="M8.4 16.2c.85-1.9 2-2.8 3.6-2.8s2.75.9 3.6 2.8"></path>
        </g>
        <g *ngSwitchCase="'signout'">
          <path d="M9.5 20H5.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4"></path>
          <path d="M20 12H10.5"></path>
          <path d="m16 7.5 4.5 4.5-4.5 4.5"></path>
        </g>
        <g *ngSwitchCase="'shield-key'">
          <path d="M12 2.5 19.5 6v6.2c0 4.9-3.1 8.15-7.5 9.3-4.4-1.15-7.5-4.4-7.5-9.3V6Z"></path>
          <circle cx="11" cy="11.5" r="1.9"></circle>
          <path d="M12.4 12.9 15.5 16"></path>
          <path d="M14.2 14.7 15.4 13.5"></path>
        </g>
        <g *ngSwitchCase="'spark'">
          <path d="M12 2.5 13.6 9.4 20.5 11 13.6 12.6 12 19.5 10.4 12.6 3.5 11 10.4 9.4Z"></path>
        </g>
        <g *ngSwitchCase="'users'">
          <circle cx="8.25" cy="8" r="3"></circle>
          <circle cx="16.5" cy="9.5" r="2.4"></circle>
          <path d="M3 19c.85-3.35 2.65-5 5.25-5s4.4 1.65 5.25 5"></path>
          <path d="M14.75 14.5c2.2.35 3.55 1.9 4.25 4.5"></path>
        </g>
        <g *ngSwitchCase="'box'">
          <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z"></path>
          <path d="M4 7.5 12 11l8-3.5"></path>
          <path d="M12 11v9"></path>
        </g>
        <g *ngSwitchCase="'ticket'">
          <path d="M4 8.5a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V12.5a2 2 0 0 1 0-4V7a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 4 7Z"></path>
          <path d="M14 5.75v12.5" stroke-dasharray="1.6 2"></path>
        </g>
        <g *ngSwitchCase="'check'">
          <path d="M4.5 12.5 9.5 17.5 19.5 6.5"></path>
        </g>
        <g *ngSwitchCase="'trash'">
          <path d="M5 7.5h14"></path>
          <path d="M9.5 7.5V5.25h5V7.5"></path>
          <path d="M7 7.5 7.8 19a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4l.8-11.5"></path>
          <path d="M10.25 11v6"></path>
          <path d="M13.75 11v6"></path>
        </g>
        <g *ngSwitchCase="'clear'">
          <path d="M6 6l12 12"></path>
          <path d="M18 6 6 18"></path>
        </g>
      </ng-container>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }
      .sa-icon {
        width: 1.45rem;
        height: 1.45rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.55;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `
  ]
})
export class SaIconComponent {
  @Input() name: SaIconName = 'ops';
}
