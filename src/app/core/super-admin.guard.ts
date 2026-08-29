import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';

/** Allows only Super Admin (`isSuperAdmin`) into the Console portal. */
@Injectable({ providedIn: 'root' })
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) {
      return this.router.parseUrl('/auth/console/login');
    }
    if (this.auth.currentUser?.isSuperAdmin) {
      return true;
    }
    const role = this.auth.currentUser?.role || 'customer';
    if (role === 'admin') {
      return this.router.parseUrl('/admin');
    }
    if (role === 'manager') {
      return this.router.parseUrl('/manager');
    }
    return this.router.parseUrl('/dashboard');
  }
}
