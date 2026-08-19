import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountApplication,
  AccountStatus,
  ApplicationStep,
  ApplicationStepStatus,
  BankCard,
  CardControls,
  LimitRequestProposal,
  User,
  UserAddress
} from '../models/banking.models';
import { AuthService } from './auth.service';

function defaultSteps(status: AccountStatus): ApplicationStep[] {
  const order: AccountStatus[] = [
    'pending',
    'address_required',
    'under_review',
    'approved',
    'active'
  ];
  const labels: Record<string, { label: string; detail: string }> = {
    pending: { label: 'Signup complete', detail: 'Identity created — start account opening.' },
    address_required: { label: 'Address & KYC', detail: 'Submit verified residential address.' },
    under_review: { label: 'Manager review', detail: 'Awaiting verification & approval.' },
    approved: { label: 'Account approved', detail: 'Account number & card issued.' },
    active: { label: 'Activated', detail: 'Banking & ATM card ready to use.' },
    rejected: { label: 'Rejected', detail: 'Application needs correction.' },
    blocked: { label: 'Blocked', detail: 'Account restricted by admin.' },
    deactivated: { label: 'Deactivated', detail: 'Account closed or suspended.' }
  };

  if (status === 'rejected') {
    return [
      { id: 'pending', ...labels['pending'], status: 'complete' },
      { id: 'address_required', ...labels['address_required'], status: 'complete' },
      { id: 'under_review', ...labels['under_review'], status: 'complete' },
      { id: 'rejected', ...labels['rejected'], status: 'rejected' }
    ];
  }

  const idx = Math.max(0, order.indexOf(status === 'active' ? 'active' : status));
  return order.map((id, i) => ({
    id,
    label: labels[id as keyof typeof labels].label,
    detail: labels[id as keyof typeof labels].detail,
    status: (i < idx ? 'complete' : i === idx ? 'current' : 'upcoming') as ApplicationStepStatus
  }));
}

function ensureApplication(user: User): AccountApplication {
  const status = user.accountStatus || (user.accountNumber ? 'active' : 'address_required');
  return (
    user.application || {
      status,
      address: user.address || null,
      cardDraft: user.card || null,
      steps: defaultSteps(status),
      reviewNote: null,
      submittedAt: null,
      decidedAt: null
    }
  );
}

@Injectable({ providedIn: 'root' })
export class AccountLifecycleService {
  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  hasAccountNumber(user: User | null | undefined): boolean {
    return !!user?.accountNumber && String(user.accountNumber).trim().length > 0;
  }

  canMoveMoney(user: User | null | undefined): boolean {
    if (!this.hasAccountNumber(user)) {
      return false;
    }
    const status = user?.accountStatus;
    if (!status) {
      return true;
    }
    return status === 'active' || status === 'approved';
  }

  applicationFor(user: User | null): AccountApplication | null {
    if (!user) {
      return null;
    }
    return ensureApplication(user);
  }

  submitApplication(payload: {
    address: UserAddress;
    card: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
      brand?: string;
      accountType?: string;
      accountExpiryMonth?: string;
      accountExpiryYear?: string;
    };
  }): Observable<{ message: string; user: User }> {
    return this.http
      .post<{ message: string; user: User }>(`${environment.apiUrl}/account/application`, payload)
      .pipe(tap((res) => this.auth.updateLocalUser(res.user)));
  }

  updateCardControls(partial: Partial<CardControls>): Observable<{ message: string; user: User }> {
    return this.http
      .patch<{ message: string; user: User }>(`${environment.apiUrl}/account/card-controls`, partial)
      .pipe(tap((res) => this.auth.updateLocalUser(res.user)));
  }

  requestLimits(proposed: LimitRequestProposal): Observable<{ message: string; user: User }> {
    return this.http
      .post<{ message: string; user: User }>(`${environment.apiUrl}/account/limits/request`, proposed)
      .pipe(tap((res) => this.auth.updateLocalUser(res.user)));
  }

  /** Admin/manager local approve helper when API missing (UI should prefer /api/admin). */
  activateAccountLocal(user: User): User {
    const digits = String(Math.floor(100000000000 + Math.random() * 899999999999));
    const accountNumber = `MB${digits}`;
    const cardNumber = `4532${digits.slice(0, 12)}`.slice(0, 16);
    const next: User = {
      ...user,
      accountNumber,
      accountStatus: 'active',
      card: {
        holderName: user.card?.holderName || user.fullName,
        number: user.card?.number || cardNumber,
        expiryMonth: user.card?.expiryMonth || '12',
        expiryYear: user.card?.expiryYear || '30',
        cvv: user.card?.cvv || '123',
        brand: 'novabank',
        status: 'active'
      },
      application: {
        ...(user.application || ensureApplication(user)),
        status: 'active',
        steps: defaultSteps('active'),
        decidedAt: new Date().toISOString(),
        reviewNote: 'Approved by NovaBank operations.'
      }
    };
    return next;
  }
}
