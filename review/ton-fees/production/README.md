Production fee verification passed all seven bounded stages on 2026-09-28, 19:49:40–19:50:07 UTC. Native source was `8296dab52c400c371bf57adcc4542fe6b256717f`; the hub loaded complete TON export `70f39df1858a52b6`. The release owner verified the native source/export hashes and matching public native/hub artifacts separately. Router packaging revision was `1b5a027`; the subsequent error-cache fix `67076ed` preserves that exact export.

[Results](results-all.json) record real public HTTPS/WSS at `ton.tx.taxi`, `masterchain.ton.tx.taxi` and `tx.taxi`, at both 1440px and 390px. No API/WebSocket responses were intercepted or mocked. Masterchain DNS was mapped to the approved `40.160.19.141` address in Chromium, while HTTPS certificate validation remained enabled.

Nineteen visible live cubes were matched by complete workchain/shard/sequence identity to actual captured WebSocket frames. Their median, minimum–maximum range, bold total and exact tooltips agreed with those frames. The median and its units used 12px type; the range and its units used 11px yellow type. All measured rows fit the 125px faces; maximum content width was 102.67px. All six actual block clicks reached clean numeric URLs on the correct native host and displayed the selected block height. The hub loaded the expected versioned TON module successfully.

The fixed Basechain block `(0,8000000000000000,100160666)` was checked against a fresh [complete indexed transaction list](sample-transactions.json), [block header](sample-header.json) and [historical context](sample-context.json). Independent BigInt arithmetic over all 15 distinct transactions gives:

| Measurement | Exact value |
| --- | ---: |
| Transaction-fee total | 10820804 ng = 0.010820804 GRAM |
| Median | 308182 ng/tx |
| Minimum–maximum | 0–3534740 ng/tx |
| Protocol fees collected, separately retained | 1020062620 ng |

The actual context statistics and both viewport DOM measurements agreed. The rendered rows were `~308k ng/tx`, `0–3.53M ng/tx`, and `0.011 GRAM`; exact tooltips preserved the underlying amounts. This corroborates the complete transaction-fee summary independently of the new BOC parser and distinguishes it from protocol creation/import accounting.

The [native mobile strip](native-390-fees.png), [Masterchain mobile strip](master-390-fees.png), [hub desktop strip](hub-1440-fees.png) and [hub mobile strip](hub-390-fees.png) were opened and visually inspected. The new fee rows fit and retain the native cube hierarchy. The initial historical mobile screenshot was a capture issue: a second scroll moved the selected cube after its successful DOM measurement, so `sample-100160666-390.png` from this first run shows a neighboring block and is not target-specific visual evidence. The runner now preserves the measured viewport and records historical `viewportWidth` separately from cube width; these runner-only corrections do not change the accepted DOM/data assertions.

There were no uncaught page errors or captured TON WebSocket errors. Network logs were not completely empty: Cloudflare telemetry was blocked by CSP, unrelated LTC pool images produced browser ORB failures, and some non-TON image/telemetry requests were aborted during navigation. These remain recorded in the report; no change was made to those unrelated resources.

During the router rollout, an early request for the new TON feed asset reached an old container and its 404 was cached at the edge. The release owner purged only the affected TON assets after the package rollout and added a narrow `no-store` response rule for native/hub asset errors, with six actual HTTP GET/HEAD checks. That is a deployment/cache finding, separate from the passing fee-data and visual verification. The production browser run loaded the complete fee export successfully; cache-fix rollout completion is tracked by the release owner.

Reproduce only the needed bounded stage with [production.mjs](../production.mjs): `MASTERCHAIN_IP=40.160.19.141 PRODUCTION_STAGE=sample node review/ton-fees/production.mjs`. Stages are `native`, `master`, `hub`, `sample`, or `all`; supported viewport widths are 1440 and 390. The earlier local matched-data runner remains a different type of evidence; its current service ports require `NATIVE_PORT=4530 ROUTER_PORT=4851`, while its historical defaults remain unchanged.
