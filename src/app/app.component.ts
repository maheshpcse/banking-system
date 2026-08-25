import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ShellBootService } from './core/services/shell-boot.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'NovaBank';
  /** Ambient ledger backdrop only on authenticated app pages */
  showAmbient = false;
  isMarketingSurface = true;
  isBillingSurface = false;
  hasStickyNav = false;
  bootstrapping = false;
  bootVariant: 'dashboard' | 'history' | 'transfer' | 'settings' | 'form' = 'dashboard';
  readonly year = new Date().getFullYear();

  private readonly subs = new Subscription();

  constructor(
    private router: Router,
    private auth: AuthService,
    private shellBoot: ShellBootService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.shellBoot.bootstrapping$.subscribe((boot) => {
        this.bootstrapping = boot;
        this.syncChrome(this.router.url);
      })
    );

    this.subs.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart && this.auth.isAuthenticated()) {
          this.bootVariant = this.variantForUrl(event.url);
          // Hide banking chrome immediately when entering Billing (avoids navbar flash).
          this.syncChrome(event.url);
        }

        if (event instanceof NavigationEnd) {
          this.syncChrome(event.urlAfterRedirects);
          this.scrollPageToTop();
        }

        if (event instanceof NavigationCancel || event instanceof NavigationError) {
          this.shellBoot.complete();
          this.syncChrome(this.router.url);
        }
      })
    );

    this.subs.add(
      this.auth.user$.subscribe((user) => {
        this.syncChrome(this.router.url);
        this.applyAppearance(user);
      })
    );

    this.syncChrome(this.router.url);
    this.applyAppearance(this.auth.currentUser);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (typeof document !== 'undefined') {
      document.body.classList.remove('nb-app-shell');
    }
  }

  private syncChrome(url: string): void {
    const path = url.split('?')[0];
    this.isMarketingSurface =
      path === '/' || path.startsWith('/auth') || path.startsWith('/error');
    this.isBillingSurface = path.startsWith('/billing');
    this.showAmbient =
      !this.isBillingSurface && (!this.isMarketingSurface || this.shellBoot.isBootstrapping);
    this.hasStickyNav =
      this.auth.isAuthenticated() && !this.isBillingSurface && !this.isMarketingSurface;
    this.bootVariant = this.variantForUrl(path);
    this.applyAppearance(this.auth.currentUser);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('nb-app-shell', this.hasStickyNav);
      document.body.classList.toggle('billing-mode', this.isBillingSurface);
    }
  }

  /** Scroll the page viewport — main when nav shell is active, else window. */
  private scrollPageToTop(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (this.hasStickyNav) {
      const main = document.querySelector('.app-shell--has-nav > main');
      if (main instanceof HTMLElement) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (this.isBillingSurface) {
      const billingMain = document.querySelector('.bs-main');
      if (billingMain instanceof HTMLElement) {
        billingMain.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Theme/font tokens apply only inside authenticated app pages.
   * Marketing/auth surfaces always use the default (Daylight) chrome.
   */
  private applyAppearance(user: { settings?: { theme?: string; fontScale?: string } } | null): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.dataset['nbMode'] = 'light';
    try {
      localStorage.setItem('nb-color-mode', 'light');
    } catch {
      /* ignore */
    }

    const inApp =
      !!user && this.auth.isAuthenticated() && !this.isMarketingSurface && !this.isBillingSurface;
    if (inApp) {
      root.dataset['nbTheme'] = user?.settings?.theme || 'daylight';
      root.dataset['nbFont'] = user?.settings?.fontScale || 'comfortable';
      root.dataset['nbApp'] = '1';
    } else {
      delete root.dataset['nbTheme'];
      delete root.dataset['nbFont'];
      delete root.dataset['nbApp'];
    }
  }

  private variantForUrl(url: string): 'dashboard' | 'history' | 'transfer' | 'settings' | 'form' {
    const path = url.split('?')[0];
    if (path.startsWith('/transactions')) {
      return 'history';
    }
    if (path.startsWith('/transfer')) {
      return 'transfer';
    }
    if (path.startsWith('/settings')) {
      return 'settings';
    }
    if (path.startsWith('/dashboard')) {
      return 'dashboard';
    }
    return 'form';
  }
}
