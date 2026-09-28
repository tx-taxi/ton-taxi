"use strict";
const { ProviderError } = require("./provider.cjs");

function blockSelection(input) {
  const get = key => typeof input?.get === "function" ? input.get(key) : input?.[key];
  const rawWorkchain = get("workchain");
  const workchain = rawWorkchain == null ? 0 : Number(rawWorkchain);
  if (!["0", "-1"].includes(String(rawWorkchain ?? 0)) || ![0, -1].includes(workchain))
    throw new ProviderError("Invalid workchain", 400);
  const rawShard = get("shard");
  const shard = rawShard == null ? undefined : String(rawShard).toLowerCase();
  if (shard !== undefined && (!/^[a-f0-9]{16}$/.test(shard) || /^0+$/.test(shard)))
    throw new ProviderError("Invalid shard", 400);
  if (workchain === -1 && shard && shard !== "8000000000000000")
    throw new ProviderError("Invalid masterchain shard", 400);
  return { workchain, ...(shard ? { shard } : {}) };
}

module.exports = { blockSelection };
