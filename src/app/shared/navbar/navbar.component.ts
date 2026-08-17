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

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
