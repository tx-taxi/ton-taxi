# TON visual comparison — 2026-09-26

## Method and provenance

Browser captures use Chromium 1243 and identical `1440x900` and `390x844` CSS viewports. The TON candidate was served at `http://127.0.0.1:4530` with its separate comparison collector directory, `/tmp/tx-taxi-ton-compare`. The existing collector directory (`/tmp/tx-taxi-ton-data`) was not used or changed. The local router was available for the final closed-search dashboard pass.

Public sibling references are rendered observations from `eth.tx.taxi`, `btc.tx.taxi`, and `xmr.tx.taxi`. The recorded deployed source revisions are from `/home/lukee/dev/tx-taxi-docs-review/search-focus/deployments.json`: ETH `9327a28da7fcf95828adf51e3b4b3c45658241c1`, BTC `76abd0f2e660ce867c2453584c664ed6f6147212`, and XMR `5b8ede9c71ed18907ce38632bdbd7190bbd5b643`. SSH access to containers was not available, so these commit records are provenance, not a fresh container-revision verification.

Every listed PNG and every side-by-side pair was opened and visually inspected. The final entity images are the `*-settled` captures after the exact local API responses were warm. Earlier non-settled captures remain as controlled loading/setup evidence and are not used as the final hierarchy baseline.

## Reviewed comparisons

| Surface | TON capture | Existing rendered reference | Observation |
| --- | --- | --- | --- |
| Dashboard, desktop | `visual/ton-root-desktop-closed.png` | `visual/eth-root-desktop-closed.png` | Shell tokens, header, selector and strip position match. The dashboard body does not: TON replaces the native dense two-column composition with three uneven summary cards and a full-width chart. ETH-only gas-price and pending-treemap controls should remain absent, but their component layout should be repurposed with supported TON data. |
| Dashboard, mobile | `visual/ton-root-mobile-closed.png` | `visual/eth-root-mobile-closed.png` | The search/header and bottom-nav geometry remain aligned. The cards stack without overflow, but the desktop component-composition replacement remains visible in the mobile source ordering. |
| Dashboard, Mempool Original | `visual/ton-root-desktop-original.png` | `visual/eth-root-desktop-original.png` | Both pages loaded the versioned Mempool Original stylesheet and were opened in the browser. The shared shell and original-palette control state persist; their data visualizations remain intentionally chain-specific. |
| Account, desktop/mobile | `visual/ton-account-{desktop,mobile}-settled.png` | `visual/eth-account-{desktop,mobile}.png` | TON has a readable balance/state card and native history/transactions/jettons/NFTs/contract tabs. At desktop width it leaves most of the content column empty beside the facts; ETH uses the available hierarchy for compact account summary information and the recent activity list. |
| Transaction, desktop/mobile | `visual/ton-tx-{desktop,mobile}-settled.png` | `visual/eth-tx-{desktop,mobile}.png` | TON accurately shows status, account, block, fee, LT and ending state. The visual hierarchy stops at one plain fact card; ETH uses an explicit transaction state/progression and a focused confirmed state. The mobile difference is especially clear in `visual/pair-tx-390.png`. |
| Historical block, desktop | `visual/ton-block-desktop-settled.png` | `visual/eth-block-desktop.png`, `visual/btc-block-desktop.png`, `visual/xmr-block-desktop.png` | TON’s historical block data and tuple-specific facts are correct. Its independent strip tiles remain loading after detail settles, and the details card consumes the full width. BTC/XMR show the mature split detail/transaction-map composition; TON must not add a decorative map without defensible TON semantics. ETH’s own observed historical-strip reference was blank, so it is not an ideal loaded-strip baseline. |
| Documentation and About | `visual/pair-docs-1440.png`, `visual/pair-about-1440.png` | matching public ETH pages | Positive controls: the hero, tab row, sidebar and content-column layout are visibly shared. The docs pair intentionally compares TON REST with ETH Guide content, so copy differs while the shell matches. |

## Findings

### P1 — entity hierarchy does not yet reuse the native detail composition

The settled TON account and transaction pages are functional, but at `1440x900` both replace the existing rich entity hierarchy with one full-width fact card. This makes the content feel sparse after the block strip and weakens status, balance and activity scanning. On mobile, the TON transaction exposes raw facts immediately while the matching ETH transaction presents its status/progression and confirmation focus before detailed data.

The closest existing primitives to adapt are `frontend/src/app/components/address/address.component.{ts,html}` for the account summary/activity hierarchy and `frontend/src/app/components/transaction/transaction.component.{ts,html}` plus `transaction-details/transaction-details.component.{ts,html}` for transaction state and compact details. Reuse their layout, responsive ordering, skeleton lifecycle and controls; map TON-native account state, messages, trace and logical-time semantics into those slots rather than copying UTXO or EVM-only fields.

### P1 — dashboard body replaces rather than repurposes the native component layout

The common global tokens and card classes are retained, but that is not actual component reuse. The rendered TON dashboard uses a custom three-card row and full-width chart while the approved ETH dashboard keeps a denser two-column network/widget composition. This is a D04 visual mismatch. Reuse the existing dashboard widget/grid layout with meaningful TON masterchain, recent-block, and bounded-history slots. Do not reintroduce unsupported gas, utilization, global pending-pool, or fee-range claims just to fill the layout.

### P2 — historical-block strip remains an unresolved loading state

The final historical block detail rendered after a manual `GET /api/ton/block/30000000` returned `200`. This is an observed availability result, not independent validation of every displayed quantity. In the same settled browser capture, the top strip remains a complete row of `Loading` tiles. It should either reuse the settled masterchain tile data or retain a bounded honest unavailable state. The screenshot alone does not identify the request responsible for an earlier transient 400, so it is not attributed to the block page.

`frontend/src/app/components/block-view/block-view.component.{ts,html}` and `blockchain-blocks/blockchain-blocks.component.{ts,html}` are the existing primitives to retain/adapt for the stable containing-block focus and a non-blank strip. Do not add a BTC-style transaction treemap unless the TON adapter can provide a genuine equivalent.

### Controlled setup state, excluded from final dashboard comparison

The initial captures `ton-root-{desktop,mobile}.png` deliberately opened the search selector while router port 4531 was unavailable. They show `Explorer registry unavailable` and a connection-refused console error. They are setup evidence only. `ton-root-*-closed.png` are the clean matched dashboard references used above.

## Review assets

`visual/pair-root-1440-closed.png`, `pair-root-390-closed.png`, `pair-root-1440-original.png`, `pair-account-1440.png`, `pair-account-390.png`, `pair-tx-1440.png`, `pair-tx-390.png`, `pair-block-1440.png`, `pair-docs-1440.png`, and `pair-about-1440.png` are named side-by-side pairs. `capture.json`, `settled.json`, `settled-mobile.json`, `closed-root.json`, `original-root.json`, `eth-entities.json`, and `reference-blocks.json` retain route, viewport and observed browser-state metadata.

No product files were edited and nothing was deployed.
