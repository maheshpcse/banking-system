import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-reports',
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerReportsComponent implements OnInit {
  pageLoading = true;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly';
  scheduled = false;

  ngOnInit(): void {
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  schedule(): void {
    this.scheduled = true;
  }
}
