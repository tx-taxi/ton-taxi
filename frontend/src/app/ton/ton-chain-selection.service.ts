import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { TonChainSelection, tonChainSelection, tonSelectionKey, tonSelectionQuery, tonSelectionForBlockId, tonHostnameWorkchain } from './chain-selection';

@Injectable({ providedIn: 'root' })
export class TonChainSelectionService {
  readonly defaultWorkchain = tonHostnameWorkchain(typeof window === 'undefined' ? '' : window.location.hostname);
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
    const selection = tonChainSelection(workchain ?? this.defaultWorkchain, shard);
    if (tonSelectionKey(selection) !== tonSelectionKey(this.current)) this.selection$.next(selection);
  }

  private fromUrl(url: string): TonChainSelection {
    const tree = this.router.parseUrl(url || '/');
    const query = tree.queryParams;
    if (query.workchain != null || query.shard != null) return tonChainSelection(query.workchain ?? this.defaultWorkchain, query.shard);
    const segments = tree.root.children.primary?.segments || [];
    if (segments[segments.length - 2]?.path === 'block') {
      const contextual = tonSelectionForBlockId(segments[segments.length - 1]?.path);
      if (contextual) return contextual;
    }
    return tonChainSelection(this.defaultWorkchain);
  }
}
