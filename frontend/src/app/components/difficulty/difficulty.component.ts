import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
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

  constructor(private stateService: StateService) { }

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

  get isConfirmed(): boolean { return this.confirmedMode || !!this.tonNetwork; }

  get suppliedNetwork(): EthereumNetworkStats | null {
    if (!this.tonNetwork) return null;
    const successful = this.confirmedData?.status.successful ?? 0;
    const known = successful + (this.confirmedData?.status.failed ?? 0);
    const successRate = known ? successful / known * 100 : null;
    const filled = successRate === null ? null : Math.round(NETWORK_BAR_WIDTH * successRate / 100);
    const unknown = this.confirmedData?.status.unknown ?? 0;
    const sample = this.confirmedData?.source;
    return {
      latestBlockHeight: this.tonNetwork.seqno,
      observedBlockTime: this.tonInterval,
      metric: successRate,
      metricLabel: 'Successful transactions',
      barLabel: 'Successful transactions in the confirmed sample',
      barTooltip: known ? `${successful} successful of ${known} transactions with a reported outcome${unknown ? `; ${unknown} outcomes unavailable` : ''}${sample?.masterSeqno ? ` confirmed by masterchain block #${sample.masterSeqno}` : ''}${sample?.partial ? ' (partial sample)' : ''}.` : 'No transaction outcomes are available for this confirmed sample.',
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
