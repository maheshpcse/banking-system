import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { debounceTime, delay, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { AccountDirectoryItem, AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AccountLifecycleService } from '../../../core/services/account-lifecycle.service';
import { NotificationService } from '../../../core/services/notification.service';
import { fieldError } from '../../../core/utils/form-errors';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})
export class SendComponent implements OnInit, OnDestroy {
  pageLoading = true;
  suggestions: AccountDirectoryItem[] = [];
  showSuggestions = false;
  highlightIndex = -1;
  private recipientSub?: Subscription;

  @ViewChild('recipientField') recipientField?: ElementRef<HTMLInputElement>;

  form = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  readonly fieldError = fieldError;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private auth: AuthService,
    private alerts: AlertService,
    private lifecycle: AccountLifecycleService,
    private notifications: NotificationService
  ) {}

  get canTransfer(): boolean {
    return this.lifecycle.canMoveMoney(this.auth.currentUser);
  }

  ngOnInit(): void {
    of(true)
      .pipe(delay(500))
      .subscribe(() => {
        this.pageLoading = false;
      });

    this.recipientSub = this.form.controls.toAccountNumber.valueChanges
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = String(raw || '')
            .replace(/\s+/g, '')
            .toUpperCase();
          if (q.length < 2 || !this.canTransfer) {
            this.suggestions = [];
            this.showSuggestions = false;
            return of([] as AccountDirectoryItem[]);
          }
          return this.accountService.lookupDirectory(q);
        })
      )
      .subscribe((items) => {
        this.suggestions = items;
        this.showSuggestions = items.length > 0;
        this.highlightIndex = items.length ? 0 : -1;
      });
  }

  ngOnDestroy(): void {
    this.recipientSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.recipientField?.nativeElement.contains(target)) {
      return;
    }
    const panel = document.querySelector('.autocomplete__panel');
    if (panel?.contains(target)) {
      return;
    }
    this.showSuggestions = false;
  }

  onRecipientInput(): void {
    const ctrl = this.form.controls.toAccountNumber;
    const next = String(ctrl.value || '')
      .replace(/\s+/g, '')
      .toUpperCase();
    if (next !== ctrl.value) {
      ctrl.setValue(next, { emitEvent: true });
    }
  }

  selectSuggestion(item: AccountDirectoryItem): void {
    this.form.controls.toAccountNumber.setValue(item.accountNumber, { emitEvent: false });
    this.suggestions = [];
    this.showSuggestions = false;
    this.highlightIndex = -1;
  }

  onRecipientKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || !this.suggestions.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = (this.highlightIndex + 1) % this.suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex =
        (this.highlightIndex - 1 + this.suggestions.length) % this.suggestions.length;
    } else if (event.key === 'Enter' && this.highlightIndex >= 0) {
      event.preventDefault();
      this.selectSuggestion(this.suggestions[this.highlightIndex]);
    } else if (event.key === 'Escape') {
      this.showSuggestions = false;
    }
  }

  async submit(): Promise<void> {
    if (!this.canTransfer) {
      await this.alerts.warning('Your account number must be issued before transfers.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { toAccountNumber, amount, description } = this.form.getRawValue();
    const outcome = await this.alerts.confirmAction({
      text: `Send $${Number(amount).toFixed(2)} to account ${toAccountNumber}? This cannot be undone.`,
      confirmText: 'Send transfer',
      cancelText: 'Cancel',
      loadingText: 'Sending transfer…',
      action: () =>
        this.accountService
          .transfer({
            toAccountNumber: toAccountNumber!,
            amount: Number(amount),
            description: description || undefined
          })
          .pipe(
            tap((res) => {
              this.auth.updateLocalUser(res.user);
              // Transfer notifications are persisted by the API for sender + recipient.
              this.notifications.refresh().subscribe();
            })
          ),
      successMessage: (res) => res.message || 'Transfer successful',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Transfer failed'
    });

    if (outcome.ok) {
      this.form.reset({ toAccountNumber: '', amount: null, description: '' });
      this.suggestions = [];
      this.showSuggestions = false;
    }
  }
}
