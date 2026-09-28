import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as rxjs from 'rxjs';
import * as operators from 'rxjs/operators';
import * as tonChainSelection from '../../ton/chain-selection.ts';

const decorator = () => () => {};
const core = {
  Component: () => value => value, Injectable: () => value => value,
  Input: decorator, Output: decorator, ViewChild: decorator, HostListener: decorator,
  EventEmitter: class extends rxjs.Subject { emit(value) { this.next(value); } },
  ChangeDetectionStrategy: { OnPush: 0 },
};
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const imports = {
    '@angular/core': core, rxjs, 'rxjs/operators': operators,
    '@app/ton/chain-selection': tonChainSelection,
    '@app/shared/regex.utils': { getRegex: () => /./ },
    '@app/services/tx-taxi-explorer-registry.service': {},
  };
  new Function('require', 'module', 'exports', source)(name => imports[name] || {}, module, module.exports);
  return module.exports;
}
const { TxTaxiExplorerRegistryService } = load('../../services/tx-taxi-explorer-registry.service.ts');
const { SearchFormComponent } = load('./search-form.component.ts');
const chain = {
  id: 'ton', name: 'TON', nativeSymbol: 'GRAM', displayOrder: 1,
  brand: { accentColor: '#0098ea', icon: { url: '/ton.svg', alt: 'TON' } }, explorers: [],
  site: {
    origin: 'https://ton.tx.taxi', host: 'ton.tx.taxi', switcherLogo: { url: '/ton.svg', alt: 'TON' },
    destinations: [
      { id: 'basechain', name: 'Basechain', origin: 'https://ton.tx.taxi', default: true, search: { resolvePath: '/api/ton/resolve', params: { workchain: '0' } } },
      { id: 'masterchain', name: 'Masterchain', origin: 'https://masterchain.ton.tx.taxi', search: { resolvePath: '/api/ton/resolve', params: { workchain: '-1' } } },
    ],
  },
};
function setup(host = 'ton.tx.taxi') {
  const requests = [], assigned = [], spa = [];
  globalThis.window = { location: { origin: `https://${host}`, hostname: host, assign: value => assigned.push(value) } };
  const http = { get(url, options) {
    requests.push({ url, params: options?.params });
    if (url.endsWith('/chains')) return rxjs.of({ chains: [chain] });
    if (url.endsWith('/health')) return rxjs.of({ explorers: [] });
    return rxjs.of({ input: options?.params?.value, normalizedInput: options?.params?.value, phase: 'classified', status: 'choices', candidates: [] });
  } };
  const registry = new TxTaxiExplorerRegistryService(http, { env: { TX_TAXI_ROUTER_URL: 'https://tx.taxi' } });
  let explorers;
  registry.explorers$.subscribe(value => explorers = value);
  const component = new SearchFormComponent({ markForCheck() {} }, {}, { navigateByUrl: value => spa.push(value) }, {}, {}, http, {}, {}, {}, {}, registry, { current: { workchain: 0 }, defaultWorkchain: host.startsWith('masterchain.') ? -1 : 0 });
  component.explorers = explorers;
  component.searchForm = { value: { searchText: '100160666' } };
  component.chainMenu = { close() {} };
  return { component, registry, explorers, requests, assigned, spa };
}

test('child selection survives input changes and promotes its family once; Automatic clears scope', () => {
  const { component, explorers, requests, assigned } = setup();
  const parent = explorers[0], child = parent.destinations[1];
  component.selectExplorer(child);
  assert.equal(component.selectedExplorer(), parent);
  assert.deepEqual(component.otherExplorers(explorers), []);
  assert.equal(component.activeTarget$.value.name, 'TON · Masterchain');
  assert.equal(component.isSelectedExplorer(parent), false);
  assert.equal(component.isSelectedExplorer(child), true);
  component.searchForm.value.searchText = '95551090';
  component.clearManualOverrideOnInputChange('95551090');
  component.querySearchOptions('95551090').subscribe();
  assert.deepEqual(requests.at(-1).params, { value: '95551090', source: 'ton', chain: 'ton', destination: 'masterchain' });
  component.search();
  assert.equal(assigned.at(-1), 'https://tx.taxi/ton/95551090?destination=masterchain');
  component.selectAutomaticRouting();
  component.querySearchOptions('95551090').subscribe();
  assert.deepEqual(requests.at(-1).params, { value: '95551090', source: 'ton' });
  assert.equal(component.activeTarget$.value.destinationId, undefined);
  assert.equal(component.selectedExplorer(), undefined);
  assert.deepEqual(component.otherExplorers(explorers), explorers);
});

