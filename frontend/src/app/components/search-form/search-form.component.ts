import { TonChainSelectionService } from '@app/ton/ton-chain-selection.service';
import { navigateTonBlock } from '@app/ton/block-navigation';
import { tonBlockIdentityFromUrl } from '@app/ton/chain-selection';
import { tonSelectionKey } from '@app/ton/chain-selection';
import { HttpClient } from '@angular/common/http';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, Output, ViewChild, HostListener, ElementRef, Input } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { EventType, NavigationStart, Router } from '@angular/router';
import { AssetsService } from '@app/services/assets.service';
import { Env, StateService } from '@app/services/state.service';
import { TxTaxiExplorer, TxTaxiExplorerRegistryService, TxTaxiSearchCandidate, TxTaxiSearchOptions } from '@app/services/tx-taxi-explorer-registry.service';
import { Observable, defer, of, Subject, zip, BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, finalize, distinctUntilChanged, switchMap, catchError, map, shareReplay, startWith, tap } from 'rxjs/operators';
import { ElectrsApiService } from '@app/services/electrs-api.service';
import { RelativeUrlPipe } from '@app/shared/pipes/relative-url/relative-url.pipe';
import { ApiService } from '@app/services/api.service';
import { SearchResultsComponent } from '@components/search-form/search-results/search-results.component';
import { Network, findOtherNetworks, getRegex, getTargetUrl, needBaseModuleChange } from '@app/shared/regex.utils';

