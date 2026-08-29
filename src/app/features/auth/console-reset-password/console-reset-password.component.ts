import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
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
  selector: 'app-console-reset-password',
  templateUrl: './console-reset-password.component.html',
  styleUrls: ['./console-reset-password.component.scss']
})
export class ConsoleResetPasswordComponent implements OnInit, OnDestroy {
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
    if (typeof document !== 'undefined') {
      document.body.classList.add('sa-mode');
    }
    if (!this.resetToken) {
      void this.router.navigateByUrl('/auth/console/forgot-password');
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
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sa-mode');
    }
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
      .consoleResetPassword({
        resetToken: this.resetToken,
        password: String(raw.password),
        confirmPassword: String(raw.confirmPassword)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.formSuccess = res.message || 'Password updated.';
          setTimeout(() => {
            void this.router.navigateByUrl('/auth/console/login');
          }, 900);
        },
        error: (err) => {
          this.loading = false;
          this.formError = err?.error?.message || 'Unable to update password.';
        }
      });
  }
}
