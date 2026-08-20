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
  hasStickyNav = false;
  bootstrapping = false;
  bootVariant: 'dashboard' | 'history' | 'transfer' | 'settings' | 'form' = 'dashboard';

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
          if (this.shellBoot.isBootstrapping) {
            this.syncChrome(event.url);
          }
        }

        if (event instanceof NavigationEnd) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.syncChrome(event.urlAfterRedirects);
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
        if (typeof document !== 'undefined') {
          if (user) {
            document.documentElement.dataset['nbTheme'] = user.settings?.theme || 'daylight';
            document.documentElement.dataset['nbFont'] = user.settings?.fontScale || 'comfortable';
          }
          // Dark/light mode parked as a future enhancement — keep light chrome only.
          document.documentElement.dataset['nbMode'] = 'light';
          /*
          const mode = user?.settings?.colorMode === 'dark' ? 'dark' : 'light';
          document.documentElement.dataset['nbMode'] = mode;
          try {
            localStorage.setItem('nb-color-mode', mode);
          } catch {}
          */
          try {
            localStorage.setItem('nb-color-mode', 'light');
          } catch {
            /* ignore */
          }
        }
      })
    );

    this.syncChrome(this.router.url);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private syncChrome(url: string): void {
    const path = url.split('?')[0];
    this.isMarketingSurface = path === '/' || path.startsWith('/auth');
    this.showAmbient = !this.isMarketingSurface || this.shellBoot.isBootstrapping;
    this.hasStickyNav =
      this.auth.isAuthenticated() &&
      (!this.isMarketingSurface || this.shellBoot.isBootstrapping);
    this.bootVariant = this.variantForUrl(path);
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
