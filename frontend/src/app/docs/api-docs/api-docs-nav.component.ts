import { Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output } from '@angular/core';
import {
  TonDocItem,
  tonGuideData,
  tonRestData,
  tonWebsocketData,
} from '@app/docs/api-docs/ton-docs-data';
import { localizedTonDocs } from '@app/docs/api-docs/ton-docs-locale';
import { tonDocsCopy } from '@app/shared/ton-docs-copy';

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

  get copy() { return tonDocsCopy(this.locale); }

  ngOnInit(): void {
    this.tabData = localizedTonDocs(this.whichTab === 'rest'
      ? tonRestData
      : this.whichTab === 'websocket'
        ? tonWebsocketData
        : tonGuideData, this.locale);
  }

  anchorHref(fragment: string): string {
    return `${window.location.pathname}${window.location.search}#${encodeURIComponent(fragment)}`;
  }

  navLinkClick(event: MouseEvent, fragment: string): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    this.navLinkClickEvent.emit({ event, fragment });
  }
}
