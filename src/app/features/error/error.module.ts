import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HttpErrorPageComponent } from './http-error-page.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '404' },
  { path: ':code', component: HttpErrorPageComponent }
];

@NgModule({
  declarations: [HttpErrorPageComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ErrorModule {}
