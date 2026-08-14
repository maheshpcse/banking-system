import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.syncChrome(event.urlAfterRedirects);
      });

    this.syncChrome(this.router.url);
  }

  private syncChrome(url: string): void {
    const path = url.split('?')[0];
    this.isMarketingSurface =
      path === '/' || path.startsWith('/auth');
    this.showAmbient = !this.isMarketingSurface;
  }
}
