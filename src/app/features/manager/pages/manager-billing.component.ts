import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-billing',
  templateUrl: './manager-billing.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerBillingComponent implements OnInit {
  pageLoading = true;

  ngOnInit(): void {
    withShimmerDelay(of(true), 260).subscribe(() => {
      this.pageLoading = false;
    });
  }
}
