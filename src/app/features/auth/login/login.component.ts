import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import { fieldError } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  showPassword = false;
  formError = '';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly fieldError = fieldError;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router,
    private readonly shellBoot: ShellBootService
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.formError = '';
    this.auth.login(this.form.getRawValue() as { identifier: string; password: string }).subscribe({
      next: () => {
        const role = this.auth.currentUser?.role || 'customer';
        const dest = role === 'admin' || role === 'manager' ? '/admin' : '/dashboard';
        // Start shell boot before navigation so navbar + first page shimmer appear together.
        this.shellBoot.begin();
        void this.router.navigateByUrl(dest).then((ok) => {
          this.loading = false;
          if (ok) {
            this.alerts.toastSuccess('Welcome back', 'You are signed in to NovaBank.');
          } else {
            this.shellBoot.complete();
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.formError = err?.error?.message || 'Unable to sign in.';
      }
    });
  }
}
