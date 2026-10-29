import { ChangeDetectionStrategy, Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { tonDocsCopy } from '@app/shared/ton-docs-copy';

@Component({
  selector: 'app-tx-taxi-docs-intro',
  standalone: true,
  templateUrl: './tx-taxi-docs-intro.component.html',
  styleUrls: ['./tx-taxi-docs-intro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TxTaxiDocsIntroComponent {
  @Input() context = 'documentation';
  @Input() chainName = '';
  @Input() chainHost = '';

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  get copy() { return tonDocsCopy(this.locale); }
  get localizedContext(): string {
    return this.context === 'documentation' ? this.copy.documentation : this.context === 'explorer' ? this.copy.explorer : this.context;
  }
}
