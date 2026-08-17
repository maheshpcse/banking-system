import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { AccountLifecycleService } from '../../core/services/account-lifecycle.service';
import { NotificationService } from '../../core/services/notification.service';
import { AccountApplication, User, UserAvatar } from '../../core/models/banking.models';
import { withShimmerDelay } from '../../core/utils/shimmer';
import { fieldError } from '../../core/utils/form-errors';

type SettingsTab = 'identity' | 'presence' | 'banking' | 'cardinfo' | 'security' | 'experience';

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

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!newPassword || !confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { mismatch: true };
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
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  user: User | null = null;
  imagePreview: string | null = null;

  readonly avatarStyles: Array<UserAvatar['style']> = ['mint', 'sky', 'sand', 'rose', 'slate'];
  readonly usStates = US_STATES;
  readonly countries = COUNTRIES;
  readonly fieldError = fieldError;
  readonly tabs: Array<{ id: SettingsTab; label: string; hint: string }> = [
    { id: 'identity', label: 'Identity', hint: 'Profile details' },
    { id: 'presence', label: 'Presence', hint: 'Avatar & photo' },
    { id: 'banking', label: 'Banking', hint: 'Opening progress' },
    { id: 'cardinfo', label: 'Card info', hint: 'Card & address' },
    { id: 'security', label: 'Security', hint: 'Password' },
    { id: 'experience', label: 'Experience', hint: 'Preferences' }
  ];
  activeTab: SettingsTab = 'identity';
  savingApplication = false;
  cardFlipped = false;

  private panelTimer: ReturnType<typeof setTimeout> | null = null;

  profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
    email: ['', [Validators.required, Validators.email]]
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
    marketingTips: [false]
  });

  bankingForm = this.fb.group({
    line1: ['', [Validators.required, Validators.minLength(3)]],
    line2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    postalCode: ['', [Validators.required, Validators.minLength(3)]],
    country: ['United States', [Validators.required]],
    holderName: ['', [Validators.required, Validators.minLength(2)]],
    cardNumber: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(19)]],
    expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    expiryYear: ['', [Validators.required, Validators.pattern(/^[0-9]{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]]
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

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (
      tab === 'banking' ||
      tab === 'cardinfo' ||
      tab === 'identity' ||
      tab === 'presence' ||
      tab === 'security' ||
      tab === 'experience'
    ) {
      this.activeTab = tab;
    }
    withShimmerDelay(this.auth.refreshMe(), 500).subscribe({
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
    }, 480);
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
          email: this.user?.email || ''
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
        break;
      case 'experience':
        this.prefsForm.reset({
          emailAlerts: this.user?.settings?.emailAlerts !== false,
          hideBalance: !!this.user?.settings?.hideBalance,
          compactLedger: !!this.user?.settings?.compactLedger,
          marketingTips: !!this.user?.settings?.marketingTips
        });
        break;
    }
  }

  onCardNumberInput(): void {
    const ctrl = this.bankingForm.controls.cardNumber;
    const digits = String(ctrl.value || '').replace(/\D/g, '').slice(0, 16);
    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
    ctrl.setValue(grouped, { emitEvent: false });
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
          cvv: String(raw.cvv)
        }
      }),
      500
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

  private patchBankingFromUser(): void {
    const addr = this.user?.address;
    const card = this.user?.card;
    this.bankingForm.reset({
      line1: addr?.line1 || '',
      line2: addr?.line2 || '',
      city: addr?.city || '',
      state: addr?.state || '',
      postalCode: addr?.postalCode || '',
      country: addr?.country || 'United States',
      holderName: card?.holderName || this.user?.fullName || '',
      cardNumber: card?.number ? String(card.number).replace(/(\d{4})(?=\d)/g, '$1 ').trim() : '',
      expiryMonth: card?.expiryMonth || '',
      expiryYear: card?.expiryYear || '',
      cvv: card?.cvv || ''
    });
    this.cardFlipped = false;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      void this.alerts.warning('Please choose an image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 900_000) {
      void this.alerts.warning('Image must be under 900KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.imagePreview = null;
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile = true;
    const raw = this.profileForm.getRawValue();
    withShimmerDelay(
      this.auth.updateProfile({
        fullName: String(raw.fullName),
        username: String(raw.username).trim().toLowerCase(),
        email: String(raw.email).trim().toLowerCase()
      }),
      500
    ).subscribe({
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
      500
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
      500
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
          marketingTips: !!raw.marketingTips
        }
      }),
      500
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
      email: normalized.email || ''
    });
    this.avatarForm.patchValue({
      style: normalized.avatar?.style || 'mint',
      initials: normalized.avatar?.initials || ''
    });
    this.prefsForm.patchValue({
      emailAlerts: normalized.settings?.emailAlerts !== false,
      hideBalance: !!normalized.settings?.hideBalance,
      compactLedger: !!normalized.settings?.compactLedger,
      marketingTips: !!normalized.settings?.marketingTips
    });
    this.patchBankingFromUser();
  }
}
