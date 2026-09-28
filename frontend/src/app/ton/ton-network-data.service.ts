import { ChangeDetectorRef, Injectable, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription, throwError, timer } from 'rxjs';
import { TonChainSelectionService } from './ton-chain-selection.service';
import { tonBlockMatchesSelection, tonBlockScope, tonChainSelection, tonSelectionQuery, tonWorkchainDestination } from './chain-selection';
import { finalize, retry } from 'rxjs/operators';
import { OpenGraphService } from '@app/services/opengraph.service';
import { SeoService } from '@app/services/seo.service';
import { StateService } from '@app/services/state.service';
import { TonPageData } from './ton-page-data';
import { confirmedDashboardData, ConfirmedTransactionWindowSource } from './dashboard-data';
import { tonNetworkHistory } from './network-history';

type NativeRoute = 'dashboard' | 'blocks' | 'block';

@Injectable()
export class TonNetworkData extends TonPageData implements OnInit, OnDestroy {
  nativeRoute: NativeRoute = 'dashboard'; blocks: any[] = []; block: any | null = null; transactions: any[] = []; shards: any[] = [];
  transactionsLoading = false; transactionsError = ''; shardsLoading = false; shardsError = ''; blocksError = ''; nextBefore: string | null = null; hasMoreBlocks = false; loadingMoreBlocks = false;
  transactionWindow: ConfirmedTransactionWindowSource | null = null;
  private nativeRouteSub?: Subscription;
  private transactionRequest?: Subscription;
  private dashboardRequestSequence = 0;
  private queuedTransactionSeqno: string | null = null;
  private visibilityListener = () => this.onVisibilityChange();
  constructor(cdr: ChangeDetectorRef, http: HttpClient, route: ActivatedRoute, state: StateService, seo: SeoService, og: OpenGraphService, private selection: TonChainSelectionService, private router: Router) { super(cdr, http, route, state, seo, og, selection); }
  private getNative<T>(url: string) { return this.http.get<T>(url).pipe(finalize(() => this.cdr.markForCheck())); }
  private contextResizeListener = () => this.onContextResize();
  override ngOnInit(): void {
    window.addEventListener('resize', this.contextResizeListener);
    document.addEventListener('visibilitychange', this.visibilityListener);
    this.nativeRouteSub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      const page = this.route.snapshot.data.tonPage;
      this.nativeRoute = page === 'block' ? 'block' : page === 'blocks' ? 'blocks' : 'dashboard';
      this.page = this.nativeRoute;
      const routeId = params.get('id') || '';
      const contextual = this.nativeRoute === 'block' ? this.selection.blockIdentity(routeId, query.get('workchain'), query.get('shard')) : null;
      this.id = contextual?.id || routeId;
      this.selection.set(contextual?.workchain ?? query.get('workchain'), contextual?.shard ?? query.get('shard'));
      this.loadNative();
    });
  }
  override ngOnDestroy(): void { window.removeEventListener('resize', this.contextResizeListener); document.removeEventListener('visibilitychange', this.visibilityListener); this.nativeRouteSub?.unsubscribe(); super.ngOnDestroy(); }
  get workchain(): 0 | -1 { return this.selection.current.workchain; }
  get chainLabel(): string { return this.workchain === -1 ? 'Masterchain' : 'Basechain'; }
  get activeShards(): any[] { return (this.data?.activeShards || []).filter(shard => Number(shard.workchain) === 0); }
  get selectedShard(): string { return this.selection.current.shard || this.data?.shard || ''; }
  get selectionQueryParams(): { workchain: number; shard?: string } { return { ...this.selection.current, ...(this.selectedShard ? { shard: this.selectedShard } : {}) }; }
  selectWorkchain(value: string): void {
    const destination = tonWorkchainDestination(value, window.location.href, this.selection.current);
    if (!(window as any).__txTaxiSwitchTonView?.(destination)) window.location.assign(destination);
  }
  selectShard(value: string): void {
    const selected = tonChainSelection(this.workchain, value);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { workchain: selected.workchain, shard: selected.shard || null }, queryParamsHandling: 'merge' });
  }
  private selectedUrl(url: string, pinObservedShard = false): string {
    // Pin pagination to the observed shard even when the URL requests the current default.
    return url + (url.includes('?') ? '&' : '?') + tonSelectionQuery({ ...this.selection.current, ...(pinObservedShard && this.selectedShard ? { shard: this.selectedShard } : {}) });
  }
  private loadNative(): void {
    this.requests.unsubscribe(); this.requests = new Subscription(); clearInterval(this.refresh); this.generation++; this.data = null; this.loadingMoreBlocks = false; this.nextBefore = null; this.hasMoreBlocks = false; this.loading = true; this.error = ''; this.blocks = []; this.block = null; this.transactions = []; this.shards = []; this.transactionsError = ''; this.shardsError = ''; this.blocksError = ''; this.transactionWindow = null; this.transactionsLoading = false; this.queuedTransactionSeqno = null; this.state.markBlock$.next({}); this.state.nativeBlockContext$.next(this.nativeRoute === 'block' ? { blocks: [], loading: true, unavailable: false } : null); this.updateMetadata();
    if (this.nativeRoute === 'block') { this.loadBlock(); return; }
    // The collector already holds a bounded, ordered block window. Rendering it
    // avoids holding the list hostage to a serial provider backfill; earlier
    // pagination remains an explicit request from the user.
    this.loadBlocks('/api/ton/dashboard');
    this.requests.add(this.state.blocks$.subscribe(blocks => this.syncDashboard(blocks)));
    this.refresh = setInterval(() => { if (!document.hidden && (this.nativeRoute === 'dashboard' || this.nativeRoute === 'blocks' && !this.blocks.length) && !this.loading) this.loadBlocks('/api/ton/dashboard', true); }, 15000);
  }
  private loadBlocks(url: string, quiet = false): void {
    const generation = this.generation;
    const sequence = ++this.dashboardRequestSequence;
    const current = () => generation === this.generation && sequence === this.dashboardRequestSequence;
    this.requests.add(this.getNative<any>(this.selectedUrl(url)).subscribe({
      next: result => {
        if (!current()) return;
        if (this.nativeRoute === 'dashboard') this.loadDashboardTransactions(result.masterchainHead?.seqno || (this.workchain === -1 ? result.head?.seqno : undefined));
        // A live head may have arrived while this HTTP snapshot was in flight.
        // Keep that head, but still accept the snapshot's history and shard inventory.
        const liveAhead = this.nativeRoute === 'dashboard' && result.shard === this.data?.shard
          && Number(result.head?.seqno) < Number(this.data?.head?.seqno);
        this.data = liveAhead ? { ...result, head: this.data.head, blocks: this.data.blocks } : result;
        const observed = this.data.blocks || [];
        this.blocks = this.nativeRoute === 'blocks' ? this.consecutivePrefix(observed) : observed;
        const last = this.blocks[this.blocks.length - 1];
        this.nextBefore = result._paging?.nextBefore || (last ? String(last.ton?.seqno || last.seqno || last.height) : null);
        this.hasMoreBlocks = result._paging?.hasMore === true || (!result._paging && this.nextBefore !== null);
        this.loading = false; this.error = ''; this.updateMetadata();
      },
      error: error => {
        if (!current()) return;
        if (quiet && this.data) { this.data = { ...this.data, _meta: { ...this.data._meta, stale: true } }; return; }
        this.loading = false; this.error = error.status === 404 ? 'Not found' : 'Temporarily unavailable';
      },
    }));
  }
  loadMoreBlocks(): void {
    if (this.loadingMoreBlocks || !this.hasMoreBlocks || !this.nextBefore) return; this.loadingMoreBlocks = true; const generation = this.generation;
    this.requests.add(this.getNative<any>(this.selectedUrl('/api/ton/blocks?limit=8&before=' + encodeURIComponent(this.nextBefore), true)).subscribe({ next: result => { if (generation !== this.generation) return; const ids = new Set(this.blocks.map(block => this.blockIdentity(block))); this.blocks = this.blocks.concat((result.blocks || []).filter(block => !ids.has(this.blockIdentity(block)))); this.nextBefore = result._paging?.nextBefore || null; this.hasMoreBlocks = result._paging?.hasMore === true; this.loadingMoreBlocks = false; }, error: () => { this.loadingMoreBlocks = false; this.blocksError = 'Unable to load earlier blocks'; } }));
  }
  private loadDashboardTransactions(seqno: string | number | undefined): void {
    if (seqno === undefined || seqno === null) { this.transactionsError = 'No masterchain head is available'; return; }
    // Refresh cadence must not starve a slower provider by repeatedly canceling
    // its first usable response. Keep one request and coalesce newer heads.
    if (this.transactionsLoading) { this.queuedTransactionSeqno = String(seqno); return; }
    this.transactionsLoading = true;
    const generation = this.generation;
    const finish = () => {
      this.transactionsLoading = false;
      const queued = this.queuedTransactionSeqno;
      this.queuedTransactionSeqno = null;
      if (queued && queued !== String(seqno) && generation === this.generation) this.loadDashboardTransactions(queued);
    };
    this.transactionRequest = this.getNative<any>('/api/ton/network-transactions?limit=50').subscribe({
      next: result => {
        if (generation !== this.generation) return;
        this.transactions = result.transactions || [];
        this.transactionWindow = { kind: 'confirmed-masterchain', masterSeqno: String(result.master_seqno || seqno), requestedLimit: 50, returned: this.transactions.length, complete: result._paging?.nextOffset == null, partial: result._paging?.nextOffset != null, observedAt: result._meta?.observedAt, stale: result._meta?.stale === true };
        this.transactionsError = ''; finish();
      },
      error: () => {
        if (generation !== this.generation) return;
        this.transactionsError = 'Recent transactions are temporarily unavailable';
        if (this.transactionWindow) this.transactionWindow = { ...this.transactionWindow, stale: true };
        finish();
      },
    });
    this.requests.add(this.transactionRequest);
  }
  private loadBlock(): void {
    const generation = this.generation; this.requests.add(this.getNative<any>('/api/ton/block/' + encodeURIComponent(this.id)).subscribe({ next: rawBlock => { if (generation !== this.generation) return; const block = { ...rawBlock, id: rawBlock.id || `(${rawBlock.workchain_id},${rawBlock.shard},${rawBlock.seqno})` }; this.block = block; this.data = block; this.loading = false; this.state.markBlock$.next(String(block.workchain_id) === '-1' ? { blockHeight: Number(block.seqno) } : {}); this.updateMetadata(); this.loadBlockContext(block); this.loadBlockTransactions(block); if (String(block.workchain_id) === '-1') this.loadShards(block); }, error: error => { if (generation === this.generation) { this.loading = false; this.error = error.status === 404 ? 'Not found' : 'Temporarily unavailable'; this.state.nativeBlockContext$.next({ blocks: [], loading: false, unavailable: true }); } } }));
  }
  private loadBlockTransactions(block: any): void {
    const generation = this.generation;
    this.transactionsLoading = true;
    this.transactionsError = '';
    this.requests.add(this.getNative<any>('/api/ton/block/' + encodeURIComponent(block.id || this.id) + '/transactions?limit=50').pipe(
      retry({
        count: 3,
        delay: (error, attempt) => error.status === 503 && generation === this.generation
          ? timer(attempt * 1000)
          : throwError(() => error),
      }),
    ).subscribe({
      next: result => {
        if (generation !== this.generation) return;
        this.transactions = result.transactions || [];
        this.transactionsLoading = false;
      },
      error: () => {
        if (generation !== this.generation) return;
        this.transactionsLoading = false;
        this.transactionsError = 'Block transactions are temporarily unavailable';
      },
    }));
  }
  private loadShards(block: any): void { this.shardsLoading = true; this.requests.add(this.getNative<any>('/api/ton/block/' + encodeURIComponent(block.id || this.id) + '/shards').subscribe({ next: result => { this.shards = (result.shards || result.blocks || []).map(shard => shard.last_known_block ? { ...shard.last_known_block, id: shard.last_known_block_id } : shard); this.shardsLoading = false; }, error: () => { this.shardsLoading = false; this.shardsError = 'Shard references are temporarily unavailable'; } })); }
  onVisibilityChange(): void { if (!document.hidden && (this.nativeRoute === 'dashboard' || this.nativeRoute === 'blocks' && !this.blocks.length) && !this.loading) this.loadBlocks('/api/ton/dashboard', true); }
  private blockIdentity(block: any): string { return block.id || block.ton?.id || `${block.workchain_id ?? block.ton?.workchain_id}:${block.shard ?? block.ton?.shard}:${block.seqno ?? block.ton?.seqno}`; }
  private consecutivePrefix(blocks: any[]): any[] {
    const ordered = [...blocks].sort((left, right) => Number(right.ton?.seqno || right.seqno || right.height) - Number(left.ton?.seqno || left.seqno || left.height));
    return ordered.slice(1).reduce((prefix, block) => {
      const previous = prefix[prefix.length - 1];
      const expected = Number(previous?.ton?.seqno || previous?.seqno || previous?.height) - 1;
      const actual = Number(block.ton?.seqno || block.seqno || block.height);
      return prefix.length && actual === expected ? [...prefix, block] : prefix;
    }, ordered.length ? [ordered[0]] : []);
  }
  private cachedDashboard: any;
  private dashboardInputs: any[] = [];
  override syncDashboard(blocks: any[]): void {
    const selected = this.selection.current;
    if (!blocks?.length || blocks.some(block => !tonBlockMatchesSelection(block, selected))) return;
    if (this.nativeRoute === 'blocks') {
      // Recover an initially empty collector window without replacing paged history.
      if (!this.blocks.length && !this.loading) this.loadBlocks('/api/ton/dashboard', true);
      return;
    }
    const shard = tonBlockScope(blocks[0])?.shard;
    if (this.data?.shard && shard !== this.data.shard) {
      // A split/merge can change the current default. Fetch that shard's own
      // history instead of joining unrelated sequence numbers on one chart.
      this.loadBlocks('/api/ton/dashboard', true);
      return;
    }
    super.syncDashboard(blocks);
    if (this.nativeRoute !== 'dashboard' || !this.data?.blocks) return;
    this.blocks = this.data.blocks;
  }
  get dashboard(): any {
    const inputs = [this.data, this.blocks, this.transactions, this.transactionWindow];
    if (inputs.every((value, index) => value === this.dashboardInputs[index]) && this.cachedDashboard) return this.cachedDashboard;
    this.dashboardInputs = inputs;
    const observations = this.data?.history || [];
    return this.cachedDashboard = {
      ...this.data,
      blocks: this.blocks,
      history: tonNetworkHistory(observations),
      intervals: this.observedIntervals(this.blocks),
      transactions: this.transactions,
      confirmed: this.transactionWindow ? confirmedDashboardData(this.transactions, this.transactionWindow) : null,
    };
  }
  private observedIntervals(blocks: any[]): number[] {
    const observed = blocks.map(block => ({
      sequence: Number(block.ton?.seqno || block.seqno),
      timestamp: Number(block.ton?.gen_utime || block.gen_utime || block.timestamp),
    })).filter(block => Number.isSafeInteger(block.sequence) && Number.isFinite(block.timestamp));
    observed.sort((left, right) => left.sequence - right.sequence);
    if (observed.length < 2) return [];
    const first = observed[0], last = observed[observed.length - 1];
    const distance = last.sequence - first.sequence, elapsed = last.timestamp - first.timestamp;
    return distance > 0 && elapsed > 0 ? [elapsed / distance] : [];
  }
}
