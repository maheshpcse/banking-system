import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  menuOpen = false;

  constructor(public auth: AuthService, private alerts: AlertService) {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onNavClick(): void {
    this.closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async logout(): Promise<void> {
    this.closeMenu();
    const confirmed = await this.alerts.confirm({
      title: 'Sign out?',
      text: 'You will need to sign in again to access your account.',
      confirmText: 'Sign out',
      cancelText: 'Stay signed in',
      icon: 'question'
    });
    if (confirmed) {
      this.auth.logout();
      await this.alerts.success('Signed out', 'See you next time.');
    }
  }
}
