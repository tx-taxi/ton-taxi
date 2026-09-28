import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';

export interface EthereumIdentityEntity {
  address?: string | null;
  displayName?: string | null;
  name?: string | null;
  ensName?: string | null;
  iconUrl?: string | null;
  isContract?: boolean | null;
  isVerified?: boolean | null;
  isScam?: boolean | null;
  reputation?: string | null;
  proxyType?: string | null;
  tokenSymbol?: string | null;
}

@Component({
  selector: 'app-ethereum-identity',
  templateUrl: './ethereum-identity.component.html',
  styleUrls: ['./ethereum-identity.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EthereumIdentityComponent implements OnChanges {
  @Input() entity: EthereumIdentityEntity | null | undefined;
  @Input() chainName = 'Ethereum';
  @Input() chainSymbol = 'ETH';
  @Input() compact = false;
  @Input() link: string | null | undefined;

  imageFailed = false;

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  onImageError(): void {
    this.imageFailed = true;
  }

  get iconUrl(): string | null {
    const iconUrl = this.entity?.iconUrl?.trim();
    if (!iconUrl) return null;
    try { const url = new URL(iconUrl, window.location.origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }

  get primaryLabel(): string {
    return this.firstPresent(
      this.entity?.displayName,
      this.entity?.name,
      this.entity?.ensName,
      this.entity?.tokenSymbol,
      this.abbreviatedAddress,
    ) || `Unknown ${this.chainName} entity`;
  }

  get secondaryLabel(): string | null {
    const address = this.entity?.address?.trim();
    const ensName = this.entity?.ensName?.trim();

    if (address && this.primaryLabel !== this.abbreviatedAddress) {
      return this.abbreviatedAddress;
    }
    if (ensName && ensName !== this.primaryLabel) {
      return ensName;
    }
    return null;
  }

  get abbreviatedAddress(): string {
    const address = this.entity?.address?.trim() || '';
    if (address.length <= 16) {
      return address;
    }
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }

  get initials(): string {
    const source = this.firstPresent(
      this.entity?.tokenSymbol,
      this.entity?.displayName,
      this.entity?.name,
      this.entity?.ensName,
      this.entity?.address?.replace(/^0x/i, ''),
    );

    if (!source) {
      return this.chainSymbol;
    }

    const words = source.match(/[a-zA-Z0-9]+/g) || [];
    if (words.length > 1) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  get accessibleLabel(): string {
    const address = this.entity?.address?.trim();
    return address && address !== this.primaryLabel
      ? `${this.primaryLabel}, ${this.chainName} address ${address}`
      : this.primaryLabel;
  }

  get proxyLabel(): string {
    const proxyType = this.entity?.proxyType?.trim();
    return proxyType ? `Proxy: ${proxyType}` : 'Proxy contract';
  }

  get scamLabel(): string {
    const reputation = this.entity?.reputation?.trim();
    return reputation ? `Scam warning: ${reputation}` : 'Scam warning';
  }

  private firstPresent(...values: Array<string | null | undefined>): string {
    return values.find((value) => Boolean(value?.trim()))?.trim() || '';
  }
}
