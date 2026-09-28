# TON read-only adapter

Run from the repository root:

```sh
npm ci --prefix adapter
TON_STATIC_ROOT="$PWD/frontend/dist/mempool/browser" TON_DATA_DIR=/tmp/tx-taxi-ton-data PORT=4530 node adapter/ton-server.cjs
```

`TON_DATA_DIR` persists up to 2,048 real observed masterchain samples and 32 recent headers. Mount a durable volume before deploying. Default bind is loopback. No write/send/wallet API exists.

`TON_PROVIDER_URLS` defaults to `https://tonapi.io,https://keeper.tonapi.io`. They are two service endpoints of the same underlying provider, **not independent data sources**. Optional `TON_API_KEY` applies only to tonapi.io and stays outside git. `TON_REQUEST_INTERVAL_MS` defaults to 1,100 ms, with latest head priority, request coalescing, bounded queue/cache, 12-second request deadlines and cooldown on failure. Separate adapter processes share the upstream public budget but not the local limiter; use one service process.

## Contract

All `/api/ton/*` responses preserve full upstream objects and convert JSON integer tokens to exact decimal strings before parsing. This includes atomic TON, jetton quantities, balances, NFT indices, logical times and counts. Floats remain numbers. Never use Number for financial arithmetic.

Entity responses add `_meta: {observedAt, stale, provider}`. Cached stale data retains its original observation time. No result is distinct from upstream outage (404 vs 503); invalid inputs are400. Optional account state/DNS and tx event/trace may be independently unavailable.

- `/dashboard`: `{head, blocks, history, observedAt, stale}`. `head` raw; blocks are native Mempool-compatible shapes with full original in `.ton`.
- `/blocks?before=&limit=`: raw headers; `_paging.nextBefore` is exclusive.
- `/transactions?before=`: transactions in one masterchain block; `_paging.nextBefore` selects previous block inclusively. `masterchainOnly:true`.
- `/block/:id`, `/block/:id/transactions`, `/block/:id/shards`: decimal masterchain seqno or explicit `(workchain,shard,seqno)`.
- `/tx/:hash`: raw transaction, optional event/trace and relatedUnavailable. master_seqno only when directly proven by masterchain block reference.
- `/trace/:hash`, `/message/:hash`: complete trace; message resolves containing transaction.
- `/address/:id`: account plus raw `.state` and `.dns`.
- Account subresources: `transactions`, `events`, `nfts`, `jettons`, `nft-history`, `jetton-history`, `staking`, `multisigs`, `subscriptions`, `defi`, `inspect`, `methods/:name`.
- `/nft/:id`, `/nft/:id/history`, `/collection/:id`, `/collection/:id/items`, `/jetton/:id`, `/jetton/:id/holders`.
- `/validators`, `/rates`, `/config`, `/resolve?value=`.

Account tx/event/history uses `before_lt`, paged NFT/collection/holder lists use `offset`; all support bounded `limit` (default24,max100). `_paging` carries `nextBeforeLt` or `nextOffset`, plus hasMore. NFT ownership includes indirect sale/auction ownership by default (`indirect_ownership=false` opts out). No pages are silently combined or truncated. Getter arguments repeat: `?args=123&args=0:abc...`; methods are read-only provider execution with bounded names/arguments.

Resolver verifies block/transaction/account existence. It checks friendly address CRC16, rejects testnet addresses, normalizes raw/base64 transaction hashes and accepts only known TON explorer URL hosts. Transaction hash lookup falls back to message hash lookup after confirmed404. NFT/collection/jetton accounts route according to identified interfaces.

`/api/v1/blocks`, `/api/v1/blocks/:height`, `/api/v1/init-data`, WS `/api/v1/ws` serve the native strip. `action:init` subscribes to snapshots; `action:ping` yields pong. Only real masterchain transaction counts/fees are displayed; there is no global mempool, pending utilization or gas-price estimate. `/healthz` is process liveness; `/api/provider-health` reports actual dependency observations separately.

## Verification

`node adapter/ton/check.cjs` captures direct provider facts (run only when not simultaneously issuing a separate provider audit). `node adapter/ton/verify-local.cjs` checks the running adapter and controlled outage/recovery behavior. Evidence lives in `evidence/`. The first direct check recorded a transient shared-provider429 on validators/shards; subsequent single-service local checks passed both. Live WS evidence records two distinct real heads.

Limits: TONAPI currently supplies indexing and metadata; keeper is not independently sourced. On-chain NFTs, sale ownership and pagination are exposed; private Telegram inventories cannot be recovered from chain queries. NFT item-history endpoint is upstream-deprecated but retained for item-level semantics; account NFT transfer history uses the newer operations endpoint. No node, purchase, production deployment or production registration was performed.

## NFT integer correction

TONAPI's indexed NFT `index` can truncate a256-bit identifier to signed64 bits. The observed vesting NFT returned `-8596388163365981490`; `get_nft_data` proves its actual index is `87706554636135559019488344426750645469428202348963845236341834927071573488334`. NFT detail now enriches from that getter, preserves `indexed_index`, and marks `indexVerified`. Collection details similarly use `get_collection_data` and preserve `indexed_next_item_index`. Never display indexed summaries as canonical indices without verification, and never treat collection `next_item_index` as an item count.

## Social metadata

`adapter/ton-social.cjs` uses the exact native explorer composition copied from router `scripts/generate-og.ts` / `public/assets/og/explorers/ethereum.svg`, recolored TONblue and embedding the approved TON navbar artwork. `/og.png` and `/og/{tx,block,address,nft,collection,jetton,trace,message}/:id.png` return1200×630 PNGs, with bounded render concurrency/cache and four-second metadata deadline. Parse5 injects initial entity title/description/canonical/OpenGraph/Twitter values without removing the canonical DOM id. Evidence includes visually inspected root/block cards and source-index metadata injection; production bundle initial HTML must be checked after the integrator finishes the build.

