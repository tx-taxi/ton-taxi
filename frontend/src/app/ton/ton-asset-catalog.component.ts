import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { NativeIdentity } from '../shared/native-view.types';
import { TonAssetsPageComponent } from './ton-assets-page.component';
import { TonNftGridComponent } from './ton-nft-grid.component';

/** Indexed asset catalogs use the same token rows and NFT inventory grid as account pages. */
@Component({
  selector: 'app-ton-asset-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, TonNftGridComponent],
  templateUrl: './ton-asset-catalog.component.html',
  styleUrls: ['./ton-assets-page.component.scss'],
})
export class TonAssetCatalogComponent extends TonAssetsPageComponent {
  catalogIdentity(item: any): NativeIdentity {
    return this.nativeIdentity({
      ...item,
      ...item.metadata,
      address: item.metadata?.address || item.address,
      image: item.preview || item.metadata?.image,
    });
  }
  catalogAddress(item: any): string {
    return item.metadata?.address || item.address || '';
  }
  catalogTrust(item: any): string {
    return item.verification === 'whitelist'
      ? 'Recognized'
      : item.verification === 'blacklist'
      ? 'Flagged'
      : 'Unclassified';
  }
}
