import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, timer } from 'rxjs';
import { catchError, map, scan, shareReplay, switchMap } from 'rxjs/operators';
import { NativeQuote } from '@app/shared/native-view.types';

@Injectable({ providedIn: 'root' })
export class TonRatesService {
  readonly quotes$ = timer(0, 300000).pipe(
    switchMap(() => this.http.get<any>('/api/ton/rates').pipe(
      map(result => {
        const prices = result.rates?.GRAM?.prices || result.rates?.TON?.prices || {};
        const quotes: Record<string, NativeQuote> = {};
        for (const [currency, value] of Object.entries(prices)) {
          if (Number(value) > 0 && Number.isFinite(Number(value))) quotes[currency.toUpperCase()] = { currency: currency.toUpperCase(), value: String(value), observedAt: result._meta?.observedAt, stale: result._meta?.stale === true };
        }
        return quotes;
      }),
      catchError(() => of(null)),
    )),
    scan((previous: Record<string, NativeQuote>, next: Record<string, NativeQuote> | null) => next ?? Object.fromEntries(Object.entries(previous).map(([currency, quote]) => [currency, { ...quote, stale: true }])), {}),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  constructor(private http: HttpClient) {}
}
