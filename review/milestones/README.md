# TON milestone history local review

Source ancestor: production `3a2a23977`. Added `adapter/ton/milestone-history.cjs` and `/api/v1/milestones/:height` in the native server. The ordinary explorer history routes are unchanged.

The milestone is the earliest exact shard block at the requested sequence number. Toncenter supplies historical shard identities; TonAPI verifies the selected header's workchain, shard, sequence, root/file hash, timestamp and transaction count. Cache is bounded to 128 entries and coalesces identical lookups. Index work is limited to four queued callers and one request every 1.1 seconds; HTTP 429 receives one bounded retry after two seconds. Missing/truncated index data and mismatched headers remain unavailable.

Real captured example: height 50,000,000, shard `6000000000000000`, timestamp `1739624950`, 19 transactions. Raw evidence: `index-50000000.json`, `header-50000000.json`. The native strip links this result to `https://ton.tx.taxi/block/50000000?shard=6000000000000000`.

Checks: `node --test adapter/ton/milestone-history.test.cjs` (3 passed); `node --check adapter/ton-server.cjs`; live historical lookups at 20,000,000, 50,000,000 and 100,000,000; router browser failure → tiny Retry → actual dated block recovery.

Local scoped endpoint: `PORT=4540 node adapter/review-milestones.cjs`. It uses the production handler without starting duplicate live collectors. Full hub preview instructions are in `/tmp/tx-chain-switch-skeleton/review/milestones/README.md`.

Release preflight: changes applied on current production ancestor 53f99c25f, preserving both anchored-page strip recovery fixes. Three history tests and native server syntax check passed. This record describes the prepared release; production verification is recorded separately. No secrets are recorded in these fixtures.
