"use strict";
const { blockIdentity } = require("./block-context.cjs");
const { blockSelection, tonSite } = require("./block-selection.cjs");
const ROOT_SHARD = "8000000000000000";

// Resolve presentation URLs at the boundary; provider/cache IDs remain tuples.
// A short historical link must never change meaning with the current live shard.
function blockRouteIdentity(value, query, host) {
  if (!/^\d+$/.test(String(value))) return blockIdentity(value);
  const selection = blockSelection(query, tonSite(host).workchain);
  return blockIdentity(`(${selection.workchain},${selection.shard || ROOT_SHARD},${value})`);
}

function blockUrl(value) {
  const block = blockIdentity(value);
  const origin = tonSite(block.workchain === -1 ? "masterchain.ton.tx.taxi" : "ton.tx.taxi").origin;
  if (![0, -1].includes(block.workchain)) return `${origin}/block/${encodeURIComponent(block.id)}`;
  const url = new URL(`/block/${block.seqno}`, origin);
  if (block.shard !== ROOT_SHARD) url.searchParams.set("shard", block.shard);
  return url.href;
}

module.exports = { blockRouteIdentity, blockUrl };
