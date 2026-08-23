import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export type HttpErrorTone = 'banking' | 'billing';

interface HttpErrorCopy {
  code: number;
  title: string;
  message: string;
  hint: string;
}

const ERROR_CATALOG: Record<number, Omit<HttpErrorCopy, 'code'>> = {
  400: {
    title: 'Bad request',
    message: 'That request could not be understood.',
    hint: 'Check the link or try again from a known page.'
  },
  401: {
    title: 'Sign in required',
    message: 'This area needs an authenticated session.',
    hint: 'Sign in again to continue where you left off.'
  },
  403: {
    title: 'Access denied',
    message: 'You do not have permission to open this page.',
    hint: 'Return home or ask an administrator if you need access.'
  },
  404: {
    title: 'Page not found',
    message: 'This route drifted off the ledger.',
    hint: 'The page may have moved, or the link is incomplete.'
  },
  408: {
    title: 'Request timeout',
    message: 'The server took too long to answer.',
    hint: 'Refresh once your connection feels stable.'
  },
  429: {
    title: 'Too many requests',
    message: 'Traffic paused to keep the vault calm.',
    hint: 'Wait a moment, then try again.'
  },
  500: {
    title: 'Something went wrong',
    message: 'An unexpected fault stopped this page.',
    hint: 'Our systems logged it — try again shortly.'
  },
  502: {
    title: 'Bad gateway',
    message: 'An upstream service returned an invalid response.',
    hint: 'Retry in a few seconds.'
  },
  503: {
    title: 'Service unavailable',
    message: 'This service is briefly offline for care.',
    hint: 'Check back soon — we will be ready.'
  },
  504: {
    title: 'Gateway timeout',
    message: 'A downstream service did not respond in time.',
    hint: 'Give it another try shortly.'
  }
};

@Component({
  selector: 'app-http-error-page',
  templateUrl: './http-error-page.component.html',
  styleUrls: ['./http-error-page.component.scss']
})
export class HttpErrorPageComponent implements OnInit, OnDestroy {
  code = 404;
  tone: HttpErrorTone = 'banking';
  title = ERROR_CATALOG[404].title;
  message = ERROR_CATALOG[404].message;
  hint = ERROR_CATALOG[404].hint;
  digits: string[] = ['4', '0', '4'];

  private sub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sub = merge(this.route.paramMap, this.route.queryParamMap).subscribe(() => this.syncFromRoute());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset['nbErrorTone'];
    }
  }

  get brand(): string {
    return this.tone === 'billing' ? 'NovaBill' : 'NovaBank';
  }

  get primaryLabel(): string {
    if (this.code === 401) {
      return 'Go to sign in';
    }
    if (this.tone === 'billing' && this.auth.isAuthenticated()) {
      return 'Back to Billing';
    }
    if (this.auth.isAuthenticated()) {
      return 'Back to workspace';
    }
    return 'Back to home';
  }

  get secondaryLabel(): string {
    return 'Go back';
  }

  primaryAction(): void {
    if (this.code === 401) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }
    if (this.tone === 'billing' && this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/billing');
      return;
    }
    void this.router.navigateByUrl(this.homeUrl());
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    this.primaryAction();
  }

  private syncFromRoute(): void {
    const raw =
      this.route.snapshot.paramMap.get('code') ||
      this.route.snapshot.data['code'] ||
      '404';
    const parsed = Number.parseInt(String(raw), 10);
    this.code = Number.isFinite(parsed) && parsed >= 100 && parsed <= 599 ? parsed : 404;

    const dataTone = this.route.snapshot.data['tone'] as HttpErrorTone | undefined;
    const queryTone = this.route.snapshot.queryParamMap.get('tone');
    if (queryTone === 'billing' || dataTone === 'billing') {
      this.tone = 'billing';
    } else if (
      typeof document !== 'undefined' &&
      document.documentElement.dataset['nbBilling'] === '1'
    ) {
      this.tone = 'billing';
    } else {
      this.tone = 'banking';
    }

    const copy = ERROR_CATALOG[this.code] || {
      title: 'Unexpected error',
      message: 'Something interrupted this request.',
      hint: 'Return to a known page and try again.'
    };
    this.title = copy.title;
    this.message = copy.message;
    this.hint = copy.hint;
    this.digits = String(this.code).split('');

    if (typeof document !== 'undefined') {
      document.documentElement.dataset['nbErrorTone'] = this.tone;
    }
  }

  private homeUrl(): string {
    const user = this.auth.currentUser;
    if (!user || !this.auth.isAuthenticated()) {
      return '/';
    }
    if (user.role === 'admin') {
      return '/admin';
    }
    if (user.role === 'manager') {
      return '/manager';
    }
    return '/dashboard';
  }
}
