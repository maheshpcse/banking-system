import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { OverviewComponent } from './overview/overview.component';

@NgModule({
  declarations: [OverviewComponent],
  imports: [SharedModule, DashboardRoutingModule]
})
export class DashboardModule {}
