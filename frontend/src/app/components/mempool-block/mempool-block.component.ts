import { Component, Inject, LOCALE_ID, OnInit, OnDestroy, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { russianCountNoun, ukrainianCountNoun } from '@app/shared/russian-count';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { StateService } from '@app/services/state.service';
import { SeoService } from '@app/services/seo.service';
import { WebsocketService } from '@app/services/websocket.service';
import { SharedModule } from '@app/shared/shared.module';
import { TonPendingMessage, TonPendingSnapshot } from '@app/shared/ton-pending.types';
import { detectWebGL } from '@app/shared/graphs.utils';

@Component({
  selector: 'app-mempool-block',
  templateUrl: './mempool-block.component.html',
  styleUrls: ['./mempool-block.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MempoolBlockComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly russianCountNoun = russianCountNoun;
  readonly ukrainianCountNoun = ukrainianCountNoun;
  pending$: Observable<TonPendingSnapshot> = this.stateService.tonPending$;
  selectedHash$ = this.route.fragment;
  readonly pendingFeedUnavailable = $localize`:@@ton.pending.full-feed-unavailable:Pending feed unavailable`;
  feedState(state: TonPendingSnapshot['state']): string {
    return state === 'ready' ? $localize`:@@ton.pending.live:Live`
      : state === 'loading' ? $localize`:@@ton.pending.connecting:Connecting`
      : state === 'stale' ? $localize`:@@ton.pending.reconnecting:Reconnecting`
      : $localize`:@@ton.2c9c1f79142d:Unavailable`;
  }
  visibleCount = 20;
  webGlEnabled = this.stateService.isBrowser && detectWebGL();
  private fragmentSubscription: Subscription;
  private selectedHash: string | null = null;
  private focusedHash: string | null = null;
  private scrollFrame: number | null = null;

  constructor(
    @Inject(LOCALE_ID) public locale: string,
    private route: ActivatedRoute,
    public stateService: StateService,
    private seoService: SeoService,
    private websocketService: WebsocketService,
  ) {}

  ngOnInit(): void {
    this.fragmentSubscription = this.selectedHash$.subscribe(hash => {
      if (hash !== this.selectedHash) this.focusedHash = null;
      this.selectedHash = hash;
    });
    this.websocketService.want(['blocks', 'mempool-blocks']);
    this.stateService.markBlock$.next({ mempoolBlockIndex: 0 });
    this.seoService.setTitle($localize`:@@ton.pending.page-title:Pending messages`);
    this.seoService.setDescription($localize`:@@ton.pending.page-description:Inspect pending TON external messages, destinations, message hashes, and observation times.`);
  }

  ngOnDestroy(): void {
    this.fragmentSubscription?.unsubscribe();
    if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
    this.stateService.markBlock$.next({});
  }

  ngAfterViewChecked(): void {
    if (!this.stateService.isBrowser || !this.selectedHash || this.selectedHash === this.focusedHash) return;
    const row = document.getElementById(this.selectedHash);
    if (row) {
      this.focusedHash = this.selectedHash;
      if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = requestAnimationFrame(() => row.scrollIntoView({ block: 'center' }));
    }
  }

  unixTime(value: string | null): number | null {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time / 1000 : null;
  }

  hasMessage(pending: TonPendingSnapshot, hash: string): boolean {
    return pending.messages.some(message => message.normalizedHash === hash);
  }

  visibleMessages(pending: TonPendingSnapshot, selectedHash: string): TonPendingMessage[] {
    const messages = pending.messages.slice(0, this.visibleCount);
    const selected = pending.messages.find(message => message.normalizedHash === selectedHash);
    if (selected && !messages.includes(selected)) messages.unshift(selected);
    return messages;
  }
}
