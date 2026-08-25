import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

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
export class RegisterComponent implements OnInit, OnDestroy {
  pageLoading = true;
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
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
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
        error: async (err) => {
          this.loading = false;
          const code = err?.error?.code;
          const message = err?.error?.message || 'Unable to create account.';
          if (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_DEACTIVATED') {
            const identifier = encodeURIComponent(
              String(this.form.value.email || this.form.value.username || '').trim()
            );
            const action = await this.alerts.accountRestricted({
              title: code === 'ACCOUNT_BLOCKED' ? 'Account blocked' : 'Account deactivated',
              text: message,
              supportEmail: err?.error?.supportEmail
            });
            if (action === 'contact') {
              void this.router.navigateByUrl(`/auth/contact-admin?identifier=${identifier}`);
            }
            return;
          }
          this.formError = message;
        }
      });
  }
}
