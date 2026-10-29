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
    if (this.tonSamples !== null) {
      if (this.recentSamples.length) return '';
      if (this.isCzech) return `Historie ${this.tonChainLabel} není dostupná`;
      if (this.isPolish) return `Historia ${this.tonChainLabel} jest niedostępna`;
      if (this.isVietnamese) return `Không có lịch sử ${this.tonChainLabel}`;
      if (this.isKorean) return `${this.koreanChainLabel} 기록을 사용할 수 없음`;
      if (this.isChinese) return `${this.chineseChainLabel}历史不可用`;
      if (this.isJapanese) return `${this.japaneseChainLabel}の履歴を取得できません`;
      if (this.isUkrainian) return `Історія ${this.ukrainianChainLabel} недоступна`;
      if (this.isDutch) return `Geen ${this.tonChainLabel}-geschiedenis beschikbaar`;
      if (this.isItalian) return `Nessuno storico della ${this.tonChainLabel.toLowerCase()} disponibile`;
      if (this.isRussian) return `История ${this.tonChainLabel} недоступна`;
      if (this.isFrench) return `Aucun historique de la ${this.tonChainLabel.toLowerCase()} disponible`;
      if (this.isGerman) return `Kein ${this.tonChainLabel}-Verlauf verfügbar`;
      if (this.isPortuguese) return `Nenhum histórico da ${this.tonChainLabel.toLowerCase()} disponível`;
      return this.isSpanish ? 'No hay historial de ' + this.tonChainLabel.toLowerCase() + ' disponible' : 'No ' + this.tonChainLabel.toLowerCase() + ' history available';
    }
    if (this.samples === null) {
      return 'Loading gas market history';
    }

    return 'No gas market samples are available for the last two hours';
  }

  get tonHistoryTitle(): string { return this.tonChainLabel === 'Masterchain' ? $localize`:@@ton.dash.master-history:Masterchain history` : $localize`:@@ton.dash.base-history:Basechain history`; }

  get isTon(): boolean { return this.tonSamples !== null; }
  get isSpanish(): boolean { return this.locale.toLowerCase().startsWith('es'); }
  get isFrench(): boolean { return this.locale.toLowerCase().startsWith('fr'); }
  get isGerman(): boolean { return this.locale.toLowerCase().startsWith('de'); }
  get isUkrainian(): boolean { return this.locale.toLowerCase().startsWith('uk'); }
  get isJapanese(): boolean { return this.locale.toLowerCase().startsWith('ja'); }
  get isChinese(): boolean { return this.locale.toLowerCase().startsWith('zh'); }
  get isKorean(): boolean { return this.locale.toLowerCase().startsWith('ko'); }
  get isVietnamese(): boolean { return this.locale.toLowerCase().startsWith('vi'); }
  get isPolish(): boolean { return this.locale.toLowerCase().startsWith('pl'); }
  get isCzech(): boolean { return this.locale.toLowerCase().startsWith('cs'); }
  get koreanChainLabel(): string { return this.tonChainLabel === 'Masterchain' ? '마스터체인' : '베이스체인'; }
  get chineseChainLabel(): string { return this.tonChainLabel === 'Masterchain' ? '主链' : '基础链'; }
  get japaneseChainLabel(): string { return this.tonChainLabel === 'Masterchain' ? 'マスターチェーン' : 'ベースチェーン'; }
  get ukrainianChainLabel(): string { return this.tonChainLabel === 'Masterchain' ? 'мастерчейну' : 'бейсчейну'; }
  get isDutch(): boolean { return this.locale.toLowerCase().startsWith('nl'); }
  get isItalian(): boolean { return this.locale.toLowerCase().startsWith('it'); }
  get isRussian(): boolean { return this.locale.toLowerCase().startsWith('ru'); }
  get isPortuguese(): boolean { return this.locale.toLowerCase().startsWith('pt'); }
  get chartLegendLabel(): string {
    if (this.isCzech) return 'Legenda grafu';
    if (this.isPolish) return 'Legenda wykresu';
    if (this.isVietnamese) return 'Chú giải biểu đồ';
    if (this.isKorean) return '차트 범례';
    if (this.isChinese) return '图表图例';
    if (this.isJapanese) return 'グラフの凡例';
    if (this.isUkrainian) return 'Умовні позначення графіка';
    if (this.isDutch) return 'Grafieklegenda';
    if (this.isItalian) return 'Legenda del grafico';
    if (this.isRussian) return 'Условные обозначения графика';
    if (this.isFrench) return 'Légende du graphique';
    if (this.isGerman) return 'Diagrammlegende';
    if (this.isPortuguese) return 'Legenda do gráfico';
    return this.isSpanish ? 'Leyenda del gráfico' : 'Chart legend';
  }
  get chartLabel(): string {
    if (this.isTon && this.isCzech) return `Historie TON ${this.tonChainLabel}: ${this.historyLabel}`;
    if (this.isTon && this.isPolish) return `Historia TON ${this.tonChainLabel}: ${this.historyLabel}`;
    if (this.isTon && this.isVietnamese) return `Lịch sử TON ${this.tonChainLabel}: ${this.historyLabel}`;
    if (this.isTon && this.isKorean) return `TON ${this.koreanChainLabel} 기록: ${this.historyLabel}`;
    if (this.isTon && this.isChinese) return `TON ${this.chineseChainLabel}历史：${this.historyLabel}`;
    if (this.isTon && this.isJapanese) return `TON ${this.japaneseChainLabel}の履歴：${this.historyLabel}`;
    if (this.isTon && this.isUkrainian) return `Історія ${this.ukrainianChainLabel} TON: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isDutch) return `TON ${this.tonChainLabel}-geschiedenis: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isItalian) return `Storico TON della ${this.tonChainLabel.toLowerCase()}: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isRussian) return `История TON ${this.tonChainLabel}: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isFrench) return `Historique TON de la ${this.tonChainLabel.toLowerCase()} : ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isGerman) return `TON-${this.tonChainLabel}-Verlauf: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isPortuguese) return `Histórico TON da ${this.tonChainLabel.toLowerCase()}: ${this.historyLabel.toLowerCase()}`;
    if (this.isTon && this.isSpanish) return `Historial de TON ${this.tonChainLabel.toLowerCase()} ${this.historyLabel.toLowerCase()}`;
    return (this.isTon ? 'TON ' + this.tonChainLabel.toLowerCase() + ' history ' : 'Ethereum gas market ') + this.historyLabel.toLowerCase();
  }

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
      if (this.isCzech) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `Pozorování ${this.tonChainLabel} v ${end}.` : `Historie ${this.tonChainLabel} od ${start} do ${end}.`;
        return `${range} Poslední průměr vybraných poplatků na blok: ${fee === null ? 'nedostupný' : fee + ' GRAM'}; průměrný interval bloků: ${interval === null ? 'nedostupný' : interval}.`;
      }
      if (this.isPolish) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `Obserwacja ${this.tonChainLabel} o ${end}.` : `Historia ${this.tonChainLabel} od ${start} do ${end}.`;
        return `${range} Ostatnia średnia pobranych opłat na blok: ${fee === null ? 'brak danych' : fee + ' GRAM'}; średni odstęp między blokami: ${interval === null ? 'brak danych' : interval}.`;
      }
      if (this.isVietnamese) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `Quan sát ${this.tonChainLabel} lúc ${end}.` : `Lịch sử ${this.tonChainLabel} từ ${start} đến ${end}.`;
        return `${range} Phí thu trung bình mỗi khối gần nhất: ${fee === null ? 'không có dữ liệu' : fee + ' GRAM'}; thời gian trung bình giữa các khối: ${interval === null ? 'không có dữ liệu' : interval}.`;
      }
      if (this.isKorean) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `${end}의 ${this.koreanChainLabel} 관측.` : `${start}부터 ${end}까지의 ${this.koreanChainLabel} 기록.`;
        return `${range} 최근 관측된 블록당 평균 징수 수수료: ${fee === null ? '데이터 없음' : fee + ' GRAM'}; 평균 블록 간격: ${interval === null ? '데이터 없음' : interval}.`;
      }
      if (this.isChinese) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `${end} 的${this.chineseChainLabel}观测。` : `${start} 至 ${end} 的${this.chineseChainLabel}历史。`;
        return `${range} 最近观测到的每区块平均收取手续费：${fee === null ? '无数据' : fee + ' GRAM'}；平均区块间隔：${interval === null ? '无数据' : interval}。`;
      }
      if (this.isJapanese) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        const range = this.recentSamples.length === 1 ? `${end}の${this.japaneseChainLabel}の観測。` : `${start}から${end}までの${this.japaneseChainLabel}の履歴。`;
        return `${range} 直近のブロック当たりの平均回収手数料：${fee === null ? 'データなし' : fee + ' GRAM'}。平均ブロック間隔：${interval === null ? 'データなし' : interval}。`;
      }
      if (this.isUkrainian || this.isDutch) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        if (this.isUkrainian) {
          const range = this.recentSamples.length === 1 ? `Спостереження ${this.ukrainianChainLabel} о ${end}.` : `Історія ${this.ukrainianChainLabel} з ${start} до ${end}.`;
          return `${range} Остання середня зібрана комісія за блок: ${fee === null ? 'немає даних' : fee + ' GRAM'}; середній інтервал між блоками: ${interval === null ? 'немає даних' : interval}.`;
        }
        const range = this.recentSamples.length === 1 ? `${this.tonChainLabel}-waarneming om ${end}.` : `${this.tonChainLabel}-geschiedenis van ${start} tot ${end}.`;
        return `${range} Laatst waargenomen gemiddelde geïnde kosten per blok: ${fee === null ? 'niet waargenomen' : fee + ' GRAM'}; gemiddeld blokinterval: ${interval === null ? 'niet waargenomen' : interval}.`;
      }
      if (this.isItalian) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const range = this.recentSamples.length === 1 ? `Osservazione della ${this.tonChainLabel} alle ${end}.` : `Storico della ${this.tonChainLabel} da ${start} a ${end}.`;
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        return `${range} Ultima media delle commissioni raccolte per blocco: ${fee === null ? 'non rilevata' : fee + ' GRAM'}; intervallo medio tra i blocchi: ${interval === null ? 'non rilevato' : interval}.`;
      }
      if (this.isRussian) {
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const range = this.recentSamples.length === 1 ? `Наблюдение ${this.tonChainLabel} в ${end}.` : `История ${this.tonChainLabel} с ${start} до ${end}.`;
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        return `${range} Последняя средняя комиссия на блок: ${fee === null ? 'нет данных' : fee + ' GRAM'}; средний интервал между блоками: ${interval === null ? 'нет данных' : interval}.`;
      }
      if (this.isFrench || this.isGerman || this.isPortuguese) {
        const single = this.recentSamples.length === 1;
        const start = this.formatTime(this.recentSamples[0].timestamp);
        const end = this.formatTime(latest.timestamp);
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        const interval = latest.network_utilization_percentage === null ? null : this.formatSeconds(latest.network_utilization_percentage);
        if (this.isFrench) {
          const range = single ? `Observation de la ${this.tonChainLabel} à ${end}.` : `Historique de la ${this.tonChainLabel} de ${start} à ${end}.`;
          return `${range} Dernière moyenne des frais perçus par bloc : ${fee === null ? 'non observée' : fee + ' GRAM'} ; intervalle moyen entre les blocs : ${interval === null ? 'non observé' : interval}.`;
        }
        if (this.isPortuguese) {
          const range = single ? `Observação da ${this.tonChainLabel} às ${end}.` : `Histórico da ${this.tonChainLabel} de ${start} até ${end}.`;
          return `${range} Última média de taxas arrecadadas por bloco: ${fee === null ? 'não observada' : fee + ' GRAM'}; intervalo médio entre blocos: ${interval === null ? 'não observado' : interval}.`;
        }
        const range = single ? `${this.tonChainLabel}-Beobachtung um ${end}.` : `${this.tonChainLabel}-Verlauf von ${start} bis ${end}.`;
        return `${range} Zuletzt durchschnittlich erhobene Gebühren pro Block: ${fee === null ? 'nicht beobachtet' : fee + ' GRAM'}; durchschnittlicher Blockabstand: ${interval === null ? 'nicht beobachtet' : interval}.`;
      }
      if (this.isSpanish) {
        const range = this.recentSamples.length === 1
          ? `Observación de ${this.tonChainLabel} a las ${this.formatTime(latest.timestamp)}.`
          : `Historial de ${this.tonChainLabel} desde las ${this.formatTime(this.recentSamples[0].timestamp)} hasta las ${this.formatTime(latest.timestamp)}.`;
        const fee = this.formatAtomicGram(latest.tonFeeAtomic, latest.base_fee_gwei);
        return `${range} Última media de comisiones recaudadas por bloque: ${fee === null ? 'no observada' : fee + ' GRAM'}; intervalo medio entre bloques: ${latest.network_utilization_percentage === null ? 'no observado' : this.formatSeconds(latest.network_utilization_percentage)}.`;
      }
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
      return $localize`:@@ton.dash.current-sample:Current sample`;
    }

    if (this.recentSamples.length < 2) {
      return $localize`:@@ton.dash.live-history:Live history`;
    }
    const first = this.recentSamples[0].timestamp;
    const last = this.recentSamples[this.recentSamples.length - 1].timestamp;
    return last - first >= TWO_HOURS_MS - 60_000 ? $localize`:@@ton.dash.last-hours:Last 2 hours` : $localize`:@@ton.dash.live-history:Live history`;
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
            if (this.isCzech) {
              const blocks = history?.blockCount ? `<div>Bloky: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Nedostupné';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} z ${history.blockCount})` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>Průměr vybraných poplatků na blok: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>Celkové vybrané poplatky: <strong>${total} GRAM</strong>${coverage}</div>`}<div>Průměrný interval bloků: <strong>${sample.network_utilization_percentage === null ? 'Nedostupné' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isPolish) {
              const blocks = history?.blockCount ? `<div>Bloki: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Brak danych';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} z ${history.blockCount})` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>Średnia pobranych opłat na blok: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>Łącznie pobrane opłaty: <strong>${total} GRAM</strong>${coverage}</div>`}<div>Średni odstęp między blokami: <strong>${sample.network_utilization_percentage === null ? 'Brak danych' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isVietnamese) {
              const blocks = history?.blockCount ? `<div>Khối: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Không có dữ liệu';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} trên ${history.blockCount})` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>Phí thu trung bình mỗi khối: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>Tổng phí đã thu: <strong>${total} GRAM</strong>${coverage}</div>`}<div>Thời gian trung bình giữa các khối: <strong>${sample.network_utilization_percentage === null ? 'Không có dữ liệu' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isKorean) {
              const blocks = history?.blockCount ? `<div>블록: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? '데이터 없음';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.blockCount}개 중 ${history.feeCount}개)` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>블록당 평균 징수 수수료: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>징수된 총 수수료: <strong>${total} GRAM</strong>${coverage}</div>`}<div>평균 블록 간격: <strong>${sample.network_utilization_percentage === null ? '데이터 없음' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isChinese) {
              const blocks = history?.blockCount ? `<div>区块：<strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? '无数据';
              const coverage = history?.feeCount !== history?.blockCount ? `（${history.blockCount} 个中的 ${history.feeCount} 个）` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>每区块平均收取手续费：<strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>已收取手续费总额：<strong>${total} GRAM</strong>${coverage}</div>`}<div>平均区块间隔：<strong>${sample.network_utilization_percentage === null ? '无数据' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isJapanese) {
              const blocks = history?.blockCount ? `<div>ブロック：<strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'データなし';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.blockCount}件中${history.feeCount}件)` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>ブロック当たりの平均回収手数料：<strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>回収手数料の合計：<strong>${total} GRAM</strong>${coverage}</div>`}<div>平均ブロック間隔：<strong>${sample.network_utilization_percentage === null ? 'データなし' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isUkrainian || this.isDutch) {
              const uk = this.isUkrainian;
              const blocks = history?.blockCount ? `<div>${uk ? 'Блоки' : 'Blokken'}: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const missing = uk ? 'Немає даних' : 'Niet waargenomen';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? missing;
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} ${uk ? 'із' : 'van'} ${history.blockCount})` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>${uk ? 'Середня зібрана комісія за блок' : 'Gemiddelde geïnde kosten per blok'}: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>${uk ? 'Усього зібрано комісій' : 'Totaal geïnde kosten'}: <strong>${total} GRAM</strong>${coverage}</div>`}<div>${uk ? 'Середній інтервал між блоками' : 'Gemiddeld blokinterval'}: <strong>${sample.network_utilization_percentage === null ? missing : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isItalian) {
              const blocks = history?.blockCount ? `<div>Blocchi: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Non rilevato';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} di ${history.blockCount} blocchi)` : '';
              return `<div class="ethereum-gas-tooltip"><div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>${blocks}<div>Commissioni medie per blocco: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>${total === null ? '' : `<div>Commissioni totali raccolte: <strong>${total} GRAM</strong>${coverage}</div>`}<div>Intervallo medio tra i blocchi: <strong>${sample.network_utilization_percentage === null ? 'Non rilevato' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div></div>`;
            }
            if (this.isRussian) {
              const blocks = history?.blockCount ? `<div>Блоки: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'Нет данных';
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} из ${history.blockCount} блоков)` : '';
              return `<div class="ethereum-gas-tooltip">
                <div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>
                ${blocks}
                <div>Средняя комиссия на блок: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>
                ${total === null ? '' : `<div>Всего комиссий: <strong>${total} GRAM</strong>${coverage}</div>`}
                <div>Средний интервал между блоками: <strong>${sample.network_utilization_percentage === null ? 'Нет данных' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div>
              </div>`;
            }
            if (this.isFrench || this.isGerman || this.isPortuguese) {
              const fr = this.isFrench;
              const pt = this.isPortuguese;
              const blocks = history?.blockCount ? `<div>${fr ? 'Blocs' : pt ? 'Blocos' : 'Blöcke'}: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              const notObserved = fr ? 'Non observé' : pt ? 'Não observado' : 'Nicht beobachtet';
              const fee = this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? notObserved;
              const coverage = history?.feeCount !== history?.blockCount ? ` (${history.feeCount} ${fr ? 'sur' : pt ? 'de' : 'von'} ${history.blockCount} ${fr ? 'blocs' : pt ? 'blocos' : 'Blöcken'})` : '';
              return `<div class="ethereum-gas-tooltip">
                <div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>
                ${blocks}
                <div>${fr ? 'Frais moyens perçus par bloc' : pt ? 'Taxas médias arrecadadas por bloco' : 'Durchschnittliche Gebühren pro Block'}: <strong>${fractionalMean ? '≈' : ''}${fee}</strong></div>
                ${total === null ? '' : `<div>${fr ? 'Total des frais perçus' : pt ? 'Total de taxas arrecadadas' : 'Insgesamt erhobene Gebühren'}: <strong>${total} GRAM</strong>${coverage}</div>`}
                <div>${fr ? 'Intervalle moyen entre les blocs' : pt ? 'Intervalo médio entre blocos' : 'Durchschnittlicher Blockabstand'}: <strong>${sample.network_utilization_percentage === null ? notObserved : this.formatSeconds(sample.network_utilization_percentage)}</strong></div>
              </div>`;
            }
            if (this.isSpanish) {
              const blocks = history?.blockCount ? `<div>Bloques: <strong>${history.blockCount}${history.firstSeqno === history.lastSeqno ? ` (#${history.firstSeqno})` : ` (#${history.firstSeqno}–${history.lastSeqno})`}</strong></div>` : '';
              return `<div class="ethereum-gas-tooltip">
                <div><strong>${formatDate(timestamp, 'mediumTime', this.locale, this.timezone)}</strong></div>
                ${blocks}
                <div>Comisiones medias recaudadas por bloque: <strong>${fractionalMean ? '≈' : ''}${this.formatAtomicGram(sample.tonFeeAtomic, sample.base_fee_gwei)?.concat(' GRAM') ?? 'No observado'}</strong></div>
                ${total === null ? '' : `<div>Comisiones recaudadas en total: <strong>${total} GRAM</strong>${history.feeCount !== history.blockCount ? ` (${history.feeCount} de ${history.blockCount} bloques)` : ''}</div>`}
                <div>Intervalo medio entre bloques: <strong>${sample.network_utilization_percentage === null ? 'No observado' : this.formatSeconds(sample.network_utilization_percentage)}</strong></div>
              </div>`;
            }
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
          name: this.isTon ? (this.isCzech ? 'Průměr vybraných poplatků na blok' : this.isPolish ? 'Średnia pobranych opłat na blok' : this.isVietnamese ? 'Phí thu trung bình mỗi khối' : this.isKorean ? '블록당 평균 징수 수수료' : this.isChinese ? '每区块平均收取手续费' : this.isJapanese ? 'ブロック当たりの平均回収手数料' : this.isUkrainian ? 'Середня зібрана комісія за блок' : this.isDutch ? 'Gemiddelde geïnde kosten per blok' : this.isItalian ? 'Commissioni medie per blocco' : this.isRussian ? 'Средняя комиссия на блок' : this.isFrench ? 'Frais moyens perçus par bloc' : this.isGerman ? 'Durchschnittliche Gebühren pro Block' : this.isPortuguese ? 'Taxas médias arrecadadas por bloco' : this.isSpanish ? 'Comisiones medias recaudadas por bloque' : 'Mean collected fees / block') : 'Base fee',
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
          name: this.isTon ? (this.isCzech ? 'Průměrný interval bloků' : this.isPolish ? 'Średni odstęp między blokami' : this.isVietnamese ? 'Thời gian trung bình giữa các khối' : this.isKorean ? '평균 블록 간격' : this.isChinese ? '平均区块间隔' : this.isJapanese ? '平均ブロック間隔' : this.isUkrainian ? 'Середній інтервал між блоками' : this.isDutch ? 'Gemiddeld blokinterval' : this.isItalian ? 'Intervallo medio tra i blocchi' : this.isRussian ? 'Средний интервал между блоками' : this.isFrench ? 'Intervalle moyen entre les blocs' : this.isGerman ? 'Durchschnittlicher Blockabstand' : this.isPortuguese ? 'Intervalo médio entre blocos' : this.isSpanish ? 'Intervalo medio entre bloques' : 'Mean block interval') : 'Network utilization',
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
    return `${formatNumber(value, this.locale, value < 10 ? '1.0-1' : '1.0-0')} ${this.isKorean ? '초' : this.isJapanese || this.isChinese ? '秒' : this.isUkrainian ? 'с' : 's'}`;
  }

  private formatAtomicGram(atomic: string | undefined, fallback: number | null): string | null {
    if (!atomic || !/^\d+$/.test(atomic)) return fallback === null ? null : this.formatGram(fallback);
    const padded = atomic.padStart(10, '0');
    const whole = padded.slice(0, -9);
    const fraction = padded.slice(-9).replace(/0+$/, '');
    return fraction ? `${whole}${this.isSpanish || this.isFrench || this.isGerman || this.isPortuguese || this.isItalian || this.isRussian || this.isUkrainian || this.isDutch ? ',' : '.'}${fraction}` : whole;
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
