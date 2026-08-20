import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-billing',
  templateUrl: './manager-billing.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerBillingComponent implements OnInit {
  pageLoading = true;

  ngOnInit(): void {
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }
}
