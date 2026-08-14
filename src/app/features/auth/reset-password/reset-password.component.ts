import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

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
export class ResetPasswordComponent implements OnInit {
  loading = false;
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
    if (!this.resetToken) {
      void this.router.navigateByUrl('/auth/forgot-password');
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

    withShimmerDelay(
      this.auth.resetPassword({
        resetToken: this.resetToken,
        password: String(raw.password),
        confirmPassword: String(raw.confirmPassword)
      })
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.formSuccess = res.message || 'Password updated.';
        setTimeout(() => {
          void this.router.navigateByUrl('/auth/login');
        }, 900);
      },
      error: (err) => {
        this.loading = false;
        this.formError = err?.error?.message || 'Unable to update password.';
      }
    });
  }
}
