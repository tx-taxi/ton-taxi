import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { NativeAmount } from '../shared/native-view.types';

export interface NativeNftCard {
  address: string;
  name: string;
  image: string | null;
  collectionLabel?: string;
  sale?: NativeAmount | null;
  flagged: boolean;
}

/** TON NFT media has no inherited renderer; account, collection and catalog share this one. */
@Component({
  selector: 'app-ton-nft-grid',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  templateUrl: './ton-nft-grid.component.html',
  styleUrls: ['./ton-nft-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TonNftGridComponent {
  @Input() items: NativeNftCard[] = [];
  @Input() itemKind: 'nft' | 'collection' = 'nft';
  trackItem(_index: number, item: NativeNftCard): string {
    return item.address;
  }
  imageLoaded(event: Event): void {
    (event.target as HTMLImageElement).parentElement?.classList.remove(
      'media-pending'
    );
  }
  hideImage(event: Event): void {
    this.imageLoaded(event);
    (event.target as HTMLImageElement).hidden = true;
    (event.target as HTMLImageElement).parentElement?.classList.add(
      'image-unavailable'
    );
  }
}
