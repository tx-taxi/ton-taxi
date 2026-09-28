import { NgModule } from '@angular/core';
import { TonUrlSerializer } from './ton/ton-url-serializer';
import { tonLocalePrefix } from './ton/chain-selection';
import { RouterModule, Routes, UrlSerializer } from '@angular/router';
const loadExplorer = () => import('./master-page.module').then(m => m.MasterPageModule);
const routes: Routes = [
  {matcher: segments => segments.length && tonLocalePrefix('/' + segments[0].path) ? {consumed: [segments[0]]} : null, loadChildren: loadExplorer},
  {path: '', loadChildren: loadExplorer},
];
@NgModule({providers:[{provide:UrlSerializer,useClass:TonUrlSerializer}],imports: [RouterModule.forRoot(routes, {initialNavigation:'enabledBlocking', scrollPositionRestoration:'top', anchorScrolling:'enabled'})],exports:[RouterModule]})
export class AppRoutingModule {}
