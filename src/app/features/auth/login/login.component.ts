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

type LoginMethod = 'password' | 'email-otp' | 'phone-otp';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  otpSending = false;
  unlockLoading = false;
  showPassword = false;
  formError = '';
  unlockNotice = '';
  locked = false;
  /** True when opened as Billing login (`?next=billing`). */
  isBillingLogin = false;
  loginMethod: LoginMethod = 'password';
  otpSent = false;
  otpHint = '';
  maskedDestination = '';

  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  otpForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
  });
  unlockForm = this.fb.group({
    message: ['', [Validators.maxLength(500)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;
  private otpFormSub?: Subscription;

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
    this.otpFormSub = this.otpForm.valueChanges.subscribe(() => {
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
    this.otpFormSub?.unsubscribe();
  }

  get otpChannel(): 'email' | 'phone' {
    return this.loginMethod === 'phone-otp' ? 'phone' : 'email';
  }

  setLoginMethod(method: LoginMethod): void {
    if (this.loginMethod === method || this.loading || this.otpSending) {
      return;
    }
    this.loginMethod = method;
    this.formError = '';
    this.unlockNotice = '';
    this.locked = false;
    this.otpSent = false;
    this.otpHint = '';
    this.maskedDestination = '';
    this.form.reset({ identifier: '', password: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.otpForm.reset({ identifier: '', code: '' });
    this.otpForm.markAsPristine();
    this.otpForm.markAsUntouched();
  }

  submit(): void {
    if (this.loginMethod !== 'password') {
      return;
    }
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
        await this.finishSignIn(payload.identifier);
      },
      error: async (err) => {
        this.loading = false;
        await this.handleAuthError(err, payload.identifier);
      }
    });
  }

  requestOtp(): void {
    if (this.otpSending || this.loading) {
      return;
    }
    const identifierCtrl = this.otpForm.controls.identifier;
    if (identifierCtrl.invalid) {
      identifierCtrl.markAsTouched();
      return;
    }
    const identifier = String(identifierCtrl.value || '').trim();
    this.otpSending = true;
    this.formError = '';
    this.auth.requestOtp({ channel: this.otpChannel, identifier }).subscribe({
      next: async (res) => {
        this.otpSending = false;
        this.otpSent = true;
        this.maskedDestination = res.maskedDestination || '';
        this.otpHint =
          res.message ||
          'OTP sent and will expire in 10 minutes.';
        this.otpForm.controls.code.reset('');
        if (res.delivered === false) {
          await this.alerts.info(
            this.otpChannel === 'phone'
              ? 'OTP generated. SMS delivery is not configured on the server (set SMS_ENABLED=true and Twilio credentials). In development the code is printed in the API server console.'
              : 'OTP generated. Email delivery is not configured on the server (set EMAIL_ENABLED=true and provider credentials). In development the code is printed in the API server console.',
            'OTP ready'
          );
          return;
        }
        await this.alerts.info(
          this.otpHint +
            (this.maskedDestination ? ` Sent to ${this.maskedDestination}.` : ''),
          'OTP sent'
        );
      },
      error: async (err) => {
        this.otpSending = false;
        const message = err?.error?.message || 'Unable to send OTP.';
        const code = err?.error?.code;
        if (
          code === 'USE_CONSOLE_LOGIN' ||
          code === 'STAFF_PENDING' ||
          code === 'STAFF_REJECTED' ||
          code === 'ACCOUNT_BLOCKED' ||
          code === 'ACCOUNT_DEACTIVATED' ||
          code === 'ACCOUNT_DELETED' ||
          code === 'LOGIN_LOCKED'
        ) {
          await this.handleAuthError(err, identifier);
          return;
        }
        this.formError = message;
        await this.alerts.info(message, 'Unable to send OTP');
      }
    });
  }

  verifyOtp(): void {
    if (this.loading || this.otpSending) {
      return;
    }
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    if (!this.otpSent) {
      this.formError = 'Request an OTP first.';
      return;
    }
    const raw = this.otpForm.getRawValue();
    const identifier = String(raw.identifier || '').trim();
    const code = String(raw.code || '').trim();
    this.loading = true;
    this.formError = '';
    this.auth.verifyOtp({ channel: this.otpChannel, identifier, code }).subscribe({
      next: async () => {
        await this.finishSignIn(identifier);
      },
      error: async (err) => {
        this.loading = false;
        const message = err?.error?.message || 'Unable to verify OTP.';
        const apiCode = err?.error?.code;
        if (
          apiCode === 'OTP_EXPIRED' ||
          apiCode === 'OTP_INVALID' ||
          apiCode === 'OTP_LOCKED' ||
          apiCode === 'OTP_NOT_FOUND' ||
          apiCode === 'OTP_CHANNEL_MISMATCH'
        ) {
          this.formError = message;
          await this.alerts.info(message, 'OTP validation');
          if (apiCode === 'OTP_EXPIRED' || apiCode === 'OTP_LOCKED' || apiCode === 'OTP_NOT_FOUND') {
            this.otpSent = false;
            this.otpHint = '';
          }
          return;
        }
        await this.handleAuthError(err, identifier);
      }
    });
  }

  private async finishSignIn(identifier: string): Promise<void> {
    this.notifications.refresh().subscribe();
    const role = this.auth.currentUser?.role || 'customer';
    const next = this.route.snapshot.queryParamMap.get('next');
    if (next === 'billing' && role === 'customer' && !this.auth.currentUser?.isSuperAdmin) {
      this.loading = false;
      this.auth.logout({ redirect: false });
      const goLogin = await this.alerts.billingStaffOnly(
        'Customer accounts cannot sign in to the Billing System. Managers and Admins only.'
      );
      if (goLogin) {
        void this.router.navigateByUrl('/auth/login');
      }
      return;
    }
    let dest = role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/dashboard';
    let billingLaunch = false;
    if (this.auth.currentUser?.isSuperAdmin && next !== 'billing') {
      dest = '/console';
    }
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
    void identifier;
  }

  private async handleAuthError(err: { error?: { code?: string; message?: string; supportEmail?: string } }, identifier: string): Promise<void> {
    const code = err?.error?.code;
    const message = err?.error?.message || 'Unable to sign in.';
    if (code === 'STAFF_PENDING') {
      const id = encodeURIComponent(String(identifier || '').trim());
      const goStatus = await this.alerts.infoWithAction({
        title: 'Verification in progress',
        text: message,
        confirmText: 'Check status',
        cancelText: 'Close',
        actionHint: 'Already requested access? Check status'
      });
      if (goStatus) {
        void this.router.navigateByUrl(`/auth/staff-status?identifier=${id}`);
      }
      return;
    }
    if (code === 'STAFF_REJECTED') {
      void this.alerts.info(message, 'Registration not approved');
      return;
    }
    if (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_DEACTIVATED') {
      const id = encodeURIComponent(String(identifier || '').trim());
      const action = await this.alerts.accountRestricted({
        title: code === 'ACCOUNT_BLOCKED' ? 'Sign-in blocked' : 'Sign-in deactivated',
        text: message,
        supportEmail: err?.error?.supportEmail
      });
      if (action === 'contact') {
        void this.router.navigateByUrl(`/auth/contact-admin?identifier=${id}`);
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
    if (code === 'USE_CONSOLE_LOGIN') {
      const goConsole = await this.alerts.portalMismatch({
        title: 'Wrong portal',
        text: message,
        confirmText: 'Go to Console login',
        actionHint:
          'Super Admin accounts cannot sign in, use OTP, or reset passwords on Banking or Billing pages. Use Apex Console only.'
      });
      if (goConsole) {
        void this.router.navigateByUrl('/auth/console/login');
      }
      return;
    }
    this.formError = message;
  }

  requestUnlock(): void {
    if (this.unlockLoading) {
      return;
    }
    const identifier =
      this.loginMethod === 'password'
        ? String(this.form.value.identifier || '').trim()
        : String(this.otpForm.value.identifier || '').trim();
    if (!identifier) {
      if (this.loginMethod === 'password') {
        this.form.controls.identifier.markAsTouched();
      } else {
        this.otpForm.controls.identifier.markAsTouched();
      }
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
