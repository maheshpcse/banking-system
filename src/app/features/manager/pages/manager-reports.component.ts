import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-reports',
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerReportsComponent implements OnInit {
  pageLoading = true;
  filterLoading = false;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly';
  scheduled = false;

  readonly cadenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  ngOnInit(): void {
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  onCadenceChange(value: string): void {
    const next = (value || 'weekly') as typeof this.cadence;
    if (this.cadence === next) {
      return;
    }
    this.cadence = next;
    this.filterLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.filterLoading = false;
    });
  }

  schedule(): void {
    this.scheduled = true;
  }
}
