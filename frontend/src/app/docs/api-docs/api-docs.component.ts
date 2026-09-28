import { AfterViewInit, Component, HostListener, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  TonDocEntry,
  TonDocItem,
  tonGuideData,
  tonRestData,
  tonWebsocketData,
} from '@app/docs/api-docs/ton-docs-data';

@Component({
  selector: 'app-api-docs',
  templateUrl: './api-docs.component.html',
  styleUrls: ['./api-docs.component.scss'],
  standalone: false,
})
export class ApiDocsComponent implements OnInit, AfterViewInit {
  @Input() whichTab: 'faq' | 'rest' | 'websocket';

  hostname = `${document.location.protocol}//${document.location.host}`;
  mobileViewport = window.innerWidth <= 992;
  expandedFragments = new Set<string>();
  docs: TonDocItem[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.docs = this.whichTab === 'rest'
      ? tonRestData
      : this.whichTab === 'websocket'
        ? tonWebsocketData
        : tonGuideData;
  }

  ngAfterViewInit(): void {
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      setTimeout(() => this.openAndScroll(fragment), 0);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.mobileViewport = window.innerWidth <= 992;
  }


  anchorLinkClick(event: { event?: Event; fragment: string }): void {
    event.event?.preventDefault();
    const fragment = event.fragment;
    if (this.mobileViewport && this.expandedFragments.has(fragment)) {
      this.expandedFragments.delete(fragment);
      return;
    }
    this.openAndScroll(fragment);
  }

  isEntry(item: TonDocItem): item is TonDocEntry {
    return item.type === 'entry';
  }

  isExpanded(fragment: string): boolean {
    return !this.mobileViewport || this.expandedFragments.has(fragment);
  }

  endpointUrl(path: string): string {
    return `${this.hostname}${path}`;
  }

  curlExample(path: string): string {
    return `curl '${this.endpointUrl(path)}'`;
  }

  websocketUrl(): string {
    return `${this.hostname.replace(/^http/, 'ws')}/api/v1/ws`;
  }

  private openAndScroll(fragment: string): void {
    this.expandedFragments.add(fragment);
    const element = document.getElementById(fragment);
    if (!element) {
      return;
    }
    window.history.replaceState({}, '', `${document.location.pathname}#${fragment}`);
    setTimeout(() => {
      const offset = this.mobileViewport ? 110 : 70;
      window.scrollTo({ top: element.offsetTop - offset, behavior: 'smooth' });
    }, 0);
  }
}
