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
        if (
          (error.status === 401 || loginLockedOut) &&
          !request.url.includes('/auth/login') &&
          !request.url.includes('/auth/otp/') &&
          !request.url.includes('/auth/contact-admin')
        ) {
          this.auth.logout();
        }
        return throwError(() => error);
      })
    );
  }
}
