import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  loading = false;
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
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
      this.auth.register(
        this.form.getRawValue() as { fullName: string; email: string; password: string }
      )
    ).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/auth/login').then(() => {
          this.alerts.toastSuccess(
            'Account created',
            'Your NovaBank account is ready. Please sign in to continue.'
          );
        });
      },
      error: (err) => {
        this.loading = false;
        this.alerts.toastError('Signup failed', err?.error?.message || 'Unable to create account.');
      }
    });
  }
}
