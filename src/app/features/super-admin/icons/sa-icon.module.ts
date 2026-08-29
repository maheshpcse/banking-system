import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SaIconComponent } from './sa-icon.component';

/**
 * Standalone-ish wrapper so `app-sa-icon` can be declared once and reused
 * from both `SuperAdminModule` (console pages/dock) and `AuthModule`
 * (console auth pages), without Angular's "declared in 2 modules" error.
 */
@NgModule({
  declarations: [SaIconComponent],
  imports: [CommonModule],
  exports: [SaIconComponent]
})
export class SaIconModule {}