test('exact host gets Opened and a confirmed other-child transaction leaves the current host', () => {
  const { component, explorers, assigned, spa } = setup();
  assert.equal(component.isOpenedExplorer(explorers[0]), true);
  assert.equal(component.isOpenedExplorer(explorers[0].destinations[1]), false);
  component.searchTarget({ kind: 'candidate', chainId: 'ton', destinationId: 'masterchain', confirmed: true, directUrl: 'https://masterchain.ton.tx.taxi/tx/abc' }, 'abc');
  assert.deepEqual(assigned, ['https://masterchain.ton.tx.taxi/tx/abc']);
  assert.deepEqual(spa, []);
});

test('TON parent keeps default Basechain scope instead of reinterpreting another child URL', () => {
  const { component, explorers, assigned, requests } = setup();
  component.selectExplorer(explorers[0]);
  const input = 'https://masterchain.ton.tx.taxi/block/95551090';
  component.searchForm.value.searchText = input;
  component.clearManualOverrideOnInputChange(input);
  component.search();
  assert.equal(assigned.at(-1), `https://tx.taxi/ton/${encodeURIComponent(input)}?destination=basechain`);
  assert.equal(requests.some(request => request.url === '/api/ton/resolve'), false);
});

test('pending source resolution cannot navigate after user changes destination', () => {
  const { component, explorers, assigned, spa } = setup();
  const pending = new rxjs.Subject();
  component.http = { get: () => pending };
  component.searchSourceChain('100160666');
  component.selectExplorer(explorers[0].destinations[1]);
  pending.next({ type: 'tx', id: 'old-response' });
  assert.deepEqual(spa, []);
  assert.deepEqual(assigned, []);
  assert.equal(component.activeTarget$.value.destinationId, 'masterchain');
});

test('registry derives destination from direct origin and ordinary parent search keeps existing unscoped options contract', async () => {
  const { registry, requests } = setup();
  registry.searchOptions$('test', false, 'ton', 'eth').subscribe();
  assert.deepEqual(requests.at(-1).params, { value: 'test', source: 'ton' });
  registry.http = { get: () => rxjs.of({ input: 'x', normalizedInput: 'x', phase: 'resolved', status: 'redirect', candidates: [{ chainId: 'ton', host: 'ton.tx.taxi', iconUrl: '/ton.svg', directUrl: 'https://masterchain.ton.tx.taxi/tx/x' }] }) };
  const options = await rxjs.firstValueFrom(registry.searchOptions$('x', true));
  assert.equal(options.candidates[0].destinationId, 'masterchain');
  assert.equal(options.candidates[0].destinationName, 'Masterchain');
  assert.equal(options.candidates[0].host, 'masterchain.ton.tx.taxi');
});


test('TON parent represents the default destination and shows only nondefault options in Selected', () => {
  const { component, explorers, requests } = setup();
  const parent = explorers[0];
  assert.deepEqual(component.childDestinations(parent).map(destination => destination.name), ['Masterchain']);
  component.selectExplorer(parent);
  assert.equal(component.activeTarget$.value.name, 'TON');
  assert.equal(component.activeTarget$.value.destinationId, 'basechain');
  assert.equal(component.activeTarget$.value.destinationDefault, true);
  assert.equal(component.isSelectedExplorer(parent), true);
  assert.equal(component.isSelectedExplorer(parent.destinations[1]), false);
  assert.equal(component.isOpenedExplorer(parent), true);
  assert.equal(component.selectedExplorer(), parent);
  component.querySearchOptions('100160666').subscribe();
  assert.deepEqual(requests.at(-1).params, { value: '100160666', source: 'ton', chain: 'ton', destination: 'basechain' });
  component.selectExplorer(parent.destinations[1]);
  assert.equal(component.isSelectedExplorer(parent), false);
  assert.equal(component.selectedExplorer(), parent);
  assert.equal(component.activeTarget$.value.name, 'TON · Masterchain');
});

