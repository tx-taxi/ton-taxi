import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { TonChainSelection, tonChainSelection, tonSelectionKey, tonSelectionQuery } from './chain-selection';

@Injectable({ providedIn: 'root' })
export class TonChainSelectionService {
  readonly selection$ = new BehaviorSubject<TonChainSelection>(this.fromUrl(typeof window === 'undefined' ? this.router.url : window.location.pathname + window.location.search));

  constructor(private router: Router) {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      const selection = this.fromUrl(event.urlAfterRedirects);
      this.set(selection.workchain, selection.shard);
    });
  }

  get current(): TonChainSelection { return this.selection$.value; }
  get query(): string { return tonSelectionQuery(this.current); }

  set(workchain: unknown, shard?: unknown): void {
    const selection = tonChainSelection(workchain, shard);
    if (tonSelectionKey(selection) !== tonSelectionKey(this.current)) this.selection$.next(selection);
  }

  private fromUrl(url: string): TonChainSelection {
    const query = this.router.parseUrl(url || '/').queryParams;
    return tonChainSelection(query.workchain, query.shard);
  }
}
