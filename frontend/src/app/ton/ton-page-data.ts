import { ChangeDetectorRef, Directive, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SeoService } from '../services/seo.service';
import { OpenGraphService } from '../services/opengraph.service';
import { NativeBlockContext, StateService } from '../services/state.service';
import { scaledJettonUnits } from './scaled-ui';
import { publicDetails } from './transaction-view';
import { nativeContextDepth } from '../shared/native-block-context';
import { NativeAmount } from '../shared/native-view.types';
import { TonChainSelectionService } from './ton-chain-selection.service';
import { tonSelectionForBlockId, tonLocalePrefix } from './chain-selection';

type Page = 'jettons'|'collections'|'dns'|'dns-auctions'|'staking-pool'|'extra-currency'|'config'|'message'|'trace'|'not-found'|'transactions'|'dashboard'|'blocks'|'block'|'tx'|'address'|'nft'|'collection'|'jetton'|'validators';
interface Feed { items: any[]; loading: boolean; error: string; paging?: any; stale?: boolean; restart?: boolean; request?: Subscription; }
@Directive()
export class TonPageData implements OnInit, OnDestroy {
  publicDetails = publicDetails;
  private contextRequests = new Subscription();
  private contextRevision = 0;
  private contextDepth = 0;
  private contextResizeTimer?: ReturnType<typeof setTimeout>;
  readonly timezone$ = this.state.timezone$;
  auctionTld = 'ton'; nftFilter = ''; nftFilterInput = ''; nftCollections: any[] = []; tokenFilter = ''; tokenSort = 'name'; selectedFiat = 'USD'; fiatQuotes: {[currency:string]:number} = {}; fiatQuote: number | null = null; quoteObservedAt = ''; quoteStale = false; page: Page = 'dashboard'; id = ''; data: any; loading = true; error = ''; tab = 'activity'; generation = 0;
  feeds: {[key:string]:Feed} = {}; resources: {[key:string]: any} = {}; resourceLoading: {[key:string]:boolean} = {}; resourceErrors: {[key:string]:boolean} = {}; getterName = ''; getterArgs = ''; getterResult: any; getterError = ''; getterLoading = false; mainPaginated = false; mainLoading = false; mainError = ''; requests = new Subscription(); routeSub?: Subscription; refresh?: ReturnType<typeof setInterval>;
  constructor(protected cdr: ChangeDetectorRef, protected http: HttpClient, protected route: ActivatedRoute, protected state: StateService, protected seo: SeoService, protected og: OpenGraphService, protected chainSelection: TonChainSelectionService) {}
  private get<T>(url: string) { return this.http.get<T>(url).pipe(finalize(() => this.cdr.markForCheck())); }
  ngOnInit(): void { this.routeSub = this.route.paramMap.subscribe(params => { this.page = this.route.snapshot.data.tonPage || 'dashboard'; this.id = params.get('id') || params.get('hash') || ''; this.load(); }); }
  ngOnDestroy(): void { this.contextRequests.unsubscribe(); clearTimeout(this.contextResizeTimer); this.requests.unsubscribe(); this.routeSub?.unsubscribe(); clearInterval(this.refresh); }
  load(): void {
    this.requests.unsubscribe(); this.requests = new Subscription(); clearInterval(this.refresh); this.generation++; this.auctionTld = 'ton'; this.nftFilter = ''; this.nftFilterInput = ''; this.nftCollections = []; this.tokenFilter = ''; this.tokenSort = 'name'; this.mainError = ''; this.mainLoading = false; this.mainPaginated = false; this.state.markBlock$.next({}); this.state.nativeBlockContext$.next(['tx','message','trace','block'].includes(this.page) ? { blocks: [], loading: true, unavailable: false } : null); this.loading = true; this.error = ''; this.data = null; this.feeds = {}; this.resources = {}; this.resourceErrors = {}; this.resourceLoading = {}; this.fiatQuote = null; this.fiatQuotes = {}; this.quoteObservedAt = ''; this.quoteStale = false; this.getterResult = null; this.getterLoading = false; this.getterError = ''; this.getterName = ''; this.getterArgs = ''; this.tab = this.page === 'address' ? 'events' : 'activity';
    this.updateMetadata();
    if (this.page === 'not-found') { this.loading = false; this.error = 'Page not found'; return; }
    this.requests.add(this.state.fiatCurrency$.subscribe(currency => { this.selectedFiat = currency.toUpperCase(); this.applyQuote(); }));
    this.fetchPage();
    if (this.page === 'dashboard') this.requests.add(this.state.blocks$.subscribe(blocks => this.syncDashboard(blocks)));
    if (this.page === 'dashboard' || this.page === 'blocks') this.refresh = setInterval(() => { if (!document.hidden) this.fetchPage(true); }, 15000);
  }
  fetchPage(quiet = false): void {
    const generation = this.generation;
    this.requests.add(this.get<any>(this.endpoint() + (this.page === 'transactions' ? '?limit=20' : this.page === 'blocks' ? '?limit=10' : ['jettons','collections'].includes(this.page) ? '?limit=24' : '')).subscribe({ next: data => { if (generation !== this.generation) return; this.data = data; if (this.page === 'dashboard') this.syncDashboard(this.state.blocksSubject$.value); if (data.master_seqno) this.state.markBlock$.next({blockHeight:Number(data.master_seqno)}); if (this.page === 'block' && String(data.workchain_id) === '-1') this.state.markBlock$.next({blockHeight:Number(data.seqno)}); this.loading = false; this.error = ''; this.updateMetadata(); if (!quiet) { this.loadBlockContext(data); this.loadRelated(); } }, error: e => { if (generation !== this.generation) return; this.loading = false; this.error = e.status === 404 ? 'Not found' : 'Temporarily unavailable'; if (['tx','message','trace','block'].includes(this.page)) this.state.nativeBlockContext$.next({blocks: [], loading: false, unavailable: true}); if (quiet && this.data) this.data._meta = { ...this.data._meta, stale: true }; } }));
  }
  loadBlockContext(data: any): void {
    if (!['tx','message','trace','block'].includes(this.page)) return;
    this.contextRequests.unsubscribe();
    this.contextRequests = new Subscription();
    this.requests.add(this.contextRequests);
    const revision = ++this.contextRevision;
    const generation = this.generation;
    const transaction = this.page === 'trace' ? data.transaction : data;
    const target = this.page === 'block' ? this.blockId(data) : transaction?.block;
    const contextual = tonSelectionForBlockId(target);
    if (contextual) this.chainSelection.set(contextual.workchain, contextual.shard);
    const depth = nativeContextDepth(typeof window === 'undefined' ? 1440 : window.innerWidth);
    this.contextDepth = depth;
    const slots: NativeBlockContext['blocks'] = Array(depth * 2 + 1).fill(null);
    const seed = this.page === 'block' && data._strip?.id ? data._strip : null;
    if (seed) slots[depth] = seed;
    const publish = (blocks: NativeBlockContext['blocks'], loading: boolean, unavailable = false, targetId = seed?.id || target, boundarySlots: number[] = []) => {
      if (generation === this.generation && revision === this.contextRevision) this.state.nativeBlockContext$.next({ blocks, loading, unavailable, targetId, targetSlot: depth, boundarySlots });
    };
    publish(slots, true);
    if (!target) { publish(slots, false, true); return; }
    let settled = false;
    let contextHasTarget = false;
    if (!seed) this.contextRequests.add(this.get<any>('/api/ton/block/' + encodeURIComponent(target)).subscribe({
      next: header => {
        if (!contextHasTarget && header._strip?.id) {
          slots[depth] = header._strip;
          publish([...slots], !settled, settled, header._strip.id);
        }
      },
      error: () => {}, // Context can still return the verified target or an explicit unavailable state.
    }));
    this.contextRequests.add(this.get<any>('/api/ton/block/' + encodeURIComponent(target) + '/context?older=' + depth + '&newer=' + depth).subscribe({
      next: context => {
        settled = true;
        const blocks: NativeBlockContext['blocks'] = Array(slots.length).fill(null);
        if (!Array.isArray(context.blocks) || !Number.isInteger(context.targetIndex) || context.blocks[context.targetIndex]?.id !== context.targetId) {
          publish(slots, false, true); return;
        }
        contextHasTarget = true;
        context.blocks.forEach((block, index) => {
          const slot = depth + index - context.targetIndex;
          if (slot >= 0 && slot < blocks.length) blocks[slot] = block;
        });
        const boundarySlots = blocks.flatMap((block, index) => !block && (index < depth ? context.newer?.status : context.older?.status) === 'boundary' ? [index] : []);
        publish(blocks, false, context.older?.status === 'unavailable' || context.newer?.status === 'unavailable', context.targetId, boundarySlots);
      },
      error: () => { settled = true; publish(slots, false, true); },
    }));
  }
  @HostListener('window:resize') onContextResize(): void {
    clearTimeout(this.contextResizeTimer);
    this.contextResizeTimer = setTimeout(() => {
      if (this.data && ['tx','message','trace','block'].includes(this.page) && nativeContextDepth(window.innerWidth) !== this.contextDepth) this.loadBlockContext(this.data);
    }, 200);
  }
  @HostListener('document:visibilitychange') onVisible(): void { if (!document.hidden && ['dashboard','blocks'].includes(this.page) && !this.mainLoading && !this.mainPaginated) this.fetchPage(true); }
  syncDashboard(blocks: any[]): void {
    if(this.page !== 'dashboard' || !this.data || !blocks?.length)return;
    const next=blocks.filter(block=>block.ton).slice().sort((a,b)=>Number(b.ton.seqno)-Number(a.ton.seqno));
    if(!next.length || Number(next[0].ton.seqno)<Number(this.data.head?.seqno || 0))return;
    this.data={...this.data,head:next[0].ton,blocks:next};this.cdr.markForCheck();
  }
  updateMetadata(): void {
    let title=this.title(); let description='Explore TON blocks, transactions, accounts, jettons and NFTs.';
    if (this.page === 'dashboard' && this.seo.baseDomain === 'masterchain.ton.tx.taxi') description='Explore TON masterchain blocks, transactions and network activity.';
    if(this.page === 'dashboard')this.seo.resetTitle();
    else {
      if(this.id) {
        const name=this.data?.metadata?.name || this.data?.name;
        title += ' ' + (typeof name === 'string' ? name : this.id);
        description=`View TON ${this.title().toLowerCase()} ${this.id}.`;
        if(this.page === 'address' && this.data)description=`TON account ${this.data.name || this.id}. ${this.amount(this.data.balance)} GRAM · ${this.data.status || ''}`;
        if(['tx','message'].includes(this.page) && this.data)description=`TON transaction ${this.id}. ${this.data.success === false ? 'Failed' : this.data.success === true ? 'Confirmed' : 'Transaction'} · ${this.amount(this.data.total_fees)} GRAM fees.`;
        if(this.page === 'block' && this.data)description=`TON block ${this.data.seqno}. ${this.data.tx_quantity} transactions · ${this.amount(this.data.value_flow?.fees_collected?.grams)} GRAM collected fees.`;
        if(['nft','collection','jetton'].includes(this.page) && this.data)description=`${this.title()} ${name || this.id} on TON. ${this.data.metadata?.description || ''}`;
      }
      this.seo.setTitle(title.slice(0,200));
    }
    this.seo.setDescription(description.slice(0,300));
    const path=this.page === 'dashboard' ? '/' : this.page === 'transactions' ? '/txs' : this.page === 'dns-auctions' ? '/dns' : this.page === 'not-found' ? window.location.pathname : '/' + this.page + (this.id ? '/' + encodeURIComponent(this.id) : '');
    this.seo.updateCanonical(this.page === 'block' ? tonLocalePrefix(window.location.pathname) + path : path);this.og.clearOgImage();
  }
  coin(value: string | number | null | undefined): NativeAmount { return { atomic: value == null ? null : String(value), decimals: 9, symbol: 'GRAM', atomicSymbol: 'nanograms', native: true }; }
  rawConfigUrl(): string { return this.endpoint().replace('/config', '/config/raw'); }
  endpoint(): string { if (this.page === 'config') return '/api/ton/config' + (this.route.snapshot.queryParamMap.get('master_seqno') ? '?master_seqno=' + encodeURIComponent(this.route.snapshot.queryParamMap.get('master_seqno')) : ''); return '/api/ton/' + (this.page === 'transactions' ? 'network-transactions' : this.page === 'dns-auctions' ? 'dns/auctions' : this.page) + (this.id ? '/' + encodeURIComponent(this.id) : ''); }
  loadMoreMain(): void {
    if (this.mainLoading || !this.data?._paging?.hasMore) return; this.mainLoading = true; this.mainPaginated = true; this.mainError = ''; clearInterval(this.refresh);
    const paging = this.data._paging;
    const query = new URLSearchParams({limit:this.page === 'transactions' ? '20' : this.page === 'blocks' ? '10' : '24'});
    if (paging.nextAccountId) query.set('last_account_id', paging.nextAccountId);
    else if (paging.nextOffset != null) { query.set('offset', String(paging.nextOffset)); if (paging.masterSeqno) query.set('master_seqno', paging.masterSeqno); }
    else if (paging.nextBefore) query.set('before', paging.nextBefore);
    if (paging.snapshot) query.set('snapshot',paging.snapshot);
    this.requests.add(this.get<any>(this.endpoint() + '?' + query).subscribe({next: result => {
      const key = this.page === 'blocks' ? 'blocks' : this.page === 'jettons' ? 'jettons' : this.page === 'collections' ? 'nft_collections' : 'transactions';
      const old = this.data[key] || []; const keys = new Set(old.map((item: any) => this.identity(item)));
      this.data[key] = old.concat((result[key] || []).filter((item: any) => !keys.has(this.identity(item)))); this.data._paging = result._paging; this.mainLoading = false;
    },error: error => { this.mainLoading = false; this.mainError = error.status === 410 ? 'List updated' : 'Temporarily unavailable'; }}));
  }

