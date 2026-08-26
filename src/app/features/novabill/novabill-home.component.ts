import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-novabill-home',
  templateUrl: './novabill-home.component.html',
  styleUrls: ['./novabill-home.component.scss']
})
export class NovabillHomeComponent implements OnInit {
  readonly year = new Date().getFullYear();

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    const user = this.auth.currentUser;
    if (user?.isSuperAdmin) {
      void this.router.navigateByUrl('/manager/billing');
      return;
    }
    if (user?.role === 'manager' || user?.role === 'admin') {
      void this.router.navigateByUrl('/billing');
      return;
    }
    void this.router.navigateByUrl('/dashboard');
  }
}
