import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  unlockLoading = false;
  showPassword = false;
  formError = '';
  unlockNotice = '';
  locked = false;
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  unlockForm = this.fb.group({
    message: ['', [Validators.maxLength(500)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly shellBoot: ShellBootService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
      }
      if (this.unlockNotice) {
        this.unlockNotice = '';
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
    this.unlockNotice = '';
    this.locked = false;
    const payload = this.form.getRawValue() as { identifier: string; password: string };
    this.auth.login(payload).subscribe({
      next: () => {
        this.notifications.refresh().subscribe();
        const role = this.auth.currentUser?.role || 'customer';
        const next = this.route.snapshot.queryParamMap.get('next');
        let dest =
          role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/dashboard';
        if (next === 'billing') {
          if (this.auth.currentUser?.isSuperAdmin) {
            dest = '/manager/billing';
          } else if (role === 'manager' || role === 'admin') {
            dest = '/billing';
          }
        }
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
        if (code === 'LOGIN_LOCKED') {
          this.locked = true;
          this.formError = message;
          return;
        }
        this.formError = message;
      }
    });
  }

  requestUnlock(): void {
    if (this.unlockLoading) {
      return;
    }
    const identifier = String(this.form.value.identifier || '').trim();
    if (!identifier) {
      this.form.controls.identifier.markAsTouched();
      this.formError = 'Enter your username or email, then send the unlock request.';
      return;
    }
    this.unlockLoading = true;
    this.unlockNotice = '';
    const message = String(this.unlockForm.value.message || '').trim();
    this.auth.requestUnlock({ identifier, message: message || undefined }).subscribe({
      next: (res) => {
        this.unlockLoading = false;
        this.unlockNotice = res.message || 'Unlock request sent to Super Admin.';
        this.unlockForm.reset({ message: '' });
      },
      error: (err) => {
        this.unlockLoading = false;
        this.formError = err?.error?.message || 'Unable to send unlock request.';
      }
    });
  }
}
