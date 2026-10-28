import { ChangeDetectionStrategy, Component, Inject, Input, LOCALE_ID } from '@angular/core';

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

  get isSpanish(): boolean { return this.locale.toLowerCase().startsWith('es'); }
  get localizedContext(): string {
    if (!this.isSpanish) return this.context;
    return this.context === 'documentation' ? 'documentación' : this.context === 'explorer' ? 'explorador' : this.context;
  }
}
