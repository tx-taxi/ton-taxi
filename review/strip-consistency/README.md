# TON block-strip content consistency

User correction, 2026-09-28: repeated workchain/internal labels do not belong in every cube. Keep the native visual hierarchy shared with the other explorers.

Base: TON 422ad70cf98bf91555fe1a57dc1eff57867b231d, whose deployed runtime is a051296dae132170861c3aeb72cabcbd59fb6932. The remote main read matched this checkout before implementation. Router baseline 5cdfca2 is the previously verified documentation head; this session could not refresh router main because network DNS access failed. Original checkouts were read only; this isolated clone is under /tmp/ton-strip-consistency.

Changes are limited to the two actual native Angular block-strip templates:

- Remove repeated Basechain/Masterchain/Workchain and Fees collected face labels.
- Keep existing fee-row space so amount, count and time retain peer alignment; empty rows are hidden from assistive technology.
- Pending tile uses Pending as its primary line, the complete count on one line (23 messages), and the existing observation age/state.
- Keep native CSS, dimensions, amounts, title hover details, links, workchain/shard identity, skeletons and freshness handling.

No median/range is invented: those fields are explicitly unavailable in the current TON adapter. Exact protocol collected-fee meaning and external-message details remain in the existing title attributes. Workchain selection and full block identity remain on the native explorer's controls and detail pages.

Verification: Angular compiler noEmit check and git diff --check passed. No new tests were added for this small template-only change.

Incomplete environment-dependent checks: full build stopped with spawnSync /bin/sh EPERM during theme generation. Listening on a local review port was also denied with EPERM. Therefore no new screenshots, generated hub export, running review server or deployment is claimed. The old native strip must not be presented as this new template revision.

Resume in the normal development environment:

```sh
cd /tmp/ton-strip-consistency
SKIP_SYNC=1 npm run build --prefix frontend
node hub/build.cjs /tmp/ton-strip-consistency-export
```

Generate a content-hashed TON export from strip.js + strip.css + feed.js, copy the complete export into router public/assets/native-strips/ton/<hash>/, and update only the existing ton-native-strip import in public/assets/hub-strips.js. Preserve prior immutable versions. Verify all recorded native source hashes. Compare native and hub at 1440 and 390 with identical block/pending data and inspect both screenshots. Cover ready count23, singular1, realzero, unknown and stale; confirm title hover and exact tuple destinations.

Then finish the local native/router builds and deploy within the user's existing authorization after refreshing current remote revisions. Do not overwrite other agents' work or publish only one side of the native/hub component pair.

Explorer-kit decision to carry forward: compact cubes show useful values, counts and time; repeated chain identity/protocol qualifiers belong in selectors, detail pages or hover. Preserve truthful chain semantics and do not fabricate fee-rate/range fields merely to fill peer slots.
