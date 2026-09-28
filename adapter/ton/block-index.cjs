"use strict";

const { setTimeout: delay } = require("node:timers/promises");
const { parseExact } = require("./provider.cjs");

const MASTER_SHARD = "8000000000000000";
const MAX_ROWS = 64;

class BlockIndexError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = "BlockIndexError";
    this.code = code;
    this.status = status;
  }
}

function integer(value, signed = false) {
  const text = String(value);
  if (!(signed ? /^-?\d+$/ : /^\d+$/).test(text))
    throw new BlockIndexError("Invalid indexed block integer", 502);
  return BigInt(text).toString();
}

function hashHex(value) {
  if (typeof value !== "string")
    throw new BlockIndexError("Missing indexed block hash", 502);
  if (/^[a-f\d]{64}$/i.test(value)) return value.toLowerCase();
  if (!/^[A-Za-z\d+/_-]{43}=?$/.test(value))
    throw new BlockIndexError("Invalid indexed block hash", 502);
  const bytes = Buffer.from(value, "base64");
  if (bytes.length !== 32)
    throw new BlockIndexError("Invalid indexed block hash", 502);
  return bytes.toString("hex");
}

function blockRef(ref) {
  if (!ref || !/^[a-f\d]{16}$/i.test(ref.shard))
    throw new BlockIndexError("Invalid indexed block reference", 502);
  return `(${integer(ref.workchain, true)},${ref.shard.toLowerCase()},${integer(ref.seqno)})`;
}

function normalizeBlock(raw) {
  if (!raw || integer(raw.workchain, true) !== "-1" || raw.shard !== MASTER_SHARD)
    throw new BlockIndexError("Unexpected indexed block workchain", 502);
  const { workchain, tx_count, prev_blocks, ...fields } = raw;
  if (!Array.isArray(prev_blocks))
    throw new BlockIndexError("Missing indexed block references", 502);
  const block = {
    ...fields,
    workchain_id: integer(workchain, true),
    seqno: integer(raw.seqno),
    gen_utime: integer(raw.gen_utime),
    start_lt: integer(raw.start_lt),
    end_lt: integer(raw.end_lt),
    tx_quantity: integer(tx_count),
    prev_refs: prev_blocks.map(blockRef),
  };
  for (const key of ["root_hash", "file_hash", "rand_seed", "created_by"])
    block[key] = hashHex(raw[key]);
  // The index response contains headers, not a block's value_flow. In particular,
  // tx_count is never a fee estimate and absent fees must remain absent.
  return block;
}

function selectConsecutive(raw, afterBlock, limit) {
  const bySeqno = new Map();
  for (const row of raw) {
    const block = normalizeBlock(row);
    const old = bySeqno.get(block.seqno);
    if (old && old.root_hash !== block.root_hash)
      throw new BlockIndexError("Conflicting indexed block hashes", 502);
    bySeqno.set(block.seqno, block);
  }
  const ordered = [...bySeqno.values()].sort((a, b) =>
    BigInt(a.seqno) < BigInt(b.seqno) ? -1 : 1,
  );
  const after = afterBlock ? BigInt(afterBlock.seqno) : null;
  const candidates = after === null
    ? ordered.reverse()
    : ordered.filter((block) => BigInt(block.seqno) > after);
  const blocks = [];
  let expected = after === null ? null : after + 1n;
  let gap = null;
  for (const block of candidates) {
    if (blocks.length === limit) break;
    const seqno = BigInt(block.seqno);
    if (expected !== null && seqno !== expected) {
      gap = { expected: expected.toString(), received: block.seqno };
      break;
    }
    if (seqno > 0n && !block.prev_refs.includes(`(-1,${MASTER_SHARD},${seqno - 1n})`))
      throw new BlockIndexError("Invalid indexed masterchain predecessor", 502);
    blocks.push(block);
    expected = seqno + (after === null ? -1n : 1n);
  }
  return { blocks, gap, hasMore: !gap && blocks.length > 0 && (candidates.length > blocks.length || raw.length === MAX_ROWS) };
}

// Independent indexed-batch budget. This does not consume the TonAPI detail
// provider queue and never opens one request stream per browser.
class BlockIndex {
  constructor({
    url = "https://toncenter.com/api/v3/blocks",
    fetch: fetchImpl = globalThis.fetch,
    apiKey = process.env.TONCENTER_API_KEY,
    intervalMs = 1100,
    deadlineMs = 25000,
    requestTimeoutMs = 12000,
    maxBytes = 1024 * 1024,
  } = {}) {
    this.url = new URL(url);
    if (this.url.username || this.url.password || this.url.search || this.url.hash)
      throw new BlockIndexError("Invalid block index URL");
    this.fetchImpl = fetchImpl;
    this.headers = { accept: "application/json" };
    if (apiKey) {
      if (typeof apiKey !== "string" || apiKey.length > 512 || /[^\x21-\x7e]/.test(apiKey))
        throw new BlockIndexError("Invalid block index API key");
      this.headers["X-API-Key"] = apiKey;
    }
    this.intervalMs = Math.max(1000, Number(intervalMs) || 1100);
    this.deadlineMs = Math.min(30000, Math.max(1, Number(deadlineMs) || 25000));
    this.requestTimeoutMs = Math.min(15000, Math.max(1, Number(requestTimeoutMs) || 12000));
    this.maxBytes = Math.min(2 * 1024 * 1024, Math.max(1, Number(maxBytes) || 1024 * 1024));
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.abort = new AbortController();
    this.nextRequestAt = 0;
    this.requests = 0;
    this.lastSuccess = null;
    this.lastFailure = null;
    this.lastGap = null;
    this.stopped = false;
  }

