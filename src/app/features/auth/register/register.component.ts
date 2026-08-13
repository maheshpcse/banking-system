import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  loading = false;
  error = '';

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private alerts: AlertService
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    const { fullName, email, password } = this.form.getRawValue();

    withShimmerDelay(
      this.auth.register({ fullName: fullName!, email: email!, password: password! })
    ).subscribe({
      next: async (res) => {
        this.loading = false;
        await this.alerts.success(
          'Account created',
          `Welcome ${res.user.fullName}. Your starter balance is ready.`
        );
        this.router.navigate(['/dashboard']);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: async (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to create account';
        await this.alerts.error('Registration failed', this.error);
      }
    });
  }
}
