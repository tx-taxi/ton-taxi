# TON native strip export

The implementation ancestor is approved ETH `9327a28da7fcf95828adf51e3b4b3c45658241c1`; the TON adaptation is an isolated local candidate. See `source.json` and `review/ton/reconciliation/README.md`. No deployed TON revision is claimed.

`build.cjs` imports the actual TON `BlockchainComponent`, `BlockchainBlocksComponent`, `MempoolBlocksComponent`, Amount, Time, shared controls and original component/global styles. It does not draw substitute blocks. TON renders real masterchain headers, transaction counts, exact collected fees, and a separate provider-observed pending external-message cube. The pending cube is the existing component with unchanged styles; it has no invented capacity, fee rate, value, miner, or projected masterchain height.

```sh
cd /home/lukee/dev/ton-taxi
node hub/build.cjs /home/lukee/dev/ton-router/public/assets/native-strips/ton
```

`strip.js`, `strip.css`, `feed.js`, `default.svg` and `provenance.json` are generated. Provenance records source/template/style SHA-256 values and whether the source worktree contains uncommitted changes. The wrapper provides scrolling, native destination routing and injectable observables. Each instance isolates styles and native overlays in its ShadowRoot; teardown closes the feed and destroys the renderer. Provider logic stays in this chain repository.

```js
const mounted = await mount(host, {destination: 'https://ton.tx.taxi'});
const stop = startFeed({onSnapshot: data => mounted.update(data), onStatus: detail => mounted.setStatus(detail), signal});
// Teardown:
stop(); mounted.destroy();
```

The feed sorts the verified consecutive block snapshot newest-first (eight visible headers), preserves `ton.observedAt`, honors `ton.stale`, detects a silent first confirmed stream, and retains loaded blocks across interruption. Real pending data arrives separately in `tonPending`; legacy `mempoolBlocks` remains empty. Pending-only frames do not initialize confirmed data or advance its observation time. The same validated loading/ready/stale/unavailable DTO drives native and hub pending cubes, including stale cached handoff. A pending outage cannot stop the confirmed strip.

The pending source is authenticated unfiltered TonAPI external-message SSE, with finalized-account SSE plus exact transaction BOCs over three persistent public lite-server connections for inclusion removal. Counts represent retained provider-observed groups, not a network-wide mempool. Unknown groups retire 30 seconds after first seen, without a rejection/confirmation claim; recent exact confirmations receive bounded 30-second group suppression to prevent rebroadcast reappearance. No credential is sent to the hub. Server-only `TON_API_KEY_FILE` and local build/run commands are documented in `review/ton/pending/README.md`.

Pending integration is locally verified and unshipped. The full-service 65-second check stayed ready throughout and removed 337 confirmed groups with zero dropped events or verification failures. Matching-data visual, live desktop/mobile, skeleton and source-failure evidence is linked in `review/ton/pending/README.md`. Counts and coverage remain bounded to the documented provider observation window.

Loopback transport/destination `127.0.0.1:4530` is confined to local review. Production destination is canonical `ton.tx.taxi`, but production registration remains disabled. Router layout and search presentation are registry driven; `TON_NATIVE_ORIGIN` opts the isolated router into the local candidate.

Fixed real-data native/hub comparisons at 1440 and390 pixels are recorded in `review/ton/acceptance/parity.json` and accompanying screenshots. The integrator inspected all four captures: tile size, gradient, exact text and centered divider match. The hub-owned logo/heading/fade are intentional wrapper differences.
