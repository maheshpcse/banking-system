import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TransactionsRoutingModule } from './transactions-routing.module';
import { HistoryComponent } from './history/history.component';

@NgModule({
  declarations: [HistoryComponent],
  imports: [SharedModule, TransactionsRoutingModule]
})
export class TransactionsModule {}
