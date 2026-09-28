import { NgModule } from '@angular/core';
import { TonUrlSerializer } from './ton/ton-url-serializer';
import { RouterModule, Routes, UrlSerializer } from '@angular/router';
const routes: Routes = [{path: '', loadChildren: () => import('./master-page.module').then(m => m.MasterPageModule)}];
@NgModule({providers:[{provide:UrlSerializer,useClass:TonUrlSerializer}],imports: [RouterModule.forRoot(routes, {initialNavigation:'enabledBlocking', scrollPositionRestoration:'top', anchorScrolling:'enabled'})],exports:[RouterModule]})
export class AppRoutingModule {}