## Paging and review integration updates

NFT/account and collection items, and jetton holders, now return `_paging.snapshot`. Pass that opaque token together with `offset` on Load more. Tokens expire after15minutes or bounded-cache eviction (HTTP410; restart the listing). The backend reads 100-item collection chunks (the public anonymous limit) and 1000-item wallet/holder chunks and keeps subsequent chunks on the first successful provider; it never mixes provider-specific ordering. Account/collection NFT responses also include observed `collections` groups and `collectionsComplete`, which is true only when the full first-chunk inventory is known. Group counts are not global totals when that flag is false.

`/network-transactions?master_seqno=&offset=&limit=20` returns a bounded cross-shard transaction page for the explicit masterchain interval, not just the masterchain's system transactions. `_paging.masterSeqno` stays fixed while `nextOffset` continues; when exhausted, `nextBefore` identifies the preceding interval. This endpoint is on-demand only. No globalTPS is inferred.

`/nft/:id` adds account interfaces and contract_status; `/nft/:id/sbt` supplies exact authority/revocation getter results. `/multisig/:id` and `/multisig-order/:id` (also account subresources) expose structured contract/order data. `/rates` exposes USD/EUR/GBP/AUD/CAD/CHF/JPY. Provider response key `TON` is retained; native currency display usesGRAM,9decimal nanograms.

Endpoint permission errors401/403 do not trip the provider-wide cooldown. Transport, rate limits and server failures do. Health evidence includes sanitized route and status. Collector head publication is independent of background strip history; request priorities are head, detail, pagination, then background backfill.

Local router lives at `/home/lukee/dev/ton-router`. Start with `PORT=4531 HOST=127.0.0.1 TON_NATIVE_ORIGIN=http://127.0.0.1:4530 node dist/index.js`. TON registration, CORS, native navigation and loopback presentation are explicitly local-only. `NODE_ENV=production` ignores the review registration even with the env variable set. Canonical source metadata remains `https://ton.tx.taxi`. Router proof calls native `/resolve`; asset subtypes use constrained internal markers after proof, without extending global router ObjectType. No marker derived from unproved input is accepted as proof.

User detail and pagination requests age into higher priority after five seconds, ahead of background backfill. Canonical raw account IDs unify friendly/raw cache keys. Indexed unminted NFTs can resolve only after an exact positive NFT lookup; nonexistent accounts alone never establish an entity. See `evidence/variant-sources.md` for positive SBT, subscription, multisig, Telegram username, scaled UI and DeFi fixtures and the remaining explicitly unverified variants.

## Local process control

Start the one shared API process in a dedicated terminal (foreground; Ctrl-C stops only that process):

```sh
cd /home/lukee/dev/ton-taxi
TON_STATIC_ROOT="$PWD/frontend/dist/mempool/browser" TON_DATA_DIR=/tmp/tx-taxi-ton-data PORT=4530 node adapter/ton-server.cjs
```

For a detached shell, capture the exact child PID instead of killing every Node process:

```sh
cd /home/lukee/dev/ton-taxi
TON_STATIC_ROOT="$PWD/frontend/dist/mempool/browser" TON_DATA_DIR=/tmp/tx-taxi-ton-data PORT=4530 nohup node adapter/ton-server.cjs > /tmp/tx-taxi-ton-api.log 2>&1 &
echo $! > /tmp/tx-taxi-ton-api.pid
# Stop only the process launched above:
kill "$(cat /tmp/tx-taxi-ton-api.pid)"
```

Do not launch this alongside the already running review process. The native strip has no global TON pending pool or fabricated fee rate. Both upstream URLs share one provider, so a common provider outage remains possible. Public collection listing accepts at most 100 items per upstream request; smaller UI pages transparently continue across pinned-provider chunks using the snapshot token, without a total browsing cap. Wallet inventories and holders support the 1000-item chunk used here. Exact observed capability and fixture limitations are recorded in `evidence/variant-sources.md`; live compressed NFT and populated multisig order coverage remain unverified.

## Additional metadata routes (local implementation)

Implemented read-only `/api/ton/dns/:domain`, `/dns/:domain/resolve`, `/dns/:domain/bids`, `/dns/auctions?tld=ton|t.me`, `/address/:id/dns-expiring?period=1..3660`; `/staking-pool/:id` and `/staking-pool/:id/history?before_lt=&limit=`; `/extra-currency/:uint32` and `/address/:id/extra-currency/:uint32/history?before_lt=&limit=`; `/config`, `/config/raw`, each optionally `?master_seqno=`; and binary `/block/:id/boc` download. Full JSON payloads retain exact integer strings and freshness metadata. Staking history is `apy[{time,apy}]`, not wallet staking activity; the provider does not supply a next logical-time cursor, so none is invented.

Positive fixtures include memorabilia.ton expiration/bids, official TON nominator pool `Ef-Ob4ib3dI6SyugRcZHLwLEyhsTz0Uhi9RW-AszqL1xR4D4`, FMS extra currency239 and archival block30000000 BOC (10092 bytes, magic b5ee9c72). See adapter evidence for statuses and timings. NFT summaries inside DNS payloads remain indexed summaries; canonical NFT index requires item detail getter verification.

Provider requests now enforce one 25-second absolute deadline across queue, network and fallback, rather than resetting the timeout per provider. Entire `/api/ton` responses have a 28-second deadline propagated through enrichment calls, so timed-out aggregate requests cannot indefinitely add new work. Queued entries expire independently and remove themselves. Controlled deadline evidence covers both delayed upstream and queue expiration; the previously slow Telegram Usernames collection returned24items in1512ms after the fix.
