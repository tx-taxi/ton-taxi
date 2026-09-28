import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@app/shared/shared.module';
import { NgxEchartsModule } from 'ngx-echarts';
import { DashboardComponent } from '@app/dashboard/dashboard.component';
import { BlockComponent } from '@app/components/block/block.component';
import { BlockTransactionsComponent } from '@app/components/block/block-transactions.component';
import { EthereumGasMarketGraphComponent } from '@app/components/ethereum-gas-market-graph/ethereum-gas-market-graph.component';
@NgModule({
  declarations: [DashboardComponent, BlockComponent, BlockTransactionsComponent, EthereumGasMarketGraphComponent],
  imports: [CommonModule, SharedModule, NgxEchartsModule.forRoot({echarts: () => import('@app/graphs/echarts').then(m => m.echarts)})],
  exports: [DashboardComponent, BlockComponent, EthereumGasMarketGraphComponent],
})
export class TonNetworkViewsModule {}
