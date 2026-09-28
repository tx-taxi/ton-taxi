Fee-strip review passed for native source `8296dab52` and hub export `70f39df1858a52b6` on 2026-09-28. Root executed the normal builds and browser runner against native port 4531 and router port 4852; this reviewer inspected the resulting data and images.

Deployed and publicly verified: [TON](https://ton.tx.taxi), [Masterchain](https://masterchain.ton.tx.taxi), and [hub](https://tx.taxi). [Exact release record](release.json) pins native `8296dab52` and router `67076ed`, including both successful Coolify deployments. [Production evidence](production/README.md) records actual pages, correct block destinations and independent fee arithmetic. The [public streams](production/streams.json) both advanced with 32 complete, consecutive, non-stale headers during the bounded observation. Initial startup briefly retained six older cached headers without fee statistics; fresh verified blocks replaced them, without inventing zero values.

[Independent fee verification](reference.json) uses captured public indexed transaction lists and their raw transaction BOCs. Each raw transaction was parsed with the SDK's `loadTransaction`, its hash matched the indexed hash, and its native total fee matched `total_fees`. Independently aggregated integer amounts were compared with the new full-block BOC decoder, historical header decoder, normalized strip data, and actual collector commit/fanout/persistence/restore paths.

| Public block | Transactions | Transaction-fee total, ng | Median, ng/tx | Protocol fees collected, ng |
| --- | ---: | ---: | ---: | ---: |
| Basechain 100043794 | 2 | 527295 | 263647.5 | 1000571741 |
| Basechain 100043809 | 0 | 0 | unavailable | 1000000000 |
| Masterchain 95551090 | 3 | 0 | 0 | 2702756237 |
| Basechain 100160666 | 15 | 10820804 | 308182 | 1020062620 |

The first three use authenticated full-block BOC fixtures. The last uses the independent indexed/raw-transaction oracle plus the new server's captured historical context; all statistics match, and the protocol amount remains unchanged. Missing or count-mismatched statistics do not fall back to protocol totals.

[Browser results](browser-results.json), 19:43:34–19:43:54 UTC, passed five stages across four browser contexts and 34 case/surface measurements. Actual compiled native and hub components were compared at 1440 and 390 pixels. The initial case replays [new-init.json](new-init.json), an actual newly captured collector frame. Additional cases use independently verified public blocks or clearly labelled controlled zero, missing, incomplete and half-nanogram inputs. This is matched-data component verification, not a claim that the controlled variants occurred live.

Median, minimum–maximum and bold transaction-fee total agree across native and hub, including their exact tooltips. Median units inherit the 12px row font; range units inherit the 11px yellow row styling. All examined rows fit the existing 125px cube faces; the largest measured content width was 102.67px. There were no uncaught browser page errors or local proxy errors. Pending fee rows remain unknown. Empty blocks display a zero total with unavailable distribution; three real zero-fee Masterchain transactions display measured zero statistics. The controlled 0.5ng median displays `<1 ng/tx` and an exact 0.5ng tooltip.

The [desktop live pair](pair-1440-live-captured.png), [mobile sample pair](pair-390-indexed-sample.png), [even median](native-390-real-even.png), [empty block](native-390-real-empty.png), [unavailable fees](native-390-controlled-unavailable.png), [half-nanogram median](native-390-controlled-half-ng.png), and [real Masterchain zero fees](native-390-real-master-zero.png) were opened with the image viewer. The added rows fit the native geometry and match the hub; no new visual issue was found in this bounded scope.

The separate [live stream capture](live-streams.json) initially marked both feeds stale, then recovered and advanced: Basechain `100172275 → 100172297`, Masterchain `95676436 → 95676454`. Every captured frame retained 32 consecutive headers with complete fee statistics. Existing freshness rules include reconnect/reconciliation, errors, age and head lag; Basechain also inherits Masterchain freshness. Those rules are unchanged. Fee decoding reuses authenticated bytes and optional decode failures yield unavailable statistics rather than stopping collection. The capture does not identify the exact stale trigger or isolate timing overhead, so it demonstrates recovery with complete data, not uninterrupted live service.

Reproduction scripts: [fee-reference.mjs](fee-reference.mjs) and [browser.mjs](browser.mjs). Browser APIs/WebSockets replay the documented review frames while document and asset requests map to the local candidates. Transaction-list UI and public deployment verification are outside this browser pass. Source/output provenance is recorded separately by the release owner.

Local review remains running at http://127.0.0.1:4530 (native PID2547159) and http://127.0.0.1:4851 (router PID2562880). These replace only the release owner's prior review processes; other agents' ports and original dirty checkouts were preserved. Native source is `/tmp/ton-fee-strip`; router source is `/tmp/ton-fee-strip-router`.

Build and reproduce from the corresponding checkout:

```sh
# Native
SKIP_SYNC=1 npm run build --prefix frontend
node hub/build.cjs /tmp/ton-fee-native-export
node --test adapter/ton/block-transaction-fees.test.cjs
node frontend/src/app/ton/block-fees.test.mjs
NATIVE_PORT=4530 ROUTER_PORT=4851 node review/ton-fees/browser.mjs
MASTERCHAIN_IP=40.160.19.141 node review/ton-fees/production.mjs

# Router
pnpm build
```

Restart only after stopping the owned process and confirming its PID/cwd. Start commands, each from its checkout:

```sh
# Native; the existing key remains in its server-only file.
TON_API_KEY_FILE=/home/lukee/.config/tx-taxi/ton/tonapi.key \
TON_STATIC_ROOT=/tmp/ton-fee-strip/frontend/dist/mempool/browser \
TON_DATA_DIR=/home/lukee/.cache/ton-fee-release-review \
PORT=4530 node adapter/ton-server.cjs

# Router
HOST=127.0.0.1 PORT=4851 node dist/index.js
```
