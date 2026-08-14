import { Component, OnInit } from '@angular/core';
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

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.syncChrome(event.urlAfterRedirects);
      });

    this.auth.user$.subscribe(() => this.syncChrome(this.router.url));
    this.syncChrome(this.router.url);
  }

  private syncChrome(url: string): void {
    const path = url.split('?')[0];
    this.isMarketingSurface = path === '/' || path.startsWith('/auth');
    this.showAmbient = !this.isMarketingSurface;
    this.hasStickyNav = this.auth.isAuthenticated() && !this.isMarketingSurface;
  }
}
