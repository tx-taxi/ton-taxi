import { Component, OnInit, HostBinding, Inject, LOCALE_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Env, StateService } from '@app/services/state.service';
import { WebsocketService } from '@app/services/websocket.service';
import { SeoService } from '@app/services/seo.service';
import { OpenGraphService } from '@app/services/opengraph.service';

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss'],
  standalone: false,
})
export class DocsComponent implements OnInit {

  activeTab = 0;
  env: Env;
  showWebSocketTab = true;
  showFaqTab = true;

  @HostBinding('attr.dir') dir = 'ltr';

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private route: ActivatedRoute,
    private stateService: StateService,
    private websocket: WebsocketService,
    private seoService: SeoService,
    private ogService: OpenGraphService,
  ) { }

  get isSpanish(): boolean { return this.locale.toLowerCase().startsWith('es'); }

  ngOnInit(): void {
    this.websocket.want(['blocks']);
    this.env = this.stateService.env;
    this.showFaqTab = true;

    document.querySelector<HTMLElement>( 'html' ).style.scrollBehavior = 'smooth';
  }

  ngDoCheck(): void {

    const url = this.route.snapshot.url;

    if (url[0]?.path === 'faq' ) {
      this.activeTab = 0;
      this.seoService.setTitle(this.isSpanish ? 'Guía de TON' : 'TON Guide');
      this.seoService.setDescription(this.isSpanish ? 'Explora transacciones, mensajes, carteras, jettons, NFT y validadores de TON.' : 'Explore TON transactions, messages, wallets, jettons, NFTs and validators.');
      this.ogService.setManualOgImage('faq.jpg');
    } else if( url[1]?.path === 'rest' ) {
      this.activeTab = 1;
      this.seoService.setTitle($localize`:@@meta.title.docs.rest:REST API`);
      if (this.stateService.network === 'liquid' || this.stateService.network === 'liquidtestnet' ) {
        this.seoService.setDescription($localize`:@@meta.description.docs.rest-liquid:Documentation for the liquid.network REST API service: get info on addresses, transactions, assets, blocks, and more.`);
      } else {
        this.seoService.setDescription(this.isSpanish ? 'Referencia de la API REST de TON para bloques, transacciones, mensajes, cuentas, jettons y NFT.' : 'TON REST API reference for blocks, transactions, messages, accounts, jettons and NFTs.');
      }
    } else if( url[1]?.path === 'websocket' ) {
      this.activeTab = 2;
      this.seoService.setTitle($localize`:@@meta.title.docs.websocket:WebSocket API`);
      if( this.stateService.network === 'liquid' || this.stateService.network === 'liquidtestnet' ) {
        this.seoService.setDescription($localize`:@@meta.description.docs.websocket-liquid:Documentation for the liquid.network WebSocket API service: get real-time info on blocks, mempools, transactions, addresses, and more.`);
      } else {
        this.seoService.setDescription(this.isSpanish ? 'Referencia de la API WebSocket de TON para bloques en vivo de la basechain y la masterchain.' : 'TON WebSocket API reference for live basechain and masterchain blocks.');
      }
    } else {
      this.activeTab = 0;
    }
  }

  ngOnDestroy(): void {
    document.querySelector<HTMLElement>( 'html' ).style.scrollBehavior = 'auto';
  }
}
