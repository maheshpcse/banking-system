import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

const SECRET_REVEAL_MS = 3500;

@Component({
  selector: 'app-secure-secret',
  templateUrl: './secure-secret.component.html',
  styleUrls: ['./secure-secret.component.scss']
})
export class SecureSecretComponent implements OnChanges, OnDestroy {
  /** Raw secret (card number or CVV) */
  @Input() value: string | null | undefined;
  /** card = keep last 4; cvv = all bullets when hidden */
  @Input() mode: 'card' | 'cvv' = 'card';
  @Input() pendingLabel = '—';
  @Input() variant: 'hero' | 'badge' | 'inline' = 'inline';
  @Input() revealMs = SECRET_REVEAL_MS;

  visible = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  get hasValue(): boolean {
    return !!this.value && String(this.value).replace(/\s+/g, '').length > 0;
  }

  get displayValue(): string {
    const raw = String(this.value || '').replace(/\s+/g, '');
    if (!raw) {
      return '';
    }
    if (this.visible) {
      if (this.mode === 'card') {
        return raw.replace(/(.{4})/g, '$1 ').trim();
      }
      return raw;
    }
    if (this.mode === 'cvv') {
      return '•'.repeat(Math.max(3, raw.length));
    }
    if (raw.length <= 4) {
      return raw;
    }
    const masked = `${'•'.repeat(raw.length - 4)}${raw.slice(-4)}`;
    return masked.replace(/(.{4})/g, '$1 ').trim();
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
    this.hideTimer = setTimeout(() => this.hide(), this.revealMs);
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
