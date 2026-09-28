"use strict";
const { ProviderError } = require("./provider.cjs");

const BASE_SITE = Object.freeze({host: "ton.tx.taxi", origin: "https://ton.tx.taxi", workchain: 0});
const MASTER_SITE = Object.freeze({host: "masterchain.ton.tx.taxi", origin: "https://masterchain.ton.tx.taxi", workchain: -1});

function tonSite(host) {
  const hostname = String(host || "").toLowerCase().replace(/:\d+$/, "");
  return hostname === MASTER_SITE.host ? MASTER_SITE : BASE_SITE;
}

function blockSelection(input, defaultWorkchain = 0) {
  const get = key => typeof input?.get === "function" ? input.get(key) : input?.[key];
  const rawWorkchain = get("workchain");
  const workchain = rawWorkchain == null ? defaultWorkchain : Number(rawWorkchain);
  if (!["0", "-1"].includes(String(rawWorkchain ?? defaultWorkchain)) || ![0, -1].includes(workchain))
    throw new ProviderError("Invalid workchain", 400);
  const rawShard = get("shard");
  const shard = rawShard == null ? undefined : String(rawShard).toLowerCase();
  if (shard !== undefined && (!/^[a-f0-9]{16}$/.test(shard) || /^0+$/.test(shard)))
    throw new ProviderError("Invalid shard", 400);
  if (workchain === -1 && shard && shard !== "8000000000000000")
    throw new ProviderError("Invalid masterchain shard", 400);
  return { workchain, ...(shard ? { shard } : {}) };
}

module.exports = { blockSelection, tonSite };