  loadRates(): void {
    this.requests.add(this.get<any>('/api/ton/rates').subscribe({next: result => {this.fiatQuotes=result.rates?.GRAM?.prices || result.rates?.TON?.prices || {};this.quoteObservedAt=result._meta?.observedAt || '';this.quoteStale=result._meta?.stale === true;this.applyQuote();},error:()=>{this.fiatQuote=null;this.fiatQuotes={};}}));
  }
  applyQuote(): void { const quote=Number(this.fiatQuotes[this.selectedFiat]);this.fiatQuote=Number.isFinite(quote)&&quote>0?quote:null;this.cdr.markForCheck(); }
  nativeFiat(): string | null {
    if(this.fiatQuote === null || !/^\d+$/.test(String(this.data?.balance)))return null;
    const value=Number(this.data.balance)/1e9*this.fiatQuote;if(!Number.isFinite(value))return null;
    const formatter=new Intl.NumberFormat('en-US',{style:'currency',currency:this.selectedFiat});const smallest=10**-formatter.resolvedOptions().maximumFractionDigits;
    if(value>0 && value<smallest)return '<'+formatter.format(smallest);return formatter.format(value);
  }
  loadRelated(): void {
    if (this.page === 'address') { this.loadRates(); this.loadFeed('events'); this.loadFeed('activity'); this.loadFeed('jettons'); this.loadFeed('nfts'); }
    if (this.page === 'nft') { this.loadFeed('history'); if (this.data.interfaces?.includes('sbt')) this.loadResource('sbt'); }
    if (this.page === 'collection') this.loadFeed('items');
    if (this.page === 'block') { this.loadFeed('transactions'); if (String(this.data.workchain_id) === '-1') this.loadFeed('shards'); }
    if (this.page === 'jetton') this.loadFeed('holders');
    if (this.page === 'dns') { this.loadFeed('bids'); this.loadResource('resolve'); }
    if (this.page === 'staking-pool') this.loadFeed('history');
  }
  loadFeed(name: string, more = false): void {
    const feed = this.feeds[name] || { items: [], loading: false, error: '' }; if (feed.loading) return;
    feed.loading = true; feed.error = ''; feed.restart = false; this.feeds[name] = feed;
    const subpath = name === 'activity' ? 'transactions' : name.startsWith('currency-') ? 'extra-currency/' + name.slice(9) + '/history' : name;
    let path = this.endpoint() + '/' + subpath + '?limit=24';
    if (name === 'nfts' && this.nftFilter) path += '&collection=' + encodeURIComponent(this.nftFilter);
    if (more && feed.paging?.nextBeforeLt) path += '&before_lt=' + encodeURIComponent(feed.paging.nextBeforeLt);
    else if (more && feed.paging?.nextBefore) path += '&before=' + encodeURIComponent(feed.paging.nextBefore);
    else if (more && feed.paging?.nextOffset != null) path += '&offset=' + encodeURIComponent(feed.paging.nextOffset);
    if (more && feed.paging?.snapshot) path += '&snapshot=' + encodeURIComponent(feed.paging.snapshot);
    feed.request = this.get<any>(path).subscribe({ next: result => {
      const items = this.list(result); const existing = more ? feed.items : []; const keys = new Set(existing.map(x => this.identity(x)));
      feed.items = existing.concat(items.filter(x => !keys.has(this.identity(x))));
      if (name === 'nfts' && !this.nftFilter && Array.isArray(result.collections)) this.nftCollections = result.collections; feed.paging = result._paging; feed.stale = result._meta?.stale === true; feed.loading = false;
    }, error: e => { feed.restart = e.status === 410; feed.error = feed.restart ? 'List updated' : e.status === 400 ? 'Invalid filter' : 'Temporarily unavailable'; feed.loading = false; } });
    this.requests.add(feed.request);
  }
  filterNfts(value: string): void {
    this.nftFilter = value.trim(); this.nftFilterInput = this.nftFilter;
    const previous=this.feeds.nfts; previous?.request?.unsubscribe();
    this.feeds.nfts={items:[],loading:false,error:''}; this.loadFeed('nfts');
  }
  filteredTokens(): any[] {
    const filter=this.tokenFilter.trim().toLowerCase();
    const items=(this.feeds.jettons?.items || []).filter(item=>[item.jetton?.name,item.jetton?.symbol,item.jetton?.address].some(value=>String(value || '').toLowerCase().includes(filter)));
    return items.sort((a,b)=>{
      if(this.tokenSort === 'balance' && /^\d+$/.test(a.balance) && /^\d+$/.test(b.balance)) {
        const da=Number(a.jetton?.decimals),db=Number(b.jetton?.decimals);
        if(Number.isInteger(da)&&Number.isInteger(db)&&da>=0&&db>=0&&da<=255&&db<=255) {const scale=Math.max(da,db);const au=this.currentJettonUnits(a.balance,a.jetton),bu=this.currentJettonUnits(b.balance,b.jetton);if(au===null || bu===null)return au===null?(bu===null?0:1):-1;const av=BigInt(au)*BigInt(10)**BigInt(scale-da);const bv=BigInt(bu)*BigInt(10)**BigInt(scale-db);if(av!==bv)return av>bv?-1:1;}
      }
      return String(a.jetton?.name || a.jetton?.symbol || a.jetton?.address).localeCompare(String(b.jetton?.name || b.jetton?.symbol || b.jetton?.address));
    });
  }
  extraCurrencies(): any[] { const values=this.data?.state?.extra_balance || this.data?.extra_balance;return Array.isArray(values)?values:[]; }
  openTab(name: string): void { this.tab = name; if (['events','nft-history','jetton-history'].includes(name) && !this.feeds[name]) this.loadFeed(name); }
  loadResource(name: string): void {
    if (this.resourceLoading[name] || this.resources[name]) return; this.resourceLoading[name] = true; this.resourceErrors[name] = false;
    const directMultisig = name === 'multisigs' && this.data?.interfaces?.includes('multisig_v2');
    this.requests.add(this.get<any>(this.endpoint() + '/' + (directMultisig ? 'multisig' : name)).subscribe({next: value => {this.resources[name] = directMultisig ? {multisigs:[value],_meta:value._meta} : value; this.resourceLoading[name] = false;}, error: () => {this.resourceErrors[name] = true; this.resourceLoading[name] = false;}}));
  }
  runGetter(): void {
    if (!this.getterName || this.getterLoading) return; this.getterLoading = true; this.getterError = ''; this.getterResult = null;
    let args: string[] = [];
    try { const input = this.getterArgs.trim(); if (input) { const parsed = input.startsWith('[') ? JSON.parse(input) : input.split(',').map(value => value.trim()); if (!Array.isArray(parsed) || parsed.some(value => typeof value !== 'string')) throw new Error(); args = parsed; } } catch { this.getterError = 'Enter comma-separated arguments or a JSON array of strings'; this.getterLoading = false; return; }
    const query = args.map(value => 'args=' + encodeURIComponent(value)).join('&');
    this.requests.add(this.get<any>(this.endpoint() + '/methods/' + encodeURIComponent(this.getterName) + (query ? '?' + query : '')).subscribe({next: value => {this.getterResult = value; this.getterLoading = false;}, error: () => {this.getterError = 'Unable to run method'; this.getterLoading = false;}}));
  }
  fieldLabel(value: string): string { return value.replace(/_/g, ' '); }
  phaseValue(key: string, value: any): string { return ['gas_fees','total_fwd_fees','total_action_fees','storage_fees_collected','storage_fees_due','credit','msg_fees','fwd_fees'].includes(key) && /^-?\d+$/.test(String(value)) ? this.amount(value) + ' GRAM' : this.text(value); }
  messageTotal(tx: any, incoming: boolean): string {
    const messages = incoming ? (tx.in_msg ? [tx.in_msg] : []) : tx.out_msgs || [];
    if (!messages.length) return '0'; let sum = BigInt(0);
    for (const message of messages) { if (message.value == null && message.msg_type !== 'int_msg') continue; if (!/^\d+$/.test(String(message.value))) return '—'; sum += BigInt(message.value); }
    return this.amount(sum.toString());
  }
  actionReferencesNft(action: any): boolean {
    const normalize=(value:string)=>/^-?\d:[a-fA-F0-9]{64}$/.test(value)?value.toLowerCase():value;
    const targets=new Set([this.id,this.data?.address].filter(value=>typeof value==='string').map(normalize));
    const visit=(value:any,depth=0):boolean=>{if(depth>16 || value==null)return false;if(typeof value==='string')return targets.has(normalize(value));if(Array.isArray(value))return value.some(item=>visit(item,depth+1));if(typeof value==='object')return Object.values(value).some(item=>visit(item,depth+1));return false;};
    return visit(action);
  }
  visibleActions(event: any): any[] { return this.page === 'nft' ? (event.actions || []).filter((action:any)=>this.actionReferencesNft(action)) : event.actions || []; }
  otherActions(event: any): any[] { return this.page === 'nft' ? (event.actions || []).filter((action:any)=>!this.actionReferencesNft(action)) : []; }
  actionTitle(action: any): string { return ({NftItemTransfer:'NFT transfer',NftPurchase:'NFT purchase'}[action.type] || action.type || 'Action').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^Ton Transfer$/, 'GRAM transfer'); }
  actionFields(action: any): {label:string,text:string,route?:string[],flagged?:boolean}[] {
    const payload = this.actionDetails(action); const fields = [];
    for (const [key,value] of Object.entries<any>(payload)) {
      if (value == null || key === 'ton_attached' && payload.gram_attached != null || key === 'amount' && payload.stake_meta) continue;
      const label = this.fieldLabel(key).replace(/^(ton|gram) attached$/, 'Amount attached');
      if (key === 'currency' && value?.id != null) { fields.push({label,text:value.symbol || String(value.id),route:['/extra-currency',String(value.id)]}); continue; }
      if (value?.address) { fields.push({label,text:value.name || value.symbol || value.address,route:[key.includes('jetton') ? '/jetton' : key.includes('nft') ? '/nft' : '/address',value.address],flagged:value.is_scam || value.verification === 'blacklist'}); continue; }
      if (typeof value === 'string' && /^(?:-?\d:[a-fA-F0-9]{64}|[A-Za-z0-9_-]{48})$/.test(value)) {fields.push({label,text:value,route:[key.includes('nft') ? '/nft' : '/address',value]}); continue;}
      if (value?.currency_type && value.value != null) {fields.push({label,text:this.price({price:value})}); continue;}
      if (['amount','ton_attached','gram_attached','fee','refund','cost','value'].includes(key) && /^-?\d+$/.test(String(value))) {
        const jetton = payload.jetton; const native = /^(TonTransfer|DepositStake|WithdrawStake|WithdrawStakeRequest|ElectionsDepositStake|ElectionsRecoverStake|SmartContractExec|Subscription|UnSubscription|AuctionBid|GasRelay)$/.test(action.type);
        fields.push({label,text:action.type === 'ExtraCurrencyTransfer' && payload.currency ? this.tokenAmount(value,payload.currency.decimals) + ' ' + (payload.currency.symbol || 'units') : jetton ? this.tokenAmount(value,jetton.decimals) + ' ' + (jetton.symbol || 'tokens') : native ? this.amount(value) + ' GRAM' : this.text(value)}); continue;
      }
      fields.push({label,text:Array.isArray(value) && value.every(item => typeof item !== 'object') ? value.join(', ') : this.text(value)});
    }
    return fields;
  }
  actionDetails(action: any): any { return action?.[action.type] || {}; }
  transactionHash(value: any): string { return typeof value === 'string' ? value : value?.hash || ''; }
  list(value: any): any[] { if (Array.isArray(value)) return value; for (const key of ['jettons','nft_collections','traces','transactions','nft_items','balances','holders','validators','blocks','events','shards','items','operations','addresses','data','apy']) if (Array.isArray(value?.[key])) return value[key]; return []; }
  identity(x: any): string { return String(x.id || x.hash || x.address || x.metadata?.address || x.event_id || x.public_key || x.jetton?.address || x.seqno || JSON.stringify(x)); }
  amount(value: any, decimals: any = 9): string {
    if (value === undefined || value === null) return '—'; const raw = String(value); if (!/^-?\d+$/.test(raw)) return '—';
    const places = Number(decimals); if (!Number.isInteger(places) || places < 0 || places > 255) return raw;
    const negative = raw.startsWith('-'); const digits = (negative ? raw.slice(1) : raw).padStart(places + 1, '0');
    const whole = (places ? digits.slice(0, -places) : digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fraction = places ? digits.slice(-places).replace(/0+$/, '') : ''; return (negative ? '-' : '') + whole + (fraction ? '.' + fraction : '');
  }
  currentJettonUnits(value: any, jetton: any): string | null { return scaledJettonUnits(value,jetton?.scaled_ui); }
  currentJettonAmount(value: any, jetton: any): string { const units=this.currentJettonUnits(value,jetton);return units === null ? '—' : this.tokenAmount(units,jetton?.decimals ?? jetton?.metadata?.decimals); }
  tokenAmount(value: any, decimals: any): string { return decimals == null ? this.text(value) + ' units' : this.amount(value,decimals); }
  isAddress(value: any): boolean { return typeof value === 'string' && /^(?:-?\d:[a-fA-F0-9]{64}|[A-Za-z0-9_-]{48})$/.test(value); }
  address(value: any): string { return typeof value === 'string' ? value : value?.address || ''; }
  label(value: any): string { return value?.name || this.address(value); }
  short(value: any): string { const text = this.address(value); return text.length > 22 ? text.slice(0,10) + '…' + text.slice(-8) : text; }
  date(value: any): Date | null { return value ? new Date(Number(value) * 1000) : null; }
  safeUrl(value: any): string | null { if (typeof value !== 'string') return null; if (value.startsWith('ipfs://')) value = 'https://ipfs.io/ipfs/' + value.slice(7).replace(/^ipfs\//, ''); try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } }
  media(item: any): string | null { const preview = item?.previews?.find((p: any) => p.resolution === '500x500'); return this.safeUrl(preview?.url || item?.metadata?.image || item?.image); }
  imageLoaded(event: Event): void { (event.target as HTMLImageElement).parentElement?.classList.remove('media-pending'); }
  hideImage(event: Event): void { this.imageLoaded(event); (event.target as HTMLImageElement).hidden = true; (event.target as HTMLImageElement).parentElement?.classList.add('image-unavailable'); }
  name(item: any): string { return item?.metadata?.name || item?.name || (item?.address ? 'NFT ' + this.short(item.address) : 'Unnamed NFT'); }
  blockId(block: any): string { if (block?.last_known_block_id) return String(block.last_known_block_id); if (block?.last_known_block) return this.blockId(block.last_known_block); return block?.workchain_id != null ? '(' + block.workchain_id + ',' + block.shard + ',' + block.seqno + ')' : String(block?.id || block?.height || block?.seqno || ''); }
  typeofValue(value: any): string { return typeof value; }
  selectAuctionTld(value: string): void { if (!['ton','t.me'].includes(value)) return; this.auctionTld=value; this.loading=true; this.data=null; this.error=''; this.requests.add(this.get<any>(this.endpoint()+'?tld='+encodeURIComponent(value)).subscribe({next: data=>{this.data=data;this.loading=false;},error:()=>{this.error='Temporarily unavailable';this.loading=false;}})); }
  trackEntry(_index: number, entry: {key:string}): string { return entry.key; }
  configEntries(): {key:string,value:any}[] { return this.entries(this.data).filter(entry => !entry.key.startsWith('_')); }
  title(): string { const titles: {[key:string]:string} = {jettons:'Jettons',collections:'NFT collections',dashboard:'TON Explorer',blocks:'Blocks',block:'Block',tx:'Transaction',address:'Account',nft:'NFT',collection:'Collection',jetton:'Jetton',validators:'Validators',transactions:'Transactions',message:'Message',trace:'Trace','not-found':'Page not found',dns:'TON DNS','dns-auctions':'DNS auctions','staking-pool':'Staking pool','extra-currency':'Extra currency',config:'Network configuration'}; return titles[this.page]; }
  entries(value: any): {key:string,value:any}[] { return value && typeof value === 'object' ? Object.entries(value).map(([key,value]) => ({key,value})) : []; }
  text(value: any): string { return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'); }
  messages(): any[] { return [...(this.data?.in_msg ? [{...this.data.in_msg, direction:'Incoming'}] : []), ...(this.data?.out_msgs || []).map((m: any) => ({...m,direction:'Outgoing'}))]; }
  price(sale: any): string { const price = sale?.price; return price && typeof price === 'object' ? this.amount(price.value, price.decimals ?? 9) + ' ' + (price.currency_type === 'native' ? 'GRAM' : (price.token_name || 'tokens')) : '—'; }
}
