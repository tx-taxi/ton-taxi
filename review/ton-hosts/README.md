# TON host views — deployed and verified

2026-09-28. Approved behavior: `ton.tx.taxi` opens Basechain; `masterchain.ton.tx.taxi` opens Masterchain. Both domains serve the same native application and collectors. The router continues to advertise one TON explorer and one Basechain hub band. The existing workchain selector navigates between the fixed hosts with the existing transition surface.

## Implemented

- HTTP dashboards, block lists, numeric search and WebSocket upgrades derive their default workchain from the exact hostname. Explicit supported workchain/shard query selections still override defaults. Connected viewers retain independent selections during updates and reconnects.
- Full block tuples preserve workchain/shard/height on either host. The subsequent approved clean-URL change supersedes the old numeric Masterchain-only rule: `/block/<number>` means the current host's workchain and the stable root shard, with `?shard=` for other shards. Raw numeric searches still use the selected feed scope. Tuple page links redirect to their clean equivalent. See [the clean URL review](../ton-clean-urls/README.md).
- Angular selection initialization, native controls, titles, canonical URLs and social images recognize the Masterchain hostname. Shared social-image caches are partitioned by approved host. Logo navigation remains detail page → current explorer root → hub.
- Router `site.aliasOrigins` adds the exact Masterchain origin to native input recognition, browser CORS, hub handoff and allowed destinations without adding a second chain. Full internal block identities produce clean numeric destinations on their workchain host.
- The earlier native cube cleanup is included: omit repeated chain/fee qualifiers while preserving native row dimensions; pending count and messages share one line. No fee statistics or pending ETA are fabricated.

## Source and evidence

Native isolated clone: `/tmp/ton-strip-consistency`, based on `422ad70cf98bf91555fe1a57dc1eff57867b231d`. Cube cleanup commit: `e099973be`. Router isolated clone: `/tmp/ton-strip-consistency-router`, based on `5cdfca21` (remote head rechecked on 2026-09-28). Original checkouts and other agents' changes are untouched.

Checks already passed:

- Angular compiler `ngc --noEmit`.
- The hostname baseline passed 13 frontend behavior checks; subsequent clean-link checks and final counts are recorded in the clean URL review.
- 3 backend behavior checks: simultaneous host API scopes, numeric/full tuple/legacy search identity, and server-rendered canonical/social host separation.
- Actual server handlers checked in process with 24 HTTP cases and three simultaneous WebSocket fixtures: host/query scope, short block routes, tuple redirects, split-shard SSR, initialization, selection, ping, block/pending broadcasts and one shared collector. Run `node review/ton-hosts/server-check.cjs`; no real transport is used.
- Router compilation and relevant routing/access suites; its exact final count and controlled handoff/transition evidence are recorded in the router's `review/ton-hosts/`.
- Syntax and whitespace checks.

Access was restored on 2026-09-28. Full builds, rebuilt export, actual matched-data native/hub review and public production verification passed. Exact runtime and deployment IDs are in [release.json](../ton-clean-urls/release.json). Native `219d2e7b9` and router `d1967c8` are live. Production evidence and observed limits are in [the browser production review](../ton-clean-urls/browser/production/README.md).

`masterchain.ton.tx.taxi` uses the same app on game-1 (`40.160.19.141`), a user-approved DNS-only A record, and its own valid Let's Encrypt certificate. The main TON hostname stays proxied. Coolify preserved environment variables, volume, health settings and native repository; only the domain list and its generated routing labels changed. Both public host scopes advance live.

## Local review commands

Native (already running, PID 2138693):

```sh
cd /tmp/ton-strip-consistency
TON_API_KEY_FILE=/home/lukee/.config/tx-taxi/ton/tonapi.key TON_STATIC_ROOT=/tmp/ton-strip-consistency/frontend/dist/mempool/browser TON_DATA_DIR=/home/lukee/.cache/ton-host-release-review PORT=4530 node adapter/ton-server.cjs
```

Router (already running, PID 2148959):

```sh
cd /tmp/ton-strip-consistency-router
HOST=127.0.0.1 PORT=4851 node dist/index.js
```

URLs: native `http://127.0.0.1:4530`, hub `http://127.0.0.1:4851`. To stop only these review processes, first confirm ownership with `ss -ltnp '( sport = :4530 or sport = :4851 )'`, then `kill 2138693 2148959`. Ports 4330/4592 and original checkouts belong to other work and were preserved.

## Release procedure used

1. Refresh the approved native/router remote heads and inspect other work before applying the candidate patches. Native repository is `https://github.com/tx-taxi/ton-taxi.git`; do not inherit the historical ETH remote. Do not overwrite another agent's work. The isolated clone origins point at local source checkouts.
2. Inspect Cloudflare's actual edge certificate coverage. On a full-zone setup Universal SSL alone covers only the apex and first-level subdomains; this nested host needs appropriate existing or additional coverage. The user explicitly approved DNS-only for this nested host; retain the main host proxy. Do not silently purchase a certificate product. Reference: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
3. Point the new hostname at the existing TON origin and add `https://masterchain.ton.tx.taxi` to the same Coolify application, preserving `https://ton.tx.taxi`, `/data/ton`, current environment and health settings. Last verified app: `hnovtmaezijzd4lf7lpnczef`, game-1 `40.160.19.141`, container port 8080, `/healthz`. Verify the current configuration before changing it. Check edge and origin TLS, exact Host forwarding, cache behavior and WebSocket upgrades. Both hosts must work before publishing selector/router links.
4. Build and export the exact native component sources:

   ```sh
   cd /tmp/ton-strip-consistency
   node adapter/ton/host-views.test.cjs
   node frontend/src/app/ton/chain-selection.test.mjs
   node review/ton-hosts/server-check.cjs
   node frontend/node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p frontend/tsconfig.app.json
   SKIP_SYNC=1 npm run build --prefix frontend
   node hub/build.cjs /tmp/ton-host-native-export
   ```

   Generate a content-hashed TON export from `strip.js`, `strip.css` and `feed.js`; copy the complete export into the router's `public/assets/native-strips/ton/<hash>/`. Update only the existing `ton-native-strip` loader in `public/assets/hub-strips.js`; preserve immutable old versions. Verify every provenance source hash. This release uses `2bc11808b22c347e`; old immutable exports remain preserved.
5. Build the router. Use controlled matched block/pending snapshots for native-versus-hub desktop/mobile screenshots at 1440 and 390 px, and inspect both. Verify both TON host roots, old numeric URLs, full tuples, typed/pasted search, root/hub logo clicks, host selector, Original/Taxi themes, stale/disconnected data and two simultaneous live sockets. A Basechain hub snapshot must be rejected by a Masterchain viewer. Confirm one hub band/dropdown entry and correct hover/entity destinations.
6. Deploy the verified native and corresponding hub export/router release within the existing user authorization, then check public HTTPS, API workchain identities, live block progression, search and transitions. Record exact runtime revisions, evidence and host certificate status in explorer-kit. Do not advance approved revision locks before those checks pass.

Explorer-kit records the implemented host/URL contract, final source/export paths, the explicit DNS-only exception and bounded production evidence. Its unrelated dirty work is preserved.
