import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { SharedModule } from '@app/shared/shared.module';
import { PriceChartComponent } from './price-chart.component';

/** Exposes the existing price renderer without importing graph routes. */
@NgModule({
  declarations: [PriceChartComponent],
  imports: [CommonModule, SharedModule, NgxEchartsModule.forRoot({echarts: () => import('@app/graphs/echarts').then(module => module.echarts)})],
  exports: [PriceChartComponent],
})
export class PriceChartModule {}
