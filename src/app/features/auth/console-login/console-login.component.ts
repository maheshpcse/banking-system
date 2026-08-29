import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type ConsoleLoginMethod = 'password' | 'email-otp';

/**
 * Super Admin Console sign-in — password or Email OTP only (no phone, no
 * self-signup). Distinct Apex Console visual treatment from the Banking
 * and Billing login pages.
 */
@Component({
  selector: 'app-console-login',
  templateUrl: './console-login.component.html',
  styleUrls: ['./console-login.component.scss']
})
export class ConsoleLoginComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  otpSending = false;
  showPassword = false;
  formError = '';
  loginMethod: ConsoleLoginMethod = 'password';
  otpSent = false;
  otpHint = '';
  maskedDestination = '';
  bankingLoginNotice = '';

  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  otpForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;
  private otpFormSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router,
    private readonly shellBoot: ShellBootService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('sa-mode');
    }
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
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
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sa-mode');
    }
  }

  setLoginMethod(method: ConsoleLoginMethod): void {
    if (this.loginMethod === method || this.loading || this.otpSending) {
      return;
    }
    this.loginMethod = method;
    this.formError = '';
    this.bankingLoginNotice = '';
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
    this.bankingLoginNotice = '';
    const payload = this.form.getRawValue() as { identifier: string; password: string };
    this.auth.consoleLogin(payload).subscribe({
      next: async () => {
        await this.finishSignIn();
      },
      error: async (err) => {
        this.loading = false;
        await this.handleAuthError(err);
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
    this.bankingLoginNotice = '';
    this.auth.consoleRequestOtp({ identifier }).subscribe({
      next: async (res) => {
        this.otpSending = false;
        this.otpSent = true;
        this.maskedDestination = res.maskedDestination || '';
        this.otpHint = res.message || 'OTP sent and will expire in 10 minutes.';
        this.otpForm.controls.code.reset('');
        if (res.delivered === false) {
          await this.alerts.info(
            'OTP generated. Email delivery is not configured on the server (set EMAIL_ENABLED=true and provider credentials). In development the code is printed in the API server console.',
            'OTP ready'
          );
          return;
        }
        await this.alerts.info(
          this.otpHint + (this.maskedDestination ? ` Sent to ${this.maskedDestination}.` : ''),
          'OTP sent'
        );
      },
      error: async (err) => {
        this.otpSending = false;
        await this.handleAuthError(err);
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
    this.auth.consoleVerifyOtp({ identifier, code }).subscribe({
      next: async () => {
        await this.finishSignIn();
      },
      error: async (err) => {
        this.loading = false;
        const message = err?.error?.message || 'Unable to verify OTP.';
        const apiCode = err?.error?.code;
        if (
          apiCode === 'OTP_EXPIRED' ||
          apiCode === 'OTP_INVALID' ||
          apiCode === 'OTP_LOCKED' ||
          apiCode === 'OTP_NOT_FOUND'
        ) {
          this.formError = message;
          await this.alerts.info(message, 'OTP validation');
          if (apiCode === 'OTP_EXPIRED' || apiCode === 'OTP_LOCKED' || apiCode === 'OTP_NOT_FOUND') {
            this.otpSent = false;
            this.otpHint = '';
          }
          return;
        }
        await this.handleAuthError(err);
      }
    });
  }

  private async finishSignIn(): Promise<void> {
    this.notifications.refresh().subscribe();
    this.notifications.startRealtime();
    this.shellBoot.begin();
    void this.router.navigateByUrl('/console').then((ok) => {
      this.loading = false;
      if (ok) {
        this.alerts.toastSuccessCorner('Welcome back', 'You are signed in to Apex Console.');
      } else {
        this.shellBoot.complete();
      }
    });
  }

  private async handleAuthError(err: {
    status?: number;
    error?: { code?: string; message?: string } | string;
  }): Promise<void> {
    this.loading = false;
    this.otpSending = false;
    const code = typeof err?.error === 'object' && err.error ? err.error.code : undefined;
    const apiMessage =
      typeof err?.error === 'object' && err.error
        ? err.error.message
        : typeof err?.error === 'string'
          ? err.error
          : undefined;
    if (code === 'USE_BANKING_LOGIN') {
      const goBanking = await this.alerts.portalMismatch({
        title: 'Wrong portal',
        text: apiMessage || 'Access denied.',
        confirmText: 'Go to Banking login',
        actionHint:
          'Apex Console authentication is restricted to Super Admin. Customers, managers, and admins must use Banking login.'
      });
      if (goBanking) {
        void this.router.navigateByUrl('/auth/login');
      }
      return;
    }
    if (err?.status === 404) {
      this.formError =
        'Console sign-in API is not available on the server yet (missing /api/auth/console). Redeploy banking-system-server so Apex Console auth routes are live.';
      await this.alerts.info(this.formError, 'Console API unavailable');
      return;
    }
    this.formError = apiMessage || 'Unable to sign in.';
  }
}
