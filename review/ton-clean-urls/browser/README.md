Browser review completed on 2026-09-28. Final native source: `219d2e7b9eb2aa07f153cdfe9f6f0e522735c68b`. Final hub export: `2bc11808b22c347e` (source/output provenance verified by the release owner).

All five final stages passed across seven browser pages, with no uncaught page errors or local proxy errors:

- [Native navigation results](results-native-final.json), 18:57:26–18:57:56 UTC: native block clicks and previous links; host selector in both directions; numeric searches on both hosts; root and split-shard URLs; pasted split URL changing only the query; old tuple redirect response and destination hydration; pending-page ArrowLeft navigation at 1440 and 390 pixels; canonical host recovery; localized block hydration and previous navigation.
- [Native/hub parity results](results-parity-final.json), 18:58:08–18:58:23 UTC: actual compiled native components and hub custom element at 1440 and 390 pixels. Matching blocks have identical text, dimensions, font, color, background, hover copy and short links. Hub block clicks hydrate the native detail page. Pending counts 23, 1 and 0, unavailable state and stale state render correctly on both surfaces.

The final [desktop pair](pair-1440.png), [mobile pair](pair-390.png), [localized block](locale-detail-1440.png) and [mobile split block](split-detail-390.png) were opened with the image viewer and visually inspected. Cubes retain their native geometry and show amount, count and age without repeated Basechain or Fees collected labels. The pending cube uses one count line. Hub branding remains the existing shell overlay. Detail pages preserve full identity and shard information.

This is a controlled browser integration review, not a live-chain screenshot claim. Playwright maps `ton.tx.taxi` and `masterchain.ton.tx.taxi` to local port 4530, and `tx.taxi` to local port 4851, preserving the requested Host. Both surfaces receive the same previously captured block data, identified in each results file. Pending variants and split-shard identities are controlled variants. Transaction-list requests deliberately return unavailable because transaction rows are outside these recorded fixtures; unavailable future context slots in detail screenshots are also fixture boundaries.

Old tuple redirects were checked against the actual local HTTP server for status 308 and exact Location, followed by a separate mapped browser navigation to that destination. This avoids this browser's redirect request escaping request interception. These checks do not verify public DNS, TLS or a production deployment.

Separate [live WebSocket evidence](../live-websockets.json), captured at 18:53:47 UTC without fixtures, verifies the local collector's host defaults and advancing heads: Basechain `100164928 → 100164933`, Masterchain `95669268 → 95669274`, both root shard and non-stale. It is separate from the deterministic browser capture.

Earlier results retain the investigation history. The review exposed two real issues, fixed in the final source: localized routes rendered not-found, and the first feed frame cleared the pending route marker so direct-entry keyboard navigation failed. Final native results verify both fixes. Initial pending locator ambiguity and redirected-request DNS failures were harness issues; neither is counted as a product failure.

Reproduction: run `ROUTER_PORT=4851 REPORT_FILE=results.json node review/ton-clean-urls/browser/review.mjs` from the candidate root with both local servers running. The release owner executed Chromium; the reviewing worker inspected outputs and screenshots.

The subsequent [production verification](production/README.md) separately covers live public HTTPS, redirects, router integration, and deployed artifact identity.