test('default candidate uses plain chain label while master host only marks its nested destination Opened', async () => {
  const { registry, component, explorers } = setup('masterchain.ton.tx.taxi');
  assert.equal(component.isOpenedExplorer(explorers[0]), false);
  assert.equal(component.isOpenedExplorer(explorers[0].destinations[1]), true);
  registry.http = { get: () => rxjs.of({ input: 'x', normalizedInput: 'x', phase: 'resolved', status: 'redirect', candidates: [{ chainId: 'ton', name: 'TON', host: 'ton.tx.taxi', iconUrl: '/ton.svg', directUrl: 'https://ton.tx.taxi/tx/x' }] }) };
  const options = await rxjs.firstValueFrom(registry.searchOptions$('x', true));
  const target = component.targetForCandidate(options.candidates[0]);
  assert.equal(target.name, 'TON');
  assert.equal(target.destinationId, 'basechain');
  assert.equal(target.destinationDefault, true);
});


test('Possible results cannot promote a chain from Automatic; a confirmed result promotes its exact destination once', () => {
  const { component, explorers } = setup();
  component.selectAutomaticRouting();
  const candidate = { chainId: 'ton', destinationId: 'masterchain', destinationName: 'Masterchain', name: 'TON', confirmed: false, confidence: 'weak', firstParty: true, directUrl: 'https://masterchain.ton.tx.taxi/block/95551090' };
  const options = { input: '100160666', phase: 'classified', candidates: [candidate] };
  component.setSearchOptions(options);
  assert.equal(component.selectedExplorer(), undefined);
  assert.equal(component.isAutomaticRoutingSelected(), true);
  const found = { ...candidate, confirmed: true, confidence: 'strong' };
  component.setSearchOptions({ ...options, phase: 'resolved', resolvedChainId: 'ton', resolvedDestinationId: 'masterchain', candidates: [found] });
  assert.equal(component.selectedExplorer(), explorers[0]);
  assert.equal(component.isSelectedExplorer(explorers[0]), false);
  assert.equal(component.isSelectedExplorer(explorers[0].destinations[1]), true);
  assert.equal(component.isSelectedCandidate(found), false);
  assert.deepEqual(component.otherExplorers(explorers), []);
});

test('selected external candidate remains distinct from Automatic and loses stale Found state on edited input', () => {
  const { component, explorers } = setup();
  const candidate = { chainId: 'sol', name: 'Solana', symbol: 'SOL', category: 'account', objectType: 'tx', confidence: 'strong', confirmed: true, firstParty: false, iconUrl: '/sol.svg', host: 'solscan.io', directUrl: 'https://solscan.io/tx/x' };
  component.selectCandidate(candidate);
  assert.equal(component.selectedExplorer(), undefined);
  assert.equal(component.selectedExternalCandidate().chainId, 'sol');
  assert.equal(component.isAutomaticRoutingSelected(), false);
  assert.equal(component.isSelectedExternalCandidate(candidate), true);
  assert.equal(component.isSelectedCandidate(candidate), true);
  assert.deepEqual(component.otherExplorers(explorers), explorers);
  component.searchForm.value.searchText = 'another-value';
  component.clearManualOverrideOnInputChange('another-value');
  assert.equal(component.selectedExternalCandidate().confirmed, false);
  assert.equal(component.selectedExternalCandidate().directUrl, undefined);
  component.selectAutomaticRouting();
  assert.equal(component.selectedExternalCandidate(), undefined);
});


test('relocating a selected row cannot turn its original inside click into an outside dismissal', () => {
  const { component } = setup();
  const host = { contains: () => false };
  component.elementRef = { nativeElement: host };
  let closes = 0;
  component.chainMenu = { close: () => closes++ };
  const detachedButton = {};
  component.onDocumentClick({ target: detachedButton, composedPath: () => [detachedButton, host] });
  assert.equal(closes, 0);
  component.onDocumentClick({ target: {}, composedPath: () => [{}] });
  assert.equal(closes, 1);
  component.closeChainMenu();
  assert.equal(closes, 2);
});
