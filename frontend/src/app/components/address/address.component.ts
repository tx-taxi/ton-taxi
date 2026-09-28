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

export interface NativeAccountView {
  address: string;
  identity: NativeIdentity;
  balance: NativeAmount;
  status?: string;
  lastActivity?: number;
  interfaces: string[];
  domains: string[];
  stale: boolean;
}

/** The native account presentation. TON's route owner supplies indexed account data. */
@Component({
  selector: 'app-address',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressComponent {
  @Input() account: NativeAccountView | null = null;
  @Input() addressString = '';
  @Input() isLoadingAddress = false;
  @Input() error = '';
  @Output() retry = new EventEmitter<void>();
  showQR = false;
}
