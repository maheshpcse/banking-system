import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { StaffSignupComponent } from './staff-signup/staff-signup.component';
import { StaffStatusComponent } from './staff-status/staff-status.component';
import { ContactAdminComponent } from './contact-admin/contact-admin.component';
import { ConsoleLoginComponent } from './console-login/console-login.component';
import { ConsoleForgotPasswordComponent } from './console-forgot-password/console-forgot-password.component';
import { ConsoleResetPasswordComponent } from './console-reset-password/console-reset-password.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'staff-signup', component: StaffSignupComponent },
  { path: 'staff-status', component: StaffStatusComponent },
  { path: 'contact-admin', component: ContactAdminComponent },
  { path: 'console/login', component: ConsoleLoginComponent },
  { path: 'console/forgot-password', component: ConsoleForgotPasswordComponent },
  { path: 'console/reset-password', component: ConsoleResetPasswordComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule {}
