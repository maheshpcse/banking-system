import { Component } from '@angular/core';

@Component({
  selector: 'app-manager-reports',
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerReportsComponent {
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly';
  scheduled = false;

  schedule(): void {
    this.scheduled = true;
  }
}
