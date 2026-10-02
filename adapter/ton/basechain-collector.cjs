"use strict";
const path = require("node:path");
const ROOT_SHARD = "8000000000000000";

class BasechainCollector {
  constructor(master, Collector) {
    this.master = master;
    this.Collector = Collector;
    this.shards = new Map();
    this.active = [];
    this.lastError = null;
    this.stopped = false;
  }
  selectedShard(shard) {
    if (shard !== undefined && shard !== null && shard !== "") return String(shard).toLowerCase();
    return this.active.includes(ROOT_SHARD) ? ROOT_SHARD : this.active[0] || ROOT_SHARD;
  }
  acceptMaster(header) {
    if (this.stopped || !Array.isArray(header?.shard_refs)) return;
    const refs = header.shard_refs.filter(ref => String(ref.workchain_id) === "0");
    if (!refs.length || refs.length > 1024 || refs.some(ref => !/^[a-f0-9]{16}$/.test(ref.shard) || !/^\d+$/.test(String(ref.seqno)))) {
      this.lastError = "Invalid active basechain shards";
      return;
    }
    this.active = [...new Set(refs.map(ref => ref.shard))].sort();
    this.lastError = null;
    for (const [shard, state] of this.shards) {
      if (!this.active.includes(shard) && state.active) {
        state.active = false;
        state.collector.stopped = true;
        clearTimeout(state.collector.retry);
        // A cancelled retry is no longer scheduled work. Leaving its handle
        // here makes acceptHead suppress every event after this shard returns.
        state.collector.retry = null;
      }
    }
    for (const ref of refs) {
      let state = this.shards.get(ref.shard);
      if (!state) {
        state = {active: true, target: ref, collector: null, initializing: null};
        this.shards.set(ref.shard, state);
        const passive = {
          health: () => this.master.stream.health(), start: () => {}, stop: () => {},
        };
        const scopedIndex = {
          list: async options => {
            const target = state.target;
            const result = await this.master.index.list({...options, workchain: "0", shard: ref.shard, target});
            const exact = result.blocks.find(block => block.seqno === target.seqno);
            if (exact && (exact.root_hash !== target.root_hash || exact.file_hash !== target.file_hash)) throw new Error("Indexed shard tip disagrees with masterchain reference");
            return result;
          },
          health: () => this.master.index.health?.(),
        };
        state.collector = new this.Collector(this.master.provider, {
          workchain: 0, shard: ref.shard,
          file: path.join(path.dirname(this.master.file), `basechain-${ref.shard}.json`),
          now: this.master.now, index: scopedIndex,
          economics: {hydrate: headers => this.master.economics.hydrate(headers), health: () => this.master.economics.health?.()},
          streamFactory: () => passive,
          onUpdate: () => { if (!this.stopped && state.active) this.master.onUpdate(this.master.snapshot()); },
        });
        state.initializing = state.collector.restore().then(() => {
          if (this.stopped || !state.active || this.master.stopped) return;
          state.collector.target = Number(state.target.seqno);
          state.collector.streamState = this.master.streamState;
          return state.collector.start();
        }).catch(error => { state.collector.lastError = error.message; }).finally(() => {state.initializing = null;});
      } else {
        state.target = ref;
        if (!state.active) {
          state.active = true;
          state.collector.stopped = false;
          state.collector.reconcile = true;
          state.collector.reconcileGeneration++;
          state.collector.forceRecentRecovery = true;
          state.collector.historyGapReason = "shard-lineage-changed";
        }
        state.collector.streamState = this.master.streamState;
        state.collector.acceptHead(ref).catch(() => {});
      }
    }
  }
  setStreamStatus(health) {
    for (const state of this.shards.values()) if (state.active) state.collector.setStreamStatus(health);
  }
  availableShards() {
    return this.active.map(shard => {
      const state = this.shards.get(shard), data = state?.collector.dashboard();
      return {workchain: 0, shard, seqno: state?.target?.seqno || null, stale: !data || data.stale};
    });
  }
  cached(height, shard) {
    return this.shards.get(this.selectedShard(shard))?.collector.cached(height);
  }
  async refresh() {
    await Promise.all(this.active.map(shard => {
      const state = this.shards.get(shard);
      return state?.initializing || state?.collector.refresh().catch(() => {});
    }));
    return this.dashboard();
  }
  dashboard(shard) {
    const selected = this.selectedShard(shard), state = this.shards.get(selected);
    const data = state?.collector.dashboard() || {head: null, blocks: [], history: [], historyGaps: [], observedAt: null, stale: true};
    return {...data, workchain: 0, shard: selected, activeShards: this.availableShards(), masterchainHead: this.master.blocks[0] || null,
      stale: data.stale || !state?.active || !!this.lastError || this.master.dashboard({workchain: -1}).stale};
  }
  health() {
    return {activeShards: this.availableShards(), error: this.lastError,
      shards: this.active.map(shard => ({shard, ...this.shards.get(shard).collector.health()}))};
  }
  async stop() {
    this.stopped = true;
    for (const state of this.shards.values()) await state.collector.stop();
  }
}
module.exports = {BasechainCollector};
