import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef, Input, OnChanges } from '@angular/core';
import { StateService } from '@app/services/state.service';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { Recommendedfees } from '@interfaces/websocket.interface';
import { feeLevels } from '@app/app.constants';
import { map, startWith, tap } from 'rxjs/operators';
import { ThemeService } from '@app/services/theme.service';
import type { FeeStatistics, ConfirmedTransactionWindowSource } from '@app/ton/dashboard-data';
import type { NativeAmount } from '@app/shared/native-view.types';

@Component({
  selector: 'app-fees-box',
  templateUrl: './fees-box.component.html',
  styleUrls: ['./fees-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FeesBoxComponent implements OnInit, OnDestroy, OnChanges {
  @Input() confirmedMode = false;
  @Input() confirmedFees: FeeStatistics | null = null;
  @Input() confirmedSource: ConfirmedTransactionWindowSource | null = null;
  isLoading$: Observable<boolean>;
  recommendedFees$: Observable<Recommendedfees>;
  themeStateSubscription: Subscription;
  gradient = 'linear-gradient(to right, var(--skeleton-bg), var(--skeleton-bg))';
  noPriority = 'var(--skeleton-bg)';
  fees: Recommendedfees;

  constructor(
    private stateService: StateService,
    private themeService: ThemeService,
    private cd: ChangeDetectorRef,
  ) { }

  get labels(): string[] {
    return this.confirmedMode ? ['Minimum', 'Median', 'Average', 'Maximum'] : ['No Priority', 'Low Priority', 'Medium Priority', 'High Priority'];
  }

  get feeRows(): { amount?: NativeAmount; rate?: number; belowAtomicUnit?: boolean; tooltip: string }[] {
    if (this.confirmedMode) {
      const fees = this.confirmedFees;
      const sample = `${fees?.count ?? 0} confirmed transactions across the network with reported fees${this.confirmedSource?.masterSeqno ? ` confirmed by masterchain block #${this.confirmedSource.masterSeqno}` : ''}${this.confirmedSource?.partial ? ' (partial sample)' : ''}.`;
      const descriptions = ['Lowest observed transaction fee.', 'Middle observed transaction fee, rounded down to a whole nanogram when necessary.', 'Average observed transaction fee, rounded down to a whole nanogram when necessary.', 'Highest observed transaction fee.'];
      return [fees?.min, fees?.median, fees?.mean, fees?.max].map((atomic, index) => {
        const ratio = index === 1 ? fees?.medianExact : index === 2 ? fees?.meanExact : null;
        const fractional = ratio && ratio.remainder !== '0';
        return {
          amount: { atomic, decimals: 9, symbol: 'GRAM', atomicSymbol: 'nanograms', native: true },
          belowAtomicUnit: atomic === '0' && fractional,
          tooltip: `${descriptions[index]}${fractional ? ` Exact result: ${atomic} + ${ratio.remainder}/${ratio.denominator} nanograms.` : ''} ${sample}`,
        };
      });
    }
    return [this.fees?.economyFee, this.fees?.hourFee, this.fees?.halfHourFee, this.fees?.fastestFee].map(rate => ({ rate, tooltip: 'Based on a simple ETH transfer using 21,000 gas' }));
  }

  labelTooltip(index: number): string {
    return this.confirmedMode ? this.feeRows[index].tooltip : [
      'Either 2x the minimum, or the Low Priority rate (whichever is lower)',
      'Usually places your transaction in between the second and third mempool blocks',
      'Usually places your transaction in between the first and second mempool blocks',
      'Places your transaction in the first mempool block',
    ][index];
  }

  ngOnChanges(): void { this.setFeeGradient(); }

  trackByIndex(index: number): number { return index; }

  ngOnInit(): void {
    if (!this.confirmedMode) {
      this.isLoading$ = combineLatest(
        this.stateService.isLoadingWebSocket$.pipe(startWith(false)),
        this.stateService.loadingIndicators$.pipe(startWith({ mempool: 0 })),
      ).pipe(map(([socket, indicators]) => socket || (indicators.mempool != null && indicators.mempool !== 100)));
      this.recommendedFees$ = this.stateService.recommendedFees$.pipe(
        tap(fees => {
          this.fees = fees;
          this.setFeeGradient();
        }),
      );
    }
    this.themeStateSubscription = this.themeService.themeState$.subscribe((state) => {
      if (!state.loading) {
        this.setFeeGradient();
      }
    });
  }

  setFeeGradient() {
    if (this.confirmedMode) {
      this.gradient = 'linear-gradient(to right, var(--primary), var(--mainnet-alt))';
      this.noPriority = 'var(--primary)';
      this.cd.markForCheck();
      return;
    }
    if (!this.fees || !this.themeService.mempoolFeeColors) {
      return;
    }
    let feeLevelIndex = feeLevels.slice().reverse().findIndex((feeLvl) => this.fees.minimumFee >= feeLvl);
    feeLevelIndex = feeLevelIndex >= 0 ? feeLevels.length - feeLevelIndex : feeLevelIndex;
    const startColor = '#' + (this.themeService.mempoolFeeColors[feeLevelIndex - 1] || this.themeService.mempoolFeeColors[this.themeService.mempoolFeeColors.length - 1]);

    feeLevelIndex = feeLevels.slice().reverse().findIndex((feeLvl) => this.fees.fastestFee >= feeLvl);
    feeLevelIndex = feeLevelIndex >= 0 ? feeLevels.length - feeLevelIndex : feeLevelIndex;
    const endColor = '#' + (this.themeService.mempoolFeeColors[feeLevelIndex - 1] || this.themeService.mempoolFeeColors[this.themeService.mempoolFeeColors.length - 1]);

    this.gradient = `linear-gradient(to right, ${startColor}, ${endColor})`;
    this.noPriority = startColor;

    this.cd.markForCheck();
  }

  ngOnDestroy(): void {
    this.themeStateSubscription?.unsubscribe();
  }
}
