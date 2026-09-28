import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@app/shared/shared.module';
import { TransactionDetailsComponent } from './transaction-details/transaction-details.component';
import { TransactionExtrasModule } from './transaction-extras.module';

/** The existing detail renderer without transaction or graph route registration. */
@NgModule({
  declarations: [TransactionDetailsComponent],
  imports: [CommonModule, SharedModule, TransactionExtrasModule],
  exports: [TransactionDetailsComponent],
})
export class TransactionDetailsModule {}
