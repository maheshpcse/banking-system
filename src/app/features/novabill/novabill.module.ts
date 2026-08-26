import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { NovabillHomeComponent } from './novabill-home.component';

const routes: Routes = [{ path: '', component: NovabillHomeComponent }];

@NgModule({
  declarations: [NovabillHomeComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class NovabillModule {}
