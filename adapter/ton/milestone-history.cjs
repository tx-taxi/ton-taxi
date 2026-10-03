"use strict";
const { ProviderError, parseExact } = require('./provider.cjs');
const { normalizeBlock } = require('./block-index.cjs');
const { normalize } = require('./collector.cjs');
const { setTimeout: delay } = require('node:timers/promises');

// One milestone is the first exact shard block to reach its sequence number.
class MilestoneHistory {
  constructor(provider, { fetcher = fetch } = {}) {
    this.provider = provider;
    this.fetcher = fetcher;
    this.cache = new Map();
    this.indexQueue = Promise.resolve();
    this.indexPending = 0;
    this.nextIndexAt = 0;
  }
  async get(height, workchain = 0) {
    if (!Number.isSafeInteger(height) || height < 1 || height > 4294967295 || ![0, -1].includes(workchain))
      throw new ProviderError('Invalid milestone', 400);
    const key = `${workchain}:${height}`;
    if (!this.cache.has(key)) {
      if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value);
      const pending = this.read(height, workchain).catch(error => { this.cache.delete(key); throw error; });
      this.cache.set(key, pending);
    }
    return this.cache.get(key);
  }
  async indexed(height, workchain) {
    if (this.indexPending >= 4) throw new ProviderError('Milestone index busy');
    this.indexPending++;
    const previous = this.indexQueue;
    let release;
    this.indexQueue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      const url = new URL('https://toncenter.com/api/v3/blocks');
      url.search = new URLSearchParams({ workchain: String(workchain), seqno: String(height), limit: '20' });
      for (let attempt = 0; attempt < 2; attempt++) {
        await delay(Math.max(0, this.nextIndexAt - Date.now()));
        const response = await this.fetcher(url, { signal: AbortSignal.timeout(12000), redirect: 'error' });
        this.nextIndexAt = Date.now() + (response.status === 429 ? 2000 : 1100);
        if (response.status === 429 && attempt === 0) continue;
        if (!response.ok) throw new ProviderError('Milestone index unavailable');
        return parseExact(await response.text());
      }
    } finally { this.indexPending--; release(); }
  }
  async read(height, workchain) {
    const data = await this.indexed(height, workchain);
    if (!Array.isArray(data.blocks) || !data.blocks.length) throw new ProviderError('Milestone not found', 404);
    if (data.blocks.length >= 20) throw new ProviderError('Milestone index incomplete');
    const candidates = data.blocks.map(raw => normalizeBlock({ ...raw, shard: raw.shard?.toLowerCase() }, String(workchain), raw.shard?.toLowerCase()));
    if (candidates.some(block => Number(block.seqno) !== height || !Number.isSafeInteger(Number(block.gen_utime))))
      throw new ProviderError('Milestone index identity mismatch', 502);
    candidates.sort((a, b) => Number(a.gen_utime) - Number(b.gen_utime) || a.shard.localeCompare(b.shard));
    const indexed = candidates[0];
    const id = `(${workchain},${indexed.shard},${height})`;
    const header = (await this.provider.request(`/v2/blockchain/blocks/${encodeURIComponent(id)}`, 86400000)).data;
    if (Number(header.workchain_id) !== workchain || String(header.shard).toLowerCase() !== indexed.shard
      || Number(header.seqno) !== height || String(header.root_hash).toLowerCase() !== indexed.root_hash
      || String(header.file_hash).toLowerCase() !== indexed.file_hash || Number(header.gen_utime) !== Number(indexed.gen_utime)
      || Number(header.tx_quantity) !== Number(indexed.tx_quantity))
      throw new ProviderError('Milestone header verification failed', 502);
    return normalize(header);
  }
}
module.exports = { MilestoneHistory };
