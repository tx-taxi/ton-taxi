# TON host views — release candidate, not deployed

2026-09-28. Approved behavior: `ton.tx.taxi` opens Basechain; `masterchain.ton.tx.taxi` opens Masterchain. Both domains serve the same native application and collectors. The router continues to advertise one TON explorer and one Basechain hub band. The existing workchain selector navigates between the fixed hosts with the existing transition surface.

## Implemented

- HTTP dashboards, block lists, numeric search and WebSocket upgrades derive their default workchain from the exact hostname. Explicit supported workchain/shard query selections still override defaults. Connected viewers retain independent selections during updates and reconnects.
- Full block tuples preserve workchain/shard/height on either host. The subsequent approved clean-URL change supersedes the old numeric Masterchain-only rule: `/block/<number>` means the current host's workchain and the stable root shard, with `?shard=` for other shards. Raw numeric searches still use the selected feed scope. Tuple page links redirect to their clean equivalent. See [the clean URL review](../ton-clean-urls/README.md).
- Angular selection initialization, native controls, titles, canonical URLs and social images recognize the Masterchain hostname. Shared social-image caches are partitioned by approved host. Logo navigation remains detail page → current explorer root → hub.
- Router `site.aliasOrigins` adds the exact Masterchain origin to native input recognition, browser CORS, hub handoff and allowed destinations without adding a second chain. Full internal block identities produce clean numeric destinations on their workchain host.
- The earlier native cube cleanup is included: omit repeated chain/fee qualifiers while preserving native row dimensions; pending count and messages share one line. No fee statistics or pending ETA are fabricated.

## Source and evidence

Native isolated clone: `/tmp/ton-strip-consistency`, based on `422ad70cf98bf91555fe1a57dc1eff57867b231d`. Cube cleanup commit: `e099973be`. Router isolated clone: `/tmp/ton-strip-consistency-router`, based on `5cdfca21` (previously verified documentation head; network access prevented refreshing it this session). Original checkouts and other agents' changes are untouched.

Checks already passed:

- Angular compiler `ngc --noEmit`.
- The hostname baseline passed 13 frontend behavior checks; subsequent clean-link checks and final counts are recorded in the clean URL review.
- 3 backend behavior checks: simultaneous host API scopes, numeric/full tuple/legacy search identity, and server-rendered canonical/social host separation.
- Actual server handlers checked in process with 24 HTTP cases and three simultaneous WebSocket fixtures: host/query scope, short block routes, tuple redirects, split-shard SSR, initialization, selection, ping, block/pending broadcasts and one shared collector. Run `node review/ton-hosts/server-check.cjs`; no real transport is used.
- Router compilation and relevant routing/access suites; its exact final count and controlled handoff/transition evidence are recorded in the router's `review/ton-hosts/`.
- Syntax and whitespace checks.

These are controlled source checks, not a production or visual acceptance claim. Full frontend build fails at theme generation with `spawnSync /bin/sh EPERM`; local listening also fails with `EPERM`. Coolify/network reads fail with DNS socket permission errors. No DNS, certificate, deployment, new browser screenshots, running review server or regenerated hub bundle is claimed.

## Finish in an environment with build and network access

1. Refresh the approved native/router remote heads and inspect other work before applying the candidate patches. Native repository is `https://github.com/tx-taxi/ton-taxi.git`; do not inherit the historical ETH remote. Do not overwrite another agent's work. The isolated clone origins point at local source checkouts.
2. Inspect Cloudflare's actual edge certificate coverage. On a full-zone setup Universal SSL alone covers only the apex and first-level subdomains; this nested host needs appropriate existing or additional coverage. Preserve the Cloudflare proxy. Do not silently use DNS-only or purchase a certificate product. Reference: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
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

   Generate a content-hashed TON export from `strip.js`, `strip.css` and `feed.js`; copy the complete export into the router's `public/assets/native-strips/ton/<hash>/`. Update only the existing `ton-native-strip` loader in `public/assets/hub-strips.js`; preserve immutable old versions. Verify every provenance source hash. The current old `d967359b7d302529` bundle does **not** contain this cube cleanup.
5. Build the router. Use controlled matched block/pending snapshots for native-versus-hub desktop/mobile screenshots at 1440 and 390 px, and inspect both. Verify both TON host roots, old numeric URLs, full tuples, typed/pasted search, root/hub logo clicks, host selector, Original/Taxi themes, stale/disconnected data and two simultaneous live sockets. A Basechain hub snapshot must be rejected by a Masterchain viewer. Confirm one hub band/dropdown entry and correct hover/entity destinations.
6. Deploy the verified native and corresponding hub export/router release within the existing user authorization, then check public HTTPS, API workchain identities, live block progression, search and transitions. Record exact runtime revisions, evidence and host certificate status in explorer-kit. Do not advance approved revision locks before those checks pass.

Explorer-kit changes are supplied separately as `/tmp/ton-host-explorer-kit.patch` because the kit is read-only in this session.
