# Clean TON block URLs — candidate, not deployed

User follow-up, 2026-09-28: replace visible encoded block tuples with normal `/block/<height>` paths. Implemented on the isolated hostname candidate based on native `ca3e6b1ca` and router `3e87c235`, preserving original checkouts.

## Public contract

- Basechain root-shard block: `https://ton.tx.taxi/block/100160666`.
- Masterchain root-shard block: `https://masterchain.ton.tx.taxi/block/<height>`.
- A different Basechain shard adds `?shard=<16hex>`. The query-free block entity path always means root shard `8000000000000000`; it must not change meaning if the live feed later splits or changes its selected shard.
- Typed numeric search still resolves within its selected live feed scope. Pasting a block URL instead preserves that URL's exact host/shard identity.
- Explicit tuple page URLs remain valid and receive a 308 redirect to the short equivalent for workchains 0/-1. The redirect requires no provider request, retains the locale and presentation query, and preserves the tuple's identity over conflicting scope queries. API, BOC, context and image tuple routes do not redirect. Other workchain tuples are not shortened.
- This intentionally supersedes the previous candidate's rule that all numeric block paths meant Masterchain. Both meanings cannot coexist at the same query-free main-host path. Existing full-tuple links preserve identity.

## Implementation and checks

`adapter/ton/block-route.cjs` resolves short URLs at the external boundary and constructs canonical destinations. All internal provider, cache, stream, context and BOC identities remain full tuples. `api.cjs` resolves the identity before any block subresource request; Basechain `/shards` rejects the invalid operation instead of looking up an unrelated Masterchain height. Native pasted URL resolution includes localized and encoded paths.

Server-rendered canonical links use the short destination; social images retain a full tuple in the image path on the correct host. Shard queries reach the renderer and image-cache key. The independent review caught and fixed a missing server-to-renderer query handoff; the actual captured HTTP handler now verifies the split-shard canonical and image, not just a direct metadata helper call.

Three existing backend/API checks cover both hosts, equal heights across scopes, short/tuple/pasted/encoded/localized links, transaction rows, BOC, context and metadata. The actual server-handler fixture passes 24 HTTP cases plus three simultaneous WebSocket viewers with one collector. Router verification passes 115 relevant existing tests, and 11 controlled search-options → actual native API → generated destination round trips, including active-shard search versus stable-root links.

The 17 frontend behavior checks exercise the actual native link directive and compiled hub Router factory/NativeLink facade, stable-root numeric API identity, same-path shard changes, tuple precedence, cross-host search/navigation, locale and canonical/full-tuple social images. No new visual component or style is introduced: a nonvisual directive supplies clean hrefs and native navigation to the existing anchors. The hub composes that same directive and native components. Raw keyboard navigation and transaction/parent/shard block links use the shared helper. These checks do not substitute for rebuilding and reviewing the exported hub bundle.

Commands (no listener/provider required):

```sh
cd /tmp/ton-strip-consistency
node adapter/ton/host-views.test.cjs
node review/ton-hosts/server-check.cjs
node frontend/src/app/ton/chain-selection.test.mjs
node frontend/node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p frontend/tsconfig.app.json
```

The same [release instructions](../ton-hosts/README.md#finish-in-an-environment-with-build-and-network-access) still apply. Full build, rebuilt native hub export, browser navigation/visual review, actual DNS/TLS and deployment are unfinished because this session denies the necessary build processes, local listening and external network access. Neither a deployment nor a running review URL is claimed. The shared native export must be rebuilt before the hub can use these links; do not hand-edit the old generated strip. Explorer-kit is supplied as a separate patch without changing its approved revision lock.
