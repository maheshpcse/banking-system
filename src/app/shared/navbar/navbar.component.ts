import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserRole } from '../../core/models/banking.models';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  unreadCount = 0;
  private sub?: Subscription;

  constructor(public auth: AuthService, private readonly notifications: NotificationService) {}

  get role(): UserRole {
    return this.auth.currentUser?.role || 'customer';
  }

  get isStaff(): boolean {
    return this.role === 'admin' || this.role === 'manager';
  }

  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  get isManager(): boolean {
    return this.role === 'manager';
  }

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  get isDarkMode(): boolean {
    return this.auth.currentUser?.settings?.colorMode === 'dark';
  }

  get homeLink(): string {
    if (this.isAdmin) {
      return '/admin';
    }
    if (this.isManager) {
      return '/manager';
    }
    return '/dashboard';
  }

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe(() => {
      this.unreadCount = this.notifications.unreadCount;
    });
    this.unreadCount = this.notifications.unreadCount;
    this.applyColorMode(this.isDarkMode ? 'dark' : 'light');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onNavClick(): void {
    this.closeMenu();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  toggleColorMode(): void {
    const next = this.isDarkMode ? 'light' : 'dark';
    this.applyColorMode(next);
    const current = this.auth.currentUser?.settings;
    this.auth
      .updateProfile({
        settings: {
          emailAlerts: current?.emailAlerts !== false,
          hideBalance: !!current?.hideBalance,
          compactLedger: !!current?.compactLedger,
          marketingTips: !!current?.marketingTips,
          theme: current?.theme || 'daylight',
          fontScale: current?.fontScale || 'comfortable',
          currency: current?.currency || null,
          colorMode: next
        }
      })
      .subscribe({ error: () => undefined });
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }

  private applyColorMode(mode: 'light' | 'dark'): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.dataset['nbMode'] = mode;
  }
}
