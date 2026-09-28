# TON accuracy and basechain rollout

2026-09-28 UTC. Root integrates the explorer and router release; other worktrees remain isolated.

Completed production release: `3d0ba35186c2fe6682c0408e947b001f02d6943d` fixed same-second history loss, shared recent transaction requests, confirmation-scope tooltips and small fee display. Production desktop/mobile: two recent-transaction requests in 17.5 seconds, populated chart series, no observed JavaScript errors/overflow. Two groups of eight concurrent clients received the same transaction window while the masterchain advanced. Evidence is in the original explorer review directory `review/ton/accuracy-audit/after-production/`.

Independent data audit verified five recent/historical masterchain BOCs: exactly three system transactions per tested block. Counts remain unchanged. `fees_collected` is the actual protocol ValueFlow field and can include creation/imported funds. Exact amounts remain available in native tooltips/details. The basechain default is a usability decision, not correction of fabricated transaction counts.

Basechain release (local acceptance complete; deployment record follows in explorer-kit):

- Default workchain 0 with explicit masterchain and shard selection.
- Actual shard references decoded from verified masterchain blocks; one shared block stream.
- Full tuple entity destinations, homogeneous shard histories/caches and shard-aware numeric search.
- Separate socket selections and retained historical context; no masterchain substitution during basechain outages.
- Native component/styles preserved; all 44 exported source hashes match the final source.

Completed local acceptance:

- Eighteen native browser route/scope checks at 1440 and 390 px. Numeric search, 32-to-40-block pagination and selected context centering passed in both chains. No observed JavaScript/API errors or viewport overflow.
- Simultaneous independent socket selections advanced 50 basechain and 47 masterchain blocks with no cross-contamination or stale windows.
- Counts and ValueFlow collected fees matched independent TonAPI reads. Historical multi-shard BOC fixtures verify real shard identities; the current live network has one active basechain shard, so no live multi-shard selector claim is made.
- All 44 exported component source hashes verified. Matching-data native/hub screenshots were actually inspected at both widths; geometry, content, native hover details and full-tuple destinations match.
- Cached hub-to-native handoff rendered in 484 ms desktop / 468 ms mobile before deliberately delayed live initialization. Wrong-workchain cache was rejected. TON remained live with the other seven chain feeds disconnected.
- A bounded pool of at most three public lite connections replayed 162 consecutive new basechain blocks with no gaps/errors in the integrated observation. Maximum observed head age was 10.522 seconds. The independent pool probe also recovered from injected and observed worker failures.
- Backend scope/context/real-BOC/handoff checks, eight frontend controller checks and production Angular build passed. No new visual component or stylesheet.

Full evidence, screenshots and reproducible scripts are in `/home/lukee/dev/ton-taxi/review/ton/accuracy-audit/{basechain,basechain-browser,basechain-hub}`. These observations are bounded checks, not a claim of continuous uptime or full historical indexing.

Local review commands:

```sh
cd /home/lukee/dev/ton-basechain-integration
TON_API_KEY_FILE=/home/lukee/.config/tx-taxi/ton/tonapi.key TON_STATIC_ROOT="$PWD/frontend/dist/mempool/browser" TON_DATA_DIR=/home/lukee/.cache/ton-basechain-review PORT=4530 node adapter/ton-server.cjs
cd /home/lukee/dev/ton-basechain-router
HOST=127.0.0.1 PORT=4592 node dist/index.js
```

The key remains in its existing local secret file and is never included in the export or repository.

GitHub publication and community configuration are verified across all eight native repositories. TON is public and the organization listing includes it. The admin-only commits used the verified Coolify `[skip cd]` mechanism and did not trigger app deployments. Runtime deployment settings remain unchanged.
