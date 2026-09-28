"use strict";
const { ProviderError } = require("./provider.cjs");

// Latest dashboard readers share a bounded observation window. Explicit block
// cursors remain immutable and bypass this cache in api.cjs.
class LatestNetworkWindow {
  constructor({ now = Date.now, ttl = 15000, staleTtl = 60000, retry = 1500, maxEntries = 8 } = {}) {
    this.now = now;
    this.ttl = ttl;
    this.staleTtl = staleTtl;
    this.retry = retry;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }
  async get(key, load) {
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= this.maxEntries) {
        const removable = [...this.entries].find(([, value]) => !value.pending);
        if (!removable) throw new ProviderError("Service busy");
        this.entries.delete(removable[0]);
      }
      entry = { value: null, successAt: 0, freshUntil: 0, retryAt: 0, error: null, pending: null };
      this.entries.set(key, entry);
    }
    if (entry.pending) return entry.pending;
    if (entry.value && this.now() < entry.freshUntil) return entry.value;
    if (this.now() < entry.retryAt) return this.fallback(entry);
    entry.pending = Promise.resolve().then(load).then(value => {
      entry.value = value;
      entry.successAt = this.now();
      entry.freshUntil = this.now() + (value._meta?.stale ? this.retry : this.ttl);
      entry.retryAt = 0;
      entry.error = null;
      return value;
    }).catch(error => {
      entry.error = error;
      entry.retryAt = this.now() + this.retry;
      return this.fallback(entry);
    }).finally(() => { entry.pending = null; });
    return entry.pending;
  }
  fallback(entry) {
    if (entry.value && this.now() - entry.successAt <= this.staleTtl) {
      return { ...entry.value, _meta: { ...entry.value._meta, stale: true } };
    }
    throw entry.error || new ProviderError("Temporarily unavailable");
  }
}

module.exports = { LatestNetworkWindow };
