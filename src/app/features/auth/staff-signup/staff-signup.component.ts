import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { fieldError } from '../../../core/utils/form-errors';

function usernameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim().toLowerCase();
  if (!value) {
    return { required: true };
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(value)) {
    return { username: true };
  }
  return null;
}

@Component({
  selector: 'app-staff-signup',
  templateUrl: './staff-signup.component.html',
  styleUrls: ['./staff-signup.component.scss']
})
export class StaffSignupComponent {
  loading = false;
  showPassword = false;
  formError = '';
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [usernameValidator]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['manager' as 'manager' | 'admin', [Validators.required]]
  });

  readonly fieldError = fieldError;
  readonly roles: Array<{ id: 'manager' | 'admin'; label: string; hint: string }> = [
    { id: 'manager', label: 'Manager', hint: 'Customer openings, approvals & reports desk' },
    { id: 'admin', label: 'Admin', hint: 'Full operations desk & customer directory' }
  ];

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
    this.formError = '';
    const raw = this.form.getRawValue();
    this.auth
      .registerStaff({
        fullName: String(raw.fullName),
        username: String(raw.username).trim().toLowerCase(),
        email: String(raw.email),
        password: String(raw.password),
        role: raw.role as 'manager' | 'admin'
      })
      .subscribe({
        next: async (res) => {
          this.loading = false;
          await this.alerts.success(
            res.message ||
              'Staff registration received. A Super Admin must approve your access before you can sign in.',
            'Registration received'
          );
          void this.router.navigate(['/auth/staff-status'], {
            queryParams: { identifier: String(raw.username).trim().toLowerCase() }
          });
        },
        error: (err) => {
          this.loading = false;
          this.formError = err?.error?.message || 'Unable to submit staff registration.';
        }
      });
  }
}
