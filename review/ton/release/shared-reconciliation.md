# Shared source reconciliation for TON release

Observed deployed ETH runtime: `0cf8e721e9694a321c9d89a4640f40e0e8ab5957` on game-1, compared with the TON implementation ancestor `9327a28da7fcf95828adf51e3b4b3c45658241c1`. All 13 intervening commits were inspected by scope and diff.

- `7daef2a9c`: ported shared search-focus behavior and the correct Automatic Routing favicon. Opening the menu keeps typing in the input; programmatic route focus no longer opens the menu unexpectedly. Existing TON-specific source inference remains.
- `4946ccd8a`: ported the exact chain-colored Telegram footer link and CSS.
- `a59d11fd0`, `feaab5d05`, `356d4505c`, `9a258b4ab`: adapted the repository README for TON, archived previous upstream setup instructions, and preserved upstream notices while adding the existing contributor attribution.
- `ce76ad192`, `ca1f9481b`, `3c1514fe3`, `7f8b30d20`, `469702de4`, `35f78ae83`: Ethereum-specific txpool, pending fee projection/filtering, block recovery and mined-transaction reconciliation. Do not import Ethereum gas/nonce/execution assumptions into TON. TON has its independently verified stream/contiguous header recovery, exact block fees, authenticated external-message stream and exact inclusion removal.
- `0cf8e721e`: Ethereum token USD transfer estimates are not copied into TON jetton transfers. TON's own exact amount/scaled UI handling and current-rate display remain; historical transfers do not borrow a current display multiplier.

The user's rejected extra Masterchain/Basechain headings were not implemented. Chain/shard identity stays in existing metadata. No per-chain UI redesign is part of this release.
