import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-contact-admin',
  templateUrl: './contact-admin.component.html',
  styleUrls: ['./contact-admin.component.scss']
})
export class ContactAdminComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  submitted = false;
  countdown = 5;
  formError = '';
  supportEmail = 'support@novabank.local';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.maxLength(600)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;
  private countdownSub?: Subscription;

  get mailHref(): string {
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent('NovaBank account access')}`;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const preset = String(this.route.snapshot.queryParamMap.get('identifier') || '').trim();
    if (preset) {
      this.form.patchValue({ identifier: preset });
    }
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
      }
    });
    withShimmerDelay(this.auth.getSupportInfo(), SHIMMER_MS).subscribe({
      next: (info) => {
        this.supportEmail = info.supportEmail || this.supportEmail;
        this.pageLoading = false;
      },
      error: () => {
        this.pageLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
    this.countdownSub?.unsubscribe();
  }

  goHome(): void {
    this.countdownSub?.unsubscribe();
    void this.router.navigateByUrl('/');
  }

  submit(): void {
    if (this.form.invalid || this.loading || this.submitted) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.formError = '';
    const identifier = String(this.form.value.identifier || '').trim();
    const message = String(this.form.value.message || '').trim();
    this.auth.contactAdmin({ identifier, message: message || undefined }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.supportEmail) {
          this.supportEmail = res.supportEmail;
        }
        this.submitted = true;
        this.startCountdown();
      },
      error: async (err) => {
        this.loading = false;
        const code = err?.error?.code;
        const msg = err?.error?.message || 'Unable to send contact request.';
        if (err?.error?.supportEmail) {
          this.supportEmail = err.error.supportEmail;
        }
        if (code === 'CONTACT_DUPLICATE') {
          await this.alerts.info(msg, 'Request already open');
          this.formError = msg;
          return;
        }
        this.formError = msg;
      }
    });
  }

  private startCountdown(): void {
    this.countdown = 5;
    this.countdownSub?.unsubscribe();
    this.countdownSub = timer(0, 1000)
      .pipe(take(6))
      .subscribe((tick) => {
        if (tick < 5) {
          this.countdown = 5 - tick;
          return;
        }
        void this.router.navigateByUrl('/');
      });
  }
}
