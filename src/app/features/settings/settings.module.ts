import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AccountSettingsComponent } from './account-settings.component';

const routes: Routes = [{ path: '', component: AccountSettingsComponent }];

@NgModule({
  declarations: [AccountSettingsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class SettingsModule {}
