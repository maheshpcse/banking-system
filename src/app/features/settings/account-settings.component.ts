import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { AccountLifecycleService } from '../../core/services/account-lifecycle.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AccountApplication,
  CardAccountType,
  CardBrand,
  User,
  UserAvatar
} from '../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../core/utils/shimmer';
import { fieldError } from '../../core/utils/form-errors';

type SettingsTab = 'identity' | 'presence' | 'banking' | 'cardinfo' | 'limits' | 'security' | 'experience';

/** Loaded once for native <select> options — no custom popup UI */
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'India',
  'Germany',
  'France',
  'Mexico',
  'Singapore',
  'United Arab Emirates'
];

const COUNTRY_DIAL_CODES: Array<{ code: string; label: string }> = [
  { code: '+1', label: 'United States / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+55', label: 'Brazil (+55)' }
];

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!newPassword || !confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { mismatch: true };
}

function cardExpiryNotPast(group: AbstractControl): ValidationErrors | null {
  const month = String(group.get('expiryMonth')?.value || '');
  const year = String(group.get('expiryYear')?.value || '');
  if (!/^(0[1-9]|1[0-2])$/.test(month) || !/^[0-9]{2}$/.test(year)) {
    return null;
  }
  const now = new Date();
  const exp = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);
  return exp.getTime() >= now.getTime() ? null : { expiryPast: true };
}

function accountExpiryNotPast(group: AbstractControl): ValidationErrors | null {
  const month = String(group.get('accountExpiryMonth')?.value || '');
  const year = String(group.get('accountExpiryYear')?.value || '');
  if (!month && !year) {
    return null;
  }
  if (!/^(0[1-9]|1[0-2])$/.test(month) || !/^[0-9]{2}$/.test(year)) {
    return null;
  }
  const now = new Date();
  const exp = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);
  return exp.getTime() >= now.getTime() ? null : { accountExpiryPast: true };
}

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss']
})
export class AccountSettingsComponent implements OnInit, OnDestroy {
  loading = true;
  panelLoading = false;
  savingProfile = false;
  savingAvatar = false;
  savingPassword = false;
  savingPrefs = false;
  savingCardControls = false;
  savingLimits = false;
  savingCurrency = false;
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  showCardNumber = false;
  showCvv = false;
  user: User | null = null;
  imagePreview: string | null = null;
  imageFileName = '';

