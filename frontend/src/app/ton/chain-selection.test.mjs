import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { BehaviorSubject, Subject } from 'rxjs';
import * as selection from './chain-selection.ts';

const require = createRequire(import.meta.url);
function loadService(relativePath, additions = {}, expose = []) {
  const filename = new URL(relativePath, import.meta.url);
  const source = ts.transpileModule(readFileSync(filename, 'utf8').replaceAll('import.meta.url', JSON.stringify(filename.href)) + expose.map(name => `\nexport { ${name} };`).join(''), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, useDefineForClassFields: false },
  }).outputText;
  const module = { exports: {} };
  const imports = {
    '@angular/core': { Injectable: () => target => target, makeStateKey: key => key },
    '@app/ton/chain-selection': selection,
    './chain-selection': selection,
    '@app/shared/ton-pending-state': { readTonPending: () => null },
    ...additions,
  };
  new Function('require', 'module', 'exports', source)(name => imports[name] || (['@app/ton/block-navigation', './block-navigation'].includes(name) ? loadService('./block-navigation.ts') : name.startsWith('rxjs') ? require(name) : {}), module, module.exports);
  return module.exports;
}

const block = (workchain, shard, height) => ({
  id: `(${workchain},${shard},${height})`, height, timestamp: 1790570275,
  ton: { workchain_id: workchain, shard, seqno: height },
});
const rootShard = '8000000000000000';

