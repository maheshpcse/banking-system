import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './navbar/navbar.component';
import { AnimatedCardComponent } from './animated-card/animated-card.component';
import { CurrencyFormatPipe } from './currency-format.pipe';
import { ShimmerComponent } from './shimmer/shimmer.component';

@NgModule({
  declarations: [NavbarComponent, AnimatedCardComponent, CurrencyFormatPipe, ShimmerComponent],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    NavbarComponent,
    AnimatedCardComponent,
    CurrencyFormatPipe,
    ShimmerComponent
  ]
})
export class SharedModule {}
