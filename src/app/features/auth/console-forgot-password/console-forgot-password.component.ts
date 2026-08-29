import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-console-forgot-password',
  templateUrl: './console-forgot-password.component.html',
  styleUrls: ['./console-forgot-password.component.scss']
})
export class ConsoleForgotPasswordComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  formError = '';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('sa-mode');
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
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.formError = '';
    const identifier = String(this.form.value.identifier || '').trim();

    this.auth.consoleForgotPassword(identifier).subscribe({
      next: (res) => {
        this.loading = false;
        void this.router.navigate(['/auth/console/reset-password'], {
          state: {
            resetToken: res.resetToken,
            username: res.username,
            maskedEmail: res.maskedEmail
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.formError = err?.error?.message || 'Unable to verify that account.';
      }
    });
  }
}
