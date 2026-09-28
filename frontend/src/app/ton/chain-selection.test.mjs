import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { Subject } from 'rxjs';
import * as selection from './chain-selection.ts';

const require = createRequire(import.meta.url);
function loadService(relativePath, additions = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const module = { exports: {} };
  const imports = {
    '@angular/core': { Injectable: () => target => target, makeStateKey: key => key },
    '@app/ton/chain-selection': selection,
    '@app/shared/ton-pending-state': { readTonPending: () => null },
    ...additions,
  };
  new Function('require', 'module', 'exports', source)(name => imports[name] || (name.startsWith('rxjs') ? require(name) : {}), module, module.exports);
  return module.exports;
}

const block = (workchain, shard, height) => ({
  id: `(${workchain},${shard},${height})`, height, timestamp: 1790570275,
  ton: { workchain_id: workchain, shard, seqno: height },
});
const rootShard = '8000000000000000';

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
  const decorator = () => target => target;
  const propertyDecorator = () => () => undefined;
  const { SearchFormComponent } = loadService('../components/search-form/search-form.component.ts', {
    '@angular/core': { Component: decorator, Input: propertyDecorator, Output: propertyDecorator, ViewChild: propertyDecorator, HostListener: propertyDecorator, ChangeDetectionStrategy: { OnPush: 0 } },
  });
  const form = Object.create(SearchFormComponent.prototype);
  const requests = [], navigations = [];
  form.cdr = { markForCheck() {} };
  form.tonSelection = { current: { workchain: 0, shard: rootShard } };
  form.searchForm = { value: { searchText: '100000000' } };
  form.searchTriggered = { emit() {} };
  form.router = { navigate(value) { navigations.push(value); } };
  form.http = { get(url, options) { const response = new Subject(); requests.push({ url, options, response }); return response; } };
  form.searchSourceChain('100000000');
  assert.deepEqual(requests[0].options.params, { value: '100000000', workchain: '0', shard: rootShard });
  form.tonSelection.current = { workchain: -1, shard: rootShard };
  requests[0].response.next({ type: 'block', id: '(0,8000000000000000,100000000)' });
  assert.deepEqual(navigations, []);
  form.searchSourceChain('100000000');
  assert.equal(requests[1].options.params.workchain, '-1');
  requests[1].response.next({ type: 'block', id: '(-1,8000000000000000,100000000)' });
  assert.deepEqual(navigations, [['/', 'block', '(-1,8000000000000000,100000000)']]);
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
