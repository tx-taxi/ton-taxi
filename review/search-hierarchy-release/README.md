# Search hierarchy production release

Deployed after user approval on 2026-09-28. Runtime `e8e526c7b3a5af5f9e622f3736012095ceb803c2` serves https://ton.tx.taxi and https://masterchain.ton.tx.taxi. Router runtime is `7e71430ca3b9bb91294ed80afcd3188745192d84`.

The release includes SELECTED destination rows, registry-derived +N expansion, scoped child search, exact-origin Opened actions, removal of the redundant Workchain dropdown, numeric Block ID display/copy, and the Fees & rewards label. It preserves conditional Shard selection and native provider/fee calculations.

Public browser verification passed on both hosts at 1440×900 and 390×844, plus the hub at both widths. Four live detail/root/blocks contexts passed; reports here record numeric ID display/copy and selector removal. Production build `c03347aca0fccc28` passed budgets. Native export `dfb4847143f44835` has 47 source hashes verified from clean source.

Full screenshots, browser scripts, bounded fixture limits, actual scoped redirect/asset checks, and deployment record: `/tmp/tx-search-children-router/review/search-hierarchy/production/README.md` (also committed in tx-taxi/router). Independent zero-fee/reward verification remains in `review/masterchain-zero-fees/`.
