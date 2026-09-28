import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { NativeAmount, NativeIdentity } from '@app/shared/native-view.types';

export interface NativeTokenView {
  address: string;
  kind: 'jetton' | 'nft' | 'collection';
  name: string;
  symbol?: string;
  iconUrl?: string | null;
  description?: string;
  supply?: NativeAmount;
  holders?: string | number;
  decimals?: string | number;
  mintable?: boolean;
  admin?: NativeIdentity;
  owner?: NativeIdentity;
  collection?: NativeIdentity;
  index?: string;
  nextIndex?: string;
  membership?: 'Verified' | 'Unverified' | 'Unknown';
  trust: 'Recognized' | 'Flagged' | 'Unclassified';
  approvedBy: string[];
  soulbound: boolean;
  stale: boolean;
}

/** Retained token header/metrics/detail composition with chain-owned exact view inputs. */
@Component({
  selector: 'app-ethereum-token',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './ethereum-token.component.html',
  styleUrls: ['./ethereum-token.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EthereumTokenComponent {
  @Input() asset: NativeTokenView | null = null;
  @Input() isLoading = false;
  @Input() errorMessage = '';
  @Output() retry = new EventEmitter<void>();
  logoFailed = false;
  ngOnChanges(): void {
    this.logoFailed = false;
  }
  tokenInitials(): string {
    return (this.asset?.symbol || this.asset?.name || 'TON')
      .slice(0, 2)
      .toUpperCase();
  }
}
