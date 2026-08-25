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

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    StaffSignupComponent,
    StaffStatusComponent,
    ContactAdminComponent
  ],
  imports: [SharedModule, AuthRoutingModule]
})
export class AuthModule {}
