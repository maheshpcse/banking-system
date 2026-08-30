import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AccountSettingsComponent } from './account-settings.component';

/** Component-only module — safe to import into Console without registering routes. */
@NgModule({
  declarations: [AccountSettingsComponent],
  imports: [SharedModule],
  exports: [AccountSettingsComponent]
})
export class AccountSettingsModule {}

const routes: Routes = [{ path: '', component: AccountSettingsComponent }];

@NgModule({
  imports: [AccountSettingsModule, RouterModule.forChild(routes)]
})
export class SettingsModule {}
