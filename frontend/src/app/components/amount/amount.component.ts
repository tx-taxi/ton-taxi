import { compactBlockAmount, compactBlockNumber } from '@app/shared/block-format';
import { Component, OnInit, OnDestroy, OnChanges, Injector, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { StateService } from '@app/services/state.service';
import { Observable, Subscription } from 'rxjs';
import { NativeAmount, NativeQuote } from '@app/shared/native-view.types';
import { displayNativeAmount, exactUnits } from '@app/shared/native-amount';
import { TonRatesService } from '@app/services/ton-rates.service';
import { Price } from '@app/services/price.service';

@Component({
  selector: 'app-amount',
  templateUrl: './amount.component.html',
  styleUrls: ['./amount.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AmountComponent implements OnInit, OnDestroy, OnChanges {
  conversions$: Observable<any>;
  currency: string;
  viewAmountMode$: Observable<'btc' | 'sats' | 'fiat'>;
  network = '';

  stateSubscription: Subscription;
  currencySubscription: Subscription;

  @Input() amount?: NativeAmount;
  @Input() displayMode?: 'btc' | 'sats' | 'fiat';
  private nativeQuotes: Record<string, NativeQuote> = {};
  private nativeRatesSubscription?: Subscription;
  private modeSubscription?: Subscription;
  private mode: 'btc'|'sats'|'fiat' = 'btc';
  get nativeDisplay() {
    const mode = this.displayMode || (this.ignoreViewMode || this.noFiat && this.mode === 'fiat' ? 'btc' : this.mode);
    const display = displayNativeAmount(this.amount, mode, this.currency, this.amount.native ? this.nativeQuotes[this.currency] : null);
    if (this.compactBlock && mode !== 'fiat' && display.value !== '—') {
      const atomic = mode === 'sats' && this.amount.native;
      const exact = exactUnits(this.amount.atomic, atomic ? 0 : this.amount.decimals, false);
      return { ...display, value: compactBlockNumber(Number(exact), !atomic) };
    }
    return display;
  }
  ngOnChanges() {
    if (this.amount?.native && this.amount.quote === undefined && !this.nativeRatesSubscription) {
      this.nativeRatesSubscription = this.injector.get(TonRatesService).quotes$.subscribe(quotes => { this.nativeQuotes = quotes; this.cd.markForCheck(); });
    }
  }
  @Input() satoshis: number;
  @Input() compactBlock = false;
  compactBlockAmount = compactBlockAmount;

  @Input() digitsInfo = '1.8-8';
  @Input() noFiat = false;
  @Input() addPlus = false;
  @Input() blockConversion: Price;
  @Input() forceBtc: boolean = false;
  @Input() ignoreViewMode: boolean = false;
  @Input() forceBlockConversion: boolean = false; // true = displays fiat price as 0 if blockConversion is undefined instead of falling back to conversions
  @Input() unitStyle: any;

  constructor(
    private stateService: StateService,
    private cd: ChangeDetectorRef,
    private injector: Injector,
  ) {
    this.currencySubscription = this.stateService.fiatCurrency$.subscribe((fiat) => {
      this.currency = fiat;
      this.cd.markForCheck();
    });
  }

  ngOnInit() {
    this.modeSubscription = this.stateService.viewAmountMode$.subscribe(mode => { this.mode = mode; this.cd.markForCheck(); });
    this.viewAmountMode$ = this.stateService.viewAmountMode$.asObservable();
    this.conversions$ = this.stateService.conversions$.asObservable();
    this.stateSubscription = this.stateService.networkChanged$.subscribe((network) => this.network = network);
  }

  ngOnDestroy() {
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
    this.currencySubscription.unsubscribe();
    this.modeSubscription?.unsubscribe();
    this.nativeRatesSubscription?.unsubscribe();
  }

}
