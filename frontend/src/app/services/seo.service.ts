import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { StateService } from '@app/services/state.service';
import { tonBlockIdentityFromUrl, tonBlockUrl } from '@app/ton/chain-selection';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  network = '';
  baseTitle = 'ton.tx.taxi';
  baseDescription = 'Explore TON blocks, transactions, accounts, NFTs, jettons and messages.';
  baseDomain = 'ton.tx.taxi';

  canonicalLink: HTMLLinkElement = document.getElementById('canonical') as HTMLLinkElement;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private stateService: StateService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    // save original meta tags
    // Entity metadata must not become the defaults for subsequent root navigation.

    try {
      const canonicalUrl = new URL(this.canonicalLink?.href || '');
      if (['ton.tx.taxi', 'masterchain.ton.tx.taxi'].includes(canonicalUrl.host)) this.baseDomain = canonicalUrl.host;
    } catch (e) {
      // leave as default
    }
    if (typeof window !== 'undefined' && ['ton.tx.taxi', 'masterchain.ton.tx.taxi'].includes(window.location.hostname)) {
      this.baseDomain = this.baseTitle = window.location.hostname;
      if (this.baseDomain === 'masterchain.ton.tx.taxi') this.baseDescription = 'Explore TON masterchain blocks, transactions and network activity.';
    }

    this.stateService.networkChanged$.subscribe((network) => this.network = network);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {route = route.firstChild;}
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      switchMap(route => route.data),
    ).subscribe((data) => {
      this.clearSoft404();
      this.updateCanonical(this.router.url);
      const page = this.nativePage();
      if (page && page.path !== '/') { this.setTitle(page.title); this.setDescription(page.description); }
    });
  }

  private nativeSeoData(): { pages: {path: string; title: string; description: string}[]; aliases: Record<string, string> } {
    try { return JSON.parse(document.getElementById('native-seo-data')?.textContent || '{}'); }
    catch { return { pages: [], aliases: {} }; }
  }

  private nativePage(path = this.router.url): {path: string; title: string; description: string} | undefined {
    const data = this.nativeSeoData();
    const pathname = new URL(path, 'https://' + this.baseDomain).pathname.replace(/\/$/, '') || '/';
    const canonicalPath = data.aliases?.[pathname] || pathname;
    const page = data.pages?.find(page => page.path === canonicalPath);
    return page?.path === '/' && this.baseDomain === 'masterchain.ton.tx.taxi' ? {...page, description: this.baseDescription} : page;
  }

  private updateDiscoveryLinks(canonical: string): void {
    const page = this.nativePage();
    const head = document.head;
    for (const [rel, type, href] of [
      ['alternate', 'text/markdown', canonical + (page?.path === '/' ? 'index' : '') + '.md'],
      ['describedby', 'text/plain', 'https://' + this.baseDomain + '/llms.txt'],
    ]) {
      const existing = head.querySelector<HTMLLinkElement>('link[rel="' + rel + '"][type="' + type + '"]');
      if (rel === 'alternate' && !page) { existing?.remove(); continue; }
      const link = existing || document.createElement('link');
      link.rel = rel; link.type = type; link.href = href;
      if (!existing) head.appendChild(link);
    }
  }

  setTitle(newTitle: string): void {
    const native = this.nativePage();
    if (native && native.path !== '/') newTitle = native.title;
    const fullTitle = newTitle + ' - ' + this.getTitle();
    this.titleService.setTitle(fullTitle);
    this.metaService.updateTag({ property: 'og:title', content: fullTitle});
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle});
    this.metaService.updateTag({ property: 'og:meta:ready', content: 'ready'});
  }

  resetTitle(): void {
    this.titleService.setTitle(this.getTitle());
    this.metaService.updateTag({ property: 'og:title', content: this.getTitle()});
    this.metaService.updateTag({ name: 'twitter:title', content: this.getTitle()});
    this.metaService.updateTag({ property: 'og:meta:ready', content: 'ready'});
  }

  setEnterpriseTitle(title: string, override: boolean = false) {
    if (override) {
      this.baseTitle = title;
    } else {
      this.baseTitle = title + ' - ' + this.baseTitle;
    }
    this.resetTitle();
  }

  setDescription(newDescription: string): void {
    newDescription = this.nativePage()?.description || newDescription;
    this.metaService.updateTag({ name: 'description', content: newDescription});
    this.metaService.updateTag({ name: 'twitter:description', content: newDescription});
    this.metaService.updateTag({ property: 'og:description', content: newDescription});
  }

  resetDescription(): void {
    this.metaService.updateTag({ name: 'description', content: this.getDescription()});
    this.metaService.updateTag({ name: 'twitter:description', content: this.getDescription()});
    this.metaService.updateTag({ property: 'og:description', content: this.getDescription()});
  }

  updateCanonical(path) {
    const requestedUrl = new URL(path, 'https://' + this.baseDomain);
    const block = tonBlockIdentityFromUrl(requestedUrl.href);
    const native = this.nativePage(path);
    const canonicalUrl = block ? tonBlockUrl(block, undefined, requestedUrl.pathname) : requestedUrl.origin + (native?.path || requestedUrl.pathname);
    this.canonicalLink?.setAttribute('href', canonicalUrl);
    this.updateDiscoveryLinks(canonicalUrl);
    const pageSchema = document.getElementById('native-page-schema');
    const schemaPage = this.nativePage(path);
    if (pageSchema) {
      if (schemaPage) pageSchema.textContent = JSON.stringify({'@context': 'https://schema.org', '@type': schemaPage.path.startsWith('/docs/') ? 'TechArticle' : 'WebPage', name: schemaPage.title, description: schemaPage.description, url: canonicalUrl});
      else pageSchema.remove();
    }
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
  }

  getTitle(): string {
    if (this.network === 'testnet')
      {return this.baseTitle + ' - Bitcoin Testnet3';}
    if (this.network === 'testnet4')
      {return this.baseTitle + ' - Bitcoin Testnet4';}
    if (this.network === 'signet')
      {return this.baseTitle + ' - Bitcoin Signet';}
    if (this.network === 'liquid')
      {return this.baseTitle + ' - Liquid Network';}
    if (this.network === 'liquidtestnet')
      {return this.baseTitle + ' - Liquid Testnet';}
    return this.baseTitle + ' - TON Explorer';
  }

  getDescription(): string {
    return this.baseDescription;
  }

  ucfirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  clearSoft404() {
    window['soft404'] = false;
  }

  logSoft404() {
    window['soft404'] = true;
  }
}
