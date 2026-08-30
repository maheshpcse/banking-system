import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ShellBootService } from '../../core/services/shell-boot.service';
import { SaIconName } from './icons/sa-icon.component';

interface SaDockItem {
  path: string;
  label: string;
  icon: SaIconName;
  exact?: boolean;
}

/**
 * Apex Console shell — obsidian charcoal / copper theme for Super Admin.
 * Reuses the mint Banking admin page components (unchanged TS) and applies
 * the Console theme through `sa-theme.scss` plus a bottom command dock.
 */
@Component({
  selector: 'app-super-admin-shell',
  templateUrl: './super-admin-shell.component.html',
  styleUrls: ['./super-admin-shell.component.scss', './sa-theme.scss']
})
export class SuperAdminShellComponent implements OnInit, OnDestroy {
  readonly dockItems: SaDockItem[] = [
    { path: '/console', label: 'Operations', icon: 'ops', exact: true },
    { path: '/console/customers', label: 'Directory', icon: 'directory' },
    { path: '/console/requests', label: 'Requests', icon: 'requests' },
    { path: '/console/staff', label: 'Staff', icon: 'staff' },
    { path: '/console/notifications', label: 'Alerts', icon: 'alerts' },
    { path: '/console/data-lab', label: 'Data lab', icon: 'lab' },
    { path: '/console/account', label: 'Account', icon: 'account' }
  ];

  private routerSub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly shellBoot: ShellBootService
  ) {}

  get operatorName(): string {
    return this.auth.currentUser?.fullName || this.auth.currentUser?.username || 'Super Admin';
  }

  ngOnInit(): void {
    document.body.classList.add('sa-mode');
    this.shellBoot.complete();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.scrollStageToTop();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    document.body.classList.remove('sa-mode');
  }

  signOut(): void {
    this.auth.logout({ home: '/auth/console/login' });
  }

  private scrollStageToTop(): void {
    const stage = document.querySelector('.sa-stage');
    if (stage instanceof HTMLElement) {
      stage.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