  readonly avatarStyles: Array<UserAvatar['style']> = ['mint', 'sky', 'sand', 'rose', 'slate'];
  readonly usStates = US_STATES;
  readonly countries = COUNTRIES;
  readonly countryDialCodes = COUNTRY_DIAL_CODES;
  readonly cardBrands: Array<{ id: CardBrand; label: string }> = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'amex', label: 'American Express' },
    { id: 'discover', label: 'Discover' },
    { id: 'novabank', label: 'NovaBank' }
  ];
  readonly accountTypes: Array<{ id: CardAccountType; label: string }> = [
    { id: 'personal', label: 'Personal' },
    { id: 'business', label: 'Business' },
    { id: 'savings', label: 'Savings' },
    { id: 'debit', label: 'Debit' },
    { id: 'credit', label: 'Credit' },
    { id: 'other', label: 'Other' }
  ];
  readonly fieldError = fieldError;
  readonly allTabs: Array<{ id: SettingsTab; label: string; hint: string; staff?: boolean }> = [
    { id: 'identity', label: 'Identity', hint: 'Profile details', staff: true },
    { id: 'presence', label: 'Presence', hint: 'Avatar & photo', staff: true },
    { id: 'banking', label: 'Banking', hint: 'Opening progress' },
    { id: 'cardinfo', label: 'Card info', hint: 'Card & controls' },
    { id: 'limits', label: 'Limits', hint: 'Daily caps' },
    { id: 'security', label: 'Security', hint: 'Password', staff: true },
    { id: 'experience', label: 'Experience', hint: 'Preferences', staff: true }
  ];
  activeTab: SettingsTab = 'identity';
  savingApplication = false;
  cardFlipped = false;

  get tabs(): Array<{ id: SettingsTab; label: string; hint: string }> {
    return this.isStaff ? this.allTabs.filter((t) => t.staff) : this.allTabs;
  }

  /** Staff (admin/manager, including Super Admin) never manage a personal transaction currency. */
  get isStaff(): boolean {
    return this.auth.currentUser?.role === 'admin' || this.auth.currentUser?.role === 'manager';
  }

  /** Phone / country code are available to every role except Super Admin. */
  get showPhoneFields(): boolean {
    return !this.auth.currentUser?.isSuperAdmin;
  }

  private panelTimer: ReturnType<typeof setTimeout> | null = null;

  profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
    email: ['', [Validators.required, Validators.email]],
    countryCode: [''],
    phone: ['', [Validators.pattern(/^$|^[0-9]{7,15}$/)]]
  });

  avatarForm = this.fb.group({
    style: ['mint' as UserAvatar['style'], Validators.required],
    initials: ['', [Validators.maxLength(3)]]
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    },
    { validators: matchPasswords }
  );

  prefsForm = this.fb.group({
    emailAlerts: [true],
    hideBalance: [false],
    compactLedger: [false],
    marketingTips: [false],
    theme: ['daylight' as NonNullable<User['settings']>['theme']],
    fontScale: ['comfortable' as NonNullable<User['settings']>['fontScale']]
  });

  readonly themeCards: { id: NonNullable<User['settings']>['theme']; label: string; swatch: string[] }[] = [
    { id: 'daylight', label: 'Daylight', swatch: ['#eef7fb', '#5fc4b0', '#3b9fd8'] },
    { id: 'midnight', label: 'Midnight', swatch: ['#0f1720', '#5fc4b0', '#6aa8e8'] },
    { id: 'sand', label: 'Sand', swatch: ['#f6f1e8', '#d4a017', '#5fc4b0'] },
    { id: 'ocean', label: 'Ocean', swatch: ['#eef7fb', '#38a0d2', '#5fc4b0'] },
    { id: 'graphite', label: 'Graphite', swatch: ['#1b222b', '#94a3b8', '#5fc4b0'] },
    { id: 'orchid', label: 'Orchid', swatch: ['#f8f2f8', '#ba78b4', '#5fc4b0'] },
    { id: 'aurora', label: 'Aurora', swatch: ['#ecf8f4', '#34d399', '#60a5fa'] },
    { id: 'forest', label: 'Forest', swatch: ['#edf6ef', '#2f7d4b', '#8fbc8f'] },
    { id: 'ember', label: 'Ember', swatch: ['#fbf3ee', '#d97757', '#f59e0b'] },
    { id: 'mist', label: 'Mist', swatch: ['#f3f6fb', '#64748b', '#93c5fd'] }
  ];

  readonly currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'JPY', 'CAD', 'AUD'];

  /** MM/YY <select> options — months 01-12, years current..+15 (2-digit). */
  readonly expiryMonths: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  readonly expiryYears: string[] = Array.from({ length: 16 }, (_, i) =>
    String((new Date().getFullYear() + i) % 100).padStart(2, '0')
  );

  bankingForm = this.fb.group(
    {
      line1: ['', [Validators.required, Validators.minLength(3)]],
      line2: [''],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.minLength(3)]],
      country: ['', [Validators.required]],
      holderName: ['', [Validators.required, Validators.minLength(2)]],
      brand: ['', [Validators.required]],
      accountType: ['', [Validators.required]],
      cardNumber: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(16)]],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^[0-9]{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]],
      accountExpiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      accountExpiryYear: ['', [Validators.required, Validators.pattern(/^[0-9]{2}$/)]]
    },
    { validators: [cardExpiryNotPast, accountExpiryNotPast] }
  );

  cardControlsForm = this.fb.group({
    frozen: [false],
    onlinePayments: [true],
    contactless: [true],
    international: [false],
    atmWithdrawals: [true]
  });

  limitsForm = this.fb.group({
    depositDaily: [5000, [Validators.required, Validators.min(1)]],
    withdrawDaily: [2000, [Validators.required, Validators.min(1)]],
    transferDaily: [3000, [Validators.required, Validators.min(1)]],
    transferCountDaily: [10, [Validators.required, Validators.min(1)]]
  });

  /** Lives on the Limits tab, saved independently of the limit-change request form. */
  currencyForm = this.fb.group({
    currency: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly lifecycle: AccountLifecycleService,
    private readonly notifications: NotificationService,
    private readonly route: ActivatedRoute
  ) {}

  get application(): AccountApplication | null {
    return this.lifecycle.applicationFor(this.user);
  }

  get hasAccountNumber(): boolean {
    return this.lifecycle.hasAccountNumber(this.user);
  }

  get hasCard(): boolean {
    return !!this.user?.card;
  }

  get currentLimits(): NonNullable<User['limits']> {
    return (
      this.user?.limits || {
        depositDaily: 5000,
        withdrawDaily: 2000,
        transferDaily: 3000,
        transferCountDaily: 10
      }
    );
  }

  get pendingLimitRequest(): User['pendingLimitRequest'] | null {
    return this.user?.pendingLimitRequest || null;
  }

  get hasPendingLimitRequest(): boolean {
    return this.pendingLimitRequest?.status === 'pending';
  }

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (
      tab === 'banking' ||
      tab === 'cardinfo' ||
      tab === 'limits' ||
      tab === 'identity' ||
      tab === 'presence' ||
      tab === 'security' ||
      tab === 'experience'
    ) {
      this.activeTab = tab;
    }
    withShimmerDelay(this.auth.refreshMe(), SHIMMER_MS).subscribe({
      next: (res) => {
        this.applyUser(res.user);
        this.loading = false;
      },
      error: async () => {
        const local = this.auth.currentUser;
        if (local) {
          this.applyUser(local);
          this.loading = false;
          return;
        }
        this.loading = false;
        await this.alerts.error('Unable to load your account profile.');
      }
    });
  }

  ngOnDestroy(): void {
    this.clearPanelTimer();
  }

  setTab(tab: SettingsTab): void {
    if (tab === this.activeTab) {
      return;
    }
    const leaving = this.activeTab;
    this.activeTab = tab;
    this.resetTab(leaving);
    this.resetTab(tab);
    this.flashPanel();
  }

  private flashPanel(): void {
    this.panelLoading = true;
    this.clearPanelTimer();
    this.panelTimer = setTimeout(() => {
      this.panelLoading = false;
      this.panelTimer = null;
    }, SHIMMER_MS);
  }

  private async afterSaveSuccess(message: string): Promise<void> {
    await this.alerts.success(message);
    this.flashPanel();
  }

  private clearPanelTimer(): void {
    if (this.panelTimer) {
      clearTimeout(this.panelTimer);
      this.panelTimer = null;
    }
  }

  private resetTab(tab: SettingsTab): void {
    switch (tab) {
      case 'identity':
        this.profileForm.reset({
          fullName: this.user?.fullName || '',
          username: this.user?.username || '',
          email: this.user?.email || '',
          countryCode: this.user?.countryCode || '',
          phone: this.user?.phone || ''
        });
        break;
      case 'presence':
        this.imagePreview = this.user?.avatar?.image || null;
        this.avatarForm.reset({
          style: this.user?.avatar?.style || 'mint',
          initials: this.user?.avatar?.initials || ''
        });
        break;
      case 'security':
        this.showCurrent = false;
        this.showNew = false;
        this.showConfirm = false;
        this.passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        break;
      case 'banking':
        break;
      case 'cardinfo':
        this.patchBankingFromUser();
        this.patchCardControlsFromUser();
        break;
      case 'limits':
        this.patchLimitsFromUser();
        this.currencyForm.reset({ currency: this.user?.settings?.currency || '' });
        break;
      case 'experience':
        this.prefsForm.reset({
          emailAlerts: this.user?.settings?.emailAlerts !== false,
          hideBalance: !!this.user?.settings?.hideBalance,
          compactLedger: !!this.user?.settings?.compactLedger,
          marketingTips: !!this.user?.settings?.marketingTips,
          theme: this.user?.settings?.theme || 'daylight',
          fontScale: this.user?.settings?.fontScale || 'comfortable'
        });
        break;
    }
  }

  onCardNumberInput(): void {
    const ctrl = this.bankingForm.controls.cardNumber;
    // Digits only — input is password-masked; spaces are not shown while typing
    const digits = String(ctrl.value || '').replace(/\D/g, '').slice(0, 16);
    ctrl.setValue(digits, { emitEvent: false });
    this.cardFlipped = false;
  }

  generateCardDetails(): void {
    const brand = (this.bankingForm.value.brand || 'visa') as CardBrand;
    const prefixes: Record<CardBrand, string> = {
      visa: '4',
      mastercard: '5',
      amex: '3',
      discover: '6',
      novabank: '9'
    };
    let digits = prefixes[brand] || '4';
    while (digits.length < 16) {
      digits += String(Math.floor(Math.random() * 10));
    }
    const now = new Date();
    const expMonth = String(((now.getMonth() + 6) % 12) + 1).padStart(2, '0');
    const expYear = String((now.getFullYear() + (now.getMonth() + 6 >= 12 ? 4 : 3)) % 100).padStart(
      2,
      '0'
    );
    const acctMonth = String(((now.getMonth() + 3) % 12) + 1).padStart(2, '0');
    const acctYear = String((now.getFullYear() + 5) % 100).padStart(2, '0');
    const cvvLen = brand === 'amex' ? 4 : 3;
    let cvv = '';
    while (cvv.length < cvvLen) {
      cvv += String(Math.floor(Math.random() * 10));
    }
    this.bankingForm.patchValue({
      cardNumber: digits,
      expiryMonth: expMonth,
      expiryYear: expYear,
      cvv,
      accountExpiryMonth: acctMonth,
      accountExpiryYear: acctYear,
      holderName: this.bankingForm.value.holderName || this.user?.fullName || ''
    });
    this.cardFlipped = false;
  }

  onCvvFocus(): void {
    this.cardFlipped = true;
  }

  onCvvBlur(): void {
    this.cardFlipped = false;
  }

  submitBankingApplication(): void {
    if (this.bankingForm.invalid || this.savingApplication) {
      this.bankingForm.markAllAsTouched();
      return;
    }
    const isFirstApplication =
      !this.hasAccountNumber &&
      this.user?.accountStatus !== 'under_review' &&
      this.user?.accountStatus !== 'active' &&
      this.user?.accountStatus !== 'approved';
    this.savingApplication = true;
    const raw = this.bankingForm.getRawValue();
    withShimmerDelay(
      this.lifecycle.submitApplication({
        address: {
          line1: String(raw.line1),
          line2: String(raw.line2 || ''),
          city: String(raw.city),
          state: String(raw.state),
          postalCode: String(raw.postalCode),
          country: String(raw.country)
        },
        card: {
          holderName: String(raw.holderName),
          number: String(raw.cardNumber).replace(/\s+/g, ''),
          expiryMonth: String(raw.expiryMonth),
          expiryYear: String(raw.expiryYear),
          cvv: String(raw.cvv),
          brand: String(raw.brand || 'visa'),
          accountType: String(raw.accountType || 'personal'),
          accountExpiryMonth: String(raw.accountExpiryMonth),
          accountExpiryYear: String(raw.accountExpiryYear)
        }
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingApplication = false;
        // Notification is persisted by the API on first submit only.
        this.notifications.refresh().subscribe();
        await this.afterSaveSuccess(
          res.message ||
            (isFirstApplication ? 'Application submitted for review.' : 'Card & address updated.')
        );
      },
      error: async (err) => {
        this.savingApplication = false;
        await this.alerts.error(err?.error?.message || 'Unable to submit application.');
      }
    });
  }

  saveCardControls(): void {
    if (this.savingCardControls || !this.hasCard) {
      return;
    }
    this.savingCardControls = true;
    const raw = this.cardControlsForm.getRawValue();
    withShimmerDelay(
      this.lifecycle.updateCardControls({
        frozen: !!raw.frozen,
        onlinePayments: !!raw.onlinePayments,
        contactless: !!raw.contactless,
        international: !!raw.international,
        atmWithdrawals: !!raw.atmWithdrawals
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingCardControls = false;
        await this.afterSaveSuccess(res.message || 'Card controls updated.');
      },
      error: async (err) => {
        this.savingCardControls = false;
        await this.alerts.error(err?.error?.message || 'Unable to update card controls.');
      }
    });
  }

  saveCurrency(): void {
    if (this.savingCurrency || this.isStaff) {
      return;
    }
    const currency = String(this.currencyForm.value.currency || '').trim().toUpperCase();
    if (!currency) {
      return;
    }
    this.savingCurrency = true;
    withShimmerDelay(
      this.auth.updateProfile({
        settings: { currency: currency as NonNullable<User['settings']>['currency'] }
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingCurrency = false;
        await this.afterSaveSuccess('Currency updated.');
      },
      error: async (err) => {
        this.savingCurrency = false;
        await this.alerts.error(err?.error?.message || 'Unable to update currency.');
      }
    });
  }

  submitLimitsRequest(): void {
    if (this.limitsForm.invalid || this.savingLimits || this.hasPendingLimitRequest) {
      this.limitsForm.markAllAsTouched();
      return;
    }
    this.savingLimits = true;
    const raw = this.limitsForm.getRawValue();
    withShimmerDelay(
      this.lifecycle.requestLimits({
        depositDaily: Number(raw.depositDaily),
        withdrawDaily: Number(raw.withdrawDaily),
        transferDaily: Number(raw.transferDaily),
        transferCountDaily: Number(raw.transferCountDaily)
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingLimits = false;
        await this.afterSaveSuccess(res.message || 'Limit change submitted for manager approval.');
      },
      error: async (err) => {
        this.savingLimits = false;
        await this.alerts.error(err?.error?.message || 'Unable to submit limit request.');
      }
    });
  }

  private patchCardControlsFromUser(): void {
    const controls = this.user?.card?.controls;
    this.cardControlsForm.reset({
      frozen: !!controls?.frozen,
      onlinePayments: controls?.onlinePayments !== false,
      contactless: controls?.contactless !== false,
      international: !!controls?.international,
      atmWithdrawals: controls?.atmWithdrawals !== false
    });
  }

  private patchLimitsFromUser(): void {
    this.limitsForm.reset({
      depositDaily: this.currentLimits.depositDaily,
      withdrawDaily: this.currentLimits.withdrawDaily,
      transferDaily: this.currentLimits.transferDaily,
      transferCountDaily: this.currentLimits.transferCountDaily
    });
  }

  private patchBankingFromUser(): void {
    const addr = this.user?.address;
    const card = this.user?.card;
    this.bankingForm.reset({
      line1: addr?.line1 || '',
      line2: addr?.line2 || '',
      city: addr?.city || '',
      state: addr?.state || '',
      postalCode: addr?.postalCode || '',
      country: addr?.country || '',
      holderName: card?.holderName || this.user?.fullName || '',
      brand: (card?.brand as CardBrand) || '',
      accountType: (card?.accountType as CardAccountType) || '',
      cardNumber: card?.number ? String(card.number).replace(/\D/g, '').slice(0, 16) : '',
      expiryMonth: card?.expiryMonth || '',
      expiryYear: card?.expiryYear || '',
      cvv: card?.cvv || '',
      accountExpiryMonth: card?.accountExpiryMonth || card?.expiryMonth || '',
      accountExpiryYear: card?.accountExpiryYear || card?.expiryYear || ''
    });
    this.cardFlipped = false;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.imageFileName = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      void this.alerts.warning('Please choose an image file (PNG, JPG, or WebP).');
      input.value = '';
      this.imageFileName = '';
      return;
    }
    if (file.size > 900_000) {
      void this.alerts.warning('Image must be under 900KB.');
      input.value = '';
      this.imageFileName = '';
      return;
    }

    this.imageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  clearImage(event?: Event): void {
    this.imagePreview = null;
    this.imageFileName = '';
    const host = (event?.target as HTMLElement | undefined)?.closest('form');
    const input = (host?.querySelector('input[type="file"]') ||
      document.querySelector('.form--avatar input[type="file"]')) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile = true;
    const raw = this.profileForm.getRawValue();
    const payload: {
      fullName: string;
      username: string;
      email: string;
      countryCode?: string;
      phone?: string;
    } = {
      fullName: String(raw.fullName),
      username: String(raw.username).trim().toLowerCase(),
      email: String(raw.email).trim().toLowerCase()
    };
    if (this.showPhoneFields) {
      payload.countryCode = String(raw.countryCode || '').trim();
      payload.phone = String(raw.phone || '').replace(/[\s()-]/g, '').trim();
    }
    withShimmerDelay(this.auth.updateProfile(payload), SHIMMER_MS).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingProfile = false;
        await this.afterSaveSuccess(res.message || 'Profile saved.');
      },
      error: async (err) => {
        this.savingProfile = false;
        await this.alerts.error(err?.error?.message || 'Unable to update profile.');
      }
    });
  }

  saveAvatar(): void {
    if (this.avatarForm.invalid || this.savingAvatar) {
      this.avatarForm.markAllAsTouched();
      return;
    }
    this.savingAvatar = true;
    const raw = this.avatarForm.getRawValue();
    withShimmerDelay(
      this.auth.updateProfile({
        avatar: {
          style: raw.style as UserAvatar['style'],
          initials: String(raw.initials || '').trim().toUpperCase(),
          image: this.imagePreview
        }
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingAvatar = false;
        await this.afterSaveSuccess('Avatar updated.');
      },
      error: async (err) => {
        this.savingAvatar = false;
        await this.alerts.error(err?.error?.message || 'Unable to update avatar.');
      }
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword = true;
    const raw = this.passwordForm.getRawValue();
    withShimmerDelay(
      this.auth.changePassword({
        currentPassword: String(raw.currentPassword),
        newPassword: String(raw.newPassword),
        confirmPassword: String(raw.confirmPassword)
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.savingPassword = false;
        this.passwordForm.reset();
        await this.afterSaveSuccess(res.message || 'Password updated.');
      },
      error: async (err) => {
        this.savingPassword = false;
        await this.alerts.error(err?.error?.message || 'Unable to change password.');
      }
    });
  }

  selectTheme(themeId: NonNullable<User['settings']>['theme']): void {
    this.prefsForm.patchValue({ theme: themeId });
  }

  savePrefs(): void {
    if (this.savingPrefs) {
      return;
    }
    this.savingPrefs = true;
    const raw = this.prefsForm.getRawValue();
    withShimmerDelay(
      this.auth.updateProfile({
        settings: {
          emailAlerts: !!raw.emailAlerts,
          hideBalance: !!raw.hideBalance,
          compactLedger: !!raw.compactLedger,
          marketingTips: !!raw.marketingTips,
          theme: (raw.theme || 'daylight') as NonNullable<User['settings']>['theme'],
          fontScale: (raw.fontScale || 'comfortable') as NonNullable<User['settings']>['fontScale'],
          currency: this.user?.settings?.currency || null,
          // Dark/light mode parked — always persist light until the feature returns.
          colorMode: 'light'
        }
      }),
      SHIMMER_MS
    ).subscribe({
      next: async (res) => {
        this.applyUser(res.user);
        this.savingPrefs = false;
        await this.afterSaveSuccess('Preferences saved.');
      },
      error: async (err) => {
        this.savingPrefs = false;
        await this.alerts.error(err?.error?.message || 'Unable to save preferences.');
      }
    });
  }

  private applyUser(user: User): void {
    // Normalize legacy users without lifecycle fields
    const normalized: User = {
      ...user,
      accountNumber: user.accountNumber || null,
      role: user.role || 'customer',
      accountStatus: user.accountStatus || (user.accountNumber ? 'active' : 'address_required')
    };
    this.user = normalized;
    this.imagePreview = normalized.avatar?.image || null;
    this.profileForm.patchValue({
      fullName: normalized.fullName || '',
      username: normalized.username || '',
      email: normalized.email || '',
      countryCode: normalized.countryCode || '',
      phone: normalized.phone || ''
    });
    this.avatarForm.patchValue({
      style: normalized.avatar?.style || 'mint',
      initials: normalized.avatar?.initials || ''
    });
    this.prefsForm.patchValue({
      emailAlerts: normalized.settings?.emailAlerts !== false,
      hideBalance: !!normalized.settings?.hideBalance,
      compactLedger: !!normalized.settings?.compactLedger,
      marketingTips: !!normalized.settings?.marketingTips,
      theme: normalized.settings?.theme || 'daylight',
      fontScale: normalized.settings?.fontScale || 'comfortable'
    });
    this.currencyForm.patchValue({ currency: normalized.settings?.currency || '' });
    this.imageFileName = normalized.avatar?.image ? 'Current profile photo' : '';
    this.applyAppearance(normalized);
    this.patchBankingFromUser();
    this.patchCardControlsFromUser();
    this.patchLimitsFromUser();
  }

  private applyAppearance(user: User): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    // Themes only apply inside authenticated app pages (app shell sets data-nb-app).
    root.dataset['nbApp'] = '1';
    root.dataset['nbTheme'] = user.settings?.theme || 'daylight';
    root.dataset['nbFont'] = user.settings?.fontScale || 'comfortable';
    // Dark/light mode parked as a future enhancement — keep light chrome only.
    root.dataset['nbMode'] = 'light';
  }
}
