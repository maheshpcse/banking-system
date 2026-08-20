import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import { fieldError } from '../../../core/utils/form-errors';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  showPassword = false;
  formError = '';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router,
    private readonly shellBoot: ShellBootService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
      }
    });
    withShimmerDelay(of(true), 220).subscribe(() => {
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
    const payload = this.form.getRawValue() as { identifier: string; password: string };
    this.auth.login(payload).subscribe({
      next: () => {
        this.notifications.refresh().subscribe();
        const role = this.auth.currentUser?.role || 'customer';
        const dest =
          role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/dashboard';
        this.shellBoot.begin();
        this.notifications.startRealtime();
        void this.router.navigateByUrl(dest).then((ok) => {
          this.loading = false;
          if (ok) {
            this.alerts.toastSuccess('Welcome back', 'You are signed in to NovaBank.');
          } else {
            this.shellBoot.complete();
          }
        });
      },
      error: async (err) => {
        this.loading = false;
        const code = err?.error?.code;
        const message = err?.error?.message || 'Unable to sign in.';
        if (code === 'STAFF_PENDING') {
          const identifier = encodeURIComponent(String(payload.identifier || '').trim());
          const goStatus = await this.alerts.infoWithAction({
            title: 'Verification in progress',
            text: message,
            confirmText: 'Check status',
            cancelText: 'Close',
            actionHint: 'Already requested access? Check status'
          });
          if (goStatus) {
            void this.router.navigateByUrl(`/auth/staff-status?identifier=${identifier}`);
          }
          return;
        }
        if (code === 'STAFF_REJECTED') {
          void this.alerts.info(message, 'Registration not approved');
          return;
        }
        this.formError = message;
      }
    });
  }
}
