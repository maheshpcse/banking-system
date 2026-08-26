import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PortalLaunchService } from '../../../core/services/portal-launch.service';
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
  /** True when opened as Billing login (`?next=billing`). */
  isBillingLogin = false;
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
    private readonly portalLaunch: PortalLaunchService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.isBillingLogin = this.route.snapshot.queryParamMap.get('next') === 'billing';
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
      next: async () => {
        this.notifications.refresh().subscribe();
        const role = this.auth.currentUser?.role || 'customer';
        const next = this.route.snapshot.queryParamMap.get('next');
        if (next === 'billing' && role === 'customer' && !this.auth.currentUser?.isSuperAdmin) {
          this.loading = false;
          this.auth.logout();
          const goLogin = await this.alerts.billingStaffOnly(
            'Customer accounts cannot sign in to the Billing System. Managers and Admins only.'
          );
          if (goLogin) {
            void this.router.navigateByUrl('/auth/login');
          }
          return;
        }
        let dest =
          role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/dashboard';
        let billingLaunch = false;
        if (next === 'billing') {
          if (this.auth.currentUser?.isSuperAdmin) {
            dest = '/manager/billing';
          } else if (role === 'manager' || role === 'admin') {
            dest = '/billing';
            billingLaunch = true;
          }
        }
        this.notifications.startRealtime();
        if (billingLaunch) {
          this.loading = false;
          this.shellBoot.begin();
          this.portalLaunch.launch('billing', dest);
          void this.alerts.toastSuccessCorner('Welcome back', 'Opening Billing System…');
          return;
        }
        this.shellBoot.begin();
        void this.router.navigateByUrl(dest).then((ok) => {
          this.loading = false;
          if (ok) {
            this.alerts.toastSuccessCorner('Welcome back', 'You are signed in to NovaBank.');
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
        if (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_DEACTIVATED') {
          const identifier = encodeURIComponent(String(payload.identifier || '').trim());
          const action = await this.alerts.accountRestricted({
            title: code === 'ACCOUNT_BLOCKED' ? 'Sign-in blocked' : 'Sign-in deactivated',
            text: message,
            supportEmail: err?.error?.supportEmail
          });
          if (action === 'contact') {
            void this.router.navigateByUrl(`/auth/contact-admin?identifier=${identifier}`);
          }
          return;
        }
        if (code === 'ACCOUNT_DELETED') {
          const goRegister = await this.alerts.infoWithAction({
            title: 'Account deleted',
            text: message,
            confirmText: 'Create account',
            cancelText: 'Close',
            actionHint: 'You can re-register with the same email or username.'
          });
          if (goRegister) {
            void this.router.navigateByUrl('/auth/register');
          }
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
