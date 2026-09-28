import { AfterViewInit, ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { StateService } from '@app/services/state.service';
import { detectWebGL } from '@app/shared/graphs.utils';
import { TonNetworkData } from '@app/ton/ton-network-data.service';

@Component({ selector: 'app-dashboard', templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.scss'], standalone: false, changeDetection: ChangeDetectionStrategy.OnPush, providers: [TonNetworkData] })
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  gasMarketGraphHeight = 260;
  goggleResolution = 82;
  webGlEnabled: boolean;
  pending$ = this.stateService.tonPending$;
  constructor(public stateService: StateService, public native: TonNetworkData) { this.webGlEnabled = stateService.isBrowser && detectWebGL(); }
  get dashboard(): any { return this.native.dashboard; }
  get meanInterval(): number | null { const intervals = this.dashboard.intervals; return intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : null; }
  ngOnInit(): void { this.onResize(); this.native.ngOnInit(); }
  ngOnDestroy(): void { this.native.ngOnDestroy(); }
  ngAfterViewInit(): void { this.stateService.focusSearchInputDesktop(); }
  trackByBlock(index: number, block: any): string { return block.id; }
  @HostListener('window:resize') onResize(): void {
    if (window.innerWidth >= 992) { this.gasMarketGraphHeight = 260; this.goggleResolution = 82; }
    else if (window.innerWidth >= 768) { this.gasMarketGraphHeight = 190; this.goggleResolution = 80; }
    else { this.gasMarketGraphHeight = 180; this.goggleResolution = 86; }
  }
}
