"use strict";
const { Cell, Dictionary } = require("@ton/core");

// ShardHashes in the verified masterchain block is the authoritative set of
// active shard tips. Each leaf carries a full identity, not a global height.
function decodeShardTargets(data) {
  const roots = Cell.fromBoc(data);
  if (roots.length !== 1 || roots[0].isExotic) throw new Error("Invalid masterchain BOC");
  const block = roots[0].beginParse();
  if (block.loadUint(32) !== 0x11ef55aa) throw new Error("Invalid Block tag");
  block.skip(32); block.loadRef(); block.loadRef(); block.loadRef();
  const extra = block.loadRef().beginParse();
  if (extra.loadUint(32) !== 0x4a33f6fd) throw new Error("Invalid BlockExtra tag");
  extra.loadRef(); extra.loadRef(); extra.loadRef(); extra.skip(512);
  if (!extra.loadBit()) return [];
  const master = extra.loadRef().beginParse();
  if (master.loadUint(16) !== 0xcca5) throw new Error("Invalid McBlockExtra tag");
  master.loadBit();
  const hashes = master.loadDict(Dictionary.Keys.Int(32), Dictionary.Values.Cell());
  const targets = [];
  let nodes = 0;
  const visit = (cell, workchain, prefix, depth) => {
    if (++nodes > 4096 || depth > 60 || cell.isExotic) throw new Error("Invalid shard tree");
    const slice = cell.beginParse();
    if (slice.loadBit()) {
      const left = slice.loadRef(), right = slice.loadRef();
      visit(left, workchain, prefix, depth + 1);
      visit(right, workchain, prefix | (1n << BigInt(63 - depth)), depth + 1);
      return;
    }
    const tag = slice.loadUint(4);
    if (tag !== 0xa && tag !== 0xb) throw new Error("Invalid ShardDescr tag");
    const seqno = slice.loadUint(32), reg_mc_seqno = slice.loadUint(32);
    const start_lt = slice.loadUintBig(64).toString(), end_lt = slice.loadUintBig(64).toString();
    const root_hash = slice.loadBuffer(32).toString("hex"), file_hash = slice.loadBuffer(32).toString("hex");
    slice.skip(8 + 32 + 64 + 32);
    const gen_utime = slice.loadUint(32);
    const shard = (prefix | (1n << BigInt(63 - depth))).toString(16).padStart(16, "0");
    targets.push({workchain_id: String(workchain), shard, seqno: String(seqno), reg_mc_seqno: String(reg_mc_seqno), start_lt, end_lt, root_hash, file_hash, gen_utime: String(gen_utime)});
  };
  for (const [workchain, tree] of hashes) visit(tree, workchain, 0n, 0);
  return targets.sort((a,b) => Number(a.workchain_id)-Number(b.workchain_id) || a.shard.localeCompare(b.shard));
}
module.exports = { decodeShardTargets };
