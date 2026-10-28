import { Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output } from '@angular/core';
import {
  TonDocItem,
  tonGuideData,
  tonRestData,
  tonWebsocketData,
} from '@app/docs/api-docs/ton-docs-data';
import { translateTonDocs } from '@app/docs/api-docs/ton-docs-es';

@Component({
  selector: 'app-api-docs-nav',
  templateUrl: './api-docs-nav.component.html',
  styleUrls: ['./api-docs-nav.component.scss'],
  standalone: false,
})
export class ApiDocsNavComponent implements OnInit {
  @Input() whichTab: 'faq' | 'rest' | 'websocket';
  @Output() navLinkClickEvent = new EventEmitter<{ event: Event; fragment: string }>();

  tabData: TonDocItem[] = [];

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  get isSpanish(): boolean { return this.locale.toLowerCase().startsWith('es'); }

  ngOnInit(): void {
    this.tabData = translateTonDocs(this.whichTab === 'rest'
      ? tonRestData
      : this.whichTab === 'websocket'
        ? tonWebsocketData
        : tonGuideData, this.locale);
  }

  navLinkClick(event: Event, fragment: string): void {
    event.preventDefault();
    this.navLinkClickEvent.emit({ event, fragment });
  }
}
