import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SHIMMER_MS, withShimmerDelay } from '../../core/utils/shimmer';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  signupComplete = false;
  pageLoading = true;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      this.signupComplete = params.get('registered') === '1';
    });

    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  dismissSignupNotice(): void {
    this.signupComplete = false;
    void this.router.navigate(['/'], { queryParams: {} });
  }
}
