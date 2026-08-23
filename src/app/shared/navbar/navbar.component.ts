import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PortalLaunchService } from '../../core/services/portal-launch.service';
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

  constructor(
    public auth: AuthService,
    private readonly notifications: NotificationService,
    private readonly portalLaunch: PortalLaunchService
  ) {}

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

  /** Future enhancement — dark/light toggle UI is commented out in the template. */
  get isDarkMode(): boolean {
    return false;
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

  /** Manager/Admin operators (not Super Admin) can open the Billing System app. */
  get canLaunchBilling(): boolean {
    const user = this.auth.currentUser;
    return !!user && !user.isSuperAdmin && (user.role === 'manager' || user.role === 'admin');
  }

  get avatarStyle(): string {
    return this.auth.currentUser?.avatar?.style || 'mint';
  }

  get avatarInitials(): string {
    return (this.auth.currentUser?.avatar?.initials || 'NB').trim().toUpperCase() || 'NB';
  }

  /** Custom upload wins; otherwise the saved professional preset portrait. */
  get avatarSrc(): string | null {
    const avatar = this.auth.currentUser?.avatar;
    if (avatar?.image) {
      return avatar.image;
    }
    const presetId = String(avatar?.presetId || '').trim();
    if (!/^(customer|manager|admin)\/preset-\d{2}$/.test(presetId)) {
      return null;
    }
    return `assets/avatars/${presetId}.webp`;
  }

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe(() => {
      this.unreadCount = this.notifications.unreadCount;
    });
    this.unreadCount = this.notifications.unreadCount;
    // Dark/light mode parked as a future enhancement — always stay on light chrome.
    this.forceLightMode();
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

  launchBilling(): void {
    this.closeMenu();
    this.portalLaunch.launch('billing', '/billing');
  }

  /*
  // Future enhancement: dark / light mode toggle
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
  */

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }

  private forceLightMode(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.dataset['nbMode'] = 'light';
    try {
      localStorage.setItem('nb-color-mode', 'light');
    } catch {
      /* ignore */
    }
  }

  /*
  // Future enhancement: dark / light mode helpers
  private applyColorMode(mode: 'light' | 'dark'): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.dataset['nbMode'] = mode;
    try {
      localStorage.setItem('nb-color-mode', mode);
    } catch {
    }
  }

  private resolveInitialMode(): 'light' | 'dark' {
    const fromUser = this.auth.currentUser?.settings?.colorMode;
    if (fromUser === 'dark' || fromUser === 'light') {
      return fromUser;
    }
    try {
      const stored = localStorage.getItem('nb-color-mode');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  */
}