function withLocation(href, run) {
  const previous = globalThis.window;
  globalThis.window = { location: new URL(href), addEventListener() {}, removeEventListener() {} };
  try { return run(); } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

function chainService() {
  class NavigationEnd { constructor(urlAfterRedirects) { this.urlAfterRedirects = urlAfterRedirects; } }
  const { TonChainSelectionService } = loadService('./ton-chain-selection.service.ts', {
    '@angular/router': { NavigationEnd }, './chain-selection': selection,
  });
  const events = new Subject();
  const router = {
    url: '/', events,
    parseUrl(value) {
      const url = new URL(value, 'https://ton.tx.taxi');
      return { queryParams: Object.fromEntries(url.searchParams), root: { children: { primary: { segments: url.pathname.split('/').filter(Boolean).map(path => ({ path: decodeURIComponent(path) })) } } } };
    },
  };
  return { service: new TonChainSelectionService(router), navigate: url => events.next(new NavigationEnd(url)) };
}

test('hostname initializes the feed and restores its scope after visiting explicit block and query routes', () => {
  withLocation('https://masterchain.ton.tx.taxi/', () => {
    const { service, navigate } = chainService();
    assert.deepEqual(service.current, { workchain: -1, shard: rootShard });
    assert.equal(service.query, 'workchain=-1&shard=8000000000000000');
    navigate('/block/(0,4000000000000000,100039007)');
    assert.deepEqual(service.current, { workchain: 0, shard: '4000000000000000' });
    navigate('/block/95544320');
    assert.equal(service.current.workchain, -1);
    navigate('/blocks?workchain=0&shard=c000000000000000');
    assert.deepEqual(service.current, { workchain: 0, shard: 'c000000000000000' });
    navigate('/blocks');
    assert.deepEqual(service.current, { workchain: -1, shard: rootShard });
    navigate('/?shard=c000000000000000');
    assert.deepEqual(service.current, { workchain: -1, shard: rootShard });
  });
  withLocation('https://ton.tx.taxi/', () => {
    const { service, navigate } = chainService();
    assert.deepEqual(service.current, { workchain: 0 });
    navigate('/?workchain=-1');
    assert.deepEqual(service.current, { workchain: -1, shard: rootShard });
    navigate('/');
    assert.deepEqual(service.current, { workchain: 0 });
  });
});

test('native dashboard initialization cannot reset the masterchain hostname to basechain', () => {
  withLocation('https://masterchain.ton.tx.taxi/', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { addEventListener() {}, removeEventListener() {} };
    try {
      const { TonNetworkData } = loadService('./ton-network-data.service.ts', {
        './ton-page-data': { TonPageData: class {} }, './chain-selection': selection,
      });
      const page = Object.create(TonNetworkData.prototype);
      const { service } = chainService();
      const query = new BehaviorSubject(new URLSearchParams());
      page.selection = service;
      page.route = { paramMap: new BehaviorSubject(new Map()), queryParamMap: query, snapshot: { data: { tonPage: 'dashboard' } } };
      const loadedSelections = [];
      page.loadNative = () => loadedSelections.push({ ...service.current });
      page.ngOnInit();
      query.next(new URLSearchParams('workchain=0&shard=4000000000000000'));
      query.next(new URLSearchParams());
      assert.deepEqual(loadedSelections, [{ workchain: -1, shard: rootShard }, { workchain: 0, shard: '4000000000000000' }, { workchain: -1, shard: rootShard }]);
      page.nativeRouteSub.unsubscribe();
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
});

test('short entity routes request a stable full identity and reload when only the shard query changes', () => {
  withLocation('https://ton.tx.taxi/block/100160666', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { addEventListener() {}, removeEventListener() {} };
    try {
      const { TonNetworkData } = loadService('./ton-network-data.service.ts', { './ton-page-data': { TonPageData: class {} } });
      const page = Object.create(TonNetworkData.prototype);
      const { service } = chainService();
      service.set(0, 'c000000000000000'); // The live stream must not determine a short entity's identity.
      const params = new BehaviorSubject(new Map([['id', '100160666']]));
      const query = new BehaviorSubject(new URLSearchParams());
      page.selection = service;
      page.route = { paramMap: params, queryParamMap: query, snapshot: { data: { tonPage: 'block' } } };
      page.requests = { add() {} };
      const requested = [];
      page.getNative = url => { requested.push(url); return new Subject(); };
      page.loadNative = () => page.loadBlock();
      page.ngOnInit();
      assert.equal(requested.at(-1), '/api/ton/block/(0%2C8000000000000000%2C100160666)');
      query.next(new URLSearchParams('shard=4000000000000000'));
      assert.equal(requested.at(-1), '/api/ton/block/(0%2C4000000000000000%2C100160666)');
      query.next(new URLSearchParams('workchain=-1'));
      assert.equal(requested.at(-1), '/api/ton/block/(-1%2C8000000000000000%2C100160666)');
      params.next(new Map([['id', '(0,c000000000000000,100160666)']]));
      assert.equal(requested.at(-1), '/api/ton/block/(0%2Cc000000000000000%2C100160666)');
      assert.deepEqual(service.current, { workchain: 0, shard: 'c000000000000000' });
      page.nativeRouteSub.unsubscribe();
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
});

test('native block links expose clean hrefs, retain shard identity, and switch workchain hosts', () => {
  const decorator = () => target => target, propertyDecorator = () => () => undefined;
  const { TonBlockLinkDirective } = loadService('./ton-block-link.directive.ts', {
    '@angular/core': { Directive: decorator, Input: propertyDecorator, HostBinding: propertyDecorator, HostListener: propertyDecorator },
  });
  withLocation('https://ton.tx.taxi/', () => {
    const local = [], external = [];
    window.location.assign = href => external.push(href);
    const link = new TonBlockLinkDirective({ navigateByUrl: (path, extras) => local.push({ path, extras }) }, { nativeElement: { target: '', hasAttribute: () => false } });
    link.tonBlockLink = block(0, rootShard, 100160666);
    assert.equal(link.href, 'https://ton.tx.taxi/block/100160666');
    let prevented = 0;
    const click = { button: 0, preventDefault() { prevented++; } };
    link.onClick({ ...click, ctrlKey: true });
    assert.equal(prevented, 0);
    assert.deepEqual(local, []);
    link.tonBlockLink = '(0,4000000000000000,100160666)';
    link.onClick(click);
    assert.equal(local[0].path, '/block/100160666?shard=4000000000000000');
    link.tonBlockLink = '(-1,8000000000000000,100160666)';
    link.onClick(click);
    assert.deepEqual(external, ['https://masterchain.ton.tx.taxi/block/100160666']);
    assert.equal(prevented, 2);
    window.location = new URL('https://ton.tx.taxi/pt-BR/tx/abc');
    window.location.assign = href => external.push(href);
    link.onClick(click);
    assert.equal(link.href, 'https://masterchain.ton.tx.taxi/pt-BR/block/100160666');
    assert.equal(external.at(-1), 'https://masterchain.ton.tx.taxi/pt-BR/block/100160666');
    link.tonBlockLink = '(0,8000000000000000,100160666)';
    link.onClick(click);
    assert.equal(local.at(-1).path, '/pt-BR/block/100160666');
  });
  const { nativeDestination } = loadService('../../../../hub/facade.ts');
  assert.equal(nativeDestination('https://ton.tx.taxi', '/block/(0,8000000000000000,100160666)'), 'https://ton.tx.taxi/block/100160666');
  assert.equal(nativeDestination('https://ton.tx.taxi', '/block/(0,4000000000000000,100160666)'), 'https://ton.tx.taxi/block/100160666?shard=4000000000000000');
  assert.equal(nativeDestination('https://ton.tx.taxi', '/block/(-1,8000000000000000,100160666)'), 'https://masterchain.ton.tx.taxi/block/100160666');
});

test('the hub module routes actual native directive clicks and router extras to clean explorer URLs', () => {
  const decorator = options => target => { target.options = options; return target; }, propertyDecorator = () => () => undefined;
  class Router {}
  const facade = loadService('../../../../hub/facade.ts');
  const { TonBlockLinkDirective } = loadService('./ton-block-link.directive.ts', {
    '@angular/core': { Directive: decorator, Input: propertyDecorator, HostBinding: propertyDecorator, HostListener: propertyDecorator },
  });
  const { StripModule, NativeLink } = loadService('../../../../hub/entry.ts', {
    '@angular/core': { Component: decorator, NgModule: decorator, Directive: decorator, Input: propertyDecorator, HostBinding: propertyDecorator, Inject: propertyDecorator, InjectionToken: class {} },
    '@angular/router': { Router }, './facade': facade,
    '@app/ton/ton-block-link.directive': { TonBlockLinkDirective },
  }, ['StripModule', 'NativeLink']);
  assert.ok(StripModule.options.imports.includes(TonBlockLinkDirective));
  withLocation('https://tx.taxi/', () => {
    const previousLocation = globalThis.location;
    const destinations = [];
    globalThis.location = { assign: href => destinations.push(href) };
    try {
      const router = StripModule.options.providers.find(provider => provider?.provide === Router).useFactory('https://ton.tx.taxi');
      const link = new TonBlockLinkDirective(router, { nativeElement: { target: '', hasAttribute: () => false } });
      link.tonBlockLink = '(0,4000000000000000,100160666)';
      link.onClick({ button: 0, preventDefault() {} });
      assert.equal(link.href, 'https://ton.tx.taxi/block/100160666?shard=4000000000000000');
      assert.equal(destinations.at(-1), link.href);
      router.navigate(['/block', '100160666'], { queryParams: { shard: 'c000000000000000' } });
      assert.equal(destinations.at(-1), 'https://ton.tx.taxi/block/100160666?shard=c000000000000000');
      const compatibilityLink = new NativeLink('https://ton.tx.taxi');
      compatibilityLink.routerLink = ['/block', '100160666'];
      compatibilityLink.queryParams = { shard: 'c000000000000000' };
      assert.equal(compatibilityLink.href, destinations.at(-1));
    } finally {
      if (previousLocation === undefined) delete globalThis.location;
      else globalThis.location = previousLocation;
    }
  });
});

test('confirmed same-chain router candidates retain their TON host and shard when searched', () => {
  const decorator = () => target => target, propertyDecorator = () => () => undefined;
  const { SearchFormComponent } = loadService('../components/search-form/search-form.component.ts', {
    '@angular/core': { Component: decorator, Input: propertyDecorator, Output: propertyDecorator, ViewChild: propertyDecorator, HostListener: propertyDecorator, ChangeDetectionStrategy: { OnPush: 0 } },
  });
  withLocation('https://ton.tx.taxi/', () => {
    const form = Object.create(SearchFormComponent.prototype);
    const local = [], external = [];
    window.location.assign = url => external.push(url);
    form.sourceChainId = 'ton';
    form.searchTriggered = { emit() {} };
    form.router = { navigateByUrl: url => local.push(url) };
    form.searchTarget({ kind: 'candidate', chainId: 'ton', confirmed: true, directUrl: 'https://ton.tx.taxi/block/100160666?shard=c000000000000000' }, '100160666');
    assert.deepEqual(local, ['/block/100160666?shard=c000000000000000']);
    form.searchTarget({ kind: 'candidate', chainId: 'ton', confirmed: true, directUrl: 'https://masterchain.ton.tx.taxi/block/100160666' }, '100160666');
    assert.deepEqual(external, ['https://masterchain.ton.tx.taxi/block/100160666']);
  });
});

test('workchain controls navigate through the shared transition to clean hosts and retain the blocks route', () => {
  const { TonNetworkData } = loadService('./ton-network-data.service.ts', {
    './ton-page-data': { TonPageData: class {} }, './chain-selection': selection,
  });
  withLocation('https://ton.tx.taxi/blocks?workchain=0&shard=4000000000000000', () => {
    const page = Object.create(TonNetworkData.prototype);
    page.selection = { current: { workchain: 0, shard: '4000000000000000' } };
    const transitions = [];
    window.__txTaxiSwitchTonView = destination => { transitions.push(destination); return true; };
    page.selectWorkchain('-1');
    assert.deepEqual(transitions, ['https://masterchain.ton.tx.taxi/blocks']);
  });
  withLocation('https://masterchain.ton.tx.taxi/en/blocks?workchain=-1&shard=8000000000000000', () => {
    const page = Object.create(TonNetworkData.prototype);
    page.selection = { current: { workchain: -1, shard: rootShard } };
    const destinations = [];
    window.location.assign = destination => destinations.push(destination);
    page.selectWorkchain('0');
    assert.deepEqual(destinations, ['https://ton.tx.taxi/en/blocks']);
  });
  assert.equal(selection.tonWorkchainDestination(0, 'https://masterchain.ton.tx.taxi/blocks?workchain=0&shard=4000000000000000', { workchain: 0, shard: '4000000000000000' }), 'https://ton.tx.taxi/blocks?shard=4000000000000000');
});

test('the native transition accepts a sibling TON view and navigates after its surface animation', async () => {
  const assigned = [], surfaces = [], animations = [];
  const element = () => ({
    style: {}, setAttribute() {},
    append(child) { this.firstElementChild = child; },
    attachShadow() { return {}; },
    animate(frames, timing) { animations.push({ frames, timing }); return { finished: Promise.resolve() }; },
  });
  const document = {
    currentScript: { dataset: { chain: 'ton' } },
    head: { append() {} }, documentElement: { append(surface) { surfaces.push(surface); } },
    createElement: element, querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  };
  const window = { addEventListener() {} };
  const location = new URL('https://ton.tx.taxi/blocks');
  location.assign = destination => assigned.push(destination);
  runInNewContext(readFileSync(new URL('../../resources/branding/chain-transition.js', import.meta.url), 'utf8'), {
    document, window, location, URL, innerWidth: 1440, innerHeight: 900,
    matchMedia: () => ({ matches: false }), addEventListener() {},
    MutationObserver: class { observe() {} },
  });
  assert.equal(window.__txTaxiSwitchTonView('https://masterchain.ton.tx.taxi/blocks'), true);
  assert.equal(surfaces.length, 1);
  assert.equal(animations.length, 1);
  assert.deepEqual(assigned, []);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(assigned, ['https://masterchain.ton.tx.taxi/blocks']);
  assert.equal(window.__txTaxiSwitchTonView('https://user@masterchain.ton.tx.taxi/'), false);
  assert.equal(window.__txTaxiSwitchTonView('https://masterchain.ton.tx.taxi/block/95544320'), false);
});

test('block metadata uses the short canonical workchain URL and a full-identity image', () => {
  withLocation('https://masterchain.ton.tx.taxi/', () => {
    const previousDocument = globalThis.document;
    const canonical = { href: 'https://masterchain.ton.tx.taxi/', setAttribute(key, value) { this[key] = value; } };
    globalThis.document = { getElementById: () => canonical };
    try {
      const tags = new Map();
      const meta = { updateTag(tag) { tags.set(tag.property || tag.name, tag.content); } };
      const router = { url: '/block/(0,4000000000000000,100039007)', events: new Subject() };
      const state = { networkChanged$: new Subject() };
      const { SeoService } = loadService('../services/seo.service.ts');
      const seo = new SeoService({ setTitle() {} }, meta, state, router, {});
      seo.resetTitle();
      seo.updateCanonical(router.url);
      assert.equal(canonical.href, 'https://ton.tx.taxi/block/100039007?shard=4000000000000000');
      assert.equal(tags.get('og:title'), 'masterchain.ton.tx.taxi - TON Explorer');
      const { OpenGraphService } = loadService('../services/opengraph.service.ts');
      const og = new OpenGraphService({}, meta, state, router, {});
      og.clearOgImage();
      assert.equal(tags.get('og:image'), 'https://ton.tx.taxi/og/block/(0%2C4000000000000000%2C100039007).png?v=4');
      router.url = '/block/100039007?workchain=0&shard=c000000000000000';
      seo.updateCanonical(router.url);
      og.clearOgImage();
      assert.equal(canonical.href, 'https://ton.tx.taxi/block/100039007?shard=c000000000000000');
      assert.equal(tags.get('og:image'), 'https://ton.tx.taxi/og/block/(0%2Cc000000000000000%2C100039007).png?v=4');
      router.url = '/pt-BR/block/100039007?workchain=0&shard=c000000000000000';
      seo.updateCanonical(router.url);
      og.clearOgImage();
      assert.equal(canonical.href, 'https://ton.tx.taxi/pt-BR/block/100039007?shard=c000000000000000');
      assert.equal(tags.get('og:image'), 'https://ton.tx.taxi/og/block/(0%2Cc000000000000000%2C100039007).png?v=4');
      router.url = '/';
      og.clearOgImage();
      assert.equal(tags.get('og:image'), 'https://masterchain.ton.tx.taxi/og.png?v=1');
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
  withLocation('https://ton.tx.taxi/block/42?workchain=-1', () => {
    const previousDocument = globalThis.document;
    const canonical = { href: 'https://masterchain.ton.tx.taxi/block/42', setAttribute(key, value) { this[key] = value; } };
    globalThis.document = { getElementById: () => canonical };
    try {
      const tags = new Map();
      const { SeoService } = loadService('../services/seo.service.ts');
      const seo = new SeoService({ setTitle() {} }, { updateTag(tag) { tags.set(tag.property || tag.name, tag.content); } }, { networkChanged$: new Subject() }, { events: new Subject() }, {});
      seo.updateCanonical('/block/42?workchain=-1');
      assert.equal(canonical.href, 'https://masterchain.ton.tx.taxi/block/42');
      seo.updateCanonical('/');
      seo.resetTitle();
      assert.equal(canonical.href, 'https://ton.tx.taxi/');
      assert.equal(tags.get('og:title'), 'ton.tx.taxi - TON Explorer');
      seo.updateCanonical('/block/43');
      assert.equal(canonical.href, 'https://ton.tx.taxi/block/43');
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });
});

test('switching to a lower sequence workchain resets the live high-water mark and rejects the old feed', () => {
  const { WebsocketService } = loadService('../services/websocket.service.ts');
  const service = Object.create(WebsocketService.prototype);
  const state = {
    latestBlockHeight: 100039007, blocks: [],
    resetChainTip() { this.latestBlockHeight = -1; },
    resetBlocks(blocks) { this.blocks = blocks; },
    updateChainTip(height) { this.latestBlockHeight = Math.max(this.latestBlockHeight, height); },
    markBlock$: new Subject(), resetScroll$: new Subject(),
  };
  let cacheResets = 0;
  service.stateService = state;
  service.cacheService = { resetBlockCache() { cacheResets++; } };
  service.tonSelection = { current: { workchain: -1, shard: rootShard } };
  service.handleResponse({ blocks: [block(-1, rootShard, 95544320)] });
  assert.equal(state.latestBlockHeight, 95544320);
  assert.equal(state.blocks[0].id, '(-1,8000000000000000,95544320)');
  service.tonSelection.current = { workchain: 0, shard: rootShard };
  service.handleResponse({ blocks: [block(0, rootShard, 100039007)] });
  assert.equal(state.latestBlockHeight, 100039007);
  service.handleResponse({ blocks: [block(-1, rootShard, 95544321)] });
  assert.equal(state.blocks[0].id, '(0,8000000000000000,100039007)');
  assert.equal(cacheResets, 2);
});

test('a default-shard change clears height aliases and a mixed-shard snapshot is rejected', () => {
  const { WebsocketService } = loadService('../services/websocket.service.ts');
  const service = Object.create(WebsocketService.prototype);
  let resets = 0;
  service.cacheService = { resetBlockCache() { resets++; } };
  service.tonSelection = { current: { workchain: 0 } };
  service.stateService = {
    latestBlockHeight: -1, blocks: [], markBlock$: new Subject(), resetScroll$: new Subject(),
    resetChainTip() { this.latestBlockHeight = -1; },
    resetBlocks(blocks) { this.blocks = blocks; },
    updateChainTip(height) { this.latestBlockHeight = Math.max(this.latestBlockHeight, height); },
  };
  const left = block(0, '4000000000000000', 100039007), right = block(0, 'c000000000000000', 100039007);
  service.handleResponse({ blocks: [left] });
  service.handleResponse({ blocks: [right] });
  assert.equal(service.stateService.blocks[0].id, right.id);
  assert.equal(resets, 2);
  service.handleResponse({ blocks: [left, right] });
  assert.deepEqual(service.stateService.blocks, [right]);
});

test('a delayed history response from the previous selection cannot repopulate the new height cache', async () => {
  const { CacheService } = loadService('../services/cache.service.ts');
  const requests = [];
  const state = { blocks$: new Subject(), chainTip$: new Subject(), networkChanged$: new Subject() };
  const api = { getBlocks$() { const request = new Subject(); requests.push(request); return request; }, blockAuditLoaded: {} };
  const cache = new CacheService(state, api);
  cache.loadBlock(100);
  cache.resetBlockCache();
  cache.loadBlock(100);
  requests[0].next([block(-1, rootShard, 100)]);
  requests[0].complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cache.getCachedBlock(100), undefined);
  requests[1].next([block(0, rootShard, 100)]);
  requests[1].complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cache.getCachedBlock(100).id, '(0,8000000000000000,100)');
});

test('an initially empty blocks page recovers on a scoped live update without replacing paged history', () => {
  const { TonNetworkData } = loadService('./ton-network-data.service.ts', {
    './ton-page-data': { TonPageData: class {} },
    './chain-selection': selection,
  });
  const page = Object.create(TonNetworkData.prototype);
  page.selection = { current: { workchain: 0 } };
  page.nativeRoute = 'blocks'; page.blocks = []; page.loading = false;
  let refreshes = 0;
  page.loadBlocks = () => refreshes++;
  page.syncDashboard([block(-1, rootShard, 95544320)]);
  assert.equal(refreshes, 0);
  page.syncDashboard([block(0, rootShard, 100039007)]);
  assert.equal(refreshes, 1);
  page.blocks = [block(0, rootShard, 100039000)];
  page.syncDashboard([block(0, rootShard, 100039008)]);
  assert.equal(refreshes, 1);
  assert.equal(page.blocks[0].height, 100039000);
});

test('numeric search carries the selected workchain and discards a result after that choice changes', () => {
  withLocation('https://ton.tx.taxi/', () => {
  const decorator = () => target => target;
  const propertyDecorator = () => () => undefined;
  const { SearchFormComponent } = loadService('../components/search-form/search-form.component.ts', {
    '@angular/core': { Component: decorator, Input: propertyDecorator, Output: propertyDecorator, ViewChild: propertyDecorator, HostListener: propertyDecorator, ChangeDetectionStrategy: { OnPush: 0 } },
  });
  const form = Object.create(SearchFormComponent.prototype);
  const requests = [], navigations = [], external = [];
  window.location.assign = value => external.push(value);
  form.cdr = { markForCheck() {} };
  form.tonSelection = { current: { workchain: 0, shard: rootShard } };
  form.searchForm = { value: { searchText: '100000000' } };
  form.searchTriggered = { emit() {} };
  form.router = { navigateByUrl(value) { navigations.push(value); } };
  form.http = { get(url, options) { const response = new Subject(); requests.push({ url, options, response }); return response; } };
  form.searchSourceChain('100000000');
  assert.deepEqual(requests[0].options.params, { value: '100000000', workchain: '0', shard: rootShard });
  form.tonSelection.current = { workchain: -1, shard: rootShard };
  requests[0].response.next({ type: 'block', id: '(0,8000000000000000,100000000)' });
  assert.deepEqual(navigations, []);
  form.searchSourceChain('100000000');
  assert.equal(requests[1].options.params.workchain, '-1');
  requests[1].response.next({ type: 'block', id: '(-1,8000000000000000,100000000)' });
  assert.deepEqual(external, ['https://masterchain.ton.tx.taxi/block/100000000']);
  form.tonSelection.current = { workchain: 0, shard: '4000000000000000' };
  form.searchSourceChain('100000000');
  requests[2].response.next({ type: 'block', id: '(0,4000000000000000,100000000)' });
  assert.deepEqual(navigations, ['/block/100000000?shard=4000000000000000']);
  });
});

test('a slower dashboard response refreshes history without moving the live head backward', () => {
  const { TonNetworkData } = loadService('./ton-network-data.service.ts', {
    './ton-page-data': { TonPageData: class {} }, './chain-selection': selection,
  });
  const page = Object.create(TonNetworkData.prototype);
  const response = new Subject();
  const live = block(0, rootShard, 100039008);
  page.selection = { current: { workchain: 0 } };
  page.nativeRoute = 'dashboard'; page.generation = 1; page.dashboardRequestSequence = 0;
  page.data = { head: live.ton, blocks: [live], shard: rootShard, history: [] };
  page.blocks = [live]; page.requests = { add() {} };
  page.getNative = () => response;
  page.loadDashboardTransactions = () => {};
  page.updateMetadata = () => {};
  page.loadBlocks('/api/ton/dashboard', true);
  const history = [{ seqno: '100039007', timestamp: 1790570275, fees: '123456' }];
  response.next({ head: block(0, rootShard, 100039007).ton, blocks: [block(0, rootShard, 100039007)], shard: rootShard, history });
  assert.deepEqual(page.data.history, history);
  assert.equal(page.data.head.seqno, 100039008);
  assert.equal(page.blocks[0].height, 100039008);
});


test('full tuple block routes retain their scope while short routes return to the hostname and stable root shard', () => {
  class NavigationEnd { constructor(urlAfterRedirects) { this.urlAfterRedirects = urlAfterRedirects; } }
  const { TonChainSelectionService } = loadService('./ton-chain-selection.service.ts', {
    '@angular/router': { NavigationEnd }, './chain-selection': selection,
  });
  const events = new Subject();
  const router = {
    url: '/block/(-1,8000000000000000,95544320)', events,
    parseUrl(value) {
      const url = new URL(value, 'https://ton.tx.taxi');
      return { queryParams: Object.fromEntries(url.searchParams), root: { children: { primary: { segments: url.pathname.split('/').filter(Boolean).map(path => ({path: decodeURIComponent(path)})) } } } };
    },
  };
  const service = new TonChainSelectionService(router);
  assert.deepEqual(service.current, {workchain:-1, shard:rootShard});
  events.next(new NavigationEnd('/block/(0,4000000000000000,100039007)'));
  assert.deepEqual(service.current, {workchain:0, shard:'4000000000000000'});
  events.next(new NavigationEnd('/block/95544320'));
  assert.deepEqual(service.current, {workchain:0, shard:rootShard});
  events.next(new NavigationEnd('/block/95544320?workchain=-1'));
  assert.deepEqual(service.current, {workchain:-1, shard:rootShard});
  events.next(new NavigationEnd('/block/(0,4000000000000000,95544320)?workchain=-1'));
  assert.deepEqual(service.current, {workchain:0, shard:'4000000000000000'});
  events.next(new NavigationEnd('/'));
  assert.deepEqual(service.current, {workchain:0});
});


test('a live-feed scroll reset keeps the selected contextual block centered', () => {
  const decorator = () => target => target;
  const propertyDecorator = () => () => undefined;
  const { StartComponent } = loadService('../components/start/start.component.ts', {
    '@angular/core': { Component: decorator, Input: propertyDecorator, ViewChild: propertyDecorator, HostListener: propertyDecorator, ChangeDetectionStrategy: { OnPush: 0 } },
  });
  const rail = Object.create(StartComponent.prototype);
  rail.nativeContextMode = true;
  rail.nativeContext = { targetSlot: 6 };
  rail.blockWidth = 155;
  rail.chainWidth = 1440;
  rail.timeLtr = false;
  rail.mempoolOffset = 0;
  rail.scrollLeft = 0;
  rail.resetScroll();
  // The selected cube's center starts at 40 + 6*155 + 125/2 from the rail origin.
  assert.equal(rail.scrollLeft, 1032.5);
  rail.timeLtr = true;
  rail.resetScroll();
  assert.equal(rail.scrollLeft, -1032.5);
});
