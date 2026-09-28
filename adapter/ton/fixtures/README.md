# Public chain fixtures

`masterchain-95546363.boc` and `masterchain-40000000.boc` are unmodified mainnet blocks downloaded from the native explorer's read-only BOC endpoint on 2026-09-28. They contain one and nine active basechain shard references respectively. `masterchain-40000000-shards.json` records the corresponding public TonAPI indexed header identities, independently compared with the BOC's ShardHashes tree.

The fixtures verify actual TON sharding semantics: different shard prefixes/depths, independent sequence numbers, and exact root/file identities. Tests do not rename or renumber the chain data. Source routes: `/v2/blockchain/blocks/(-1,8000000000000000,95546363)/boc`, `/v2/blockchain/blocks/(-1,8000000000000000,40000000)/boc`, and `/v2/blockchain/masterchain/40000000/shards` at `https://tonapi.io`.
