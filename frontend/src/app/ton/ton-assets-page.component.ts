import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  AddressComponent,
  NativeAccountView,
} from '../components/address/address.component';
import {
  EthereumTokenComponent,
  NativeTokenView,
} from '../components/ethereum-token/ethereum-token.component';
import { SharedModule } from '../shared/shared.module';
import { NativeAmount, NativeIdentity } from '../shared/native-view.types';
import { TonPageComponent } from './ton-page.component';
import { NativeNftCard, TonNftGridComponent } from './ton-nft-grid.component';

/** TON data/pagination orchestration; native account/token components own presentation. */
@Component({
  selector: 'app-ton-assets-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    AddressComponent,
    EthereumTokenComponent,
    TonNftGridComponent,
  ],
  templateUrl: './ton-assets-page.component.html',
  styleUrls: ['./ton-assets-page.component.scss'],
})
export class TonAssetsPageComponent extends TonPageComponent {
  readonly accountTabs = [
    { id: 'events', label: 'History' },
    { id: 'activity', label: 'Transactions' },
    { id: 'traces', label: 'Traces' },
    { id: 'jettons', label: 'Jettons' },
    { id: 'nfts', label: 'NFTs' },
    { id: 'contract', label: 'Contract' },
  ];
  private summaryData: unknown;
  private accountModel: NativeAccountView | null = null;
  private tokenModel: NativeTokenView | null = null;
  private identities = new Map<string, NativeIdentity>();
  private cardCache = new WeakMap<
    any[],
    { kind: string; cards: NativeNftCard[] }
  >();
  private historyCache = new WeakMap<any[], { scope: string; events: any[] }>();
  private historyRecords = new WeakMap<object, Map<string, any>>();
  private emptyHistory: any[] = [];
  selectedJetton = '';

  override load(): void {
    this.selectedJetton = '';
    super.load();
  }
  override openTab(name: string): void {
    super.openTab(name);
    if (name === 'traces' && !this.feeds.traces) this.loadFeed('traces');
    if (name === 'contract') {
      for (const method of ['seqno', 'get_public_key']) {
        if (this.data?.get_methods?.includes(method))
          this.loadResource('methods/' + method);
      }
    }
  }
  override list(value: any): any[] {
    if (Array.isArray(value?.trace_ids))
      return value.trace_ids.map((id: string) => ({ trace_id: id }));
    if (Array.isArray(value?.traces)) return value.traces;
    return super.list(value);
  }
  override identity(value: any): string {
    if (value?.operation && value?.transaction_hash) {
      return [
        value.transaction_hash,
        value.lt,
        value.operation,
        value.jetton?.address ||
          value.nft?.address ||
          value.item?.address ||
          '',
      ].join(':');
    }
    return value?.trace_id || value?.id || super.identity(value);
  }
  traceId(value: any): string {
    return (
      value.trace_id || value.id || value.hash || value.transaction?.hash || ''
    );
  }
  selectJetton(value: string): void {
    this.selectedJetton = value;
    this.feeds['jetton-history']?.request?.unsubscribe();
    this.feeds['jetton-history'] = { items: [], loading: false, error: '' };
    this.loadFeed('jetton-history');
    document
      .getElementById('account-jetton-activity')
      ?.scrollIntoView({ block: 'start' });
  }
  override loadFeed(name: string, more = false): void {
    if (name !== 'jetton-history' || !this.selectedJetton) {
      super.loadFeed(name, more);
      return;
    }
    const feed = this.feeds[name] || { items: [], loading: false, error: '' };
    if (feed.loading) return;
    feed.loading = true;
    feed.error = '';
    feed.restart = false;
    this.feeds[name] = feed;
    let path =
      this.endpoint() +
      '/jetton-history?limit=24&jetton=' +
      encodeURIComponent(this.selectedJetton);
    if (more && feed.paging?.nextBeforeLt)
      path += '&before_lt=' + encodeURIComponent(feed.paging.nextBeforeLt);
    feed.request = this.http.get<any>(path).subscribe({
      next: (result) => {
        const existing = more ? feed.items : [];
        const keys = new Set(existing.map((item) => this.identity(item)));
        feed.items = existing.concat(
          this.list(result).filter((item) => !keys.has(this.identity(item)))
        );
        feed.paging = result._paging;
        feed.stale = result._meta?.stale === true;
        feed.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        feed.error =
          e.status === 400 ? 'Invalid jetton' : 'Temporarily unavailable';
        feed.loading = false;
        this.cdr.markForCheck();
      },
    });
    this.requests.add(feed.request);
  }
  walletGetter(method: string): string | null {
    const result = this.resources['methods/' + method];
    const integer = result?.stack?.[0]?.num;
    if (
      result?.success !== true ||
      typeof integer !== 'string' ||
      !/^(?:0x[0-9a-f]+|\d+)$/i.test(integer)
    )
      return null;
    const value = BigInt(integer);
    if (method === 'get_public_key')
      return value < BigInt(1) << BigInt(256)
        ? value.toString(16).padStart(64, '0')
        : null;
    return value.toString();
  }

