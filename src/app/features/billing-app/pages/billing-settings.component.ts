import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingCoupon,
  BillingCouponKind,
  BillingCouponPaymentScope,
  BillingGatewaySettings
} from '../../../core/models/banking.models';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-billing-settings',
  templateUrl: './billing-settings.component.html',
  styleUrls: ['./billing-settings.component.scss']
})
export class BillingSettingsComponent implements OnInit {
  pageLoading = true;
  busy = false;
  couponBusy = false;
  coupons: BillingCoupon[] = [];
  editingCouponId: string | null = null;

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

  couponForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    title: ['', [Validators.required, Validators.minLength(2)]],
    kind: ['general' as BillingCouponKind, Validators.required],
    discountType: ['percent', Validators.required],
    value: [10, [Validators.required, Validators.min(0)]],
    paymentScopes: ['any'],
    usageNote: ['', [Validators.required, Validators.minLength(8)]],
    bankNote: [''],
    minSubtotal: [0, [Validators.min(0)]],
    maxDiscount: [null as number | null],
    expiresAt: [''],
    maxUses: [null as number | null],
    active: [true]
  });

  readonly kindOptions: ThemeSelectOption[] = [
    { value: 'general', label: 'General' },
    { value: 'payment', label: 'Payment-type' },
    { value: 'bank', label: 'Bank-linked' }
  ];

  readonly discountTypeOptions: ThemeSelectOption[] = [
    { value: 'percent', label: 'Percent %' },
    { value: 'fixed', label: 'Fixed amount' }
  ];

  readonly scopeOptions: ThemeSelectOption[] = [
    { value: 'any', label: 'Any payment method' },
    { value: 'cash', label: 'Cash only' },
    { value: 'card', label: 'Card only' },
    { value: 'upi', label: 'UPI only' },
    { value: 'qr', label: 'QR only' },
    { value: 'bank', label: 'Bank rails (card / UPI / QR)' }
  ];

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get isBankKind(): boolean {
    return this.couponForm.value.kind === 'bank';
  }

  load(): void {
    this.pageLoading = true;
    withShimmerDelay(
      forkJoin({
        settings: this.billing.getSettings(),
        coupons: this.billing.listCoupons(true).pipe(catchError(() => of({ items: [] as BillingCoupon[] })))
      }),
      SHIMMER_MS
    ).subscribe({
      next: (bundle) => {
        this.patchForm(bundle.settings.settings);
        this.coupons = bundle.coupons.items || [];
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

  startEditCoupon(coupon: BillingCoupon): void {
    this.editingCouponId = coupon.id;
    this.couponForm.patchValue({
      code: coupon.code,
      title: coupon.title,
      kind: coupon.kind,
      discountType: coupon.discountType,
      value: coupon.value,
      paymentScopes: (coupon.paymentScopes && coupon.paymentScopes[0]) || 'any',
      usageNote: coupon.usageNote,
      bankNote: coupon.bankNote || '',
      minSubtotal: coupon.minSubtotal || 0,
      maxDiscount: coupon.maxDiscount ?? null,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      maxUses: coupon.maxUses ?? null,
      active: coupon.active !== false
    });
    this.couponForm.get('code')?.disable();
  }

  resetCouponForm(): void {
    this.editingCouponId = null;
    this.couponForm.reset({
      code: '',
      title: '',
      kind: 'general',
      discountType: 'percent',
      value: 10,
      paymentScopes: 'any',
      usageNote: '',
      bankNote: '',
      minSubtotal: 0,
      maxDiscount: null,
      expiresAt: '',
      maxUses: null,
      active: true
    });
    this.couponForm.get('code')?.enable();
  }

  async saveCoupon(): Promise<void> {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }
    const raw = this.couponForm.getRawValue();
    if (raw.kind === 'bank' && !String(raw.bankNote || '').trim()) {
      void this.alerts.toastWarning('Bank note required', 'Add a short note for bank-linked coupon usage.');
      return;
    }
    if (raw.expiresAt) {
      const exp = new Date(String(raw.expiresAt));
      if (Number.isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
        void this.alerts.toastWarning('Invalid expiry', 'Pick a future expiry date.');
        return;
      }
    }
    if (raw.discountType === 'percent' && Number(raw.value) > 100) {
      void this.alerts.toastWarning('Invalid percent', 'Percent discount cannot exceed 100.');
      return;
    }

    const payload: Partial<BillingCoupon> = {
      code: String(raw.code || '').trim().toUpperCase(),
      title: String(raw.title || '').trim(),
      kind: raw.kind as BillingCouponKind,
      discountType: raw.discountType as 'percent' | 'fixed',
      value: Number(raw.value) || 0,
      paymentScopes: [String(raw.paymentScopes || 'any') as BillingCouponPaymentScope],
      usageNote: String(raw.usageNote || '').trim(),
      bankNote: String(raw.bankNote || '').trim(),
      minSubtotal: Number(raw.minSubtotal) || 0,
      maxDiscount: raw.maxDiscount == null || raw.maxDiscount === ('' as unknown) ? null : Number(raw.maxDiscount),
      expiresAt: raw.expiresAt ? String(raw.expiresAt) : null,
      maxUses: raw.maxUses == null || raw.maxUses === ('' as unknown) ? null : Number(raw.maxUses),
      active: raw.active !== false
    };

    this.couponBusy = true;
    const outcome = await this.alerts.confirmAction({
      text: this.editingCouponId ? 'Update this coupon?' : 'Create this coupon for POS?',
      confirmText: this.editingCouponId ? 'Update coupon' : 'Create coupon',
      loadingText: 'Saving coupon…',
      action: () =>
        withShimmerDelay(
          this.editingCouponId
            ? this.billing.updateCoupon(this.editingCouponId, payload)
            : this.billing.createCoupon(payload),
          SHIMMER_MS
        ),
      successMessage: (res) => res.message || 'Coupon saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to save coupon.'
    });
    this.couponBusy = false;
    if (outcome.ok) {
      const saved = outcome.result.coupon;
      const idx = this.coupons.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        this.coupons = [...this.coupons.slice(0, idx), saved, ...this.coupons.slice(idx + 1)];
      } else {
        this.coupons = [saved, ...this.coupons];
      }
      this.resetCouponForm();
    }
  }

  async deleteCoupon(coupon: BillingCoupon): Promise<void> {
    this.couponBusy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Deactivate coupon ${coupon.code}?`,
      confirmText: 'Deactivate',
      loadingText: 'Deactivating…',
      action: () => withShimmerDelay(this.billing.deleteCoupon(coupon.id), SHIMMER_MS),
      successMessage: (res) => res.message || 'Coupon deactivated',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to deactivate coupon.'
    });
    this.couponBusy = false;
    if (outcome.ok) {
      const saved = outcome.result.coupon;
      this.coupons = this.coupons.map((c) => (c.id === saved.id ? saved : c));
      if (this.editingCouponId === coupon.id) {
        this.resetCouponForm();
      }
    }
  }

  scopeLabel(scopes: BillingCouponPaymentScope[] | undefined): string {
    const s = (scopes && scopes[0]) || 'any';
    return this.scopeOptions.find((o) => o.value === s)?.label || s;
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
