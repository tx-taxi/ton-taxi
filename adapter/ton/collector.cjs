"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const HISTORY_LIMIT = 2048;
const RECOVERY_WINDOW = 64;
const HISTORY_GAP_LIMIT = 32;
const blockId = (b) => `(${b.workchain_id},${b.shard},${b.seqno})`;
const canonicalBlock = (id) =>
  /^\d+$/.test(id) ? `(-1,8000000000000000,${id})` : id;
function normalize(b) {
  return {
    id: blockId(b),
    height: Number(b.seqno),
    timestamp: Number(b.gen_utime),
    version: Number(b.version),
    tx_count: Number(b.tx_quantity),
    size: 0,
    weight: 0,
    bits: 0,
    nonce: 0,
    difficulty: 0,
    merkle_root: b.root_hash,
    previousblockhash: b.prev_refs?.[0] || "",
    extras: {
      totalFees: b.value_flow?.fees_collected?.grams ?? null,
      reward: b.value_flow?.created?.grams ?? null,
      medianFee: null,
      minFee: null,
      maxFee: null,
      feeRange: [],
      pool: null,
    },
    ton: b,
  };
}
// Transport and header ingestion have separate lifetimes: a connected socket
// does not make an unfilled block window fresh.
class Collector {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.workchain = String(options.workchain ?? -1);
    this.shard = options.shard || "8000000000000000";
    this.forceRecentRecovery = false;
    this.index = options.index || new (require("./block-index.cjs").BlockIndex)();
    this.economics = options.economics || new (require("./block-economics.cjs").BlockEconomics)();
    this.now = options.now || Date.now;
    this.onUpdate = options.onUpdate || (() => {});
    this.file = options.file || path.join(process.env.TON_DATA_DIR || path.join(require("node:os").tmpdir(), "tx-taxi-ton-data"), "observed.json");
    this.blocks = [];
    this.history = [];
    this.historyGaps = [];
    this.observedAt = null;
    this.target = 0;
    this.running = null;
    this.stopped = true;
    this.streamState = "disconnected";
    this.lastError = null;
    this.failures = 0;
    this.reconcile = false;
    this.reconcileGeneration = 0;
    const makeStream = options.streamFactory || (callbacks => new (require("./block-stream.cjs").BlockStream)(callbacks));
    this.stream = makeStream({
      onHead: event => { this.acceptHead(event).catch(() => {}); },
      onStatus: health => this.setStreamStatus(health),
    });
    if (options.basechain) this.basechain = new (require("./basechain-collector.cjs").BasechainCollector)(this, Collector);
  }
  async restore() {
    try {
      const saved = JSON.parse(await fs.readFile(this.file, "utf8"));
      // Legacy sampled heads are not a recoverable cursor. Bootstrap a complete
      // recent window once, rather than treating those holes as observed blocks.
      if (saved.schemaVersion !== 2 || !saved.blocks?.length) return;
      const blocks = this.ordered(saved.blocks).reverse();
      if (Number(saved.cursor) !== Number(blocks[0].seqno)) return;
      for (const block of blocks) this.assertEconomics(block);
      this.blocks = blocks.slice(0, 128);
      this.history = Array.isArray(saved.history) ? saved.history.slice(-HISTORY_LIMIT) : [];
      this.historyGaps = Array.isArray(saved.historyGaps) ? saved.historyGaps.slice(-HISTORY_GAP_LIMIT).filter(gap =>
        Number.isSafeInteger(Number(gap?.fromSeqno)) && Number(gap.fromSeqno) > 0 &&
        Number.isSafeInteger(Number(gap?.toSeqno)) && Number(gap.toSeqno) >= Number(gap.fromSeqno) &&
        ["retention-window-exceeded", "shard-lineage-changed"].includes(gap.reason) && typeof gap.observedAt === "string" && Number.isFinite(Date.parse(gap.observedAt))
      ).map(({fromSeqno, toSeqno, observedAt, reason}) => ({fromSeqno: String(fromSeqno), toSeqno: String(toSeqno), observedAt, reason})) : [];
      this.observedAt = saved.observedAt || null;
      this.target = Number(blocks[0].seqno);
      this.reconcile = true;
    } catch { /* A missing/invalid cache requires a new complete window. */ }
  }
  start() {
    if (!this.stopped) return this.refresh();
    this.stopped = false;
    this.stream.start();
    return this.refresh();
  }
  setStreamStatus(health) {
    const previous = this.streamState;
    this.streamState = health.state;
    this.basechain?.setStreamStatus(health);
    if (health.state === "live" && previous !== "live" && this.blocks.length) {
      this.reconcile = true;
      this.reconcileGeneration++;
    }
    if (previous !== health.state && !this.stopped) this.onUpdate(this.snapshot());
  }
  acceptHead(event) {
    const seqno = Number(event.seqno);
    if (Number.isSafeInteger(seqno) && seqno > 0) this.target = Math.max(this.target, seqno);
    if (this.failures && this.retry) return this.running || Promise.resolve(this.dashboard());
    return this.refresh();
  }
  needsWork() {
    return !this.blocks.length || this.reconcile || this.forceRecentRecovery || Number(this.blocks[0].seqno) < this.target;
  }
  refresh() {
    if (this.stopped) return Promise.resolve(this.dashboard());
    if (this.running) return this.running;
    if (!this.needsWork()) return Promise.resolve(this.dashboard());
    clearTimeout(this.retry);
    this.retry = null;
    this.running = this.collect().finally(() => {
      this.running = null;
      // This is recovery for an announced target (including indexer lag), not
      // periodic head polling. Idle connections make no header requests.
      if (!this.stopped && this.needsWork()) {
        this.retry = setTimeout(() => this.refresh().catch(() => {}), Math.min(15000, 1000 * 2 ** Math.min(this.failures, 4)));
        this.retry.unref?.();
      }
    });
    return this.running;
  }
  ordered(input) {
    const byHeight = new Map();
    for (const block of input) {
      const height = Number(block.seqno);
      if (!Number.isSafeInteger(height) || height <= 0 || String(block.workchain_id) !== this.workchain || block.shard !== this.shard || !/^[a-f0-9]{64}$/.test(block.root_hash || "")) throw new Error("Invalid block lineage");
      const previous = byHeight.get(height);
      if (previous && previous.root_hash !== block.root_hash) throw new Error("Conflicting masterchain headers");
      byHeight.set(height, block);
    }
    const blocks = [...byHeight.values()].sort((a,b) => Number(a.seqno) - Number(b.seqno));
    for (let i = 1; i < blocks.length; i++) {
      if (Number(blocks[i].seqno) !== Number(blocks[i-1].seqno) + 1) throw new Error("Missing masterchain header");
      const refs = blocks[i].prev_refs;
      if (refs?.length && !refs.includes(blockId(blocks[i-1]))) throw new Error("Conflicting masterchain predecessor");
    }
    return blocks;
  }
  assertEconomics(block) {
    for (const kind of ["fees_collected", "created"]) {
      const grams = block.value_flow?.[kind]?.grams;
      if (typeof grams !== "string" || !/^\d+$/.test(grams)) throw new Error("Block economics unavailable");
    }
  }
  async commit(incoming, reconcileGeneration, recentRecovery = false, lineageBoundary = false) {
    const prior = Number(this.blocks[0]?.seqno || 0);
    if (!incoming.length || Number(incoming.at(-1).seqno) < prior) return;
    // Only a verified recent-window recovery may detach the retained header
    // window from its old cursor. Historical observations are never filled in.
    const detached = recentRecovery && Number(incoming[0].seqno) > prior + 1;
    const merged = new Map((detached ? [] : this.blocks).map(b => [Number(b.seqno), b]));
    for (const block of incoming) { this.assertEconomics(block); merged.set(Number(block.seqno), block); }
    const blocks = this.ordered([...merged.values()]).reverse().slice(0, 128);
    const observedAt = new Date(this.now()).toISOString();
    const historyGaps = detached ? [...this.historyGaps, {
      fromSeqno: String(prior + 1), toSeqno: String(Number(incoming[0].seqno) - 1),
      reason: lineageBoundary ? "shard-lineage-changed" : "retention-window-exceeded", observedAt,
    }].slice(-HISTORY_GAP_LIMIT) : this.historyGaps;
    const samples = new Map(this.history.map(b => [Number(b.seqno), b]));
    for (const block of incoming) samples.set(Number(block.seqno), {
      seqno: block.seqno, timestamp: block.gen_utime, transactions: block.tx_quantity,
      fees: block.value_flow.fees_collected.grams, observedAt,
    });
    const history = [...samples.values()].sort((a,b) => Number(a.seqno) - Number(b.seqno)).slice(-HISTORY_LIMIT);
    await fs.mkdir(path.dirname(this.file), {recursive: true});
    await fs.writeFile(this.file + ".tmp", JSON.stringify({schemaVersion: 2, cursor: blocks[0].seqno, blocks, history, historyGaps, observedAt}));
    await fs.rename(this.file + ".tmp", this.file);
    if (this.stopped) return;
    this.blocks = blocks;
    this.history = history;
    this.historyGaps = historyGaps;
    this.observedAt = observedAt;
    this.lastError = null;
    this.failures = 0;
    this.forceRecentRecovery = false;
    this.basechain?.acceptMaster(this.blocks[0]);
    if (reconcileGeneration === this.reconcileGeneration) this.reconcile = false;
    this.onUpdate(this.snapshot());
  }
  async collect() {
    try {
      while (!this.stopped && this.needsWork()) {
        const head = this.blocks[0];
        const reconcileGeneration = this.reconcileGeneration;
        // Replaying more than the entire retained history only delays the live
        // strip while decoding headers that will immediately be evicted. Fetch
        // one complete recent indexed batch, then resume ordinary range repair.
        let recentRecovery = !!head && (this.forceRecentRecovery || this.target - Number(head.seqno) > HISTORY_LIMIT);
        // Re-read the cursor itself after reconnect, so a same-height canonical
        // replacement is not hidden by a height-only deduplication rule.
        const afterBlock = recentRecovery ? undefined : this.reconcile ? this.blocks[1] : head;
        const result = await this.index.list({afterBlock, limit: recentRecovery ? RECOVERY_WINDOW : head ? 32 : 16});
        if (this.stopped) break;
        if (result.gap && !result.blocks?.length) throw new Error("Missing masterchain header");
        if (result.lineageBoundary) recentRecovery = true;
        let incoming = this.ordered(result.blocks || []);
        if (recentRecovery && (result.gap || (!incoming.length || incoming.length !== RECOVERY_WINDOW && !(this.workchain === "0" && (incoming[0].after_split || incoming[0].after_merge))) || incoming.some((block, i) => i > 0 && !block.prev_refs?.includes(blockId(incoming[i - 1]))))) throw new Error("Incomplete recent masterchain window");
        if (head) incoming = incoming.filter(b => Number(b.seqno) >= Number(head.seqno));
        if (!incoming.length) break;
        if (head && !recentRecovery && Number(incoming[0].seqno) > Number(head.seqno) + 1) throw new Error("Missing masterchain predecessor");
        const hasReplacement = head && incoming.some(b => Number(b.seqno) === Number(head.seqno) && b.root_hash !== head.root_hash);
        if (head && !hasReplacement) incoming = incoming.filter(b => Number(b.seqno) > Number(head.seqno));
        if (!incoming.length) {
          if (reconcileGeneration === this.reconcileGeneration) this.reconcile = false;
          this.lastError = null;
          this.failures = 0;
          this.forceRecentRecovery = false;
          this.basechain?.acceptMaster(this.blocks[0]);
          this.onUpdate(this.snapshot());
          break;
        }
        const complete = this.ordered(await this.economics.hydrate(incoming));
        if (complete.length !== incoming.length || complete.some((b,i) => b.root_hash !== incoming[i].root_hash || b.seqno !== incoming[i].seqno)) throw new Error("Incomplete masterchain economics");
        if (this.stopped) break;
        await this.commit(complete, reconcileGeneration, recentRecovery, result.lineageBoundary === true || this.historyGapReason === "shard-lineage-changed");
        this.historyGapReason = null;
        // A reported hole stops here; the next attempt resumes from the last
        // committed cursor. Neither a newer event nor a visitor can skip it.
        if (result.gap) throw new Error("Missing masterchain header");
      }
    } catch (error) {
      this.lastError = error.message || "Block source unavailable";
      this.failures++;
      this.onUpdate(this.snapshot());
      if (!this.blocks.length) throw error;
    }
    return this.dashboard();
  }
  cached(height) {
    return this.blocks.find(block => Number(block.seqno) === Number(height));
  }
  health() {
    return {stream: this.stream.health(), index: this.index.health?.(), economics: this.economics.health?.(), cursor: this.blocks[0]?.seqno || null, target: this.target || null, pendingBlocks: Math.max(0, this.target - Number(this.blocks[0]?.seqno || this.target)), historyGaps: this.historyGaps, error: this.lastError, ...(this.basechain ? {basechain: this.basechain.health()} : {})};
  }
  dashboard(selection) {
    if (this.basechain && String(selection?.workchain ?? 0) === "0") return this.basechain.dashboard(selection?.shard);
    return {
      workchain: Number(this.workchain), shard: this.shard,
      ...(this.basechain ? {activeShards: this.basechain.availableShards(), masterchainHead: this.blocks[0] || null} : {}),
      head: this.blocks[0] || null,
      blocks: this.blocks.slice(0, 32).map(normalize),
      history: this.history,
      historyGaps: this.historyGaps,
      observedAt: this.observedAt,
      stale: this.reconcile || this.streamState !== "live" || !!this.lastError || !this.observedAt || this.now() - Date.parse(this.observedAt) > 45000 || this.now() - Number(this.blocks[0]?.gen_utime || 0) * 1000 > 45000 || this.target - Number(this.blocks[0]?.seqno || 0) > 32,
    };
  }
  snapshot(selection) {
    const d = this.dashboard(selection);
    return {
      blocks: d.blocks,
      "mempool-blocks": [],
      mempoolInfo: {loaded: true, size: 0, bytes: 0, usage: 0, maxmempool: 0},
      vBytesPerSecond: 0, transactions: [], loadingIndicators: {},
      // Charts read bounded history via /dashboard. Live fanout needs only one
      // block window and freshness, not another copy of every historical sample.
      ton: {observedAt: d.observedAt, stale: d.stale, historyGaps: d.historyGaps, workchain: d.workchain, shard: d.shard, activeShards: d.activeShards, masterchainHead: d.masterchainHead},
      backendInfo: {chain: "ton"},
    };
  }
  async stop() {
    this.stopped = true;
    await this.basechain?.stop();
    clearTimeout(this.retry);
    this.stream.stop();
    this.index.stop?.();
    await this.economics.stop?.();
  }
}
module.exports = { Collector, normalize, blockId, canonicalBlock };
