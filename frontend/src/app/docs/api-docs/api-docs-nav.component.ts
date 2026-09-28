import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  TonDocItem,
  tonGuideData,
  tonRestData,
  tonWebsocketData,
} from '@app/docs/api-docs/ton-docs-data';

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

  ngOnInit(): void {
    this.tabData = this.whichTab === 'rest'
      ? tonRestData
      : this.whichTab === 'websocket'
        ? tonWebsocketData
        : tonGuideData;
  }

  navLinkClick(event: Event, fragment: string): void {
    event.preventDefault();
    this.navLinkClickEvent.emit({ event, fragment });
  }
}
