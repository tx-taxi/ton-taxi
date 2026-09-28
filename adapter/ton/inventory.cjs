"use strict";
const { randomBytes } = require("node:crypto");
const { ProviderError } = require("./provider.cjs");
const snapshots = new Map(),
  pending = new Map();
const MAX_AGE = 15 * 60 * 1000;
async function inventory(provider, path, q, field = "nft_items", pageSize) {
  // Collection item listing has a lower anonymous limit than wallet inventories.
  const PAGE = pageSize || (path.startsWith("/v2/nfts/collections/") ? 100 : 1000);
  const limit = Math.min(100, Math.max(1, Number(q.get("limit")) || 24)),
    offset = Number(q.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new ProviderError("Invalid pagination", 400);
  const identity = path + "#" + field;
  const requested = q.get("snapshot");
  let snap = requested && snapshots.get(requested);
  if (
    requested &&
    (!snap || snap.identity !== identity || Date.now() - snap.created > MAX_AGE)
  )
    throw new ProviderError("Inventory expired. Refresh to continue.", 410);
  if (!snap) {
    snap = {
      id: randomBytes(16).toString("hex"),
      identity,
      created: Date.now(),
      provider: null,
      chunks: new Map(),
      total: null,
    };
    snapshots.set(snap.id, snap);
    while (snapshots.size > 64) snapshots.delete(snapshots.keys().next().value);
  }
  async function chunk(start) {
    if (snap.chunks.has(start)) return snap.chunks.get(start);
    const key = snap.id + ":" + start;
    if (pending.has(key)) return pending.get(key);
    const job = (async () => {
      const url = new URL(path, "https://tonapi.io");
      url.searchParams.set("limit", PAGE);
      url.searchParams.set("offset", start);
      const result = await provider.request(
        url.pathname + url.search,
        30000,
        snap.provider || undefined,
      );
      if (result.stale) throw new ProviderError("Temporarily unavailable");
      snap.provider = result.provider;
      snap.chunks.set(start, result);
      if (result.data[field].length < PAGE)
        snap.total = start + result.data[field].length;
      while (snap.chunks.size > 2)
        snap.chunks.delete(snap.chunks.keys().next().value);
      let bytes = 0;
      for (const state of snapshots.values())
        for (const entry of state.chunks.values()) bytes += entry.bytes || 0;
      while (bytes > 64 * 1024 * 1024 && snapshots.size > 1) {
        const oldest = snapshots.keys().next().value;
        for (const entry of snapshots.get(oldest).chunks.values())
          bytes -= entry.bytes || 0;
        snapshots.delete(oldest);
      }
      return result;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  }
  const firstStart = Math.floor(offset / PAGE) * PAGE;
  const first = await chunk(firstStart);
  let items = first.data[field].slice(
    offset - firstStart,
    offset - firstStart + limit,
  );
  if (items.length < limit && first.data[field].length === PAGE) {
    const next = await chunk(firstStart + PAGE);
    items.push(...next.data[field].slice(0, limit - items.length));
  }
  const nextOffset = offset + items.length,
    hasMore = snap.total === null || nextOffset < snap.total;
  const groups = new Map();
  if (field === "nft_items")
    for (const chunk of snap.chunks.values())
      for (const item of chunk.data[field])
        if (item.collection?.address) {
          const id = item.collection.address;
          const group = groups.get(id) || {
            address: id,
            name: item.collection.name || "",
            count: 0,
          };
          group.count++;
          groups.set(id, group);
        }
  return {
    ...first.data,
    [field]: items,
    ...(field === "nft_items"
      ? {
          collections: [...groups.values()],
          collectionsComplete: snap.total !== null && snap.total <= PAGE,
        }
      : {}),
    _meta: {
      observedAt: new Date(first.at).toISOString(),
      stale: false,
      provider: snap.provider,
    },
    _paging: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
      snapshot: snap.id,
      total: snap.total,
    },
  };
}
module.exports = { inventory };
