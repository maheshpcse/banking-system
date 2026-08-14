import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { fieldError } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  loading = false;
  formError = '';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly fieldError = fieldError;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.formError = '';
    const identifier = String(this.form.value.identifier || '').trim();

    this.auth.forgotPassword(identifier).subscribe({
      next: (res) => {
        this.loading = false;
        void this.router.navigate(['/auth/reset-password'], {
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
