import { Component, OnInit, Input, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { Transaction } from '@interfaces/electrs.interface';
import { Acceleration, CpfpInfo } from '@interfaces/node-api.interface';
import { Pool, TxAuditStatus } from '@interfaces/transaction-audit.interface';
import { Observable } from 'rxjs';
import { ETA } from '@app/services/eta.service';
import { MiningStats } from '@app/services/mining.service';
import { Filter } from '@app/shared/filters.utils';
import { formatEthereumQuantity } from '@app/shared/ethereum-quantity.utils';
import { TonTransaction, tonAddress, tonAmount, tonExecution, tonLabel, tonIdentity } from '@app/ton/transaction-view';

@Component({
  selector: 'app-transaction-details',
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionDetailsComponent implements OnInit {
  @Input() nativeTransaction: TonTransaction | null = null;
  @Input() nativeMode = false;
  tonAddress = tonAddress;
  tonLabel = tonLabel;
  tonIdentity = tonIdentity;
  tonAmount = tonAmount;
  tonExecution = tonExecution;
  @Input() network: string;
  @Input() tx: Transaction;
  @Input() isLoadingTx: boolean;
  @Input() isMobile: boolean;
  @Input() transactionTime: number;
  @Input() isLoadingFirstSeen: boolean;
  @Input() featuresEnabled: boolean;
  @Input() auditStatus: TxAuditStatus;
  @Input() filters: Filter[];
  @Input() miningStats: MiningStats;
  @Input() pool: Pool | null;
  @Input() isAcceleration: boolean;
  @Input() hasEffectiveFeeRate: boolean;
  @Input() cpfpInfo: CpfpInfo;
  @Input() hasCpfp: boolean;
  @Input() accelerationInfo: Acceleration;
  @Input() acceleratorAvailable: boolean;
  @Input() accelerateCtaType: string;
  @Input() notAcceleratedOnLoad: boolean;
  @Input() showAccelerationSummary: boolean;
  @Input() eligibleForAcceleration: boolean;
  @Input() replaced: boolean;
  @Input() isCached: boolean;
  @Input() ETA$: Observable<ETA>;
  @Input() unbroadcasted: boolean;
  @Input() cpfpMode: boolean = false;

  @Output() accelerateClicked = new EventEmitter<boolean>();
  @Output() toggleCpfp$ = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  onAccelerateClicked(): void {
    this.accelerateClicked.emit(true);
  }

  toggleCpfp(): void {
    this.toggleCpfp$.emit();
  }

  formatEthereumQuantity(value: string | null | undefined, decimals: string | null | undefined = '18', maxFractionDigits = 8): string {
    return formatEthereumQuantity(value, decimals, maxFractionDigits);
  }

  ethereumWeiNumber(value: string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get clusterPreviewStats(): { chunkSize: number; chunkFeerate: number; otherChunks: number } {
    const cluster = this.cpfpInfo?.cluster;
    const chunk = cluster?.chunks[cluster.chunkIndex];
    return {
      chunkSize: chunk?.txs.length ?? 0,
      chunkFeerate: chunk?.feerate ?? 0,
      otherChunks: Math.max(0, (cluster?.chunks.length ?? 0) - 1),
    };
  }
}
