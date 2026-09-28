"use strict";

const { ProviderError } = require("./provider.cjs");
const { normalize } = require("./collector.cjs");
const { ContextHeaders } = require("./context-headers.cjs");

const contexts = new WeakMap();
const headerSources = new WeakMap();
const MAX_SIDE = 7;
const DEADLINE_MS = 20000;

function blockIdentity(value) {
  const text = String(value || "");
  const canonical = /^\d+$/.test(text) ? `(-1,8000000000000000,${text})` : text;
  const match = /^\((-?\d+),([a-f\d]{16}),(\d+)\)$/i.exec(canonical);
  if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < -2147483648
      || Number(match[1]) > 2147483647 || BigInt(match[3]) > 4294967295n)
    throw new ProviderError("Invalid block identifier", 400);
  const workchain = Number(match[1]), shard = match[2].toLowerCase(), seqno = Number(match[3]);
  if (workchain === -1 && shard !== "8000000000000000") throw new ProviderError("Invalid masterchain shard", 400);
  return { id: `(${workchain},${shard},${seqno})`, workchain, shard, seqno };
}

function headerIdentity(header) {
  return blockIdentity(`(${header.workchain_id},${header.shard},${header.seqno})`);
}

function observedChain(collector, identity) {
  if (identity.workchain === -1) return {head: collector.blocks?.[0], observedAt: collector.observedAt};
  if (identity.workchain === 0) return collector.basechain?.dashboard(identity.shard) || {};
  return {};
}

function cachedHeader(collector, identity) {
  const cached = identity.workchain === -1 ? collector.cached?.(identity.seqno)
    : identity.workchain === 0 ? collector.basechain?.cached(identity.seqno, identity.shard) : null;
  return cached && headerIdentity(cached).id === identity.id ? cached : null;
}

function sideLimit(value, fallback) {
  if (value == null) return fallback;
  if (!/^\d+$/.test(String(value))) throw new ProviderError("Invalid context window", 400);
  return Math.min(MAX_SIDE, Number(value));
}

function strip(header) {
  const result = normalize(header);
  // Missing measurements remain unknown; a placeholder is never a zero-fee or
  // zero-transaction block. All values here come from the selected header.
  result.tx_count = /^\d+$/.test(String(header.tx_quantity)) ? Number(header.tx_quantity) : null;
  return result;
}

