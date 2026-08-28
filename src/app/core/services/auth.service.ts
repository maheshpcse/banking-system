import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  ForgotPasswordResponse,
  RegisterResponse,
  StaffRegisterResponse,
  StaffStatusResponse,
  User,
  UserAvatar,
  UserSettings
} from '../models/banking.models';
import { ShellBootService } from './shell-boot.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'mb_token';
  private readonly userKey = 'mb_user';
  private readonly userSubject = new BehaviorSubject<User | null>(this.readStoredUser());

  readonly user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private shellBoot: ShellBootService
  ) {}

  /** Creates an account without signing the user in. */
  register(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, payload);
  }

  /** Manager/admin self-signup — pending Super Admin approval before login unlocks. */
  registerStaff(payload: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    role: 'manager' | 'admin';
  }): Observable<StaffRegisterResponse> {
    return this.http.post<StaffRegisterResponse>(`${environment.apiUrl}/auth/register-staff`, payload);
  }

  /** Public check for a pending/rejected/active staff registration — no auth required. */
  checkStaffStatus(identifier: string): Observable<StaffStatusResponse> {
    return this.http.post<StaffStatusResponse>(`${environment.apiUrl}/auth/staff-status`, { identifier });
  }

  login(payload: { identifier: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => this.persistSession(res))
    );
  }

  requestOtp(payload: {
    channel: 'email' | 'phone';
    identifier: string;
  }): Observable<{ message: string; expiresInMinutes: number; channel: string; maskedDestination: string }> {
    return this.http.post<{
      message: string;
      expiresInMinutes: number;
      channel: string;
      maskedDestination: string;
    }>(`${environment.apiUrl}/auth/otp/request`, payload);
  }

  verifyOtp(payload: {
    channel: 'email' | 'phone';
    identifier: string;
    code: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/otp/verify`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  forgotPassword(identifier: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${environment.apiUrl}/auth/forgot-password`, {
      identifier
    });
  }

  /** Public — ask Super Admin to clear a login lock (no auth). */
  requestUnlock(payload: { identifier: string; message?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/request-unlock`, payload);
  }

  getSupportInfo(): Observable<{ supportEmail: string; contactPath: string }> {
    return this.http.get<{ supportEmail: string; contactPath: string }>(
      `${environment.apiUrl}/auth/support-info`
    );
  }

  /** Public — blocked/deactivated users request restore access (no auth). */
  contactAdmin(payload: {
    identifier: string;
    message?: string;
  }): Observable<{ message: string; supportEmail?: string }> {
    return this.http.post<{ message: string; supportEmail?: string }>(
      `${environment.apiUrl}/auth/contact-admin`,
      payload
    );
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
    countryCode?: string;
    phone?: string;
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

  logout(options?: { redirect?: boolean; home?: string }): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
    this.shellBoot.complete();
    if (options?.redirect === false) {
      return;
    }
    void this.router.navigateByUrl(options?.home || '/');
  }

  /** True when the user has chosen a transaction currency (required before money actions). */
  hasCurrencyConfigured(user: User | null | undefined = this.currentUser): boolean {
    const code = String(user?.settings?.currency || '').trim().toUpperCase();
    return !!code && code !== 'NONE';
  }

  preferredCurrency(user: User | null | undefined = this.currentUser): string {
    const code = String(user?.settings?.currency || '').trim().toUpperCase();
    return code && code !== 'NONE' ? code : 'USD';
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
