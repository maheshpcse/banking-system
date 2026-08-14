import { Component, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'NovaBank';
  /** Ambient ledger backdrop only on authenticated app pages */
  showAmbient = false;
  isMarketingSurface = true;
  hasStickyNav = false;

  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    this.viewportScroller.setOffset([0, 0]);
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.smoothScrollToTop();
        this.syncChrome(event.urlAfterRedirects);
      });

    this.auth.user$.subscribe(() => this.syncChrome(this.router.url));
    this.syncChrome(this.router.url);
  }

  private smoothScrollToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });

    const main = document.querySelector('main');
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      this.resetOverflowScroll(main);
    }
  }

  /** Smooth-reset nested overflow scrollports under a layout root. */
  private resetOverflowScroll(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const { overflowX, overflowY } = window.getComputedStyle(el);
      const y =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1;
      const x =
        (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
        el.scrollWidth > el.clientWidth + 1;
      if (y || x) {
        el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    });
  }

  private syncChrome(url: string): void {
    const path = url.split('?')[0];
    this.isMarketingSurface = path === '/' || path.startsWith('/auth');
    this.showAmbient = !this.isMarketingSurface;
    this.hasStickyNav = this.auth.isAuthenticated() && !this.isMarketingSurface;
  }
}
