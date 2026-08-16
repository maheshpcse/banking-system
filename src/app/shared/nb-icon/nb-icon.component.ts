import { Component, Input } from '@angular/core';

export type NbIconName =
  | 'wallet'
  | 'arrow-up'
  | 'arrow-down'
  | 'transfer'
  | 'clock'
  | 'shield'
  | 'card'
  | 'bell'
  | 'check'
  | 'user'
  | 'chart';

@Component({
  selector: 'app-nb-icon',
  template: `
    <svg class="nb-icon" viewBox="0 0 24 24" aria-hidden="true" [attr.data-name]="name">
      <ng-container [ngSwitch]="name">
        <g *ngSwitchCase="'wallet'">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a1 1 0 0 1 1 1v2"></path>
          <rect x="2.5" y="8" width="19" height="11.5" rx="2.2"></rect>
          <path d="M16 13.5h3.5"></path>
        </g>
        <g *ngSwitchCase="'arrow-up'">
          <path d="M12 19V5"></path>
          <path d="M6.5 10.5 12 5l5.5 5.5"></path>
        </g>
        <g *ngSwitchCase="'arrow-down'">
          <path d="M12 5v14"></path>
          <path d="M6.5 13.5 12 19l5.5-5.5"></path>
        </g>
        <g *ngSwitchCase="'transfer'">
          <path d="M4 8h13"></path>
          <path d="M13 4.5 17.5 8 13 11.5"></path>
          <path d="M20 16H7"></path>
          <path d="M11 19.5 6.5 16 11 12.5"></path>
        </g>
        <g *ngSwitchCase="'clock'">
          <circle cx="12" cy="12" r="8.25"></circle>
          <path d="M12 7.5V12l3.2 2"></path>
        </g>
        <g *ngSwitchCase="'shield'">
          <path d="M12 3.5 19 6.5v5.2c0 4.4-2.9 7.5-7 8.8-4.1-1.3-7-4.4-7-8.8V6.5L12 3.5Z"></path>
          <path d="m9.2 12 1.9 1.9 3.8-3.9"></path>
        </g>
        <g *ngSwitchCase="'card'">
          <rect x="2.75" y="5.5" width="18.5" height="13" rx="2.2"></rect>
          <path d="M2.75 10h18.5"></path>
          <path d="M7 15h4"></path>
        </g>
        <g *ngSwitchCase="'bell'">
          <path d="M15.5 17.5a3.5 3.5 0 0 1-7 0"></path>
          <path d="M6.2 17.5h11.6"></path>
          <path d="M18 17.5V11a6 6 0 1 0-12 0v6.5"></path>
        </g>
        <g *ngSwitchCase="'check'">
          <circle cx="12" cy="12" r="8.25"></circle>
          <path d="m8.5 12.2 2.4 2.4 4.7-4.8"></path>
        </g>
        <g *ngSwitchCase="'user'">
          <circle cx="12" cy="8.2" r="3.2"></circle>
          <path d="M5.5 18.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"></path>
        </g>
        <g *ngSwitchCase="'chart'">
          <path d="M4 19.5h16"></path>
          <path d="M7 16.5V10"></path>
          <path d="M12 16.5V7"></path>
          <path d="M17 16.5v-4"></path>
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
      .nb-icon {
        width: 1.1rem;
        height: 1.1rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `
  ]
})
export class NbIconComponent {
  @Input() name: NbIconName = 'wallet';
}
