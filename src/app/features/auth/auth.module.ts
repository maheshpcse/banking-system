import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AuthRoutingModule } from './auth-routing.module';
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
import { SaIconModule } from '../super-admin/icons/sa-icon.module';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    StaffSignupComponent,
    StaffStatusComponent,
    ContactAdminComponent,
    ConsoleLoginComponent,
    ConsoleForgotPasswordComponent,
    ConsoleResetPasswordComponent
  ],
  imports: [SharedModule, AuthRoutingModule, SaIconModule]
})
export class AuthModule {}
