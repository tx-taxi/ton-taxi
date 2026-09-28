import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { BlockExtended } from '@interfaces/node-api.interface';
import { StateService } from '@app/services/state.service';
import type { ConfirmedDashboardData } from '@app/ton/dashboard-data';
import type { NativeAmount } from '@app/shared/native-view.types';

interface EthereumRewardStats {
  proposerRewards: number;
  feePerBlock: number;
  feePerTx: number;
}

const REWARD_SAMPLE_BLOCKS = 6;

@Component({
  selector: 'app-reward-stats',
  templateUrl: './reward-stats.component.html',
  styleUrls: ['./reward-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RewardStatsComponent implements OnInit {
  @Input() confirmedMode = false;
  @Input() confirmedData: ConfirmedDashboardData | null = null;
  public $rewardStats: Observable<EthereumRewardStats | null>;

  constructor(private stateService: StateService) { }

  ngOnInit(): void {
    if (this.confirmedMode) return;
    this.$rewardStats = this.stateService.blocks$.pipe(
      map((blocks) => this.rewardStats(blocks)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  get labels(): string[] {
    return this.confirmedMode ? ['Total fees', 'Compute fees', 'Average tx fee'] : ['Proposer rewards', 'Execution fees', 'Average tx fee'];
  }

  rewardRows(stats: EthereumRewardStats | ConfirmedDashboardData): { label: string; tooltip: string; amount?: NativeAmount; value?: number; belowAtomicUnit?: boolean; suffix: string; digits: string }[] {
    if (this.confirmedMode) {
      const data = stats as ConfirmedDashboardData;
      const sample = `${data.source.returned} confirmed transactions${data.source.masterSeqno ? ` confirmed by masterchain block #${data.source.masterSeqno}` : ''}${data.source.partial ? ' (partial sample)' : ''}.`;
      const amounts = [data.fees.count ? data.fees.sum : null, data.phaseFees.compute.sum, data.fees.mean];
      const descriptions = [`Total reported transaction fees (${data.fees.count} known).`, `Compute-phase gas fees (${data.phaseFees.compute.count} known).`, `Average reported fee across ${data.fees.count} transactions, rounded down to a whole nanogram when necessary.`];
      return amounts.map((atomic, index) => {
        const ratio = index === 2 ? data.fees.meanExact : null;
        const fractional = ratio && ratio.remainder !== '0';
        return {
          label: this.labels[index], tooltip: `${descriptions[index]}${fractional ? ` Exact result: ${atomic} + ${ratio.remainder}/${ratio.denominator} nanograms.` : ''} ${sample}`,
          amount: { atomic, decimals: 9, symbol: 'GRAM', atomicSymbol: 'nanograms', native: true },
          belowAtomicUnit: atomic === '0' && fractional,
          suffix: index === 2 ? '/tx' : '', digits: '1.2-6',
        };
      });
    }
    const values = stats as EthereumRewardStats;
    return [
      { label: this.labels[0], tooltip: 'Priority fees paid to block proposers in the recent block sample', value: values.proposerRewards, suffix: '', digits: '1.2-6' },
      { label: this.labels[1], tooltip: 'All execution-layer gas fees in the recent block sample', value: values.feePerBlock, suffix: '/block', digits: '1.2-4' },
      { label: this.labels[2], tooltip: 'Average execution-layer gas fee per transaction in the recent block sample', value: values.feePerTx, suffix: '/tx', digits: '1.4-6' },
    ];
  }

  trackByIndex(index: number): number { return index; }

  private rewardStats(blocks: BlockExtended[]): EthereumRewardStats | null {
    const recent = (blocks || [])
      .filter((block) => Number.isFinite(block?.height))
      .sort((left, right) => left.height - right.height)
      .slice(-REWARD_SAMPLE_BLOCKS);
    if (!recent.length) {
      return null;
    }

    const totalFees = recent.reduce((sum, block) => sum + Number(block.extras?.totalFees || 0), 0);
    const proposerRewards = recent.reduce((sum, block) => sum + Number(block.extras?.reward || 0), 0);
    const transactions = recent.reduce((sum, block) => sum + Number(block.tx_count || 0), 0);

    return {
      proposerRewards,
      feePerBlock: totalFees / recent.length,
      feePerTx: transactions ? totalFees / transactions : 0,
    };
  }
}