  nativeIdentity(value: any): NativeIdentity {
    const address = this.address(value);
    const metadata = value?.metadata || value || {};
    const displayName = metadata.name || value?.name;
    const iconUrl = this.safeUrl(metadata.image || value?.image || value?.icon);
    const isScam =
      value?.is_scam === true ||
      value?.verification === 'blacklist' ||
      value?.trust === 'blacklist';
    const key = JSON.stringify([
      address,
      displayName,
      iconUrl,
      isScam,
      metadata.symbol,
    ]);
    if (!this.identities.has(key)) {
      if (this.identities.size > 1000) this.identities.clear();
      this.identities.set(key, {
        address,
        displayName,
        iconUrl,
        isScam,
        tokenSymbol: metadata.symbol,
      });
    }
    return this.identities.get(key)!;
  }
  nativeAmount(value: any): NativeAmount {
    return {
      atomic: value == null ? null : String(value),
      decimals: 9,
      symbol: 'GRAM',
      atomicSymbol: 'nanograms',
      native: true,
    };
  }
  nftCards(
    items: any[] | undefined,
    kind: 'nft' | 'collection' = 'nft'
  ): NativeNftCard[] {
    if (!items) return [];
    const cached = this.cardCache.get(items);
    if (cached?.kind === kind) return cached.cards;
    const cards = items.map((item) => ({
      address: this.address(item),
      name:
        item.metadata?.name ||
        item.name ||
        (kind === 'collection' ? 'Collection ' : 'NFT ') +
          this.short(item.address),
      image: this.media(item),
      collectionLabel:
        item.collection?.name || this.short(item.collection?.address),
      sale: this.saleValue(item.sale),
      flagged: item.trust === 'blacklist' || item.verification === 'blacklist',
    }));
    this.cardCache.set(items, { kind, cards });
    return cards;
  }
  jettonValue(value: any, jetton: any, current = true): NativeAmount {
    const decimals = jetton?.decimals ?? jetton?.metadata?.decimals;
    const known =
      decimals != null &&
      Number.isInteger(Number(decimals)) &&
      Number(decimals) >= 0 &&
      Number(decimals) <= 255;
    return {
      atomic: current
        ? this.currentJettonUnits(value, jetton)
        : value == null
        ? null
        : String(value),
      decimals: known ? Number(decimals) : 0,
      symbol: known
        ? jetton?.symbol || jetton?.metadata?.symbol || 'tokens'
        : 'raw units',
      assetId: jetton?.address || jetton?.metadata?.address,
    };
  }
  currencyValue(value: any, metadata: any): NativeAmount {
    const decimals = metadata?.decimals;
    return {
      atomic: value == null ? null : String(value),
      decimals: decimals == null ? 0 : Number(decimals),
      symbol: decimals == null ? 'raw units' : metadata?.symbol || 'units',
      assetId: String(metadata?.id ?? ''),
    };
  }
  saleValue(sale: any): NativeAmount | null {
    const price = sale?.price;
    if (!price || typeof price !== 'object') return null;
    if (price.currency_type === 'native') return this.nativeAmount(price.value);
    return {
      atomic: price.value,
      decimals: price.decimals == null ? 0 : Number(price.decimals),
      symbol:
        price.decimals == null ? 'raw units' : price.token_name || 'tokens',
    };
  }
  get accountView(): NativeAccountView | null {
    this.buildSummary();
    return this.accountModel;
  }
  get assetView(): NativeTokenView | null {
    this.buildSummary();
    return this.tokenModel;
  }
  private buildSummary(): void {
    if (this.summaryData === this.data) return;
    this.summaryData = this.data;
    this.accountModel = null;
    this.tokenModel = null;
    if (!this.data) return;
    const data = this.data;
    if (this.page === 'address') {
      this.accountModel = {
        address: this.id,
        identity: this.nativeIdentity({
          ...data,
          address: data.address || this.id,
        }),
        balance: this.nativeAmount(data.balance),
        status: data.status,
        lastActivity:
          data.last_activity == null ? undefined : Number(data.last_activity),
        interfaces: data.interfaces || [],
        domains: data.dns?.domains || [],
        stale: data._meta?.stale === true,
      };
      return;
    }
    if (!['jetton', 'nft', 'collection'].includes(this.page)) return;
    this.tokenModel = {
      address: data.address || this.id,
      kind: this.page as NativeTokenView['kind'],
      name:
        data.metadata?.name ||
        data.name ||
        (this.page === 'jetton' ? 'Unnamed jetton' : this.name(data)),
      symbol: data.metadata?.symbol,
      iconUrl: this.media(data) || this.safeUrl(data.preview),
      description: data.metadata?.description,
      supply:
        this.page === 'jetton'
          ? this.jettonValue(data.total_supply, data)
          : undefined,
      holders: data.holders_count,
      decimals: data.metadata?.decimals,
      mintable: data.mintable,
      admin: data.admin ? this.nativeIdentity(data.admin) : undefined,
      owner: data.owner ? this.nativeIdentity(data.owner) : undefined,
      collection: data.collection
        ? this.nativeIdentity(data.collection)
        : undefined,
      index:
        data.indexVerified === true && data.index != null
          ? String(data.index)
          : undefined,
      nextIndex:
        data.indexVerified === true &&
        data.next_item_index != null &&
        String(data.next_item_index) !== '-1'
          ? String(data.next_item_index)
          : undefined,
      membership:
        this.page === 'nft'
          ? data.verified === true
            ? 'Verified'
            : data.verified === false
            ? 'Unverified'
            : 'Unknown'
          : undefined,
      trust:
        (data.trust || data.verification) === 'whitelist'
          ? 'Recognized'
          : (data.trust || data.verification) === 'blacklist'
          ? 'Flagged'
          : 'Unclassified',
      approvedBy: data.approved_by || [],
      soulbound: data.interfaces?.includes('sbt') || false,
      stale: data._meta?.stale === true,
    };
  }
  assetEvents(items: any[] | undefined): any[] {
    if (!items) return this.emptyHistory;
    const scope = this.page + ':' + this.id + ':' + (this.data?.address || '');
    const cached = this.historyCache.get(items);
    if (cached?.scope === scope) return cached.events;
    const events = items.map((item) => {
      const records = this.historyRecords.get(item) || new Map<string, any>();
      if (!records.has(scope)) {
        const event = Array.isArray(item.actions)
          ? item
          : this.operationEvent(item);
        records.set(scope, { ...event, actions: this.visibleActions(event) });
        this.historyRecords.set(item, records);
      }
      return records.get(scope);
    });
    this.historyCache.set(items, { scope, events });
    return events;
  }
  assetOtherEvents(item: any): any[] {
    const scope =
      'other:' + this.page + ':' + this.id + ':' + (this.data?.address || '');
    const records = this.historyRecords.get(item) || new Map<string, any>();
    if (!records.has(scope)) {
      records.set(scope, [{ ...item, actions: this.otherActions(item) }]);
      this.historyRecords.set(item, records);
    }
    return records.get(scope);
  }
  private operationEvent(operation: any): any {
    if (!operation?.operation) return operation;
    const {
      utime,
      lt,
      transaction_hash,
      trace_id,
      status,
      success,
      item,
      payload,
      ...fields
    } = operation;
    const nft = operation.nft || item;
    const asset = operation.jetton ? 'Jetton' : nft ? 'NftItem' : 'Asset';
    const type =
      asset +
      String(operation.operation).replace(
        /(^|_)([a-z])/g,
        (_match, _separator, letter) => letter.toUpperCase()
      );
    const reportedStatus =
      typeof status === 'string'
        ? status
        : success === true
        ? 'ok'
        : success === false
        ? 'failed'
        : undefined;
    const comment =
      payload?.SumType === 'TextComment' ? payload?.Value?.Text : undefined;
    const displayedFields = Object.fromEntries(
      Object.entries(fields).filter(
        ([, value]) => value !== '' && value != null
      )
    );
    return {
      event_id: trace_id,
      timestamp: utime == null ? undefined : Number(utime),
      actions: [
        {
          type,
          status: reportedStatus,
          [type]: {
            ...displayedFields,
            ...(nft
              ? { nft: { ...nft, name: nft.metadata?.name || nft.name } }
              : {}),
            logical_time: lt,
            ...(payload?.SumType && typeof comment !== 'string'
              ? { payload_type: payload.SumType }
              : {}),
            ...(typeof comment === 'string' ? { comment } : {}),
          },
          base_transactions: transaction_hash ? [transaction_hash] : [],
        },
      ],
      operation,
    };
  }
  asNumber(value: any): number {
    return Number(value);
  }
}
