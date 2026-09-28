import { TonAssetCatalogComponent } from './ton/ton-asset-catalog.component';
import { PriceChartComponent } from './components/price-chart/price-chart.component';
import { PriceChartModule } from './components/price-chart/price-chart.module';
import { TonNetworkViewsModule } from './ton/ton-network-views.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BlockComponent } from './components/block/block.component';
import { MempoolBlockComponent } from './components/mempool-block/mempool-block.component';
import { TransactionComponent } from './components/transaction/transaction.component';
import { TonAssetsPageComponent } from './ton/ton-assets-page.component';
import { TonPageComponent } from './ton/ton-page.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MasterPageComponent } from '@components/master-page/master-page.component';
import { SharedModule } from '@app/shared/shared.module';

import { StartComponent } from '@components/start/start.component';
import { PushTransactionComponent } from '@components/push-transaction/push-transaction.component';
import { TestTransactionsComponent } from '@components/test-transactions/test-transactions.component';
import { BlocksList } from '@components/blocks-list/blocks-list.component';
import { RbfList } from '@components/rbf-list/rbf-list.component';
import { RecentTransactionsList } from '@components/recent-transactions-list/recent-transactions-list.component';
import { StaleList } from '@components/stale-list/stale-list.component';
import { StratumList } from '@components/stratum/stratum-list/stratum-list.component';
import { ServerHealthComponent } from '@components/server-health/server-health.component';
import { ServerStatusComponent } from '@components/server-health/server-status.component';
import { FaucetComponent } from '@components/faucet/faucet.component';
import { SimpleProofWidgetComponent } from '@components/simpleproof-widget/simpleproof-widget.component';
import { SimpleProofCuboWidgetComponent } from '@components/simpleproof-widget/simpleproof-cubo-widget.component';

const browserWindow = window || {};
// @ts-ignore
const browserWindowEnv = browserWindow.__env || {};

const routes: Routes = [{path:'', component:MasterPageComponent, children:[
  {path:'', component:StartComponent, children:[
    {path:'', pathMatch:'full',component:DashboardComponent,data:{tonPage:'dashboard'}},
    {path:'block/:id',component:BlockComponent,data:{tonPage:'block'}},
    {path:'mempool-block/0',component:MempoolBlockComponent},
    ...[{path:'message/:id',page:'message'},{path:'trace/:id',page:'trace'},{path:'tx/:id',page:'tx'}].map(r=>({path:r.path,component:TransactionComponent,data:{tonPage:r.page}})),
  ]},
  {path:'market',component:PriceChartComponent,data:{tonMarket:true}},
  ...['jettons','collections'].map(page=>({path:page,component:TonAssetCatalogComponent,data:{tonPage:page}})),
  {path:'txs',component:RecentTransactionsList,data:{tonPage:'transactions'}},
  ...[{path:'address/:id',page:'address'},{path:'nft/:id',page:'nft'},{path:'collection/:id',page:'collection'},{path:'jetton/:id',page:'jetton'}].map(r=>({path:r.path,component:TonAssetsPageComponent,data:{tonPage:r.page}})),
  {path:'blocks',component:BlocksList,data:{tonPage:'blocks'}},
  ...[{path:'validators',page:'validators'},
    {path:'dns/:id',page:'dns'},{path:'dns',page:'dns-auctions'},
    {path:'staking-pool/:id',page:'staking-pool'},{path:'extra-currency/:id',page:'extra-currency'},{path:'config',page:'config'}].map(r=>({path:r.path,component:TonPageComponent,data:{tonPage:r.page}})),
  {path:'about',loadChildren:()=>import('@components/about/about.module').then(m=>m.AboutModule)},
  {path:'docs',loadChildren:()=>import('@app/docs/docs.module').then(m=>m.DocsModule)},
  {path:'api',redirectTo:'docs',pathMatch:'full'},
  {path:'production',redirectTo:'validators',pathMatch:'full'},
  {path:'token/:id',redirectTo:'jetton/:id',pathMatch:'full'},
  {path:'terms-of-service',loadChildren:()=>import('@components/terms-of-service/terms-of-service.module').then(m=>m.TermsOfServiceModule)},
  {path:'privacy-policy',loadChildren:()=>import('@components/privacy-policy/privacy-policy.module').then(m=>m.PrivacyPolicyModule)},
  {path:'trademark-policy',loadChildren:()=>import('@components/trademark-policy/trademark-policy.module').then(m=>m.TrademarkModule)},
  {path:'**',component:TonPageComponent,data:{tonPage:'not-found'}}
]}];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class MasterPageRoutingModule { }

@NgModule({
  imports: [
    CommonModule,
    MasterPageRoutingModule,
    SharedModule,
    TonPageComponent,
    TonAssetCatalogComponent,
    PriceChartModule,
    TonNetworkViewsModule,
    TransactionComponent,
    MempoolBlockComponent,
    TonAssetsPageComponent,
  ],
  declarations: [
    MasterPageComponent,
  ],
  exports: [
    MasterPageComponent,
  ]
})
export class MasterPageModule { }
