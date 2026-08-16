import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './navbar/navbar.component';
import { AnimatedCardComponent } from './animated-card/animated-card.component';
import { CurrencyFormatPipe } from './currency-format.pipe';
import { ShimmerComponent } from './shimmer/shimmer.component';
import { BankCardComponent } from './bank-card/bank-card.component';
import { NbIconComponent } from './nb-icon/nb-icon.component';
import { AccountNumberComponent } from './account-number/account-number.component';

@NgModule({
  declarations: [
    NavbarComponent,
    AnimatedCardComponent,
    CurrencyFormatPipe,
    ShimmerComponent,
    BankCardComponent,
    NbIconComponent,
    AccountNumberComponent
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NavbarComponent,
    AnimatedCardComponent,
    CurrencyFormatPipe,
    ShimmerComponent,
    BankCardComponent,
    NbIconComponent,
    AccountNumberComponent
  ]
})
export class SharedModule {}
