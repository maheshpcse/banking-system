import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UserRole } from './models/banking.models';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) {
      return this.router.parseUrl('/');
    }
    const role = this.auth.currentUser?.role || 'customer';
    const allowed: UserRole[] = ['admin', 'manager'];
    if (!allowed.includes(role)) {
      return this.router.parseUrl('/dashboard');
    }
    return true;
  }
}
