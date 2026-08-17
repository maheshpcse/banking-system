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
    if (!allowed.includes(role)) {
      if (role === 'manager') {
        return this.router.parseUrl('/manager');
      }
      if (role === 'admin') {
        return this.router.parseUrl('/admin');
      }
      return this.router.parseUrl('/dashboard');
    }
    return true;
  }
}
