import { Component, ViewChild, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { StateService } from '@app/services/state.service';
import { MempoolBlockDelta, isMempoolDelta } from '@interfaces/websocket.interface';
import { TransactionStripped } from '@interfaces/node-api.interface';
import { BlockOverviewGraphComponent } from '@components/block-overview-graph/block-overview-graph.component';
import { Subscription, BehaviorSubject } from 'rxjs';
import { WebsocketService } from '@app/services/websocket.service';
import { RelativeUrlPipe } from '@app/shared/pipes/relative-url/relative-url.pipe';
import { Router } from '@angular/router';
import { Color } from '@components/block-overview-graph/sprite-types';
import TxView from '@components/block-overview-graph/tx-view';
import { FilterMode, GradientMode } from '@app/shared/filters.utils';
import { ConfirmedGraphTransaction, ConfirmedTransactionCategory, confirmedGraphBlockLimit, confirmedGraphTransactions } from '@components/block-overview-graph/confirmed-transaction';
import { PendingGraphMessage, pendingGraphMessages, pendingGraphBlockLimit } from '@components/block-overview-graph/pending-message';
import { TonPendingMessage } from '@app/shared/ton-pending.types';

@Component({
  selector: 'app-mempool-block-overview',
  templateUrl: './mempool-block-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MempoolBlockOverviewComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() index: number;
  @Input() resolution = 86;
  @Input() orientation: 'left' | 'right' | 'top' | 'bottom' | null = null;
  @Input() flip = true;
  @Input() showFilters: boolean = false;
  @Input() overrideColors: ((tx: TxView) => Color) | null = null;
  @Input() filterFlags: bigint | undefined = undefined;
  @Input() filterMode: FilterMode = 'and';
  @Input() gradientMode: GradientMode = 'fee';
  /** A non-null bounded window selects confirmed-data mode and bypasses mempool streams. */
  @Input() suppliedConfirmedTransactions: any[] | null = null;
  @Input() suppliedPendingMessages: TonPendingMessage[] | null = null;
  @Input() suppliedLoading = false;
  @Input() suppliedError: string | null = null;
  @Input() suppliedCategory: string = 'all';
  @Output() txPreviewEvent = new EventEmitter<TransactionStripped | void>();

  @ViewChild('blockGraph') blockGraph: BlockOverviewGraphComponent;

  lastBlockHeight: number;
  blockIndex: number;
  isLoading$ = new BehaviorSubject<boolean>(false);
  timeLtrSubscription: Subscription;
  timeLtr: boolean;
  chainDirection: string = 'right';
  poolDirection: string = 'left';

  blockSub: Subscription;
  firstLoad: boolean = true;
  suppliedTransactions: Array<ConfirmedGraphTransaction | PendingGraphMessage> = [];
  suppliedBlockLimit = 1;

  constructor(
    public stateService: StateService,
    private websocketService: WebsocketService,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.timeLtrSubscription = this.stateService.timeLtr.subscribe((ltr) => {
      this.timeLtr = !!ltr;
      this.chainDirection = ltr ? 'left' : 'right';
      this.poolDirection = ltr ? 'right' : 'left';
      this.cd.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    if (this.hasSuppliedTransactions) {
      this.renderSuppliedTransactions();
      return;
    }
    this.subscribeToMempoolBlock();
  }

  private subscribeToMempoolBlock(): void {
    if (this.blockSub) return;
    this.blockSub = this.stateService.mempoolBlockUpdate$.subscribe((update) => {
      // process update
      if (isMempoolDelta(update)) {
        // delta
        this.updateBlock(update);
      } else {
        const transactionsStripped = update.transactions;
        // new transactions
        if (this.firstLoad) {
          this.replaceBlock(transactionsStripped);
        } else {
          const inOldBlock = {};
          const inNewBlock = {};
          const added: TransactionStripped[] = [];
          const changed: { txid: string, rate: number | undefined, flags: number, acc: boolean | undefined }[] = [];
          const removed: string[] = [];
          for (const tx of transactionsStripped) {
            inNewBlock[tx.txid] = true;
          }
          for (const txid of Object.keys(this.blockGraph?.scene?.txs || {})) {
            inOldBlock[txid] = true;
            if (!inNewBlock[txid]) {
              removed.push(txid);
            }
          }
          for (const tx of transactionsStripped) {
            if (!inOldBlock[tx.txid]) {
              added.push(tx);
            } else {
              changed.push({
                txid: tx.txid,
                rate: tx.rate,
                flags: tx.flags,
                acc: tx.acc
              });
            }
          }
          this.updateBlock({
            block: this.blockIndex,
            removed,
            changed,
            added
          });
        }
      }
    });
  }

  ngOnChanges(changes): void {
    if (this.hasSuppliedTransactions) {
      if (changes.suppliedConfirmedTransactions || changes.suppliedPendingMessages || changes.suppliedLoading || changes.suppliedError || changes.suppliedCategory) {
        this.renderSuppliedTransactions();
      }
      return;
    }
    if (this.blockGraph && (changes.suppliedConfirmedTransactions || changes.suppliedPendingMessages)) {
      this.subscribeToMempoolBlock();
    }
    if (changes.index) {
      this.firstLoad = true;
      if (this.blockGraph) {
        this.blockGraph.clear(changes.index.currentValue > changes.index.previousValue ? this.chainDirection : this.poolDirection);
      }
      if (!this.websocketService.startTrackMempoolBlock(changes.index.currentValue) && this.stateService.mempoolBlockState && this.stateService.mempoolBlockState.block === changes.index.currentValue) {
        this.resumeBlock(Object.values(this.stateService.mempoolBlockState.transactions));
      } else {
        this.isLoading$.next(true);
      }
    }
  }

  ngOnDestroy(): void {
    this.blockGraph?.destroy();
    this.blockSub?.unsubscribe();
    this.timeLtrSubscription?.unsubscribe();
    if (!this.hasSuppliedTransactions) this.websocketService.stopTrackMempoolBlock();
  }

  get hasSuppliedTransactions(): boolean {
    return this.hasSuppliedPendingMessages || this.suppliedConfirmedTransactions !== null && this.suppliedConfirmedTransactions !== undefined;
  }

  get hasSuppliedPendingMessages(): boolean {
    return this.suppliedPendingMessages !== null && this.suppliedPendingMessages !== undefined;
  }

  get suppliedEmptyMessage(): string | null {
    return this.suppliedError || (this.hasSuppliedPendingMessages && !this.suppliedLoading ? 'No pending messages' : null);
  }

  private renderSuppliedTransactions(): void {
    const category = ['all', 'transfer', 'jetton', 'nft', 'contract'].includes(this.suppliedCategory)
      ? this.suppliedCategory as ConfirmedTransactionCategory | 'all'
      : 'all';
    const sourceTransactions = this.hasSuppliedPendingMessages ? this.suppliedPendingMessages : this.suppliedConfirmedTransactions || [];
    // A failed refresh must leave a previously rendered confirmed sample visible.
    if (!this.hasSuppliedPendingMessages && this.suppliedError && !sourceTransactions.length && this.suppliedTransactions.length) {
      this.isLoading$.next(false);
      this.cd.markForCheck();
      return;
    }
    if (this.hasSuppliedPendingMessages) {
      const messages = pendingGraphMessages(this.suppliedPendingMessages);
      this.suppliedTransactions = messages;
      this.suppliedBlockLimit = pendingGraphBlockLimit(messages);
    } else {
      const transactions = confirmedGraphTransactions(sourceTransactions, category);
      this.suppliedTransactions = transactions;
      this.suppliedBlockLimit = confirmedGraphBlockLimit(transactions);
    }
    this.isLoading$.next(this.suppliedLoading && !this.suppliedError);
    if (!this.blockGraph) return;
    if (this.hasSuppliedPendingMessages && this.blockGraph.scene) {
      const messages = new Map((this.suppliedTransactions as PendingGraphMessage[]).map(message => [message.txid, message]));
      // The native scene preserves sprites for stable IDs. Refresh the message
      // metadata and byte area independently of that animation identity.
      for (const [id, view] of Object.entries(this.blockGraph.scene.txs)) {
        const message = messages.get(id);
        if (message) {
          view.pendingMessage = message.pendingMessage;
          view.layoutWeight = message.layoutWeight;
          view.time = message.time;
        }
      }
      if (this.blockGraph.selectedTx && !messages.has(this.blockGraph.selectedTx.txid)) this.blockGraph.selectedTx = undefined;
      if (this.blockGraph.hoverTx && !messages.has(this.blockGraph.hoverTx.txid)) this.blockGraph.hoverTx = undefined;
    }
    // Keep the native scene's enter/replace transitions and click hit-testing.
    this.blockGraph.replace(this.suppliedTransactions, this.chainDirection, !this.hasSuppliedPendingMessages);
    this.cd.markForCheck();
  }

  replaceBlock(transactionsStripped: TransactionStripped[]): void {
    const blockMined = (this.stateService.latestBlockHeight > this.lastBlockHeight);
    if (this.blockIndex !== this.index) {
      const direction = (this.blockIndex == null || this.index < this.blockIndex) ? this.poolDirection : this.chainDirection;
      this.blockGraph.enter(transactionsStripped, direction);
    } else {
      this.blockGraph.replace(transactionsStripped, blockMined ? this.chainDirection : this.poolDirection);
    }

    this.lastBlockHeight = this.stateService.latestBlockHeight;
    this.blockIndex = this.index;
    this.isLoading$.next(false);
  }

  updateBlock(delta: MempoolBlockDelta): void {
    const blockMined = (this.stateService.latestBlockHeight > this.lastBlockHeight);
    if (this.blockIndex !== this.index) {
      const direction = (this.blockIndex == null || this.index < this.blockIndex) ? this.poolDirection : this.chainDirection;
      this.blockGraph.replace(delta.added, direction);
    } else {
      if (blockMined) {
        this.blockGraph.update(delta.added, delta.removed, delta.changed || [], blockMined ? this.chainDirection : this.poolDirection, blockMined);
      } else {
        this.blockGraph.deferredUpdate(delta.added, delta.removed, delta.changed || [], this.poolDirection);
      }
    }

    this.lastBlockHeight = this.stateService.latestBlockHeight;
    this.blockIndex = this.index;
    this.isLoading$.next(false);
  }

  resumeBlock(transactionsStripped: TransactionStripped[]): void {
    if (this.blockGraph) {
      this.firstLoad = false;
      this.blockGraph.setup(transactionsStripped, true);
      this.blockIndex = this.index;
      this.isLoading$.next(false);
    } else {
      requestAnimationFrame(() => {
        this.resumeBlock(transactionsStripped);
      });
    }
  }

  onTxClick(event: { tx: TransactionStripped, keyModifier: boolean }): void {
    const message = (event.tx as PendingGraphMessage).pendingMessage;
    if (message) {
      const path = new RelativeUrlPipe(this.stateService).transform('/mempool-block/0');
      if (event.keyModifier) window.open(this.router.serializeUrl(this.router.createUrlTree([path], { fragment: message.normalizedHash })), '_blank');
      else this.router.navigate([path], { fragment: message.normalizedHash });
      return;
    }
    const url = new RelativeUrlPipe(this.stateService).transform(`/tx/${event.tx.txid}`);
    if (!event.keyModifier) {
      this.router.navigate([url]);
    } else {
      window.open(url, '_blank');
    }
  }
}
