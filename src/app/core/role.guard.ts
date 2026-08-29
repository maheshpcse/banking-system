import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';
import { UserRole } from './models/banking.models';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) {
      return this.router.parseUrl('/');
    }
    const role = this.auth.currentUser?.role || 'customer';
    const allowed: UserRole[] = (route.data?.['roles'] as UserRole[]) || ['admin', 'manager'];
    const allowSuperAdmin = !!route.data?.['allowSuperAdmin'];
    /* Super Admin has its own Apex Console (`/console`) — send them there
     * instead of the mint Banking Admin shell, unless the route explicitly
     * welcomes Super Admin (e.g. `/manager` for Billing oversight). */
    if (this.auth.currentUser?.isSuperAdmin && !allowSuperAdmin) {
      return this.router.parseUrl('/console');
    }
    if (allowed.includes(role)) {
      return true;
    }
    if (allowSuperAdmin && this.auth.currentUser?.isSuperAdmin) {
      return true;
    }
    if (role === 'manager') {
      return this.router.parseUrl('/manager');
    }
    if (role === 'admin') {
      return this.router.parseUrl('/admin');
    }
    return this.router.parseUrl('/dashboard');
  }
}
