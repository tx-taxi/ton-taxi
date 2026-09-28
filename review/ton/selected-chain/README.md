# Selected TON chain API and socket integration

Default live explorer traffic selects workchain 0. Explicit `workchain=-1` selects masterchain. An optional 16-digit hexadecimal `shard` selects one basechain lineage; masterchain only accepts its root shard. The chain-owned collector supplies one homogeneous block window, active-shard discovery and the masterchain confirmation cursor.

Routes accepting this selection: `/api/ton/dashboard`, `/api/ton/blocks`, `/api/v1/blocks`, `/api/v1/blocks/:from`, `/api/blocks`, `/api/v1/init-data`, and the `/api/v1/ws` query. WebSocket `init`/`select` messages may also carry top-level `workchain` and `shard`. Block, pending-freshness and ping envelopes are recomputed per selected socket; one visitor cannot change another visitor's view.

`/api/ton/blocks` returns raw headers, as before. `/api/v1/blocks/:from` returns normalized strip DTOs and retains inclusive `from` semantics. Paging includes workchain/shard, verifies exact requested identities and stops at split/merge boundaries. No masterchain fallback is emitted while basechain data is loading or unavailable. Bare numeric entity URLs preserve their prior masterchain interpretation; new basechain links use full tuples.

The collector is constructed with `basechain:true`. This integration depends on the separately owned collector contract (`dashboard(selection)`, `snapshot(selection)`, `basechain.cached(height,shard)`); it does not redefine masterchain `collector.blocks` or cached cursor semantics. The shared `/network-transactions` endpoint continues to use the masterchain confirmation cursor.

Two behavioral tests run the real HTTP/WebSocket server against deterministic chain fixtures: simultaneous basechain/masterchain clients, REST selection/paging, socket selection/ping/pending updates, invalid input rejection, honest empty loading, and a real split-lineage boundary. Four earlier latest-window tests still pass. No external provider requests are made by these tests.

```
NODE_PATH=/home/lukee/dev/ton-taxi/adapter/node_modules node --test review/ton/latest-window/behavior.test.cjs review/ton/selected-chain/behavior.test.cjs
```

Live integration and browser verification remain the integrator's next step. No push or production changes made by this agent.

Basechain context follow-up: the existing context assembler now consults the selected basechain's verified cached headers and uses its exact tuple as the observed-tip boundary. It skips speculative future acquisition at that tip and never reuses a same-height sibling/masterchain header. Two targeted behavior checks cover cached zero-provider context, masterchain/basechain same-height isolation, and rejecting a sibling-shard cache collision.
