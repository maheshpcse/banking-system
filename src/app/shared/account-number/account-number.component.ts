import { Component, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';

const ACCOUNT_REVEAL_MS = 3500;

@Component({
  selector: 'app-account-number',
  templateUrl: './account-number.component.html',
  styleUrls: ['./account-number.component.scss']
})
export class AccountNumberComponent implements OnChanges, OnDestroy {
  @Input() value: string | null | undefined;
  @Input() pendingLabel = 'Pending';
  /** Visual density: hero chip, badge, or table cell */
  @Input() variant: 'hero' | 'badge' | 'inline' = 'inline';

  visible = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  get hasValue(): boolean {
    return !!this.value && String(this.value).trim().length > 0;
  }

  get displayValue(): string {
    const raw = String(this.value || '');
    if (this.visible) {
      return raw;
    }
    if (raw.length <= 4) {
      return raw;
    }
    return `${'•'.repeat(raw.length - 4)}${raw.slice(-4)}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.hide();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  toggle(): void {
    if (!this.hasValue) {
      return;
    }
    if (this.visible) {
      this.hide();
      return;
    }
    this.visible = true;
    this.clearTimer();
    this.hideTimer = setTimeout(() => this.hide(), ACCOUNT_REVEAL_MS);
  }

  private hide(): void {
    this.visible = false;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
