import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { NativePriceSeries } from '@app/components/price-chart/price-chart.component';

export interface TonMarketMeta { observedAt?: string; stale?: boolean; }
export interface TonMarketPrices extends NativePriceSeries { _meta?: TonMarketMeta; }
export interface TonVenueQuote { market: string; usd_price: number | string; last_date_update?: number | string; }
export interface TonMarketQuotes { markets: TonVenueQuote[]; _meta?: TonMarketMeta; }

@Injectable({ providedIn: 'root' })
export class TonMarketService {
  constructor(private readonly http: HttpClient) {}
  prices(currency: string, timespan: string): Observable<TonMarketPrices> {
    const months: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12, '2y': 24, '3y': 36 };
    const now = new Date();
    const start = timespan === 'all' ? 0 : Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months[timespan], now.getUTCDate()) / 1000);
    return this.http.get<TonMarketPrices>('/api/ton/rates/chart', { params: new HttpParams().set('currency', currency).set('start_date', start).set('end_date', Math.floor(now.getTime() / 1000)) });
  }
  quotes(): Observable<TonMarketQuotes> { return this.http.get<TonMarketQuotes>('/api/ton/rates/markets'); }
}
