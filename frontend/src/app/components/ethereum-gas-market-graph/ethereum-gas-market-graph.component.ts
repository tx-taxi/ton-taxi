import { formatDate, formatNumber } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, LOCALE_ID, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { EChartsOption } from '@app/graphs/echarts';
import { StateService } from '@app/services/state.service';
import { Subscription } from 'rxjs';
import type { TonNetworkHistorySample } from '@app/ton/network-history';

export interface EthereumGasMarketSample {
  added: number;
  base_fee_gwei: number;
  network_utilization_percentage: number;
  gas_price_average_gwei: number;
  pending_sample_count?: number;
}
export type { TonNetworkHistorySample } from '@app/ton/network-history';

type ChartSample = Omit<EthereumGasMarketSample, 'base_fee_gwei' | 'gas_price_average_gwei' | 'network_utilization_percentage'> & { timestamp: number; base_fee_gwei: number | null; gas_price_average_gwei: number | null; network_utilization_percentage: number | null; tonFeeAtomic?: string; tonHistory?: TonNetworkHistorySample; gapBefore?: boolean };

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 60 * 1000;

@Component({
  selector: 'app-ethereum-gas-market-graph',
  templateUrl: './ethereum-gas-market-graph.component.html',
  styleUrls: ['./ethereum-gas-market-graph.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EthereumGasMarketGraphComponent implements OnChanges, OnInit, OnDestroy {
  @Input() samples: EthereumGasMarketSample[] | null = null;
  /** Bounded observations from one selected workchain/shard. */
  @Input() tonSamples: TonNetworkHistorySample[] | null = null;
  @Input() height = 260;
  @Input() tonChainLabel = 'Basechain';

  readonly chartInitOptions = { renderer: 'svg' as const };

  chartOptions: EChartsOption = {};
  recentSamples: ChartSample[] = [];
  private timezone = 'local';
  private timezoneSubscription?: Subscription;

  constructor(@Inject(LOCALE_ID) private readonly locale: string, private readonly stateService: StateService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.timezoneSubscription = this.stateService.timezone$.subscribe(timezone => {
      this.timezone = timezone;
      this.chartOptions = this.recentSamples.length ? this.buildChartOptions() : {};
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void { this.timezoneSubscription?.unsubscribe(); }

  ngOnChanges(): void {
    this.recentSamples = this.tonSamples !== null ? this.normalizeTonSamples(this.tonSamples) : this.normalizeSamples(this.samples);
    this.chartOptions = this.recentSamples.length ? this.buildChartOptions() : {};
  }

  get emptyState(): string {
    if (this.tonSamples !== null) return this.recentSamples.length ? '' : 'No ' + this.tonChainLabel.toLowerCase() + ' history available';
    if (this.samples === null) {
      return 'Loading gas market history';
    }

    return 'No gas market samples are available for the last two hours';
  }

  get isTon(): boolean { return this.tonSamples !== null; }

  private normalizeTonSamples(samples: TonNetworkHistorySample[] | null): ChartSample[] {
    if (!samples?.length) return [];
    const points: ChartSample[] = [];
    for (const sample of samples) {
      const timestamp = Number(sample.timestamp) * 1000;
      const fees = sample.fees === null || sample.fees === undefined || String(sample.fees).trim() === '' ? null : Number(sample.fees);
      const interval = sample.interval === null || sample.interval === undefined ? NaN : Number(sample.interval);
      if (!Number.isFinite(timestamp)) continue;
      // Interval values are mean durations over observed shard sequence spans.
      points.push({ added: Math.floor(timestamp / 1000), timestamp, base_fee_gwei: Number.isFinite(fees) && fees >= 0 ? fees : null, gas_price_average_gwei: Number.isFinite(fees) && fees >= 0 ? fees : null, network_utilization_percentage: Number.isFinite(interval) && interval >= 0 ? interval : null, tonFeeAtomic: sample.feeAtomic, tonHistory: sample, gapBefore: sample.gapBefore === true });
    }
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }

  get accessibleSummary(): string {
    if (!this.recentSamples.length) {
      return this.emptyState;
    }

    const latest = this.recentSamples[this.recentSamples.length - 1];
    if (this.isTon) {
      const range = this.recentSamples.length === 1
        ? `${this.tonChainLabel} observation at ${this.formatTime(latest.timestamp)}.`
        : `${this.tonChainLabel} history from ${this.formatTime(this.recentSamples[0].timestamp)} to ${this.formatTime(latest.timestamp)}.`;
      const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
      return `${range} Latest mean collected fees per block ${fee === null ? 'not observed' : fee + ' GRAM'}; mean block interval ${latest.network_utilization_percentage === null ? 'not observed' : this.formatSeconds(latest.network_utilization_percentage)}.`;
    }
    if (this.recentSamples.length === 1) {
      return `Current gas market sample at ${this.formatTime(latest.timestamp)}. `
        + `Base fee ${this.formatGwei(latest.base_fee_gwei)} gwei; `
        + `network utilization ${this.formatPercentage(latest.network_utilization_percentage)}.`;
    }

    return `Gas market history from ${this.formatTime(this.recentSamples[0].timestamp)} to ${this.formatTime(latest.timestamp)}. `
      + `Latest base fee ${this.formatGwei(latest.base_fee_gwei)} gwei; `
      + `network utilization ${this.formatPercentage(latest.network_utilization_percentage)}.`;
  }

  get historyLabel(): string {
    if (this.recentSamples.length === 1) {
      return 'Current sample';
    }

    if (this.recentSamples.length < 2) {
      return 'Live history';
    }
    const first = this.recentSamples[0].timestamp;
    const last = this.recentSamples[this.recentSamples.length - 1].timestamp;
    return last - first >= TWO_HOURS_MS - 60_000 ? 'Last 2 hours' : 'Live history';
  }

  private normalizeSamples(samples: EthereumGasMarketSample[] | null): ChartSample[] {
    if (!samples?.length) {
      return [];
    }

    const now = Date.now();
    const windowStart = now - TWO_HOURS_MS;
    const samplesByTimestamp = new Map<number, ChartSample>();

    for (const sample of samples) {
      const timestamp = sample.added * 1000;
      if (
        !Number.isFinite(timestamp)
        || timestamp < windowStart
        || timestamp > now + FUTURE_TOLERANCE_MS
        || !Number.isFinite(sample.base_fee_gwei)
        || sample.base_fee_gwei < 0
        || !Number.isFinite(sample.network_utilization_percentage)
        || sample.network_utilization_percentage < 0
        || sample.network_utilization_percentage > 100
        || !Number.isFinite(sample.gas_price_average_gwei)
        || sample.gas_price_average_gwei < 0
      ) {
        continue;
      }

      samplesByTimestamp.set(timestamp, { ...sample, timestamp });
    }

    return Array.from(samplesByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  private buildChartOptions(): EChartsOption {
    const isCurrentSample = this.recentSamples.length === 1;
    const currentTimestamp = this.recentSamples[0]?.timestamp || Date.now();

    // A null separator breaks the native line across unobserved headers while
    // retaining both real endpoints and their exact tooltip data.
    const lineData = (key: 'base_fee_gwei' | 'network_utilization_percentage'): Array<[number, number | null, number]> =>
      this.recentSamples.flatMap((sample, index) => sample.gapBefore
        ? [[sample.timestamp, null, index], [sample.timestamp, sample[key], index]] as Array<[number, number | null, number]>
        : [[sample.timestamp, sample[key], index]] as Array<[number, number | null, number]>);

    return {
      animation: false,
      grid: {
        top: 12,
        right: 44,
        bottom: 32,
        left: 44,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'var(--box-bg)',
        borderColor: 'var(--border-subtle)',
        borderWidth: 1,
        textStyle: {
          color: 'var(--fg)',
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'var(--transparent-fg)',
            type: 'dashed',
          },
        },
        formatter: (params: unknown): string => {
          const points = Array.isArray(params) ? params as Array<{ value?: [number, number, number] }> : [];
          const timestamp = Number(points[0]?.value?.[0]);
          const sample = this.recentSamples[Number(points[0]?.value?.[2])];
          if (!sample) {
            return '';
          }

          if (this.isTon) {
            const history = sample.tonHistory;
            const total = this.formatAtomicGram(history?.feeTotalAtomic, null);
            const fractionalMean = !!history?.feeTotalAtomic && !!history.feeCount && BigInt(history.feeTotalAtomic) % BigInt(history.feeCount) !== 0n;
            const blocks = history?.blockCount ? `<div>Blocks: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
            return `<div class="ethereum-gas-tooltip">
              <div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>
              ${blocks}
              <div>Mean collected fees / block: <strong>${fractionalMean ? '≈' : ''}${this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Not observed'}</strong></div>
              ${total === null ? '' : `<div>Total collected fees: <strong>${total} GRAM</strong>${history.feeCount !== history.blockCount ? ` (${history.feeCount} of ${history.blockCount} blocks)` : ''}</div>`}
              <div>Mean block interval: <strong>${sample.network_utilization_percentage === null ? 'Not observed' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div>
            </div>`;
          }

          const pendingCount = Number.isFinite(sample.pending_sample_count)
            ? `<div>Pending txs sampled: <strong>${formatNumber(sample.pending_sample_count as number, this.locale, '1.0-0')}</strong></div>`
            : '';

          return `<div class="ethereum-gas-tooltip">
            <div><strong>${formatDate(timestamp, 'mediumTime', this.locale)}</strong></div>
            <div>Base fee: <strong>${this.formatGwei(sample.base_fee_gwei as number)} gwei</strong></div>
            <div>Network utilization: <strong>${this.formatPercentage(sample.network_utilization_percentage)}</strong></div>
            <div>Average gas price: <strong>${this.formatGwei(sample.gas_price_average_gwei as number)} gwei</strong></div>
            ${pendingCount}
          </div>`;
        },
      },
      xAxis: {
        type: 'time',
        min: isCurrentSample ? currentTimestamp - 5 * 60 * 1000 : 'dataMin',
        max: isCurrentSample ? currentTimestamp + 5 * 60 * 1000 : 'dataMax',
        boundaryGap: false,
        splitNumber: 3,
        axisLine: {
          lineStyle: { color: 'var(--transparent-fg)' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: 'var(--transparent-fg)',
          hideOverlap: true,
          showMinLabel: true,
          showMaxLabel: true,
          formatter: (value: number): string => this.formatAxisTime(value),
        },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          axisLabel: {
            color: 'var(--transparent-fg)',
            formatter: (value: number): string => this.formatCompact(value),
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: 'var(--transparent-fg)',
              opacity: 0.16,
              type: 'dotted',
            },
          },
        },
        {
          type: 'value',
          min: 0,
          ...(this.isTon ? {} : { max: 100 }),
          axisLabel: {
            color: 'var(--transparent-fg)',
            formatter: (value: number): string => this.isTon ? `${this.formatCompact(value)} s` : `${formatNumber(value, this.locale, '1.0-0')}%`,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: this.isTon ? 'Mean collected fees / block' : 'Base fee',
          type: 'line',
          yAxisIndex: 0,
          data: lineData('base_fee_gwei'),
          connectNulls: false,
          showSymbol: isCurrentSample,
          symbol: 'circle',
          symbolSize: isCurrentSample ? 9 : 4,
          smooth: false,
          lineStyle: {
            color: 'var(--primary)',
            width: 2.5,
          },
          itemStyle: { color: 'var(--primary)' },
          emphasis: { focus: 'series' },
        },
        {
          name: this.isTon ? 'Mean block interval' : 'Network utilization',
          type: 'line',
          yAxisIndex: 1,
          data: lineData('network_utilization_percentage'),
          connectNulls: false,
          showSymbol: isCurrentSample,
          symbol: 'diamond',
          symbolSize: isCurrentSample ? 9 : 4,
          smooth: false,
          lineStyle: {
            color: 'var(--eth-utilization)',
            type: 'dashed',
            width: 2,
          },
          itemStyle: { color: 'var(--eth-utilization)' },
          areaStyle: {
            color: 'var(--eth-utilization)',
            opacity: 0.1,
          },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }

  private formatTime(timestamp: number): string {
    return formatDate(timestamp, 'shortTime', this.locale, this.timezone);
  }

  private formatAxisTime(timestamp: number): string {
    const first = this.recentSamples[0]?.timestamp || timestamp;
    const last = this.recentSamples[this.recentSamples.length - 1]?.timestamp || timestamp;
    const span = last - first;
    if (span < 5 * 60 * 1000) {
      const edgeTolerance = Math.max(1_000, span * 0.06);
      if (Math.abs(timestamp - first) > edgeTolerance && Math.abs(timestamp - last) > edgeTolerance) {
        return '';
      }
      return formatDate(timestamp, 'mediumTime', this.locale, this.timezone);
    }
    return formatDate(timestamp, 'shortTime', this.locale, this.timezone);
  }

  private formatGwei(value: number): string {
    const digits = value < 1 ? '1.0-4' : value < 100 ? '1.0-2' : '1.0-0';
    return formatNumber(value, this.locale, digits);
  }

  private formatPercentage(value: number): string {
    return `${formatNumber(value, this.locale, '1.0-1')}%`;
  }

  private formatGram(value: number): string {
    const digits = value < 0.001 ? '1.0-6' : value < 1 ? '1.0-4' : '1.0-2';
    return formatNumber(value, this.locale, digits);
  }

  private formatSeconds(value: number): string {
    return `${formatNumber(value, this.locale, value < 10 ? '1.0-1' : '1.0-0')} s`;
  }

  private formatAtomicGram(atomic: string | undefined, fallback: number | null): string | null {
    if (!atomic || !/^\d+$/.test(atomic)) return fallback === null ? null : this.formatGram(fallback);
    const padded = atomic.padStart(10, '0');
    const whole = padded.slice(0, -9);
    const fraction = padded.slice(-9).replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole;
  }

  private formatCompact(value: number): string {
    if (value < 1) {
      return formatNumber(value, this.locale, '1.0-3');
    }
    if (value >= 1000) {
      return `${formatNumber(value / 1000, this.locale, '1.0-1')}k`;
    }
    return formatNumber(value, this.locale, value < 10 ? '1.0-1' : '1.0-0');
  }
}
