import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TransferRoutingModule } from './transfer-routing.module';
import { SendComponent } from './send/send.component';

@NgModule({
  declarations: [SendComponent],
  imports: [SharedModule, TransferRoutingModule]
})
export class TransferModule {}
