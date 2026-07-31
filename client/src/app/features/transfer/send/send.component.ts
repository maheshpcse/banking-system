import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})
export class SendComponent {
  loading = false;
  error = '';
  success = '';

  form = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private auth: AuthService
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const { toAccountNumber, amount, description } = this.form.getRawValue();

    this.accountService
      .transfer({
        toAccountNumber: toAccountNumber!,
        amount: Number(amount),
        description: description || undefined
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.success = res.message;
          this.auth.updateLocalUser(res.user);
          this.form.reset();
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Transfer failed';
        }
      });
  }
}