async function requestHeader(provider, route) {
  const deadline = provider.context?.getStore()?.deadline;
  if (!Number.isFinite(deadline)) return provider.request(route, 86400000);
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ProviderError("Block context timed out", 503);
  let timer;
  try {
    // A shared Provider request may have started with a longer deadline. Bound
    // this caller's wait without canceling work another caller still needs.
    // Promise.race also observes a later rejection from that shared request.
    return await Promise.race([
      provider.request(route, 86400000),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new ProviderError("Block context timed out", 503)), remaining);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

async function readHeader(provider, collector, requestedId, preferCollector = true, supplied = null) {
  const expected = blockIdentity(requestedId);
  let header;
  if (preferCollector) {
    const cached = cachedHeader(collector, expected);
    if (cached) {
      header = { ...cached, _meta: { observedAt: observedChain(collector, expected).observedAt, stale: false, provider: "verified-block-stream" } };
    }
  }
  if (!header && supplied?.has(expected.id)) header = supplied.get(expected.id);
  if (!header) {
    const response = await requestHeader(provider, "/v2/blockchain/blocks/" + encodeURIComponent(expected.id));
    header = { ...response.data, _meta: { observedAt: new Date(response.at).toISOString(), stale: response.stale, provider: response.provider } };
  }
  if (headerIdentity(header).id !== expected.id || !/^\d+$/.test(String(header.gen_utime)))
    throw new ProviderError("Block header does not match requested identity", 502);
  return header;
}

function predecessorIds(header) {
  if (!Array.isArray(header.prev_refs)) throw new ProviderError("Block predecessor references unavailable", 502);
  return header.prev_refs.map(value => blockIdentity(value).id);
}

async function assembleContext(provider, collector, requestedId, olderCount, newerCount, supplied) {
  const read = id => readHeader(provider, collector, id, true, supplied);
  const target = await read(requestedId);
  const targetId = headerIdentity(target).id;
  const olderHeaders = [], newerHeaders = [];
  const older = { status: "complete", refs: [] }, newer = { status: "complete", refs: [] };
  const unavailable = (side, reason) => { side.status = "unavailable"; side.reason = reason; };
  const boundary = (side, reason, refs = []) => { side.status = "boundary"; side.reason = reason; side.refs = refs; };
  const walkOlder = async () => {
    let current = target;
    for (let i = 0; i < olderCount; i++) {
      try {
        const currentId = headerIdentity(current);
        const refs = predecessorIds(current);
        if (refs.length > 1) { boundary(older, "merge", refs); break; }
        if (!refs.length) {
          if (currentId.seqno === 0) boundary(older, "genesis");
          else unavailable(older, "missing-predecessor");
          break;
        }
        const parentId = blockIdentity(refs[0]);
        if (parentId.workchain !== currentId.workchain || parentId.seqno >= currentId.seqno)
          throw new ProviderError("Invalid predecessor relationship", 502);
        const parent = await read(parentId.id);
        const proof = current._prev_blocks?.find(block => headerIdentity(block).id === parentId.id);
        if (proof && (proof.root_hash !== parent.root_hash || proof.file_hash !== parent.file_hash))
          throw new ProviderError("Predecessor hash mismatch", 502);
        olderHeaders.push(parent);
        current = parent;
      } catch { unavailable(older, "predecessor-unavailable"); break; }
    }
  };
  const walkNewer = async () => {
    let current = target;
    for (let i = 0; i < newerCount; i++) {
      try {
        const currentId = headerIdentity(current);
        if (current.before_split === true) { boundary(newer, "split"); break; }
        const observedHead = observedChain(collector, currentId).head;
        if (observedHead && headerIdentity(observedHead).id === currentId.id) { boundary(newer, "observed-tip"); break; }
        // A numerical candidate is not adjacency evidence. Shard IDs can change
        // at splits/merges. Include a candidate only after its header proves an
        // edge back to the exact current tuple; never substitute master_ref.
        const candidateId = blockIdentity(`(${currentId.workchain},${currentId.shard},${currentId.seqno + 1})`).id;
        const next = await read(candidateId);
        if (!predecessorIds(next).includes(currentId.id)) { unavailable(newer, "successor-not-linked"); break; }
        const proof = next._prev_blocks?.find(block => headerIdentity(block).id === currentId.id);
        if (proof && (proof.root_hash !== current.root_hash || proof.file_hash !== current.file_hash))
          throw new ProviderError("Successor predecessor hash mismatch", 502);
        newerHeaders.push(next);
        current = next;
      } catch { unavailable(newer, "successor-unavailable"); break; }
    }
  };
  // Walk only verified links through the acquired candidates. Split/merge
  // branches remain explicit; speculative numerical candidates are never UI.
  await Promise.all([walkOlder(), walkNewer()]);
  const headers = [...newerHeaders.reverse(), target, ...olderHeaders];
  return { targetId, targetIndex: newerHeaders.length, blocks: headers.map(strip), older, newer,
    requested: { older: olderCount, newer: newerCount },
    _meta: { partial: older.status === "unavailable" || newer.status === "unavailable",
      stale: headers.some(header => header._meta?.stale === true),
      observedAt: headers.map(header => header._meta?.observedAt).filter(Boolean).sort().at(-1) || null } };
}

async function buildContext(provider, collector, requestedId, olderCount, newerCount, source) {
  if (!source) return assembleContext(provider, collector, requestedId, olderCount, newerCount, null);
  const target = blockIdentity(requestedId), candidates = [];
  const observedHeader = observedChain(collector, target).head;
  const observedHead = observedHeader && headerIdentity(observedHeader).workchain === target.workchain
    && headerIdentity(observedHeader).shard === target.shard ? Number(observedHeader.seqno) : null;
  const add = seqno => {
    if (seqno < 0 || seqno > 4294967295) return;
    const id = `(${target.workchain},${target.shard},${seqno})`;
    if (cachedHeader(collector, blockIdentity(id))) return;
    if (Number.isSafeInteger(observedHead) && seqno > observedHead && target.seqno <= observedHead) return;
    candidates.push(id);
  };
  add(target.seqno);
  for (let distance = 1; distance <= Math.max(olderCount, newerCount); distance++) {
    if (distance <= olderCount) add(target.seqno - distance);
    if (distance <= newerCount) add(target.seqno + distance);
  }
  if (!candidates.length) return assembleContext(provider, collector, requestedId, olderCount, newerCount, null);
  const deadline = provider.context?.getStore()?.deadline || Date.now() + DEADLINE_MS;
  const liteDeadline = Math.min(deadline, Date.now() + 6500);
  let supplied = new Map(), timer;
  try {
    supplied = await Promise.race([
      source.getMany(candidates, liteDeadline, { targetId: requestedId }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Context acquisition deadline")), Math.max(0, liteDeadline - Date.now())); }),
    ]);
  } catch { supplied = source.cached?.(candidates) || new Map(); }
  finally { clearTimeout(timer); }
  // Do not recreate the old 20-second per-header waterfall when the fast source
  // misses an edge. Existing data survives a short, rate-limited REST fallback.
  const fallbackDeadline = Math.min(deadline, Date.now() + 2000);
  const run = () => assembleContext(provider, collector, requestedId, olderCount, newerCount, supplied);
  return provider.context ? provider.context.run({ deadline: fallbackDeadline }, run) : run();
}

function blockContext(provider, collector, id, query, options = {}) {
  const canonical = blockIdentity(id).id;
  const older = sideLimit(query.get("older"), 4), newer = sideLimit(query.get("newer"), 3);
  let cache = contexts.get(provider);
  if (!cache) { cache = new Map(); contexts.set(provider, cache); }
  const key = `${canonical}:${older}:${newer}`;
  const previous = cache.get(key);
  if (previous && (previous.pending || previous.expires > Date.now())) return previous.promise;
  if (cache.size >= 128 && !cache.has(key)) {
    const removable = [...cache].find(([, value]) => !value.pending);
    if (!removable) throw new ProviderError("Block context service busy", 503);
    cache.delete(removable[0]);
  }
  const entry = { pending: true, expires: 0, promise: null };
  const deadline = Math.min(provider.context?.getStore()?.deadline || Infinity, Date.now() + DEADLINE_MS);
  let source = options.headers;
  if (source === undefined) {
    source = headerSources.get(provider);
    if (!source) { source = new ContextHeaders(); headerSources.set(provider, source); }
  }
  const run = () => buildContext(provider, collector, canonical, older, newer, source);
  entry.promise = (provider.context ? provider.context.run({ deadline }, run) : run()).then(result => {
    entry.pending = false;
    // A resolved historical window is immutable. An observed tip, split, or
    // unavailable edge is short-lived so a later request can discover progress.
    entry.expires = Date.now() + (result.older.status === "complete" && result.newer.status === "complete" ? 300000 : 1000);
    return result;
  }, error => { cache.delete(key); throw error; });
  cache.set(key, entry);
  while (cache.size > 128) {
    const removable = [...cache].find(([cachedKey, value]) => cachedKey !== key && !value.pending);
    if (!removable) break;
    cache.delete(removable[0]);
  }
  return entry.promise;
}

module.exports = { blockContext, blockIdentity, readHeader };
