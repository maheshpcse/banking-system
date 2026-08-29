import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  showPassword = false;
  showConfirm = false;
  formError = '';
  formSuccess = '';
  resetToken = '';
  username = '';
  maskedEmail = '';

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    },
    { validators: matchPasswords }
  );

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state || history.state || {}) as {
      resetToken?: string;
      username?: string;
      maskedEmail?: string;
    };
    this.resetToken = state.resetToken || '';
    this.username = state.username || '';
    this.maskedEmail = state.maskedEmail || '';
  }

  ngOnInit(): void {
    if (!this.resetToken) {
      void this.router.navigateByUrl('/auth/forgot-password');
    }
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
      }
    });
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.loading || !this.resetToken) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.formError = '';
    this.formSuccess = '';
    const raw = this.form.getRawValue();

    this.auth
      .resetPassword({
        resetToken: this.resetToken,
        password: String(raw.password),
        confirmPassword: String(raw.confirmPassword)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.formSuccess = res.message || 'Password updated.';
          setTimeout(() => {
            void this.router.navigateByUrl('/auth/login');
          }, 900);
        },
        error: async (err) => {
          this.loading = false;
          const code = err?.error?.code;
          const message = err?.error?.message || 'Unable to update password.';
          if (code === 'USE_CONSOLE_LOGIN') {
            const goConsole = await this.alerts.infoWithAction({
              title: 'Super Admin account',
              text: message,
              confirmText: 'Go to Console login',
              cancelText: 'Close',
              actionHint: 'Super Admin password reset is only available on the Apex Console.'
            });
            if (goConsole) {
              void this.router.navigateByUrl('/auth/console/login');
            }
            return;
          }
          this.formError = message;
        }
      });
  }
}
