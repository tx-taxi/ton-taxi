import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, LOCALE_ID, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { echarts, EChartsOption } from '@app/graphs/echarts';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { map, share, startWith, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '@app/services/api.service';
import { SeoService } from '@app/services/seo.service';
import { formatDate, formatNumber } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { download, formatterXAxis } from '@app/shared/graphs.utils';
import { StorageService } from '@app/services/storage.service';
import { MiningService } from '@app/services/mining.service';
import { ActivatedRoute } from '@angular/router';
import { FiatShortenerPipe } from '@app/shared/pipes/fiat-shortener.pipe';
import { FiatCurrencyPipe } from '@app/shared/pipes/fiat-currency.pipe';
import { StateService } from '@app/services/state.service';
import { ThemeService } from '@app/services/theme.service';
import { TonMarketService, TonVenueQuote } from '@app/ton/ton-market.service';

export interface NativePriceSeries {
  points: Array<{timestamp: number; price: string | number}>;
  currency: string;
  assetSymbol: string;
  observedAt?: string;
  stale?: boolean;
}

@Component({
  selector: 'app-price-chart',
  templateUrl: './price-chart.component.html',
  styleUrls: ['./price-chart.component.scss'],
  styles: [`
    .loadingGraphs {
      position: absolute;
      top: 50%;
      left: calc(50% - 15px);
      z-index: 99;
    }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() widget = false;
  @Input() height: number = 300;
  @Input() right: number | string = 45;
  @Input() left: number | string = 75;
  @Input() timespan: string = '';
  @Input() currency: string = 'USD';
  @Input() nativeMode = false;
  @Input() nativePrices: NativePriceSeries | null = null;
  @Input() nativeLoading = false;
  @Input() nativeError = '';
  @Output() timespanChange = new EventEmitter<string>();
  private subscriptions = new Subscription();

  miningWindowPreference: string;
  radioGroupForm: UntypedFormGroup;

  chartOptions: EChartsOption = {};
  chartInitOptions = {
    renderer: 'svg',
  };

  pricesObservable$: Observable<any>;
  isLoading = true;
  formatNumber = formatNumber;
  chartInstance: any = undefined;
  currentTimespan = '';
  marketPage = false;
  marketQuotes: TonVenueQuote[] = [];
  marketQuotesLoading = false;
  marketQuotesError = '';
  marketQuotesStale = false;

  constructor(
    @Inject(LOCALE_ID) public locale: string,
    private seoService: SeoService,
    private apiService: ApiService,
    private formBuilder: UntypedFormBuilder,
    private storageService: StorageService,
    private miningService: MiningService,
    public stateService: StateService,
    private route: ActivatedRoute,
    private fiatShortenerPipe: FiatShortenerPipe,
    private fiatCurrencyPipe: FiatCurrencyPipe,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private tonMarketService: TonMarketService,
  ) {
    this.radioGroupForm = this.formBuilder.group({ dateSpan: '1y' });
    this.radioGroupForm.controls.dateSpan.setValue('1y');
  }

  ngOnInit(): void {
    if (this.route.snapshot.data['tonMarket'] === true) {
      this.marketPage = true;
      this.nativeMode = true;
      this.currentTimespan = this.timespan || '1m';
      this.radioGroupForm.controls.dateSpan.setValue(this.currentTimespan, {emitEvent: false});
      this.subscriptions.add(this.radioGroupForm.controls.dateSpan.valueChanges.subscribe(timespan => { this.currentTimespan = timespan; this.loadTonMarketPrices(); }));
      this.subscriptions.add(this.stateService.fiatCurrency$.subscribe(currency => { this.currency = currency.toUpperCase(); this.loadTonMarketPrices(); }));
      this.loadTonMarketQuotes();
      return;
    }
    if (this.nativeMode) {
      this.currentTimespan = this.timespan || '1m';
      this.radioGroupForm.controls.dateSpan.setValue(this.currentTimespan, {emitEvent: false});
      this.subscriptions.add(this.radioGroupForm.controls.dateSpan.valueChanges.subscribe(timespan => {
        this.currentTimespan = timespan;
        this.timespanChange.emit(timespan);
      }));
      this.subscriptions.add(combineLatest([this.themeService.themeState$, this.stateService.timezone$]).subscribe(([theme]) => {
        if (!theme.loading) this.updateNativeSeries();
      }));
      this.updateNativeSeries();
      return;
    }
    // Use input timespan if provided, otherwise use defaults
    if (this.timespan) {
      this.miningWindowPreference = this.timespan;
    } else if (this.widget) {
      this.miningWindowPreference = '1y';
    } else {
      this.seoService.setTitle($localize`:@@price-chart.title:Bitcoin Price`);
      this.seoService.setDescription($localize`:@@price-chart.description:See the Bitcoin price in USD visualized over time.`);
      this.miningWindowPreference = this.miningService.getDefaultTimespan('1m');
    }
    this.radioGroupForm = this.formBuilder.group({ dateSpan: this.miningWindowPreference });
    this.radioGroupForm.controls.dateSpan.setValue(this.miningWindowPreference);

    this.route
      .fragment
      .subscribe((fragment) => {
        if (['1m', '3m', '6m', '1y', '2y', '3y', 'all'].indexOf(fragment) > -1) {
          this.radioGroupForm.controls.dateSpan.setValue(fragment, { emitEvent: false });
        }
      });

    this.pricesObservable$ = combineLatest([
      this.radioGroupForm.get('dateSpan').valueChanges.pipe(startWith(this.radioGroupForm.controls.dateSpan.value)),
      this.stateService.fiatCurrency$,
    ]).pipe(
        switchMap(([timespan, currency]) => {
          this.currency = currency;
          const now = new Date();
          let startTimestamp = 0;
          if (timespan === '1m') {
            startTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate());
          } else if (timespan === '3m') {
            startTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate());
          } else if (timespan === '6m') {
            startTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate());
          } else if (timespan === '1y') {
            startTimestamp = Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate());
          } else if (timespan === '2y') {
            startTimestamp = Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate());
          } else if (timespan === '3y') {
            startTimestamp = Date.UTC(now.getUTCFullYear() - 3, now.getUTCMonth(), now.getUTCDate());
          } // 'all' keeps startTimestamp = 0

          this.isLoading = true;
          if (!this.widget) {
            this.storageService.setValue('miningWindowPreference', timespan);
          }
          this.currentTimespan = timespan;
          return this.apiService.getHistoricalPrice$(undefined, this.currency)
            .pipe(
              tap((response: any) => {
                this.prepareChartOptions({
                  priceData: response.prices.filter((p: any) => p[this.currency] > 0 && p.time * 1000 >= startTimestamp).map((p: any) => [p.time * 1000, p[this.currency]]),
                });
                this.isLoading = false;
              }),
              map((response: any) => {
                const priceData = response.prices.filter((p: any) => p[this.currency] > 0 && p.time * 1000 >= startTimestamp).map((p: any) => p[this.currency]);
                const latestPrice = priceData.length > 0 ? priceData[0] : null;
                const firstPrice = priceData.length > 0 ? priceData[priceData.length - 1] : null;
                const percentChange = (latestPrice && firstPrice) ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

                return {
                  latestPrice: latestPrice,
                  percentChange: percentChange,
                };
              }),
            );
        }),
        share()
      );
  }

  ngOnChanges(): void {
    if (this.nativeMode) {
      if (this.timespan) {
        this.currentTimespan = this.timespan;
        this.radioGroupForm.controls.dateSpan.setValue(this.timespan, {emitEvent: false});
      }
      this.updateNativeSeries();
    }
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  private loadTonMarketPrices(): void {
    this.nativeLoading = true; this.nativeError = '';
    this.tonMarketService.prices(this.currency, this.currentTimespan).subscribe({
      next: response => { this.nativePrices = { points: response.points || [], currency: response.currency, assetSymbol: response.assetSymbol, observedAt: response._meta?.observedAt, stale: response._meta?.stale === true }; this.nativeLoading = false; this.updateNativeSeries(); },
      error: () => { this.nativeLoading = false; this.nativeError = 'Price history temporarily unavailable'; if (this.nativePrices) this.nativePrices = {...this.nativePrices, stale: true}; this.updateNativeSeries(); },
    });
  }

  private loadTonMarketQuotes(): void {
    this.marketQuotesLoading = true; this.marketQuotesError = '';
    this.tonMarketService.quotes().subscribe({
      next: response => { this.marketQuotes = response.markets || []; this.marketQuotesStale = response._meta?.stale === true; this.marketQuotesLoading = false; this.cdr.markForCheck(); },
      error: () => { this.marketQuotesError = 'Market quotes temporarily unavailable'; this.marketQuotesLoading = false; this.marketQuotesStale = this.marketQuotesStale || this.marketQuotes.length > 0; this.cdr.markForCheck(); },
    });
  }

  marketTimestamp(value: number | string | undefined): number | null { const parsed = value == null || value === '' ? NaN : (typeof value === 'number' || /^\d+$/.test(value) ? Number(value) : Date.parse(value) / 1000); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; }

  private updateNativeSeries(): void {
    if (!this.nativeMode) return;
    const points = (this.nativePrices?.points || [])
      .filter(point => Number.isFinite(point.timestamp) && point.timestamp > 0 && Number.isFinite(Number(point.price)) && Number(point.price) > 0)
      .map(point => [point.timestamp * 1000, Number(point.price)])
      .sort((a, b) => a[0] - b[0]);
    if (this.nativePrices?.currency) this.currency = this.nativePrices.currency;
    this.isLoading = this.nativeLoading;
    this.prepareChartOptions({priceData: points});
    const first = points[0]?.[1], latest = points[points.length - 1]?.[1];
    this.pricesObservable$ = of({latestPrice: latest ?? null, percentChange: first != null && latest != null ? ((latest - first) / first) * 100 : null});
    this.cdr.markForCheck();
  }

  nativeDate(value: number, pattern = 'MMM d, y HH:mm'): string {
    return formatDate(value, pattern, this.locale, this.stateService.timezone$.value);
  }

  nativePrice(value: number, precision = 6): string {
    return new Intl.NumberFormat(this.locale, {style: 'currency', currency: this.currency, minimumFractionDigits: 2, maximumFractionDigits: precision}).format(value);
  }

  prepareChartOptions(data) {
    let title: object;
    if (data.priceData.length === 0) {
      title = {
        textStyle: {
          color: 'grey',
          fontSize: 15
        },
        text: this.nativeMode ? (this.nativeLoading ? 'Loading price history' : this.nativeError || 'No price history available') : $localize`:@@23555386d8af1ff73f297e89dd4af3f4689fb9dd:Indexing blocks`,
        left: 'center',
        top: 'center'
      };
    }

    const colors = this.nativeMode && this.stateService.isBrowser ? getComputedStyle(document.documentElement) : null;
    const primary = colors?.getPropertyValue('--primary').trim() || '#0098ea';
    const foreground = colors?.getPropertyValue('--fg').trim() || '#fff';
    const background = colors?.getPropertyValue('--active-bg').trim() || '#101b23';
    const prices: number[] = this.nativeMode ? data.priceData.map(point => point[1]) : [];
    const range = prices.length ? Math.max(...prices) - Math.min(...prices) : 0;
    const axisPrecision = range > 0 ? Math.min(6, Math.max(2, Math.ceil(-Math.log10(range / 5)))) : 2;
    this.chartOptions = {
      title: title,
      color: [
        new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: this.nativeMode ? primary : '#C0CA33' },
          { offset: 1, color: this.nativeMode ? primary : '#1B5E20' },
        ]),
      ],
      animation: false,
      grid: {
        height: (this.widget && this.height) ? this.height - 30 : undefined,
        top: this.widget ? 20 : 30,
        bottom: this.widget ? 30 : 80,
        right: this.right,
        left: this.left,
      },
      tooltip: {
        show: !this.isMobile() || !this.widget,
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        backgroundColor: this.nativeMode ? background : 'rgba(17, 19, 31, 1)',
        borderRadius: 4,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        textStyle: {
          color: this.nativeMode ? foreground : 'var(--tooltip-grey)',
          align: 'left',
        },
        borderColor: '#000',
        formatter: function (data) {
          if (data.length <= 0) {
            return '';
          }
          let tooltip = `<b style="color: white; margin-left: 2px">
            ${this.nativeMode ? this.nativeDate(Number(data[0].axisValue)) : formatterXAxis(this.locale, this.currentTimespan, parseInt(data[0].axisValue, 10))}</b><br>`;

          for (const tick of data) {
            tooltip += `${tick.marker} ${tick.seriesName}: ${this.nativeMode ? this.nativePrice(tick.data[1]) : this.fiatCurrencyPipe.transform(tick.data[1], null, this.currency)}<br>`;
          }
          return tooltip;
        }.bind(this)
      },
      xAxis: data.priceData.length === 0 ? undefined :
      {
        type: 'time',
        splitNumber: (this.isMobile() || this.widget) ? 5 : 10,
        axisLabel: {
          hideOverlap: true,
          ...(this.nativeMode ? {formatter: (value: number) => this.nativeDate(value, ['1m', '3m', '6m'].includes(this.currentTimespan) ? 'MMM d' : 'MMM y')} : {}),
        }
      },
      yAxis: data.priceData.length === 0 ? undefined : [
        {
          type: 'value',
          min: 'dataMin',
          axisLabel: {
            color: 'rgb(110, 112, 121)',
            formatter: function(val) {
              return this.nativeMode ? this.nativePrice(val, axisPrecision) : this.fiatShortenerPipe.transform(val, null, this.currency);
            }.bind(this)
          },
          splitLine: {
            lineStyle: {
              type: 'dotted',
              color: 'var(--transparent-fg)',
              opacity: 0.25,
            }
          },
        },
      ],
      series: data.priceData.length === 0 ? undefined : [
        {
          // legendHoverLink: false,
          zlevel: 0,
          yAxisIndex: 0,
          name: `${this.nativeMode ? this.nativePrices?.assetSymbol || 'GRAM' : 'BTC'}/${this.currency}`,
          data: data.priceData,
          type: 'line',
          smooth: this.nativeMode ? false : 0.25,
          symbol: 'none',
          lineStyle: {
            width: 2,
            opacity: 1,
          }
        },
      ],
      dataZoom: (this.widget || data.priceData.length === 0) ? undefined : [{
        type: 'inside',
        realtime: true,
        zoomLock: true,
        maxSpan: 100,
        minSpan: 5,
        moveOnMouseMove: false,
      }, {
        showDetail: false,
        show: true,
        type: 'slider',
        brushSelect: false,
        realtime: true,
        left: 20,
        right: 15,
        selectedDataBackground: {
          lineStyle: {
            color: '#fff',
            opacity: 0.45,
          },
          areaStyle: {
            opacity: 0,
          }
        },
      }],
    };
  }

  onChartInit(ec) {
    this.chartInstance = ec;
  }

  isMobile() {
    return (window.innerWidth <= 767.98);
  }

  onSaveChart() {
    // @ts-ignore
    const prevBottom = this.chartOptions.grid.bottom;
    const now = new Date();
    // @ts-ignore
    this.chartOptions.grid.bottom = 40;
    this.chartOptions.backgroundColor = 'var(--active-bg)';
    this.chartInstance.setOption(this.chartOptions);
    download(this.chartInstance.getDataURL({
      pixelRatio: 2,
      excludeComponents: ['dataZoom'],
    }), `${this.nativeMode ? (this.nativePrices?.assetSymbol || 'GRAM').toLowerCase() : 'btc'}-price-${this.currency.toLowerCase()}-${this.currentTimespan}-${Math.round(now.getTime() / 1000)}.svg`);
    // @ts-ignore
    this.chartOptions.grid.bottom = prevBottom;
    this.chartOptions.backgroundColor = 'none';
    this.chartInstance.setOption(this.chartOptions);
  }
}
