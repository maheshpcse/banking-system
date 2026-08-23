import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/** Unknown /billing/* paths land on the themed HTTP error page. */
@Component({
  selector: 'app-billing-not-found-redirect',
  template: ''
})
export class BillingNotFoundRedirectComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    void this.router.navigate(['/error/404'], {
      queryParams: { tone: 'billing' },
      replaceUrl: true
    });
  }
}
