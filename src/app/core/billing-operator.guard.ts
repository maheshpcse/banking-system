import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Billing System POS operators: Manager or Admin, excluding Super Admin.
 * Super Admins monitor Billing from Banking controls only.
 */
@Injectable({ providedIn: 'root' })
export class BillingOperatorGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) {
      return this.router.parseUrl('/auth/login?next=billing');
    }
    const user = this.auth.currentUser;
    if (user?.isSuperAdmin) {
      return this.router.parseUrl('/manager/billing');
    }
    if (user?.role === 'manager' || user?.role === 'admin') {
      return true;
    }
    if (user?.role === 'customer') {
      return this.router.parseUrl('/dashboard');
    }
    return this.router.parseUrl('/');
  }
}
