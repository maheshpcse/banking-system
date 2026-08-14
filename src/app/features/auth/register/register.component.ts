import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  loading = false;
  showPassword = false;
  formError = '';
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [usernameValidator]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
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
    const raw = this.form.getRawValue();
    this.auth
      .register({
        fullName: String(raw.fullName),
        username: String(raw.username).trim().toLowerCase(),
        email: String(raw.email),
        password: String(raw.password)
      })
      .subscribe({
        next: () => {
          this.loading = false;
          void this.router.navigate(['/'], { queryParams: { registered: '1' } });
        },
        error: (err) => {
          this.loading = false;
          this.formError = err?.error?.message || 'Unable to create account.';
        }
      });
  }
}
