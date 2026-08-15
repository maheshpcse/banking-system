import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { User, UserAvatar } from '../../core/models/banking.models';
import { withShimmerDelay } from '../../core/utils/shimmer';
import { fieldError } from '../../core/utils/form-errors';

type SettingsTab = 'identity' | 'presence' | 'security' | 'experience';

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
export class AccountSettingsComponent implements OnInit {
  loading = true;
  savingProfile = false;
  savingAvatar = false;
  savingPassword = false;
  savingPrefs = false;
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  user: User | null = null;
  imagePreview: string | null = null;
  profileMessage = '';
  profileError = '';
  avatarMessage = '';
  avatarError = '';
  passwordMessage = '';
  passwordError = '';
  prefsMessage = '';

  readonly avatarStyles: Array<UserAvatar['style']> = ['mint', 'sky', 'sand', 'rose', 'slate'];
  readonly fieldError = fieldError;
  readonly tabs: Array<{ id: SettingsTab; label: string; hint: string }> = [
    { id: 'identity', label: 'Identity', hint: 'Profile details' },
    { id: 'presence', label: 'Presence', hint: 'Avatar & photo' },
    { id: 'security', label: 'Security', hint: 'Password' },
    { id: 'experience', label: 'Experience', hint: 'Preferences' }
  ];
  activeTab: SettingsTab = 'identity';

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

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
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
        await this.alerts.error('Settings unavailable', 'Unable to load your account profile.');
      }
    });
  }

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.avatarError = 'Please choose an image file (PNG, JPG, or WebP).';
      return;
    }
    if (file.size > 900_000) {
      this.avatarError = 'Image must be under 900KB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = String(reader.result || '');
      this.avatarError = '';
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
    this.profileMessage = '';
    this.profileError = '';
    const raw = this.profileForm.getRawValue();
    withShimmerDelay(
      this.auth.updateProfile({
        fullName: String(raw.fullName),
        username: String(raw.username).trim().toLowerCase(),
        email: String(raw.email).trim().toLowerCase()
      }),
      500
    ).subscribe({
      next: (res) => {
        this.applyUser(res.user);
        this.savingProfile = false;
        this.profileMessage = 'Profile saved.';
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError = err?.error?.message || 'Unable to update profile.';
      }
    });
  }

  saveAvatar(): void {
    if (this.avatarForm.invalid || this.savingAvatar) {
      this.avatarForm.markAllAsTouched();
      return;
    }
    this.savingAvatar = true;
    this.avatarMessage = '';
    this.avatarError = '';
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
      next: (res) => {
        this.applyUser(res.user);
        this.savingAvatar = false;
        this.avatarMessage = 'Avatar updated.';
      },
      error: (err) => {
        this.savingAvatar = false;
        this.avatarError = err?.error?.message || 'Unable to update avatar.';
      }
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword = true;
    this.passwordMessage = '';
    this.passwordError = '';
    const raw = this.passwordForm.getRawValue();
    withShimmerDelay(
      this.auth.changePassword({
        currentPassword: String(raw.currentPassword),
        newPassword: String(raw.newPassword),
        confirmPassword: String(raw.confirmPassword)
      }),
      500
    ).subscribe({
      next: (res) => {
        this.savingPassword = false;
        this.passwordMessage = res.message || 'Password updated.';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordError = err?.error?.message || 'Unable to change password.';
      }
    });
  }

  savePrefs(): void {
    if (this.savingPrefs) {
      return;
    }
    this.savingPrefs = true;
    this.prefsMessage = '';
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
      next: (res) => {
        this.applyUser(res.user);
        this.savingPrefs = false;
        this.prefsMessage = 'Preferences saved.';
      },
      error: (err) => {
        this.savingPrefs = false;
        this.prefsMessage = err?.error?.message || 'Unable to save preferences.';
      }
    });
  }

  private applyUser(user: User): void {
    this.user = user;
    this.imagePreview = user.avatar?.image || null;
    this.profileForm.patchValue({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || ''
    });
    this.avatarForm.patchValue({
      style: user.avatar?.style || 'mint',
      initials: user.avatar?.initials || ''
    });
    this.prefsForm.patchValue({
      emailAlerts: user.settings?.emailAlerts !== false,
      hideBalance: !!user.settings?.hideBalance,
      compactLedger: !!user.settings?.compactLedger,
      marketingTips: !!user.settings?.marketingTips
    });
  }
}
