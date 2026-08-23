import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-billing-panel-shimmer',
  template: `
    <div class="bps" [attr.data-variant]="variant" aria-hidden="true">
      <!-- Shared page head: title + actions -->
      <div class="bps__head" *ngIf="showHead">
        <div class="bps__head-copy">
          <div class="bps__bone bps__bone--xs"></div>
          <div class="bps__bone bps__bone--title"></div>
          <div class="bps__bone bps__bone--lede"></div>
        </div>
        <div class="bps__head-actions" *ngIf="variant === 'desk' || variant === 'catalog'">
          <div class="bps__bone bps__bone--btn"></div>
          <div class="bps__bone bps__bone--btn bps__bone--accent" *ngIf="variant === 'desk'"></div>
        </div>
      </div>

      <!-- Desk: KPI row + Live POS field + Recent bills -->
      <ng-container *ngIf="variant === 'desk'">
        <div class="bps__kpis">
          <div class="bps__kpi" *ngFor="let k of kpis">
            <div class="bps__bone bps__bone--xs"></div>
            <div class="bps__bone bps__bone--lg"></div>
          </div>
        </div>
        <div class="bps__scene">
          <div class="bps__bone bps__bone--scene"></div>
          <div class="bps__scene-caption">
            <div class="bps__bone bps__bone--xs"></div>
            <div class="bps__bone bps__bone--md"></div>
          </div>
        </div>
        <div class="bps__panel">
          <div class="bps__toolbar">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--btn"></div>
          </div>
          <div class="bps__row" *ngFor="let r of billRows">
            <div class="bps__bone bps__bone--fill" [style.width.%]="r"></div>
            <div class="bps__bone bps__bone--sm"></div>
          </div>
        </div>
      </ng-container>

      <!-- Desk pieces for partial reloads -->
      <ng-container *ngIf="variant === 'desk-scene'">
        <div class="bps__scene">
          <div class="bps__bone bps__bone--scene"></div>
          <div class="bps__scene-caption">
            <div class="bps__bone bps__bone--xs"></div>
            <div class="bps__bone bps__bone--md"></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="variant === 'desk-bills'">
        <div class="bps__panel">
          <div class="bps__toolbar">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--btn"></div>
          </div>
          <div class="bps__row" *ngFor="let r of billRows">
            <div class="bps__bone bps__bone--fill" [style.width.%]="r"></div>
            <div class="bps__bone bps__bone--sm"></div>
          </div>
        </div>
      </ng-container>

      <!-- Catalog data panel only (form stays mounted) -->
      <ng-container *ngIf="variant === 'catalog-data'">
        <div class="bps__table-head">
          <div class="bps__bone" *ngFor="let h of heads"></div>
        </div>
        <div class="bps__row bps__row--table" *ngFor="let r of catalogDataRows">
          <div class="bps__dot"></div>
          <div class="bps__bone bps__bone--fill"></div>
          <div class="bps__bone bps__bone--sm"></div>
          <div class="bps__bone bps__bone--xs"></div>
        </div>
      </ng-container>

      <!-- History timeline only -->
      <ng-container *ngIf="variant === 'history-data'">
        <div class="bps__panel">
          <div class="bps__row bps__row--table" *ngFor="let r of historyRows">
            <div class="bps__bone bps__bone--fill"></div>
            <div class="bps__bone bps__bone--sm"></div>
            <div class="bps__bone bps__bone--xs"></div>
            <div class="bps__bone bps__bone--sm"></div>
          </div>
        </div>
      </ng-container>

      <!-- Catalog: toolbar + form/data panels -->
      <ng-container *ngIf="variant === 'catalog'">
        <div class="bps__toolbar bps__toolbar--wrap">
          <div class="bps__bone bps__bone--search"></div>
          <div class="bps__bone bps__bone--btn"></div>
          <div class="bps__bone bps__bone--select"></div>
          <div class="bps__bone bps__bone--select"></div>
          <div class="bps__seg">
            <span *ngFor="let s of segs"></span>
          </div>
        </div>
        <div class="bps__layout">
          <div class="bps__panel bps__panel--form">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--field" *ngFor="let f of fields"></div>
            <div class="bps__bone bps__bone--btn bps__bone--accent"></div>
          </div>
          <div class="bps__panel">
            <div class="bps__table-head">
              <div class="bps__bone" *ngFor="let h of heads"></div>
            </div>
            <div class="bps__row bps__row--table" *ngFor="let r of catalogRows">
              <div class="bps__dot"></div>
              <div class="bps__bone bps__bone--fill"></div>
              <div class="bps__bone bps__bone--sm"></div>
              <div class="bps__bone bps__bone--xs"></div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- POS: two columns -->
      <ng-container *ngIf="variant === 'pos'">
        <div class="bps__pos">
          <div class="bps__panel bps__pos__picker">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--field"></div>
            <div class="bps__search-row">
              <div class="bps__bone bps__bone--search"></div>
              <div class="bps__bone bps__bone--btn"></div>
            </div>
            <div class="bps__chips">
              <div class="bps__chip" *ngFor="let c of chips"></div>
            </div>
          </div>
          <div class="bps__panel bps__pos__cart">
            <div class="bps__toolbar">
              <div class="bps__bone bps__bone--md"></div>
              <div class="bps__bone bps__bone--xs"></div>
            </div>
            <div class="bps__row" *ngFor="let r of cartRows">
              <div class="bps__bone bps__bone--fill"></div>
              <div class="bps__bone bps__bone--xs"></div>
            </div>
            <div class="bps__totals">
              <div class="bps__bone bps__bone--sm" *ngFor="let t of totals"></div>
            </div>
            <div class="bps__bone bps__bone--btn bps__bone--block bps__bone--accent"></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="variant === 'pos-products'">
        <div class="bps__chips">
          <div class="bps__chip" *ngFor="let c of chips"></div>
        </div>
      </ng-container>

      <!-- Settings: hero + two columns -->
      <ng-container *ngIf="variant === 'settings'">
        <div class="bps__hero">
          <div class="bps__bone bps__bone--xs"></div>
          <div class="bps__bone bps__bone--title"></div>
          <div class="bps__bone bps__bone--lede"></div>
        </div>
        <div class="bps__settings">
          <div class="bps__panel">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--field" *ngFor="let f of settingsFields"></div>
            <div class="bps__bone bps__bone--btn bps__bone--accent"></div>
          </div>
          <div class="bps__panel">
            <div class="bps__bone bps__bone--md"></div>
            <div class="bps__bone bps__bone--sm"></div>
            <div class="bps__tiles">
              <div class="bps__tile" *ngFor="let t of methodTiles"></div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- History: toolbar + table -->
      <ng-container *ngIf="variant === 'history'">
        <div class="bps__toolbar bps__toolbar--wrap">
          <div class="bps__bone bps__bone--search"></div>
          <div class="bps__bone bps__bone--select"></div>
          <div class="bps__bone bps__bone--select"></div>
          <div class="bps__bone bps__bone--btn"></div>
        </div>
        <div class="bps__panel">
          <div class="bps__table-head">
            <div class="bps__bone" *ngFor="let h of historyHeads"></div>
          </div>
          <div class="bps__row bps__row--table" *ngFor="let r of historyRows">
            <div class="bps__bone bps__bone--fill"></div>
            <div class="bps__bone bps__bone--sm"></div>
            <div class="bps__bone bps__bone--xs"></div>
            <div class="bps__bone bps__bone--sm"></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .bps {
        display: grid;
        gap: 1rem;
        width: 100%;
        animation: bps-fade-up 0.4s ease both;
      }

      .bps__bone,
      .bps__chip,
      .bps__tile,
      .bps__dot,
      .bps__seg span {
        border-radius: 0.75rem;
        background: linear-gradient(
          105deg,
          rgba(217, 232, 226, 0.55) 18%,
          rgba(255, 200, 1, 0.42) 42%,
          rgba(217, 232, 226, 0.65) 62%
        );
        background-size: 220% 100%;
        animation: bps-shimmer 1.35s ease-in-out infinite;
        border: 1px solid rgba(255, 255, 255, 0.55);
      }

      .bps__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .bps__head-copy {
        display: grid;
        gap: 0.45rem;
        flex: 1;
        min-width: 12rem;
      }

      .bps__head-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .bps__bone--xs {
        height: 0.55rem;
        width: 4.5rem;
      }
      .bps__bone--sm {
        height: 0.7rem;
        width: 5.5rem;
      }
      .bps__bone--md {
        height: 0.85rem;
        width: 8rem;
      }
      .bps__bone--title {
        height: 1.55rem;
        width: min(16rem, 55%);
        border-radius: 0.65rem;
      }
      .bps__bone--lede {
        height: 0.7rem;
        width: min(28rem, 85%);
      }
      .bps__bone--lg {
        height: 1.35rem;
        width: 7rem;
        margin-top: 0.45rem;
      }
      .bps__bone--fill {
        height: 0.8rem;
        flex: 1;
        min-width: 0;
      }
      .bps__bone--search {
        height: 2.35rem;
        flex: 1;
        min-width: 12rem;
        border-radius: 0.85rem;
      }
      .bps__bone--btn {
        height: 2.35rem;
        width: 5.5rem;
        border-radius: 0.85rem;
      }
      .bps__bone--select {
        height: 2.35rem;
        width: 8.5rem;
        border-radius: 0.85rem;
      }
      .bps__bone--field {
        height: 2.35rem;
        width: 100%;
        border-radius: 0.85rem;
      }
      .bps__bone--block {
        width: 100%;
        height: 2.6rem;
      }
      .bps__bone--accent {
        background: linear-gradient(
          105deg,
          rgba(255, 153, 50, 0.35) 18%,
          rgba(255, 200, 1, 0.55) 45%,
          rgba(255, 153, 50, 0.4) 65%
        );
        background-size: 220% 100%;
      }

      .bps__scene {
        position: relative;
        min-height: 210px;
        border-radius: 1.25rem;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.7);
      }

      .bps__bone--scene {
        width: 100%;
        height: 210px;
        border-radius: 0;
        border: 0;
      }

      .bps__scene-caption {
        position: absolute;
        left: 1rem;
        bottom: 0.9rem;
        display: grid;
        gap: 0.35rem;
      }

      .bps__panel {
        padding: 1rem 1.1rem;
        border-radius: 1.15rem;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        display: grid;
        gap: 0.7rem;
      }

      .bps__kpis {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .bps__kpi {
        padding: 1rem 1.05rem;
        border-radius: 1.1rem;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
      }

      .bps__toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.65rem;
      }

      .bps__toolbar--wrap {
        flex-wrap: wrap;
        justify-content: flex-start;
      }

      .bps__row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.35rem 0;
      }

      .bps__row--table {
        padding: 0.55rem 0;
        border-top: 1px solid rgba(22, 50, 58, 0.06);
      }

      .bps__layout {
        display: grid;
        grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.6fr);
        gap: 0.9rem;
        align-items: start;
      }

      .bps__panel--form {
        gap: 0.65rem;
      }

      .bps__table-head {
        display: grid;
        grid-template-columns: 1.4fr 1fr 0.7fr 0.6fr;
        gap: 0.75rem;
        padding-bottom: 0.35rem;

        .bps__bone {
          height: 0.55rem;
          width: 70%;
        }
      }

      .bps__dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        flex: 0 0 auto;
      }

      .bps__seg {
        display: inline-flex;
        gap: 0.35rem;
        padding: 0.25rem;
        border-radius: 0.85rem;
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(22, 50, 58, 0.08);

        span {
          width: 3.2rem;
          height: 1.7rem;
          border-radius: 0.65rem;
        }
      }

      .bps__pos {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 0.9rem;
        min-height: min(62vh, 560px);
      }

      .bps__pos__picker,
      .bps__pos__cart {
        min-height: 100%;
      }

      .bps__search-row {
        display: flex;
        gap: 0.5rem;
      }

      .bps__chips {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.55rem;
      }

      .bps__chip {
        height: 4.2rem;
        border-radius: 0.95rem;
      }

      .bps__totals {
        display: grid;
        gap: 0.45rem;
        padding-top: 0.35rem;
        border-top: 1px solid rgba(22, 50, 58, 0.08);
      }

      .bps__hero {
        padding: 1.35rem 1.5rem;
        border-radius: 1.25rem;
        background: linear-gradient(
          120deg,
          rgba(255, 200, 1, 0.28),
          rgba(217, 232, 226, 0.75) 55%,
          rgba(255, 255, 255, 0.7)
        );
        border: 1px solid rgba(255, 255, 255, 0.7);
        display: grid;
        gap: 0.55rem;
      }

      .bps__settings {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.9rem;
      }

      .bps__tiles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.65rem;
      }

      .bps__tile {
        height: 5.75rem;
        border-radius: 1rem;
        aspect-ratio: 1.586 / 1;
        height: auto;
        min-height: 5.5rem;
      }

      @media (max-width: 960px) {
        .bps__kpis {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .bps__layout,
        .bps__pos,
        .bps__settings {
          grid-template-columns: 1fr;
        }
        .bps__chips {
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
          transform: translateY(8px);
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
  @Input() variant:
    | 'desk'
    | 'desk-scene'
    | 'desk-bills'
    | 'catalog'
    | 'catalog-data'
    | 'pos'
    | 'pos-products'
    | 'settings'
    | 'history'
    | 'history-data' = 'desk';

  get showHead(): boolean {
    return (
      this.variant === 'desk' ||
      this.variant === 'catalog' ||
      this.variant === 'pos' ||
      this.variant === 'history'
    );
  }

  readonly kpis = [1, 2, 3, 4];
  readonly rows = [88, 76, 92];
  readonly billRows = [88, 72];
  readonly segs = [1, 2, 3];
  readonly fields = [1, 2, 3, 4];
  readonly heads = [1, 2, 3, 4];
  readonly catalogRows = [1, 2, 3, 4, 5, 6];
  readonly catalogDataRows = [1, 2, 3, 4];
  readonly chips = [1, 2, 3, 4, 5, 6];
  readonly cartRows = [1, 2, 3, 4];
  readonly totals = [1, 2, 3];
  readonly settingsFields = [1, 2, 3, 4];
  readonly methodTiles = [1, 2, 3, 4];
  readonly historyHeads = [1, 2, 3, 4];
  readonly historyRows = [1, 2, 3, 4, 5, 6];
}
