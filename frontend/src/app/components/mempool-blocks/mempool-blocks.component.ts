import { TonPendingSnapshot } from '@app/shared/ton-pending.types';
import { czechCountNoun, polishCountNoun, russianCountNoun, ukrainianCountNoun } from '@app/shared/russian-count';
import { navigateTonBlock } from '@app/ton/block-navigation';
import { blockValueDetails } from '@app/shared/block-format';
import { Component, Inject, LOCALE_ID, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, Input, OnChanges, SimpleChanges, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Subscription, Observable, of, combineLatest } from 'rxjs';
import { MempoolBlock } from '@interfaces/websocket.interface';
import { StateService } from '@app/services/state.service';
import { EtaService } from '@app/services/eta.service';
import { Router } from '@angular/router';
import { delay, filter, map, switchMap, tap } from 'rxjs/operators';
import { feeLevels } from '@app/app.constants';
import { specialBlocks } from '@app/app.constants';
import { RelativeUrlPipe } from '@app/shared/pipes/relative-url/relative-url.pipe';
import { Location } from '@angular/common';
import { DifficultyAdjustment, MempoolPosition } from '@interfaces/node-api.interface';
import { animate, style, transition, trigger } from '@angular/animations';
import { ThemeService } from '@app/services/theme.service';

@Component({
  selector: 'app-mempool-blocks',
  templateUrl: './mempool-blocks.component.html',
  styleUrls: ['./mempool-blocks.component.scss'],
  animations: [trigger('blockEntryTrigger', [
    transition(':enter', [
      style({ transform: 'translateX(-155px)' }),
      animate('2s 0s ease', style({ transform: '' })),
    ]),
  ])],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MempoolBlocksComponent implements OnInit, OnChanges, OnDestroy {
  readonly russianCountNoun = russianCountNoun;
  readonly ukrainianCountNoun = ukrainianCountNoun;
  readonly polishCountNoun = polishCountNoun;
  readonly czechCountNoun = czechCountNoun;
  get isSlavic(): boolean { return /^(ru|uk|pl|cs)/i.test(this.locale); }
  get isUkrainian(): boolean { return this.locale.toLowerCase().startsWith('uk'); }
  get isPolish(): boolean { return this.locale.toLowerCase().startsWith('pl'); }
  get isCzech(): boolean { return this.locale.toLowerCase().startsWith('cs'); }
  blockValueDetails = blockValueDetails;
  nativePendingMode = false;
  nativePending: TonPendingSnapshot;
  readonly nativePendingBlocks: Array<Partial<MempoolBlock>> = [{ index: 0 }];
  private pendingSubscription: Subscription;
  private latestConfirmedId = '';

  get pendingCount(): number | null {
    return this.nativePending?.totalObserved ?? (this.nativePending?.messages.length ? this.nativePending.messages.length : null);
  }
  get pendingObservedTime(): number | null {
    const time = Date.parse(this.nativePending?.observedAt || '');
    return Number.isFinite(time) ? time / 1000 : null;
  }
  get pendingTitle(): string {
    const count = this.pendingCount;
    const language = this.locale.toLowerCase();
    if (language.startsWith('cs')) {
      const summary = count === null ? 'Data čekajících zpráv nejsou dostupná' : `Čekající externí zprávy: ${new Intl.NumberFormat(this.locale).format(count)}`;
      const updated = this.nativePending?.observedAt ? ` · Poslední aktualizace ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Opětovné připojování' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('pl')) {
      const form = count === null ? 'other' : new Intl.PluralRules('pl').select(count);
      const suffix = form === 'one' ? 'zewnętrzna oczekuje' : form === 'few' ? 'zewnętrzne oczekują' : form === 'many' ? 'zewnętrznych oczekuje' : 'zewnętrznej oczekuje';
      const summary = count === null ? 'Dane oczekujących wiadomości są niedostępne' : `${new Intl.NumberFormat(this.locale).format(count)} ${polishCountNoun(count, 'message')} ${suffix}`;
      const updated = this.nativePending?.observedAt ? ` · Ostatnia aktualizacja ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Ponowne łączenie' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('vi')) {
      const summary = count === null ? 'Không có dữ liệu tin nhắn đang chờ' : `${new Intl.NumberFormat(this.locale).format(count)} tin nhắn bên ngoài đang chờ`;
      const updated = this.nativePending?.observedAt ? ` · Cập nhật gần nhất ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Đang kết nối lại' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('ko')) {
      const summary = count === null ? '대기 메시지 피드를 사용할 수 없음' : `대기 중인 외부 메시지 ${new Intl.NumberFormat(this.locale).format(count)}개`;
      const updated = this.nativePending?.observedAt ? ` · 마지막 업데이트 ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · 다시 연결 중' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('zh')) {
      const summary = count === null ? '待处理消息数据流不可用' : `${new Intl.NumberFormat(this.locale).format(count)} 条待处理的外部消息`;
      const updated = this.nativePending?.observedAt ? ` · 最近更新 ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · 正在重新连接' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('ja')) {
      const summary = count === null ? '保留中のメッセージフィードを利用できません' : `保留中の外部メッセージ ${new Intl.NumberFormat(this.locale).format(count)}件`;
      const updated = this.nativePending?.observedAt ? ` · 最終更新 ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · 再接続中' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('uk')) {
      const amount = count === null ? null : new Intl.NumberFormat(this.locale).format(count);
      const category = count === null ? 'other' : new Intl.PluralRules('uk').select(count);
      const adjective = category === 'one' ? 'зовнішнє' : category === 'few' ? 'зовнішні' : 'зовнішніх';
      const summary = amount === null ? 'Стрічка повідомлень, що очікують, недоступна' : `${amount} ${adjective} ${ukrainianCountNoun(count, 'message')} ${category === 'one' ? 'очікує' : 'очікують'}`;
      const updated = this.nativePending?.observedAt ? ` · Останнє оновлення ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Повторне підключення' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('nl')) {
      const amount = count === null ? null : new Intl.NumberFormat(this.locale).format(count);
      const summary = amount === null ? 'Berichtenfeed in afwachting niet beschikbaar' : `${amount} ${count === 1 ? 'extern bericht' : 'externe berichten'} in afwachting`;
      const updated = this.nativePending?.observedAt ? ` · Laatst bijgewerkt ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Opnieuw verbinden' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('ru')) {
      const amount = count === null ? null : new Intl.NumberFormat(this.locale).format(count);
      const category = count === null ? 'other' : new Intl.PluralRules('ru').select(count);
      const noun = category === 'one' ? 'внешнее сообщение ожидает' : category === 'few' ? 'внешних сообщения ожидают' : 'внешних сообщений ожидают';
      const summary = amount === null ? 'Лента ожидающих сообщений недоступна' : `${amount} ${noun}`;
      const updated = this.nativePending?.observedAt ? ` · Последнее обновление ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Повторное подключение' : '';
      return summary + updated + stale;
    }
    if (language.startsWith('fr') || language.startsWith('de') || language.startsWith('pt') || language.startsWith('it')) {
      const fr = language.startsWith('fr');
      const pt = language.startsWith('pt');
      const it = language.startsWith('it');
      const amount = count === null ? null : new Intl.NumberFormat(this.locale).format(count);
      const summary = amount === null
        ? (fr ? 'Flux des messages en attente indisponible' : pt ? 'Fluxo de mensagens pendentes indisponível' : it ? 'Flusso dei messaggi in attesa non disponibile' : 'Feed ausstehender Nachrichten nicht verfügbar')
        : fr ? `${amount} message${count === 1 ? '' : 's'} externe${count === 1 ? '' : 's'} en attente` : pt ? `${amount} mensage${count === 1 ? 'm externa pendente' : 'ns externas pendentes'}` : it ? `${amount} messagg${count === 1 ? 'io esterno' : 'i esterni'} in attesa` : `${amount} ausstehende externe Nachricht${count === 1 ? '' : 'en'}`;
      const updated = this.nativePending?.observedAt ? ` · ${fr ? 'Dernière mise à jour' : pt ? 'Última atualização' : it ? 'Ultimo aggiornamento' : 'Zuletzt aktualisiert'} ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ` · ${fr ? 'Reconnexion' : pt ? 'Reconectando' : it ? 'Riconnessione' : 'Verbindung wird wiederhergestellt'}` : '';
      return summary + updated + stale;
    }
    if (this.locale.toLowerCase().startsWith('es')) {
      const summary = count == null ? 'Información de pendientes no disponible' : `${count} mensaje${count === 1 ? '' : 's'} externo${count === 1 ? '' : 's'} pendiente${count === 1 ? '' : 's'}`;
      const updated = this.nativePending?.observedAt ? ` · Última actualización ${this.nativePending.observedAt}` : '';
      const stale = this.nativePending?.state === 'stale' ? ' · Reconectando' : '';
      return summary + updated + stale;
    }
    const summary = count == null ? 'Pending feed unavailable' : `${count} pending external message${count === 1 ? '' : 's'}`;
    const updated = this.nativePending?.observedAt ? ` · Last updated ${this.nativePending.observedAt}` : '';
    const stale = this.nativePending?.state === 'stale' ? ' · Reconnecting' : '';
    return summary + updated + stale;
  }
  private initTonPending(): void {
    this.nativePendingMode = true;
    this.mempoolWidth = this.containerOffset + this.blockOffset;
    this.widthChange.emit(this.mempoolWidth);
    this.mempoolEmptyBlocks = [{ index: 0 } as MempoolBlock];
    this.mempoolEmptyBlockStyles = [this.getStyleForMempoolEmptyBlock(0)];
    this.mempoolBlockStyles = [this.getStyleForMempoolEmptyBlock(0)];
    this.loadingBlocks$ = this.stateService.tonPending$.pipe(map(snapshot => snapshot.state === 'loading' && snapshot.totalObserved === null));
    this.pendingSubscription = this.stateService.tonPending$.subscribe(snapshot => {
      this.nativePending = snapshot;
      this.cd.markForCheck();
    });
    this.timeLtrSubscription = this.stateService.timeLtr.subscribe(ltr => { this.timeLtr = !this.forceRtl && !!ltr; this.cd.markForCheck(); });
    this.networkSubscription = this.stateService.networkChanged$.subscribe(network => this.network = network);
    this.blockSubscription = this.stateService.blocks$.subscribe(blocks => this.latestConfirmedId = blocks?.[0]?.id || '');
    this.markBlocksSubscription = this.stateService.markBlock$.subscribe(mark => {
      this.markIndex = mark?.mempoolBlockIndex;
      this.arrowVisible = this.markIndex === 0;
      this.rightPosition = this.blockWidth / 2;
      this.cd.markForCheck();
    });
    this.keySubscription = this.stateService.keyNavigation$.subscribe(event => {
      if (this.markIndex !== 0 || event.key !== (this.timeLtr ? 'ArrowRight' : 'ArrowLeft') || !this.latestConfirmedId) return;
      navigateTonBlock(this.router, this.latestConfirmedId);
    });
  }
  @Input() minimal: boolean = false;
  @Input() blockWidth: number = 125;
  @Input() containerWidth: number = null;
  @Input() count: number = null;
  @Input() spotlight: number = 0;
  @Input() getHref?: (index) => string = (index) => `/mempool-block/${index}`;
  @Input() allBlocks: boolean = false;
  @Input() forceRtl: boolean = false;

  mempoolWidth: number = 0;
  @Output() widthChange: EventEmitter<number> = new EventEmitter();

  specialBlocks = specialBlocks;
  mempoolBlocks: MempoolBlock[] = [];
  mempoolEmptyBlocks: MempoolBlock[] = this.mountEmptyBlocks();
  mempoolBlocks$: Observable<MempoolBlock[]>;
  difficultyAdjustments$: Observable<DifficultyAdjustment>;
  loadingBlocks$: Observable<boolean>;
  showMiningInfoSubscription: Subscription;
  blockDisplayModeSubscription: Subscription;
  blockDisplayMode: 'size' | 'fees';
  blockTransformation = {};
  blocksSubscription: Subscription;
  themeStateSubscription: Subscription;

  mempoolBlocksFull: MempoolBlock[] = [];
  mempoolBlockStyles = [];
  mempoolEmptyBlockStyles = [];
  markBlocksSubscription: Subscription;
  isLoadingWebsocketSubscription: Subscription;
  blockSubscription: Subscription;
  networkSubscription: Subscription;
  chainTipSubscription: Subscription;
  keySubscription: Subscription;
  isTabHiddenSubscription: Subscription;
  network = '';
  now = new Date().getTime();
  timeOffset = 0;
  timeLtrSubscription: Subscription;
  timeLtr: boolean;
  animateEntry: boolean = false;

  blockOffset: number = 155;
  blockPadding: number = 30;
  containerOffset: number = 40;
  arrowVisible = false;
  tabHidden = false;
  feeRounding = '1.0-0';

  maxArrowPosition = 0;
  rightPosition = 0;
  transition = 'background 2s, right 2s, transform 1s';
  @ViewChild('arrowUp')
  arrowElement: ElementRef<HTMLDivElement>;
  acceleratingArrow: boolean = false;

  markIndex: number;
  txPosition: MempoolPosition;
  txFeePerVSize: number;

  resetTransitionTimeout: number;

  chainTip: number = -1;
  blockIndex = 1;

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private router: Router,
    public stateService: StateService,
    private etaService: EtaService,
    private themeService: ThemeService,
    private cd: ChangeDetectorRef,
    private relativeUrlPipe: RelativeUrlPipe,
    private location: Location,
  ) { }

  ngOnInit() {
    if (this.stateService.tonPending$) { this.initTonPending(); return; }
    this.chainTip = this.stateService.latestBlockHeight;

    const width = this.containerOffset + (this.stateService.env.MEMPOOL_BLOCKS_AMOUNT) * this.blockOffset;
    this.mempoolWidth = width;
    this.widthChange.emit(this.mempoolWidth);

    this.blockDisplayMode = this.stateService.blockDisplayMode$.value as 'size' | 'fees';
    this.blockDisplayModeSubscription = this.stateService.blockDisplayMode$
      .pipe(
        filter((mode: 'size' | 'fees') => mode !== this.blockDisplayMode),
        tap(() => {
          this.blockTransformation = {
            transform: 'rotateX(90deg)',
            transition: 'transform 0.375s'
          };
        }),
        delay(375),
        tap((mode) => {
          this.blockDisplayMode = mode;
          this.blockTransformation = {
            transition: 'transform 0.375s'
          };
          this.cd.markForCheck();
        }),
        delay(375),
      )
      .subscribe(() => {
        this.blockTransformation = {};
      });

    this.timeLtrSubscription = this.stateService.timeLtr.subscribe((ltr) => {
      this.timeLtr = !this.forceRtl && !!ltr;
      this.cd.markForCheck();
    });

    if (this.stateService.network === 'liquid' || this.stateService.network === 'liquidtestnet') {
      this.feeRounding = '1.0-1';
    }
    this.mempoolEmptyBlocks.forEach((b) => {
      this.mempoolEmptyBlockStyles.push(this.getStyleForMempoolEmptyBlock(b.index));
    });
    this.reduceEmptyBlocksToFitScreen(this.mempoolEmptyBlocks);

    this.isTabHiddenSubscription = this.stateService.isTabHidden$.subscribe((tabHidden) => this.tabHidden = tabHidden);
    this.themeStateSubscription = this.themeService.themeState$.subscribe((state) => {
      if (!state.loading) {
        this.updateMempoolBlockStyles();
        this.cd.markForCheck();
      }
    });
    this.loadingBlocks$ = combineLatest([
      this.stateService.isLoadingWebSocket$,
      this.stateService.isLoadingMempool$
    ]).pipe(
      switchMap(([loadingBlocks, loadingMempool]) => {
        return of(loadingBlocks || loadingMempool);
      })
    );

    this.mempoolBlocks$ = combineLatest([
      this.stateService.blocks$.pipe(map((blocks) => blocks[0])),
      this.stateService.mempoolBlocks$
        .pipe(
          map((mempoolBlocks) => {
            if (!mempoolBlocks.length) {
              return [{ index: 0, blockSize: 0, blockVSize: 0, feeRange: [0, 0], medianFee: 0, nTx: 0, totalFees: 0 }];
            }
            return mempoolBlocks;
          }),
        )
    ]).pipe(
      map(([lastBlock, mempoolBlocks]) => {
        mempoolBlocks.forEach((block, i) => {
          block.index = this.blockIndex + i;
          block.height = lastBlock.height + i + 1;
          block.blink = specialBlocks[block.height]?.networks.includes(this.stateService.network || 'mainnet') ? true : false;
        });

        const stringifiedBlocks = JSON.stringify(mempoolBlocks);
        this.mempoolBlocksFull = JSON.parse(stringifiedBlocks);
        this.mempoolBlocks = this.reduceMempoolBlocksToFitScreen(JSON.parse(stringifiedBlocks));

        this.now = Date.now();

        this.updateMempoolBlockStyles();
        this.calculateTransactionPosition();

        return this.mempoolBlocks;
      }),
      tap(() => {
        const width = this.containerOffset + this.mempoolBlocks.length * this.blockOffset;
        if (this.mempoolWidth !== width) {
          this.mempoolWidth = width;
          this.widthChange.emit(this.mempoolWidth);
        }
      })
    );

    this.difficultyAdjustments$ = this.stateService.difficultyAdjustment$
      .pipe(
        map((da) => {
          this.now = Date.now();
          this.cd.markForCheck();
          return da;
        })
      );

    this.markBlocksSubscription = this.stateService.markBlock$
      .subscribe((state) => {
        const oldTxPosition = this.txPosition;
        this.markIndex = undefined;
        this.txPosition = undefined;
        this.txFeePerVSize = undefined;
        if (state.mempoolBlockIndex !== undefined) {
          this.markIndex = state.mempoolBlockIndex;
        }
        if (state.mempoolPosition) {
          this.txPosition = state.mempoolPosition;
          if (this.txPosition.accelerated && !oldTxPosition?.accelerated) {
            this.acceleratingArrow = true;
            setTimeout(() => {
              this.acceleratingArrow = false;
            }, 2000);
          }
        }
        if (state.txFeePerVSize) {
          this.txFeePerVSize = state.txFeePerVSize;
        }
        this.calculateTransactionPosition();
        this.cd.markForCheck();
      });

    this.blockSubscription = this.stateService.blocks$.pipe(map((blocks) => blocks[0]))
      .subscribe((block) => {
        if (!block) {
          return;
        }

        const isNewBlock = block.height > this.chainTip;

        if (this.chainTip === -1) {
          this.animateEntry = block.height === this.stateService.latestBlockHeight;
        } else {
          this.animateEntry = isNewBlock;
        }

        this.chainTip = this.stateService.latestBlockHeight;
        if (isNewBlock && (block?.extras?.similarity == null || block?.extras?.similarity > 0.5) && !this.tabHidden) {
          this.blockIndex++;
        }
        this.cd.markForCheck();
      });

    this.chainTipSubscription = this.stateService.chainTip$.subscribe((height) => {
      if (this.chainTip === -1) {
        this.chainTip = height;
        this.cd.markForCheck();
      }
    });

    this.networkSubscription = this.stateService.networkChanged$
      .subscribe((network) => this.network = network);

    this.keySubscription = this.stateService.keyNavigation$.subscribe((event) => {
      if (this.markIndex === undefined) {
        return;
      }
      const prevKey = this.timeLtr ? 'ArrowLeft' : 'ArrowRight';
      const nextKey = this.timeLtr ? 'ArrowRight' : 'ArrowLeft';

      if (event.key === prevKey) {
        if (this.mempoolBlocks[this.markIndex - 1]) {
          this.router.navigate([this.relativeUrlPipe.transform('/mempool-block/'), this.markIndex - 1]);
        } else {
          const blocks = this.stateService.blocksSubject$.getValue();
          for (const block of (blocks || [])) {
            if (this.stateService.latestBlockHeight === block.height) {
              this.router.navigate([this.relativeUrlPipe.transform('/block/'), block.id], { state: { data: { block } }});
            }
          }
        }
      } else if (event.key === nextKey) {
        if (this.mempoolBlocks[this.markIndex + 1]) {
          this.router.navigate([this.relativeUrlPipe.transform('/mempool-block/'), this.markIndex + 1]);
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.blockWidth && this.blockWidth) {
      this.blockPadding = 0.24 * this.blockWidth;
      this.containerOffset = 0.32 * this.blockWidth;
      this.blockOffset = this.blockWidth + this.blockPadding;
      this.cd.markForCheck();
    }
  }

  ngOnDestroy() {
    this.pendingSubscription?.unsubscribe();
    this.markBlocksSubscription?.unsubscribe();
    this.blockSubscription?.unsubscribe();
    this.networkSubscription?.unsubscribe();
    this.blockDisplayModeSubscription?.unsubscribe();
    this.timeLtrSubscription?.unsubscribe();
    this.themeStateSubscription?.unsubscribe();
    this.chainTipSubscription?.unsubscribe();
    this.keySubscription?.unsubscribe();
    this.isTabHiddenSubscription?.unsubscribe();
    clearTimeout(this.resetTransitionTimeout);
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (this.nativePendingMode) { this.cd.markForCheck(); return; }
    this.animateEntry = false;
    this.reduceEmptyBlocksToFitScreen(this.mempoolEmptyBlocks);
    this.cd.markForCheck();
  }

  trackByFn(index: number, block: Partial<MempoolBlock>) {
    return (block.isStack) ? `stack-${block.index}` : block.index;
  }

  reduceEmptyBlocksToFitScreen(blocks: MempoolBlock[]): MempoolBlock[] {
    const innerWidth = this.containerWidth || (this.stateService.env.BASE_MODULE !== 'liquid' && window.innerWidth <= 767.98 ? window.innerWidth : window.innerWidth / 2);
    let blocksAmount = this.stateService.env.MEMPOOL_BLOCKS_AMOUNT;
    if (!this.allBlocks) {
      blocksAmount = Math.min(this.stateService.env.MEMPOOL_BLOCKS_AMOUNT, Math.floor(innerWidth / (this.blockWidth + this.blockPadding)));
    }
    while (blocks.length < blocksAmount) {
      blocks.push({
        blockSize: 0,
        blockVSize: 0,
        feeRange: [],
        index: blocks.length,
        medianFee: 0,
        nTx: 0,
        totalFees: 0
      });
    }
    while (blocks.length > blocksAmount) {
      blocks.pop();
    }
    return blocks;
  }

  reduceMempoolBlocksToFitScreen(blocks: MempoolBlock[]): MempoolBlock[] {
    const innerWidth = this.containerWidth || (this.stateService.env.BASE_MODULE !== 'liquid' && window.innerWidth <= 767.98 ? window.innerWidth : window.innerWidth / 2);
    let blocksAmount = this.stateService.env.MEMPOOL_BLOCKS_AMOUNT;
    if (this.count) {
      blocksAmount = 8;
    } else if (!this.allBlocks) {
      blocksAmount = Math.min(this.stateService.env.MEMPOOL_BLOCKS_AMOUNT, Math.floor(innerWidth / (this.blockWidth + this.blockPadding)));
    }
    while (blocks.length > blocksAmount) {
      const block = blocks.pop();
      if (!this.count) {
        const lastBlock = blocks[blocks.length - 1];
        lastBlock.blockSize += block.blockSize;
        lastBlock.blockVSize += block.blockVSize;
        lastBlock.nTx += block.nTx;
        lastBlock.feeRange = lastBlock.feeRange.concat(block.feeRange);
        lastBlock.feeRange.sort((a, b) => a - b);
        lastBlock.medianFee = this.median(lastBlock.feeRange);
        lastBlock.totalFees += block.totalFees;
      }
    }
    if (blocks.length) {
      blocks[blocks.length - 1].isStack = blocks[blocks.length - 1].blockVSize > this.stateService.blockVSize;
    }
    if (this.count) {
      this.maxArrowPosition = (Math.min(blocks.length, this.count) * (this.blockWidth + this.blockPadding)) - this.blockPadding;
    } else {
      this.maxArrowPosition = (Math.min(blocks.length, blocksAmount) * (this.blockWidth + this.blockPadding)) - this.blockPadding;
    }
    return blocks;
  }

  median(numbers: number[]) {
    let medianNr = 0;
    const numsLen = numbers.length;
    if (numsLen % 2 === 0) {
        medianNr = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else {
        medianNr = numbers[(numsLen - 1) / 2];
    }
    return medianNr;
  }

  updateMempoolBlockStyles() {
    this.mempoolBlockStyles = [];
    this.mempoolBlocksFull.forEach((block, i) => this.mempoolBlockStyles.push(this.getStyleForMempoolBlock(block, i)));
  }

  getStyleForMempoolBlock(mempoolBlock: MempoolBlock, index: number) {
    const emptyBackgroundSpacePercentage = Math.max(100 - mempoolBlock.blockVSize / this.stateService.blockVSize * 100, 0);
    const usedBlockSpace = 100 - emptyBackgroundSpacePercentage;
    const backgroundGradients = [`repeating-linear-gradient(to right,  var(--mempool-block-loading), var(--mempool-block-loading) ${emptyBackgroundSpacePercentage}%`];
    const gradientColors = [];

    const trimmedFeeRange = index === 0 ? mempoolBlock.feeRange.slice(0, -1) : mempoolBlock.feeRange;

    trimmedFeeRange.forEach((fee: number) => {
      let feeLevelIndex = feeLevels.slice().reverse().findIndex((feeLvl) => fee >= feeLvl);
      feeLevelIndex = feeLevelIndex >= 0 ? feeLevels.length - feeLevelIndex : feeLevelIndex;
      gradientColors.push(this.themeService.mempoolFeeColors[feeLevelIndex - 1] || this.themeService.mempoolFeeColors[this.themeService.mempoolFeeColors.length - 1]);
    });

    gradientColors.forEach((color, i, gc) => {
      backgroundGradients.push(`
        #${i === 0 ? color : gc[i - 1]} ${ i === 0 ? emptyBackgroundSpacePercentage : ((i / gradientColors.length) * 100) * usedBlockSpace / 100 + emptyBackgroundSpacePercentage }%,
        #${color} ${Math.round(((i + 1) / gradientColors.length) * 100) * usedBlockSpace / 100 + emptyBackgroundSpacePercentage}%
      `);
    });

    return {
      'right': this.containerOffset + index * this.blockOffset + 'px',
      'background': backgroundGradients.join(',') + ')'
    };
  }

  getStyleForMempoolEmptyBlock(index: number) {
    return {
      'right': this.containerOffset + index * this.blockOffset + 'px',
      'background': 'var(--mempool-block-loading)',
    };
  }

  calculateTransactionPosition() {
    if ((!this.txPosition && !this.txFeePerVSize && (this.markIndex === undefined || this.markIndex === -1)) || !this.mempoolBlocks?.length) {
      this.arrowVisible = false;
      return;
    } else if (this.markIndex > -1) {
      clearTimeout(this.resetTransitionTimeout);
      this.transition = 'inherit';
      this.rightPosition = Math.min(this.maxArrowPosition, this.markIndex * (this.blockWidth + this.blockPadding) + 0.5 * this.blockWidth);
      this.arrowVisible = true;

      this.resetTransitionTimeout = window.setTimeout(() => {
        this.transition = 'background 2s, right 2s, transform 1s';
        this.cd.markForCheck();
      }, 100);
      return;
    }

    this.arrowVisible = true;

    if (this.txPosition) {
      if (this.txPosition.block >= this.mempoolBlocks.length) {
        this.rightPosition = ((this.mempoolBlocks.length - 1) * (this.blockWidth + this.blockPadding)) + this.blockWidth;
      } else {
        const positionInBlock = Math.min(1, this.txPosition.vsize / this.stateService.blockVSize) * this.blockWidth;
        const positionOfBlock = this.txPosition.block * (this.blockWidth + this.blockPadding);
        this.rightPosition = positionOfBlock + positionInBlock;
      }
    } else {
      const estimatedPosition = this.etaService.mempoolPositionFromFees(this.txFeePerVSize, this.mempoolBlocks);
      this.rightPosition = estimatedPosition.block * (this.blockWidth + this.blockPadding)
        + ((estimatedPosition.vsize / this.stateService.blockVSize) * this.blockWidth);
    }
    this.rightPosition = Math.min(this.maxArrowPosition, this.rightPosition);
  }

  mountEmptyBlocks() {
    const emptyBlocks = [];
    const numberOfBlocks = this.stateService.env.MEMPOOL_BLOCKS_AMOUNT;
    for (let i = 0; i < numberOfBlocks; i++) {
      emptyBlocks.push({
        blockSize: 0,
        blockVSize: 0,
        feeRange: [],
        index: i,
        medianFee: 0,
        nTx: 0,
        totalFees: 0
      });
    }
    return emptyBlocks;
  }
}
