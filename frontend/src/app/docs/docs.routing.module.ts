import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocsComponent } from '@app/docs/docs/docs.component';

const browserWindow = window || {};
// @ts-expect-error Runtime configuration is injected before Angular bootstraps.
const browserWindowEnv = browserWindow.__env || {};

let routes: Routes = [];

if (browserWindowEnv.BASE_MODULE && browserWindowEnv.BASE_MODULE === 'liquid') {
  routes = [
    {
      path: '',
      redirectTo: 'api/rest',
      pathMatch: 'full'
    },
    {
      path: 'api/rest',
      component: DocsComponent
    },
    {
      path: 'api/websocket',
      component: DocsComponent
    },
    {
      path: 'api',
      redirectTo: 'api/rest',
      pathMatch: 'full'
    },
    {
      path: '**',
      redirectTo: 'api/rest',
      pathMatch: 'full'
    }
  ];
} else {
  routes = [
    {
      path: '',
      pathMatch: 'full',
      redirectTo: 'faq'
    },
    {
      path: 'faq',
      data: { networks: ['ton'] },
      component: DocsComponent
    },
    {
      path: 'api',
      redirectTo: 'api/rest'
    },
    {
      path: 'api/electrs',
      redirectTo: 'faq',
      pathMatch: 'full'
    },
    {
      path: 'api/rest',
      component: DocsComponent
    },
    {
      path: 'api/websocket',
      component: DocsComponent
    },
    {
      path: '**',
      redirectTo: 'faq'
    }
  ];
}

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class DocsRoutingModule { }
