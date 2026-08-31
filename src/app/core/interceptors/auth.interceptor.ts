import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Public auth endpoints must never trigger session logout / home redirect. */
function isPublicAuthUrl(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/console/') ||
    url.includes('/auth/otp/') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/register') ||
    url.includes('/auth/staff') ||
    url.includes('/auth/contact-admin')
  );
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();
    const authReq = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        const code = String((error.error as { code?: string } | null)?.code || '');
        const loginLockedOut =
          error.status === 403 &&
          (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_DELETED');
        // Only clear a real session on protected API 401/lifecycle — never on console/banking login attempts.
        if ((error.status === 401 || loginLockedOut) && !!token && !isPublicAuthUrl(request.url)) {
          this.auth.logout();
        }
        return throwError(() => error);
      })
    );
  }
}
