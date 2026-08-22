import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-billing-panel-shimmer',
  template: `
    <div class="bps" [attr.data-variant]="variant" aria-hidden="true">
      <div class="bps__tiles" *ngIf="variant !== 'list'">
        <div class="bps__tile" *ngFor="let t of tiles"></div>
      </div>
      <div class="bps__list">
        <div class="bps__line" *ngFor="let l of lines" [style.width.%]="l"></div>
      </div>
      <div class="bps__pos" *ngIf="variant === 'pos'">
        <div class="bps__chip" *ngFor="let c of chips"></div>
        <div class="bps__cart"></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .bps {
        display: grid;
        gap: 1rem;
        animation: bps-fade-up 0.45s ease both;
      }

      .bps__tiles {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .bps__tile,
      .bps__line,
      .bps__chip,
      .bps__cart {
        border-radius: 1rem;
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.45) 20%,
          rgba(147, 197, 253, 0.45) 40%,
          rgba(255, 255, 255, 0.55) 60%
        );
        background-size: 200% 100%;
        animation: bps-shimmer 1.35s ease-in-out infinite;
        border: 1px solid rgba(255, 255, 255, 0.55);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
        backdrop-filter: blur(8px);
      }

      .bps__tile {
        height: 5.5rem;
      }

      .bps__list {
        display: grid;
        gap: 0.65rem;
        padding: 1rem;
        border-radius: 1.15rem;
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.65);
      }

      .bps__line {
        height: 0.85rem;
        border-radius: 999px;
      }

      .bps__pos {
        display: grid;
        gap: 0.75rem;
      }

      .bps__chip {
        height: 2.2rem;
        width: 28%;
        display: inline-block;
      }

      .bps__cart {
        height: 9rem;
      }

      .bps[data-variant='list'] .bps__tiles {
        display: none;
      }

      .bps[data-variant='pos'] .bps__tiles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (max-width: 720px) {
        .bps__tiles {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @keyframes bps-shimmer {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: -100% 0;
        }
      }

      @keyframes bps-fade-up {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class BillingPanelShimmerComponent {
  @Input() variant: 'desk' | 'list' | 'pos' = 'desk';

  readonly tiles = [1, 2, 3, 4];
  readonly lines = [92, 78, 86, 64, 74];
  readonly chips = [1, 2, 3, 4];
}
