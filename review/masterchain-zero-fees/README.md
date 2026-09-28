# Masterchain zero-fee audit

Captured 2026-09-28T23:41:47.285Z (2026-09-28 16:41:47 America/Phoenix (UTC-07:00)). The bounded sanitized evidence is in [report.json](report.json). No product changes or tests were added by this audit.

The screenshot block **95711146** contains exactly three direct transactions: Elector tick/tock, Elector ordinary, and Config tick/tock. All three report exact total and compute fees of **0 nanograms**. Independently decoding its 10,201-byte BOC produces complete count/min/median/max/total statistics of three/zero/zero/zero/zero; its root and file hashes match the provider header. These are known zeros, not missing-data fallbacks.

For the same masterchain sequence, the network confirmation endpoint returns six transactions: those three plus three Basechain transactions in block 100207687 with fees of 445,216; 307,935; and 66,069 nanograms. The cross-shard sample totals 819,220 nanograms; its median is 33,034.5 nanograms. The screenshot dashboard sample need not be pinned to the same head as its live block strip, so this historical sample is evidence of scope, not an attempt to reproduce the screenshot dashboard numbers.

[TON configuration documentation](https://docs.ton.org/foundations/config#param-31-fee-exempt-contracts) explains the gas/storage exemption for special masterchain contracts and states that Elector and Config are always special. [TON system-contract documentation](https://docs.ton.org/foundations/system) describes Elector tick/tock execution. [TonAPI's official endpoint schema](https://github.com/tonkeeper/opentonapi/blob/master/api/openapi.yml#L228-L231) specifies the all-shard/workchain scope of masterchain-confirmed transactions.

The existing strip tooltip names transaction fees and their count; the dashboard tooltip names the masterchain block that confirmed the sample. Neither explicitly contrasts scope. A narrow clarification can say “transactions directly in this block” for the strip and “confirmed transactions across all shards” for the dashboard. Retain the numeric data. Block value-flow fees collected (2.700431833 GRAM for this example) include creation/imported economics and cannot substitute for the actual zero transaction fee sum.

Relevant code locations are recorded in report.json. Missing or incomplete fee statistics already produce unavailable values; a complete all-zero distribution correctly displays zero.

## Empty Basechain block 100207828

Also inspected at 2026-09-28T23:42:49.481Z. The provider header reports zero transactions; its transaction endpoint returns an empty array. Independently decoding the 1,174-byte BOC confirms complete coverage with count 0, transaction fee total 0, and no median/range. Root and file hashes match the header.

Both the header and BOC report created = fees_collected = 1000000000 nanograms (1 GRAM); imports, exports, imported fees, recovered value, and minted extra-currency value are zero. Therefore the displayed 1 GRAM comes entirely from the block creation reward. [TON's collator implementation](https://github.com/ton-blockchain/ton/blob/master/validator/impl/collator.cpp) adds the creation reward to collected value, and [configuration parameter 14](https://docs.ton.org/foundations/config#param-14-block-reward) defines these production rewards. The label **Fees & rewards** correctly communicates this quantity.
