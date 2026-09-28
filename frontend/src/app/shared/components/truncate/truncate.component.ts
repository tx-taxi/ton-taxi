import { Component, Input, Inject, LOCALE_ID, ChangeDetectionStrategy } from '@angular/core';
import { tonBlockIdentity } from '@app/ton/chain-selection';

@Component({
  selector: 'app-truncate',
  templateUrl: './truncate.component.html',
  styleUrls: ['./truncate.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncateComponent {
  @Input() text: string;
  @Input() link: any = null;
  @Input() external: boolean = false;
  @Input() queryParams: any = undefined;
  @Input() lastChars: number = 4;
  @Input() maxWidth: number = null;
  @Input() inline: boolean = false;
  @Input() textAlign: 'start' | 'end' = 'start';
  @Input() disabled: boolean = false;
  rtl: boolean;

  get nativeBlockLink(): string | null {
    return Array.isArray(this.link) && /(?:^|\/)block\/?$/.test(this.link[0]) && tonBlockIdentity(this.link[1]) ? this.link[1] : null;
  }

  get isEthereumAddress(): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(this.text || '');
  }

  constructor(
    @Inject(LOCALE_ID) private locale: string,
  ) {
    if (this.locale.startsWith('ar') || this.locale.startsWith('fa') || this.locale.startsWith('he')) {
      this.rtl = true;
    }
  }
}