interface SearchTarget {
  kind: 'explorer' | 'candidate' | 'router';
  chainId?: string;
  destinationId?: string;
  destinationDefault?: boolean;
  origin?: string;
  name: string;
  accentColor: string;
  iconUrl: string;
  iconAlt: string;
  confirmed?: boolean;
  directUrl?: string;
  candidate?: TxTaxiSearchCandidate;
}

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFormComponent implements OnInit {
  @Input() hamburgerOpen = false;
  readonly sourceChainId = 'ton';
  readonly defaultChainIconUrl = 'https://tx.taxi/assets/chains/ton.png';
  readonly defaultChainIconAlt = 'TON explorer';
  readonly defaultChainAccent = '#0098ea';
  env: Env;
  network = '';
  assets: object = {};
  pools: object[] = [];
  @ViewChild('chainMenu') chainMenu: NgbDropdown;
  pendingSearchRequests = 0;
  isSearching = false;
  isTypeaheading$ = new BehaviorSubject<boolean>(false);
  typeAhead$: Observable<any>;
  explorers$: Observable<TxTaxiExplorer[]>;
  thirdPartyExplorers$: typeof this.explorerRegistry.thirdPartyExplorers$;
  selectedChainId$ = new BehaviorSubject<string | undefined>(this.sourceChainId);
  activeTarget$ = new BehaviorSubject<SearchTarget>({
    kind: 'explorer',
    chainId: this.sourceChainId,
    name: 'TON',
    accentColor: this.defaultChainAccent,
    iconUrl: this.defaultChainIconUrl,
    iconAlt: this.defaultChainIconAlt,
  });
  searchOptions$ = new BehaviorSubject<TxTaxiSearchOptions | undefined>(undefined);
  searchForm: UntypedFormGroup;
  dropdownHidden = false;
  searchError = '';
  explorerRegistryLoaded = false;
  private explorers: TxTaxiExplorer[] = [];
  private additionalExplorerIds = new Set<string>();
  private selectionChanges$ = new BehaviorSubject<number>(0);
  private manualDestinationId: string | undefined;
  private hasManualSelection = false;
  private selectedExplorerTarget: SearchTarget | undefined;
  private registryInitialized = false;
  private manualChainId: string | undefined = this.sourceChainId;
  private manualOverrideSearchText: string | undefined;
  private manualOverrideTarget: SearchTarget | undefined;
  private searchOptions: TxTaxiSearchOptions | undefined;
  private suppressMenuOnFocus = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const host = this.elementRef.nativeElement;
    const inside = event.composedPath?.().includes(host) || host.contains(event.target);
    if (!inside && !this.isSearching && !this.pendingSearchRequests && !this.isTypeaheading$.value) {
      this.chainMenu?.close();
    }
    if (inside && this.isSourceChainSelected()) {
      this.dropdownHidden = false;
    } else {
      this.dropdownHidden = true;
    }
  }

  @HostListener('document:keydown.escape')
  closeChainMenu(): void {
    this.chainMenu?.close();
  }

  private querySearchOptions(searchText: string, probe = false): Observable<TxTaxiSearchOptions | undefined> {
    return defer(() => {
      this.pendingSearchRequests++;
      return this.explorerRegistry.searchOptions$(searchText, probe, this.sourceChainId, this.hasManualSelection ? this.manualChainId : undefined, this.hasManualSelection ? this.manualDestinationId : undefined).pipe(
        finalize(() => this.pendingSearchRequests--),
      );
    });
  }

  regexAddress = getRegex('address', 'mainnet'); // Default to mainnet
  regexBlockhash = getRegex('blockhash', 'mainnet');
  regexTransaction = getRegex('transaction');
  regexBlockheight = getRegex('blockheight');
  regexDate = getRegex('date');
  regexUnixTimestamp = getRegex('timestamp');

  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  @Output() searchTriggered = new EventEmitter();
  @ViewChild('searchResults') searchResults: SearchResultsComponent;
  @HostListener('keydown', ['$event']) keydown($event): void {
    this.handleKeyDown($event);
  }

  @ViewChild('searchInput') searchInput: ElementRef;

  constructor(
    private cdr: ChangeDetectorRef,
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private assetsService: AssetsService,
    private stateService: StateService,
    private http: HttpClient,
    private electrsApiService: ElectrsApiService,
    private apiService: ApiService,
    private relativeUrlPipe: RelativeUrlPipe,
    private elementRef: ElementRef,
    private explorerRegistry: TxTaxiExplorerRegistryService,
    private tonSelection: TonChainSelectionService,
  ) {
    this.explorers$ = this.explorerRegistry.explorers$;
  }

  ngOnInit(): void {
    this.env = this.stateService.env;
    this.thirdPartyExplorers$ = this.explorerRegistry.thirdPartyExplorers$;
    this.stateService.networkChanged$.subscribe((network) => {
      this.network = network;
      // TODO: Eventually change network type here from string to enum of consts
      this.regexAddress = getRegex('address', network as any || 'mainnet');
      this.regexBlockhash = getRegex('blockhash', network as any || 'mainnet');
    });

    this.router.events.subscribe((e: NavigationStart) => { // Reset search focus when changing page
      if (this.searchInput && e.type === EventType.NavigationStart) {
        this.chainMenu?.close();
        this.searchInput.nativeElement.blur();
      }
    });

    this.stateService.searchFocus$.subscribe(() => {
      if (!this.searchInput) { // Try again a bit later once the view is properly initialized
        setTimeout(() => this.focusSearchInputWithoutMenu(), 100);
      } else if (this.searchInput) {
        this.focusSearchInputWithoutMenu();
      }
    });

    this.searchForm = this.formBuilder.group({
      searchText: ['', Validators.required],
    });

    this.explorers$.subscribe((explorers) => {
      this.explorerRegistryLoaded = true;
      this.explorers = explorers;
      if (!this.registryInitialized && explorers.length) {
        this.registryInitialized = true;
        const source = explorers.find(explorer => explorer.chainId === this.sourceChainId);
        const destination = source?.destinations?.find(item => this.isOpenedExplorer(item));
        if (!this.hasManualSelection) this.manualDestinationId = destination?.destinationId;
      }
      this.updateActiveTarget();
      this.cdr.markForCheck();
    });

    if (this.network === 'liquid' || this.network === 'liquidtestnet') {
      this.assetsService.getAssetsMinimalJson$
        .subscribe((assets) => {
          this.assets = assets;
        });
    }

    const searchText$ = this.searchForm.get('searchText').valueChanges
    .pipe(
      map((text) => {
        return text.trim();
      }),
      tap((text) => {
        this.searchError = '';
        this.stateService.searchText$.next(text);
      }),
      distinctUntilChanged(),
      tap((text) => this.clearManualOverrideOnInputChange(text)),
      shareReplay(1),
    );

    const searchContext$ = combineLatest([searchText$.pipe(startWith('')), this.selectionChanges$]);
    searchContext$.pipe(
      debounceTime(120),
      switchMap(([searchText, revision]) => this.querySearchOptions(searchText).pipe(
        map((options) => ({ searchText, revision, options })),
      )),
    ).subscribe(({ searchText, revision, options }) => {
      if (options && this.currentSearchText() === searchText && revision === this.selectionChanges$.value) {
        this.setSearchOptions(options);
      }
    });

    searchContext$.pipe(
      debounceTime(420),
      switchMap(([searchText, revision]) => this.querySearchOptions(searchText, true).pipe(
        map((options) => ({ searchText, revision, options })),
      )),
    ).subscribe(({ searchText, revision, options }) => {
      if (options && this.currentSearchText() === searchText && revision === this.selectionChanges$.value) {
        this.setSearchOptions(options);
      }
    });

    this.typeAhead$ = this.searchForm.valueChanges.pipe(startWith(this.searchForm.value), map(value => ({searchText:value.searchText?.trim() || '',addresses:[],nodes:[],channels:[],otherNetworks:[],pools:[],liquidAsset:[],hashQuickMatch:0})));
  }

  handleKeyDown($event): void {
    if (this.isSourceChainSelected() && $event.target === this.searchInput?.nativeElement) {
      this.searchResults?.handleKeyDown($event);
    }
  }

  trackExplorer(_index: number, explorer: TxTaxiExplorer): string {
    return explorer.id;
  }

  trackCandidate(_index: number, candidate: TxTaxiSearchCandidate): string {
    return `${candidate.chainId}:${candidate.destinationId || ''}:${candidate.objectType}`;
  }

  isSelectedExplorer(explorer: TxTaxiExplorer): boolean {
    const target = this.activeTarget$.value;
    const destinationId = explorer.destinationId || explorer.destinations?.find(destination => destination.default)?.destinationId;
    return target.kind !== 'router' && target.chainId === explorer.chainId
      && target.destinationId === destinationId;
  }

  isSelectedCandidate(candidate: TxTaxiSearchCandidate): boolean {
    const target = this.activeTarget$.value;
    return !this.selectedExplorer() && target.kind !== 'router' && target.chainId === candidate.chainId
      && target.destinationId === candidate.destinationId;
  }

  isOpenedExplorer(explorer: TxTaxiExplorer): boolean {
    return this.isSourceOrigin(explorer.origin);
  }

  selectedExplorer(): TxTaxiExplorer | undefined {
    return this.explorers.find(explorer => explorer.chainId === this.activeTarget$.value.chainId);
  }

  selectedExternalCandidate(): TxTaxiSearchCandidate | undefined {
    const target = this.activeTarget$.value;
    return !this.selectedExplorer() && target.candidate
      ? { ...target.candidate, confirmed: Boolean(target.confirmed), directUrl: target.directUrl }
      : undefined;
  }

  isSelectedExternalCandidate(candidate: TxTaxiSearchCandidate): boolean {
    const selected = this.selectedExternalCandidate();
    return Boolean(selected && selected.chainId === candidate.chainId && selected.destinationId === candidate.destinationId);
  }

  otherExplorers(explorers: TxTaxiExplorer[]): TxTaxiExplorer[] {
    const selected = this.selectedExplorer();
    return explorers.filter(explorer => explorer.chainId !== selected?.chainId);
  }

  childDestinations(explorer: TxTaxiExplorer): TxTaxiExplorer[] {
    return explorer.destinations?.filter(destination => !destination.default) || [];
  }

  additionalExplorersExpanded(explorer: TxTaxiExplorer): boolean {
    return this.additionalExplorerIds.has(explorer.chainId);
  }

  toggleAdditionalExplorers(explorer: TxTaxiExplorer): void {
    if (this.additionalExplorerIds.has(explorer.chainId)) this.additionalExplorerIds.delete(explorer.chainId);
    else this.additionalExplorerIds.add(explorer.chainId);
  }

  isSourceChainSelected(): boolean {
    const target = this.activeTarget$.value;
    return this.selectedChainId$.value === this.sourceChainId && (!target.origin || this.isSourceOrigin(target.origin));
  }

  private isSourceOrigin(origin: string): boolean {
    if (typeof window === 'undefined') return false;
    const current = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
      ? this.tonSelection.defaultWorkchain === -1 ? 'https://masterchain.ton.tx.taxi' : 'https://ton.tx.taxi'
      : window.location.origin;
    try { return new URL(origin).origin === current; } catch { return false; }
  }

  private selectionChanged(): void {
    this.additionalExplorerIds.clear();
    const menu = this.elementRef.nativeElement?.querySelector?.('.search-chain-menu') as HTMLElement | undefined;
    const focusInMenu = typeof document !== 'undefined' && menu?.contains(document.activeElement);
    this.isSearching = false;
    this.searchError = '';
    this.setSearchOptions(undefined);
    this.selectionChanges$.next(this.selectionChanges$.value + 1);
    setTimeout(() => {
      if (!menu) return;
      menu.scrollTop = 0;
      if (focusInMenu) menu.querySelector<HTMLButtonElement>('.search-chain-selected-group .is-current button, .search-chain-selected-group button.search-chain-candidate')?.focus({ preventScroll: true });
    });
  }

  isAutomaticRoutingSelected(): boolean {
    return this.manualChainId === undefined && this.activeTarget$.value.kind === 'router';
  }

  selectAutomaticRouting(): void {
    this.manualChainId = undefined;
    this.manualDestinationId = undefined;
    this.hasManualSelection = false;
    this.selectedExplorerTarget = undefined;
    this.manualOverrideSearchText = undefined;
    this.manualOverrideTarget = undefined;
    this.selectionChanged();
    this.dropdownHidden = true;
    setTimeout(() => this.dropdownHidden = true);
  }

  selectExplorer(explorer: TxTaxiExplorer): void {
    const destination = explorer.destinations?.find(item => item.default) || explorer.destinations?.[0] || explorer;
    this.manualChainId = destination.chainId;
    this.manualDestinationId = destination.destinationId;
    this.hasManualSelection = true;
    this.manualOverrideSearchText = this.currentSearchText();
    this.manualOverrideTarget = this.targetForExplorer(destination);
    this.selectedExplorerTarget = this.manualOverrideTarget;
    this.selectionChanged();
    this.dropdownHidden = true;
    this.searchError = '';
    setTimeout(() => this.dropdownHidden = true);
  }

  selectCandidate(candidate: TxTaxiSearchCandidate): void {
    this.manualChainId = candidate.chainId;
    this.manualDestinationId = candidate.destinationId;
    this.hasManualSelection = true;
    this.manualOverrideSearchText = this.currentSearchText();
    this.manualOverrideTarget = this.targetForCandidate(candidate);
    this.selectedExplorerTarget = { ...this.manualOverrideTarget, kind: 'explorer', confirmed: undefined, directUrl: undefined };
    this.selectionChanged();
    this.dropdownHidden = true;
    this.searchError = '';
    setTimeout(() => this.dropdownHidden = true);
  }

  private focusSearchInputWithoutMenu(): void {
    if (!this.searchInput) return;
    this.suppressMenuOnFocus = true;
    this.searchInput.nativeElement.focus();
    this.suppressMenuOnFocus = false;
  }

  onSearchInputFocus(): void {
    if (!this.suppressMenuOnFocus) this.showSourceSuggestions();
  }

  showSourceSuggestions(): void {
    this.chainMenu?.open();
    if (document.activeElement !== this.searchInput?.nativeElement) {
      this.searchInput?.nativeElement.focus();
    }
    this.dropdownHidden = !this.isSourceChainSelected();
  }

  itemSelected(): void {
    setTimeout(() => this.search());
  }

  selectedResult(result: any): void {
    if (result == null) { this.search(); return; }
    if (!this.isSourceChainSelected()) {
      if (typeof result === 'string') {
        this.search(result);
      }
      return;
    }

    if (typeof result === 'string') {
      this.search(result);
    } else if (typeof result === 'number' && result <= this.stateService.latestBlockHeight) {
      this.navigate('/block/', result.toString());
    } else if (result.alias) {
      this.navigate('/lightning/node/', result.public_key);
    } else if (result.short_id) {
      this.navigate('/lightning/channel/', result.id);
    } else if (result.network) {
      if (result.isNetworkAvailable) {
        this.navigate('/address/', result.address, undefined, result.network);
      } else {
        this.searchForm.setValue({
          searchText: '',
        });
        this.isSearching = false;
      }
    } else if (result.slug) {
      this.navigate('/mining/pool/', result.slug);
    }
  }

  search(result?: string): void {
    const searchText = result || this.searchForm.value.searchText.trim();
    if (!searchText) {
      return;
    }

    const manualTarget = this.currentManualTarget(searchText);
    if (manualTarget) {
      this.searchTarget(manualTarget, searchText);
      return;
    }

    if (this.manualChainId === this.sourceChainId) {
      this.searchSourceChain(searchText, true);
      return;
    }
    this.searchAutomatic(searchText);
  }

  private searchAutomatic(searchText: string): void {
    const resolvedCandidate = this.resolvedCandidate();
    if (resolvedCandidate) {
      this.searchTarget(this.targetForCandidate(resolvedCandidate), searchText);
      return;
    }

    if (this.searchOptions?.input === searchText && this.searchOptions.phase === 'resolved' && this.searchOptions.candidates.length) {
      this.searchRouter(searchText);
      return;
    }

    this.isSearching = true;
    this.searchError = '';
    const revision = this.selectionChanges$.value;
    this.querySearchOptions(searchText, true).subscribe((options) => {
      if (revision !== this.selectionChanges$.value) return;
      if (this.currentSearchText() !== searchText) {
        this.isSearching = false;
        return;
      }

      if (options) {
        this.setSearchOptions(options);
      }

      const currentManualTarget = this.currentManualTarget(searchText);
      if (currentManualTarget) {
        this.searchTarget(currentManualTarget, searchText);
      } else if (this.resolvedCandidate()) {
        this.searchTarget(this.targetForCandidate(this.resolvedCandidate()!), searchText);
      } else if (options?.candidates.length) {
        this.searchRouter(searchText);
      } else {
        this.searchSourceChain(searchText);
      }
    });
  }

  private searchSourceChain(searchText: string, allowAutomaticFallback = false): void {
    this.isSearching = true;
    this.searchError = '';
    const selected = this.tonSelection.current;
    const scope = tonSelectionKey(selected);
    const revision = this.selectionChanges$.value;
    this.http.get<{type:string;id:string}>('/api/ton/resolve',{params:{value:searchText,workchain:String(selected.workchain),...(selected.shard ? {shard:selected.shard} : {})}}).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: result => {
        if (revision !== this.selectionChanges$.value) return;
        if (this.searchForm.value.searchText.trim() !== searchText || scope !== tonSelectionKey(this.tonSelection.current)) { this.isSearching=false; return; }
        if (!['tx','block','address','nft','collection','jetton','message','trace'].includes(result.type)) { this.showSearchError('No match found.'); return; }
        if (result.type === 'block') navigateTonBlock(this.router, result.id);
        else this.router.navigate(['/',result.type,result.id]);
        this.isSearching = false;
        this.chainMenu?.close();
        this.searchTriggered.emit();
      },
      error: error => {
        if (revision !== this.selectionChanges$.value || this.currentSearchText() !== searchText) return;
        if (allowAutomaticFallback && [400,404].includes(error.status)) { this.searchAutomatic(searchText); return; }
        this.showSearchError(error.status === 404 ? 'No match found.' : 'Search unavailable. Try again.');
      }
    });
  }

  private searchTarget(target: SearchTarget, searchText: string): void {
    if (target.kind === 'explorer' && !target.destinationId && target.chainId === this.sourceChainId && (!target.origin || this.isSourceOrigin(target.origin))) {
      this.searchSourceChain(searchText);
      return;
    }

    this.isSearching = true;
    this.searchError = '';
    this.searchTriggered.emit();
    if (target.kind === 'candidate' && target.confirmed && target.directUrl) {
      if (target.chainId === this.sourceChainId && this.isSourceOrigin(target.directUrl)) {
        const url = new URL(target.directUrl);
        const block = tonBlockIdentityFromUrl(url.href);
        if (block) navigateTonBlock(this.router, block);
        else this.router.navigateByUrl(url.pathname + url.search + url.hash);
        this.isSearching=false; return;
      }
      window.location.assign(target.directUrl);
      return;
    }

    if (target.chainId) {
      window.location.assign(this.explorerRegistry.chainSearchUrl(target.chainId, searchText, target.destinationId));
      return;
    }

    this.searchRouter(searchText);
  }

  private searchRouter(searchText: string): void {
    this.isSearching = true;
    this.searchError = '';
    this.searchTriggered.emit();
    window.location.assign(this.explorerRegistry.routerSearchUrl(searchText, this.sourceChainId));
  }

  private clearManualOverrideOnInputChange(searchText: string): void {
    if (this.manualOverrideSearchText !== undefined && this.manualOverrideSearchText !== searchText) {
      this.manualOverrideSearchText = undefined;
      this.manualOverrideTarget = undefined;
    }
    this.setSearchOptions(undefined);
  }

  private currentSearchText(): string {
    return this.searchForm?.value?.searchText?.trim() || '';
  }

  private currentManualTarget(searchText = this.currentSearchText()): SearchTarget | undefined {
    return this.manualOverrideSearchText === searchText && this.manualOverrideTarget
      ? this.manualOverrideTarget
      : this.hasManualSelection ? this.defaultSearchTarget() : undefined;
  }

  private resolvedCandidate(): TxTaxiSearchCandidate | undefined {
    if (!this.searchOptions?.resolvedChainId || this.searchOptions.phase !== 'resolved' || this.searchOptions.input !== this.currentSearchText()) {
      return undefined;
    }

    return this.searchOptions.candidates.find(
      (candidate) => candidate.chainId === this.searchOptions?.resolvedChainId
        && (!this.searchOptions?.resolvedDestinationId || candidate.destinationId === this.searchOptions.resolvedDestinationId) && candidate.confirmed && candidate.confidence === 'strong' && Boolean(candidate.directUrl),
    );
  }

  private setSearchOptions(options: TxTaxiSearchOptions | undefined): void {
    if (
      options
      && this.searchOptions?.input === options.input
      && this.searchOptions.phase === 'resolved'
      && options.phase === 'classified'
    ) {
      return;
    }

    this.searchOptions = options;
    this.searchOptions$.next(options);
    this.updateActiveTarget();
  }

  private updateActiveTarget(): void {
    const manualTarget = this.currentManualTarget();
    const resolvedCandidate = manualTarget ? undefined : this.resolvedCandidate();
    const target = manualTarget
      ?? (resolvedCandidate ? this.targetForCandidate(resolvedCandidate) : undefined)
      ?? this.defaultSearchTarget();
    const selectedChainId = target.chainId;

    if (this.selectedChainId$.value !== selectedChainId) {
      this.selectedChainId$.next(selectedChainId);
    }

    const activeTarget = this.activeTarget$.value;
    if (
      activeTarget.kind !== target.kind
      || activeTarget.chainId !== target.chainId
      || activeTarget.destinationId !== target.destinationId
      || activeTarget.destinationDefault !== target.destinationDefault
      || activeTarget.name !== target.name
      || activeTarget.accentColor !== target.accentColor
      || activeTarget.directUrl !== target.directUrl
    ) {
      this.activeTarget$.next(target);
    }
  }

  private defaultSearchTarget(): SearchTarget {
    if (this.manualChainId === undefined) return this.routerSearchTarget;
    const explorer = this.explorers.find((candidate) => candidate.chainId === this.manualChainId);
    const destination = explorer?.destinations?.find(item => item.destinationId === this.manualDestinationId)
      || explorer?.destinations?.find(item => item.default) || explorer;
    return destination ? this.targetForExplorer(destination) : this.selectedExplorerTarget || {
      kind: 'explorer',
      chainId: this.sourceChainId,
      name: 'TON',
      accentColor: this.defaultChainAccent,
      iconUrl: this.defaultChainIconUrl,
      iconAlt: this.defaultChainIconAlt,
    };
  }

  private targetForExplorer(explorer: TxTaxiExplorer): SearchTarget {
    return {
      kind: 'explorer',
      chainId: explorer.chainId,
      destinationId: explorer.destinationId,
      destinationDefault: explorer.default,
      origin: explorer.origin,
      name: explorer.destinationId
        ? `${this.explorers.find(item => item.chainId === explorer.chainId)?.name || explorer.symbol}${explorer.default ? '' : ` · ${explorer.name}`}`
        : explorer.name,
      accentColor: explorer.accentColor,
      iconUrl: explorer.iconUrl,
      iconAlt: explorer.iconAlt,
    };
  }

  private targetForCandidate(candidate: TxTaxiSearchCandidate): SearchTarget {
    return {
      kind: 'candidate',
      chainId: candidate.chainId,
      destinationId: candidate.destinationId,
      destinationDefault: candidate.destinationDefault,
      origin: candidate.directUrl ? new URL(candidate.directUrl).origin : candidate.host ? `https://${candidate.host}` : undefined,
      name: candidate.destinationName && !candidate.destinationDefault ? `${candidate.name} · ${candidate.destinationName}` : candidate.name,
      accentColor: candidate.accentColor,
      iconUrl: candidate.iconUrl,
      iconAlt: candidate.iconAlt,
      confirmed: candidate.confirmed,
      directUrl: candidate.directUrl,
      candidate,
    };
  }

  private readonly routerSearchTarget: SearchTarget = {
    kind: 'router',
    name: 'tx.taxi',
    accentColor: '#ffd21f',
    iconUrl: 'https://tx.taxi/assets/brand/router-favicon.svg',
    iconAlt: 'tx.taxi',
  };

  private showSearchError(message: string): void {
    this.isSearching = false;
    this.dropdownHidden = true;
    this.searchError = message;
    this.cdr.markForCheck();
  }


  navigate(url: string, searchText: string, extras?: any, swapNetwork?: string) {
    if (needBaseModuleChange(this.env.BASE_MODULE as 'liquid' | 'mempool', swapNetwork as Network)) {
      window.location.href = getTargetUrl(swapNetwork as Network, searchText, this.env);
    } else {
      this.router.navigate([this.relativeUrlPipe.transform(url, swapNetwork), searchText], extras);
      this.searchTriggered.emit();
      this.searchForm.setValue({
        searchText: '',
      });
      this.searchError = '';
      this.isSearching = false;
    }
  }

  getMiningPools(): Observable<any> {
    return this.pools.length ? of(this.pools) : combineLatest([
      this.apiService.listPools$(undefined),
      this.apiService.listPools$('1y')
    ]).pipe(
      map(([poolsResponse, activePoolsResponse]) => {
        const activePoolSlugs = new Set(activePoolsResponse.body.pools.map(pool => pool.slug));

        return poolsResponse.body.map(pool => ({
          name: pool.name,
          slug: pool.slug,
          active: activePoolSlugs.has(pool.slug)
        }))
          // Sort: active pools first, then alphabetically
          .sort((a, b) => {
            if (a.active && !b.active) {return -1;}
            if (!a.active && b.active) {return 1;}
            return a.slug < b.slug ? -1 : 1;
          });

      }),
      catchError(() => of([]))
    );
  }
}
