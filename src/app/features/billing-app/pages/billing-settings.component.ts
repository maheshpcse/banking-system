import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingGatewaySettings } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-settings',
  templateUrl: './billing-settings.component.html',
  styleUrls: ['./billing-settings.component.scss']
})
export class BillingSettingsComponent implements OnInit {
  pageLoading = true;
  busy = false;

  form = this.fb.group({
    merchantName: ['', [Validators.required, Validators.minLength(2)]],
    supportNote: [''],
    cash: [true],
    card: [true],
    upi: [true],
    qr: [true],
    upiVpa: [''],
    cardLabel: ['Card']
  });

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.pageLoading = true;
    withShimmerDelay(this.billing.getSettings(), SHIMMER_MS).subscribe({
      next: (res) => {
        this.patchForm(res.settings);
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load gateway settings.');
      }
    });
  }

  toggleMethod(key: 'cash' | 'card' | 'upi' | 'qr'): void {
    const ctrl = this.form.get(key);
    if (!ctrl) {
      return;
    }
    ctrl.setValue(!ctrl.value);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Partial<BillingGatewaySettings> = {
      merchantName: String(raw.merchantName || ''),
      supportNote: String(raw.supportNote || ''),
      methods: {
        cash: !!raw.cash,
        card: !!raw.card,
        upi: !!raw.upi,
        qr: !!raw.qr
      },
      upiVpa: String(raw.upiVpa || ''),
      cardLabel: String(raw.cardLabel || 'Card')
    };

    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: 'Save merchant identity and payment methods for POS?',
      confirmText: 'Save settings',
      loadingText: 'Saving settings…',
      action: () => withShimmerDelay(this.billing.updateSettings(payload), SHIMMER_MS),
      successMessage: (res) => res.message || 'Settings saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to save settings.'
    });
    this.busy = false;
    if (outcome.ok) {
      this.patchForm(outcome.result.settings);
    }
  }

  private patchForm(settings: BillingGatewaySettings | null | undefined): void {
    if (!settings) {
      return;
    }
    this.form.patchValue({
      merchantName: settings.merchantName || '',
      supportNote: settings.supportNote || '',
      cash: settings.methods?.cash !== false,
      card: settings.methods?.card !== false,
      upi: settings.methods?.upi !== false,
      qr: settings.methods?.qr !== false,
      upiVpa: settings.upiVpa || '',
      cardLabel: settings.cardLabel || 'Card'
    });
  }
}
