import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    withShimmerDelay(
      this.auth.login(this.form.getRawValue() as { email: string; password: string })
    ).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/dashboard').then(() => {
          this.alerts.toastSuccess('Welcome back', 'You are signed in to NovaBank.');
        });
      },
      error: (err) => {
        this.loading = false;
        this.alerts.toastError('Sign-in failed', err?.error?.message || 'Unable to sign in.');
      }
    });
  }
}
