import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    // Unauthenticated /console access should land on Apex Console login, not NovaBank home.
    if (state.url.startsWith('/console')) {
      return this.router.createUrlTree(['/auth/console/login']);
    }
    return this.router.createUrlTree(['/']);
  }
}