  list({ afterBlock, limit = 32 } = {}) {
    if (this.stopped) return Promise.reject(new BlockIndexError("Block index stopped"));
    limit = Math.max(1, Math.min(MAX_ROWS, Math.floor(Number(limit) || 32)));
    const url = new URL(this.url);
    url.searchParams.set("workchain", "-1");
    url.searchParams.set("shard", MASTER_SHARD);
    url.searchParams.set("limit", String(MAX_ROWS));
    url.searchParams.set("sort", afterBlock ? "asc" : "desc");
    if (afterBlock) {
      const seqno = integer(afterBlock.seqno);
      const utime = BigInt(integer(afterBlock.gen_utime));
      afterBlock = { seqno, gen_utime: utime.toString() };
      // Official v3 sorting is by gen_utime. Several masterchain blocks share
      // one second: overlap it, then enforce exact seqno continuity locally.
      // Do not assume an undocumented relationship between block end/start LT.
      url.searchParams.set("start_utime", (utime > 0n ? utime - 1n : 0n).toString());
    }
    const key = `${url.href}:${afterBlock?.seqno || "latest"}:${limit}`;
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.pending.size >= 16) return Promise.reject(new BlockIndexError("Block index busy"));
    const deadline = Date.now() + this.deadlineMs;
    const task = this.queue.then(async () => {
      const result = await this.request(url, deadline);
      const selected = selectConsecutive(result.data.blocks, afterBlock, limit);
      this.lastGap = selected.gap;
      this.lastSuccess = result.at;
      this.lastFailure = null;
      return { ...selected, at: result.at, provider: this.url.origin, stale: false };
    }).catch((error) => {
      const safe = error instanceof BlockIndexError ? error : new BlockIndexError(
        this.stopped ? "Block index stopped" : "Block index request failed",
      );
      this.lastFailure = { at: Date.now(), message: safe.message, status: safe.status };
      throw safe;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    this.queue = task.catch(() => undefined);
    return task;
  }

  async request(url, deadline) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.stopped) throw new BlockIndexError("Block index stopped");
      const wait = Math.max(0, this.nextRequestAt - Date.now());
      if (Date.now() + wait >= deadline) throw new BlockIndexError("Block index deadline exceeded");
      if (wait) await delay(wait, undefined, { signal: this.abort.signal });
      if (this.stopped) throw new BlockIndexError("Block index stopped");
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new BlockIndexError("Block index deadline exceeded");
      this.nextRequestAt = Date.now() + this.intervalMs;
      const controller = new AbortController();
      const onStop = () => controller.abort();
      this.abort.signal.addEventListener("abort", onStop, { once: true });
      const timer = setTimeout(() => controller.abort(), Math.min(remaining, this.requestTimeoutMs));
      try {
        this.requests++;
        const response = await this.fetchImpl(url, {
          headers: this.headers,
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok) {
          const retryAfter = response.headers.get("retry-after");
          if (response.status === 429 && retryAfter && retryAfter.length <= 128) {
            const seconds = /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) : null;
            const retryAt = seconds === null ? Date.parse(retryAfter) : Date.now() + seconds * 1000;
            if (Number.isFinite(retryAt)) this.nextRequestAt = Math.max(this.nextRequestAt, retryAt);
          }
          await response.body?.cancel();
          const error = new BlockIndexError(`Block index HTTP ${response.status}`, response.status);
          error.retryable = response.status === 429 || response.status >= 500;
          throw error;
        }
        const length = response.headers.get("content-length");
        if (length && length.length <= 128 && Number(length) > this.maxBytes) {
          await response.body?.cancel();
          throw new BlockIndexError("Block index response too large", 502);
        }
        if (!response.body) throw new BlockIndexError("Empty block index response", 502);
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > this.maxBytes) {
            await reader.cancel();
            throw new BlockIndexError("Block index response too large", 502);
          }
          chunks.push(value);
        }
        let data;
        try { data = parseExact(Buffer.concat(chunks).toString("utf8")); }
        catch { throw new BlockIndexError("Invalid block index JSON", 502); }
        if (!Array.isArray(data?.blocks) || data.blocks.length > MAX_ROWS)
          throw new BlockIndexError("Invalid block index response", 502);
        return { data, at: Date.now() };
      } catch (error) {
        if (this.stopped) throw new BlockIndexError("Block index stopped");
        const retryable = !(error instanceof BlockIndexError) || error.retryable;
        if (!retryable || attempt === 2) throw error;
        this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + 1000 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
        this.abort.signal.removeEventListener("abort", onStop);
      }
    }
  }

  health() {
    return {
      provider: this.url.origin,
      transport: "indexed-batches",
      requests: this.requests,
      pending: this.pending.size,
      lastSuccess: this.lastSuccess,
      lastFailure: this.lastFailure,
      gap: this.lastGap,
      nextRequestAt: this.nextRequestAt,
      stopped: this.stopped,
    };
  }

  stop() {
    this.stopped = true;
    this.abort.abort();
  }
}

module.exports = { BlockIndex, BlockIndexError };
