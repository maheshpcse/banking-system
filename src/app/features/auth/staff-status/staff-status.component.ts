import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-staff-status',
  templateUrl: './staff-status.component.html',
  styleUrls: ['./staff-status.component.scss']
})
export class StaffStatusComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  formError = '';
  lastChecked: 'active' | 'pending_approval' | 'rejected' | null = null;
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const prefill = this.route.snapshot.queryParamMap.get('identifier');
    if (prefill) {
      this.form.patchValue({ identifier: prefill });
    }
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
    const identifier = String(this.form.getRawValue().identifier || '').trim();
    this.auth.checkStaffStatus(identifier).subscribe({
      next: async (res) => {
        this.loading = false;
        this.lastChecked = res.staffStatus;
        if (res.canLogin) {
          await this.alerts.success(res.detail, res.title);
        } else {
          await this.alerts.info(res.detail, res.title);
        }
      },
      error: async (err) => {
        this.loading = false;
        this.lastChecked = null;
        const message = err?.error?.message || 'Unable to check staff status.';
        this.formError = message;
        await this.alerts.info(message, 'Not found');
      }
    });
  }
}
