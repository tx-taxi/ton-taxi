# TON native pages

TON uses the approved ETH-derived tx.taxi fork (`9327a28da7fcf95828adf51e3b4b3c45658241c1`). The component comparison and subsequent implementation iteration are recorded in `review/ton/comparison/`, `review/ton/iteration/` (both rejected baselines) and `review/ton/native-home/` at repository root. Production deployment is not part of this local review.

## Rendering and data ownership

- Routes render the existing `DashboardComponent`, `BlockComponent`, `BlocksList`, `RecentTransactionsList` and `TransactionComponent` directly. The custom network and transaction page wrappers were removed. Scoped `TonNetworkData`/`TonTransactionsData` own chain requests; `TonPageData` is nonvisual shared orchestration.
- Dashboard retains the original ETH template's three paired rows and unmodified stylesheet: FeesBox/Difficulty, MempoolBlockOverview/EthereumGasMarketGraph, recent blocks/recent transactions. TON labels use confirmed fees and observed masterchain data; no fictional pending/PoW/gas-capacity values.
- The actual BlockOverviewGraph renderer accepts a separate unitless layout weight for confirmed TON rows. Its original tooltip table shows exact native fees, confirmed timestamp/status and message counts. No layout weight is exposed as protocol bytes or gas. Hover/click/filter/loading/recovery remain native.
- Transaction/TransactionDetails/TransactionsList use their original title, summary, State, Details, sender/recipient-table and fee-summary hierarchy. TON execution phases, actual messages, action results and real trace relations fill existing slots.
- `TonAssetsPageComponent` uses the retained Address and EthereumToken components. Its narrow NFT media grid is shared with `TonAssetCatalogComponent`; account inventories, NFT/collection pages and catalogs do not maintain parallel card designs. Contract-specific resources stay in chain code.
- `/market` directly renders the existing `PriceChartComponent`; `TonMarketService` supplies native historical points and venue quotes. The custom market page was removed. Market venue quotes carry their actual USD denomination and source timestamps.
- `TonPageComponent` extends nonvisual `TonPageData` for remaining DNS, staking, extra-currency, configuration and validator metadata pages. Migrated generic route bodies and the bespoke history chart were retired.

Shared `app-amount` accepts `NativeAmount`: exact atomic string, decimals, symbol, native flag, optional atomic symbol and quote. It follows the existing coin/atomic/fiat preferences using exact strings/BigInt. Compact presentation alone uses the shared three-significant-digit formatter; its tooltip retains the exact value. Missing prices remain unavailable; small nonzero fiat amounts never become false zeroes. A singleton TON rates service supplies quotes. Block-strip compact formatting stays unchanged.

Historical detail context follows real predecessor block tuples in the actual BlockchainBlocks component. It never substitutes a live masterchain head when a shard header is slow or unavailable. `TonUrlSerializer` treats parenthesized TON tuples as identifiers rather than Angular auxiliary outlets; native hub links percent-encode their parentheses.

TON provider logic remains in `adapter/ton/`. Metadata stays escaped text; media and links accept safe HTTP(S), with IPFS mapped to HTTPS. List images load lazily, preserve their aspect ratio and keep an honest fallback. Read-only getters do not sign or send transactions.

## Exact scaled jettons

Current balances and supply use TEP-526 BigInt MULDIVR before decimal formatting. Historical transfers retain their historical raw amounts. Invalid multipliers do not silently become unscaled values. Run `node --test frontend/src/app/ton/scaled-ui.test.mjs` from repository root; its six behavioral cases include the real TSUI supply (700 on-chain to 701.4 displayed).

## Review

Build: `./review/ton/build-local.sh`. Native explorer: `http://127.0.0.1:4530`. Local hub: `http://127.0.0.1:4531`. Evidence separates real provider captures from controlled replay/outage checks and retains the rejected candidate's screenshots. See `review/ton/native-home/README.md` for this comparison pass and `review/ton/iteration/README.md` for earlier functional coverage and remaining external fixture gaps.

Mean masterchain interval is elapsed `gen_utime` divided by masterchain sequence-number distance between observed headers. This is an average over that span; it never invents individual timestamps for skipped heights. Dashboard fee-window completeness uses `nextOffset`, because `hasMore` also includes preceding masterchain intervals.
