import { ChangeDetectionStrategy, Component, Inject, Input, LOCALE_ID, OnInit } from '@angular/core';
import { czechCountNoun } from '@app/shared/russian-count';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { BlockExtended } from '@interfaces/node-api.interface';
import { StateService } from '@app/services/state.service';
import type { ConfirmedDashboardData } from '@app/ton/dashboard-data';

type NetworkBarStatus = 'mined' | 'remaining';

interface NetworkBarShape {
  x: number;
  y: number;
  w: number;
  h: number;
  status: NetworkBarStatus;
}

interface EthereumNetworkStats {
  metric: number | null;
  metricLabel: string;
  barLabel: string;
  barTooltip: string;
  latestBlockHeight: string | number;
  observedBlockTime: number | null;
  shapes: NetworkBarShape[];
}

const ETHEREUM_BLOCK_GAS_LIMIT = 60_000_000;
const NETWORK_BAR_WIDTH = 224;
const DEFAULT_BLOCK_TIME = 12;

@Component({
  selector: 'app-difficulty',
  templateUrl: './difficulty.component.html',
  styleUrls: ['./difficulty.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DifficultyComponent implements OnInit {
  @Input() showTitle = true;
  @Input() tonNetwork: { seqno: string | number; intervals?: number[]; transactionCount?: string | number; label?: string } | null = null;
  @Input() confirmedData: ConfirmedDashboardData | null = null;
  @Input() confirmedMode = false;

  networkStats$: Observable<EthereumNetworkStats | null>;
  mode: 'network' | 'rewards' = 'network';

  constructor(private stateService: StateService, @Inject(LOCALE_ID) private locale: string) { }

  ngOnInit(): void {
    if (this.isConfirmed) return;
    this.networkStats$ = this.stateService.blocks$.pipe(
      map((blocks) => this.networkStats(blocks)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  get tonInterval(): number | null {
    const samples = (this.tonNetwork?.intervals || []).filter(value => Number.isFinite(value) && value > 0);
    return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : null;
  }

  readonly tonDashboardLabel = $localize`:@@ton.dash.network-panel:TON network dashboard panel`;
  readonly tonNetworkTitle = $localize`:@@ton.dash.ton-network:TON Network`;
  readonly tonEconomicsTitle = $localize`:@@ton.dash.ton-economics:TON Economics`;
  readonly economicsLabel = $localize`:@@ton.dash.economics:economics`;
  tonSecondsTitle(seconds: number): string { return /^cs(?:-|$)/i.test(this.locale) ? `${seconds.toLocaleString('cs')} ${czechCountNoun(seconds, 'second')}` : $localize`:@@ton.dash.seconds-title:${seconds}:count: seconds`; }
  get latestTonBlockLabel(): string { return this.tonNetwork?.label === 'Basechain' ? $localize`:@@ton.dash.latest-base:Latest basechain block` : $localize`:@@ton.dash.latest-master:Latest masterchain block`; }

  get isConfirmed(): boolean { return this.confirmedMode || !!this.tonNetwork; }

  get suppliedNetwork(): EthereumNetworkStats | null {
    if (!this.tonNetwork) return null;
    const successful = this.confirmedData?.status.successful ?? 0;
    const known = successful + (this.confirmedData?.status.failed ?? 0);
    const successRate = known ? successful / known * 100 : null;
    const filled = successRate === null ? null : Math.round(NETWORK_BAR_WIDTH * successRate / 100);
    const unknown = this.confirmedData?.status.unknown ?? 0;
    const sample = this.confirmedData?.source;
    const outcomeSummary = known ? $localize`:@@ton.dash.outcome-summary:${successful}:successful: successful of ${known}:known: transactions with a reported outcome` : '';
    const unknownSummary = unknown ? $localize`:@@ton.dash.outcome-unknown:; ${unknown}:unknown: outcomes unavailable` : '';
    const masterSummary = sample?.masterSeqno ? $localize`:@@ton.dash.outcome-master: confirmed by masterchain block #${sample.masterSeqno}:seqno:` : '';
    const partialSummary = sample?.partial ? $localize`:@@ton.dash.outcome-partial: (partial sample)` : '';
    return {
      latestBlockHeight: this.tonNetwork.seqno,
      observedBlockTime: this.tonInterval,
      metric: successRate,
      metricLabel: $localize`:@@ton.dash.successful:Successful transactions`,
      barLabel: $localize`:@@ton.dash.outcome-label:Successful transactions in the confirmed sample`,
      barTooltip: known ? `${outcomeSummary}${unknownSummary}${masterSummary}${partialSummary}.` : $localize`:@@ton.dash.outcome-empty:No transaction outcomes are available for this confirmed sample.`,
      shapes: filled === null ? [] : [
        ...(filled > 0 ? [{ x: 0, y: 0, w: filled, h: 9, status: 'mined' as const }] : []),
        ...(filled < NETWORK_BAR_WIDTH ? [{ x: filled, y: 0, w: NETWORK_BAR_WIDTH - filled, h: 9, status: 'remaining' as const }] : []),
      ],
    };
  }

  setMode(mode: 'network' | 'rewards'): boolean {
    this.mode = mode;
    return false;
  }

  private networkStats(blocks: BlockExtended[]): EthereumNetworkStats | null {
    const recent = (blocks || [])
      .filter((block) => Number.isFinite(block?.height) && Number.isFinite(block?.timestamp))
      .sort((left, right) => left.height - right.height)
      .slice(-6);
    const latest = recent[recent.length - 1];
    if (!latest) {
      return null;
    }

    const intervals = recent.slice(1)
      .map((block, index) => block.timestamp - recent[index].timestamp)
      .filter((seconds) => seconds > 0 && seconds < 120);
    const observedBlockTime = intervals.length
      ? intervals.reduce((sum, seconds) => sum + seconds, 0) / intervals.length
      : DEFAULT_BLOCK_TIME;
    const gasUtilization = Math.max(0, Math.min(100, (latest.weight || 0) / ETHEREUM_BLOCK_GAS_LIMIT * 100));
    const filled = Math.round(NETWORK_BAR_WIDTH * gasUtilization / 100);

    return {
      metric: gasUtilization,
      metricLabel: 'Block gas used',
      barLabel: 'Latest block gas utilization',
      barTooltip: 'Gas used as a percentage of the latest block gas limit',
      latestBlockHeight: latest.height,
      observedBlockTime,
      shapes: [
        ...(filled > 0 ? [{ x: 0, y: 0, w: filled, h: 9, status: 'mined' as const }] : []),
        ...(filled < NETWORK_BAR_WIDTH ? [{ x: filled, y: 0, w: NETWORK_BAR_WIDTH - filled, h: 9, status: 'remaining' as const }] : []),
      ],
    };
  }
}
