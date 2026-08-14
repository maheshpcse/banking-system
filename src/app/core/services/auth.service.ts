import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  ForgotPasswordResponse,
  RegisterResponse,
  User,
  UserAvatar,
  UserSettings
} from '../models/banking.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'mb_token';
  private readonly userKey = 'mb_user';
  private readonly userSubject = new BehaviorSubject<User | null>(this.readStoredUser());

  readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  /** Creates an account without signing the user in. */
  register(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, payload);
  }

  login(payload: { identifier: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  forgotPassword(identifier: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${environment.apiUrl}/auth/forgot-password`, {
      identifier
    });
  }

  resetPassword(payload: {
    resetToken: string;
    password: string;
    confirmPassword: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, payload);
  }

  refreshMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => this.updateLocalUser(res.user))
    );
  }

  updateProfile(payload: {
    fullName?: string;
    username?: string;
    email?: string;
    avatar?: Partial<UserAvatar>;
    settings?: Partial<UserSettings>;
  }): Observable<{ message: string; user: User }> {
    return this.http.patch<{ message: string; user: User }>(`${environment.apiUrl}/auth/profile`, payload).pipe(
      tap((res) => this.updateLocalUser(res.user))
    );
  }

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/change-password`, payload);
  }

  updateLocalUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
    void this.router.navigateByUrl('/');
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this.userSubject.next(res.user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
