"use strict";

const { beginCell, Cell, loadMessage, storeMessage } = require("@ton/core");

const DEFAULT_ORIGIN = "https://tonapi.io";
const MAX_BOC_BYTES = 1024 * 1024;
const MAX_POOL = 2000;
const MAX_DETAILS = 150;
const UNKNOWN_RETENTION_MS = 30 * 1000;
const MAX_SSE_BUFFER_BYTES = 1024 * 1024;
const STREAM_IDLE_MS = 20 * 1000;

function tonApiOrigin(value = DEFAULT_ORIGIN) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== DEFAULT_ORIGIN)
    throw new Error("Pending source must use the TonAPI origin");
  return url.origin;
}

function decodeExternalBoc(encoded) {
  if (typeof encoded !== "string" || encoded.length > MAX_BOC_BYTES * 2)
    throw new Error("Invalid pending BOC");
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > MAX_BOC_BYTES) throw new Error("Invalid pending BOC size");
  const roots = Cell.fromBoc(bytes);
  if (roots.length !== 1) throw new Error("Pending BOC must have one root cell");
  const cell = roots[0];
  const message = loadMessage(cell.beginParse());
  if (message.info.type !== "external-in") throw new Error("Pending BOC is not an external inbound message");
  const normalized = beginCell()
    .store(
      storeMessage(
        {
          info: { type: "external-in", dest: message.info.dest, importFee: 0n },
          body: message.body,
        },
        { forceRef: true },
      ),
    )
    .endCell();
  return {
    hash: cell.hash().toString("hex"),
    normalizedHash: normalized.hash().toString("hex"),
    destination: message.info.dest.toRawString(),
    bodyHash: message.body.hash().toString("hex"),
    bocBytes: bytes.length,
  };
}

class PendingCollector {
  constructor({ key, onUpdate = () => {}, fetchImpl = fetch, origin = DEFAULT_ORIGIN, maxPool = MAX_POOL, maxDetails = MAX_DETAILS, unknownRetentionMs = UNKNOWN_RETENTION_MS } = {}) {
    this.key = typeof key === "string" && key.trim() ? key.trim() : null;
    this.onUpdate = onUpdate;
    this.fetch = fetchImpl;
    this.origin = tonApiOrigin(origin);
    this.maxPool = Math.min(MAX_POOL, Math.max(1, Number(maxPool) || MAX_POOL));
    this.maxDetails = Math.min(MAX_DETAILS, Math.max(1, Number(maxDetails) || MAX_DETAILS));
    this.unknownRetentionMs = Math.max(1000, Number(unknownRetentionMs) || UNKNOWN_RETENTION_MS);
    this.messages = new Map();
    this.recentlyConfirmed = new Map();
    this.state = "loading";
    this.sseState = this.key ? "loading" : "unavailable";
    this.reconciliationState = this.key ? "loading" : "unavailable";
    this.observedAt = null;
    this.truncated = false;
    this.running = false;
    this.controller = null;
    this.reconnects = 0;
    this.lastError = null;
    this.timer = null;
    this.publishTimer = null;
    this.lastPublishedAt = 0;
    this.expiryTimer = null;
    this.idleTimer = null;
    this.confirmedCount = 0;
    this.retiredUnknownCount = 0;
  }

  refreshState() {
    if (!this.key) {
      this.state = "unavailable";
    } else if (!this.observedAt) {
      this.state = this.sseState === "unavailable" ? "unavailable" : "loading";
    } else if (this.isCoverageLive() && !this.hasUncertainRecords()) {
      this.state = "ready";
    } else {
      // Do not erase observations when either leg disconnects. They remain
      // provider-observed but cannot be asserted as a current pending view.
      this.state = "stale";
    }
  }

  isCoverageLive() {
    return this.sseState === "ready" && this.reconciliationState === "ready";
  }

  hasUncertainRecords() {
    return [...this.messages.values()].some((message) => message.needsReconciliation);
  }

  markCoverageGap() {
    for (const message of this.messages.values()) message.needsReconciliation = true;
  }

  setReconciliationState(value) {
    const state = typeof value === "string" ? value : value?.state;
    if (!["loading", "ready", "stale", "unavailable"].includes(state)) return false;
    if (state === this.reconciliationState) return false;
    if (state !== "ready" || this.reconciliationState !== "ready") this.markCoverageGap();
    this.reconciliationState = state;
    this.refreshState();
    this.emit();
    return true;
  }

  hasDestination(rawaddr) {
    return typeof rawaddr === "string" && [...this.messages.values()].some((message) => message.destination === rawaddr);
  }

  snapshot() {
    const active = [...this.messages.values()].sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
    const ready = this.state === "ready" || this.state === "stale";
    return {
      state: this.state,
      observedAt: this.observedAt,
      coverage: "provider-observed",
      messages: active.slice(0, this.maxDetails).map(({ rawHashes, needsReconciliation, ...message }) => message),
      totalObserved: ready ? active.length : null,
      truncated: this.truncated || active.length > this.maxDetails,
    };
  }

  health() {
    return {
      state: this.state,
      running: this.running,
      observedAt: this.observedAt,
      active: this.messages.size,
      reconnects: this.reconnects,
      lastError: this.lastError,
      origin: this.origin,
      sseState: this.sseState,
      reconciliationState: this.reconciliationState,
      confirmedCount: this.confirmedCount,
      retiredUnknownCount: this.retiredUnknownCount,
      recentConfirmedGroups: this.recentlyConfirmed.size,
    };
  }

  emit() {
    clearTimeout(this.publishTimer);
    this.publishTimer = null;
    this.lastPublishedAt = Date.now();
    this.onUpdate(this.snapshot());
  }

  // TonAPI can broadcast duplicate BOCs several times per second. The
  // consumer only needs the freshest bounded snapshot, while source-state
  // transitions above still call emit() immediately.
  scheduleEmit() {
    if (this.publishTimer) return;
    const delay = Math.max(0, 1000 - (Date.now() - this.lastPublishedAt));
    this.publishTimer = setTimeout(() => this.emit(), delay);
  }

  observe(encoded, at = new Date().toISOString()) {
    let message;
    try {
      message = decodeExternalBoc(encoded);
    } catch {
      return false;
    }
    const recordKey = `${message.normalizedHash}:${message.destination}`;
    // The source can rebroadcast an included BOC. Suppress that group only
    // within this observation window, never permanently across history.
    const seenAt = Date.parse(at);
    if (!Number.isFinite(seenAt)) return false;
    const confirmedUntil = this.recentlyConfirmed.get(recordKey);
    if (confirmedUntil > seenAt) return false;
    if (confirmedUntil) this.recentlyConfirmed.delete(recordKey);
    if (this.sseState !== "ready") this.markCoverageGap();
    const existing = this.messages.get(recordKey);
    // Keep the map in last-seen order so bounded eviction removes the oldest
    // provider observation, not an actively re-broadcast message.
    if (existing) this.messages.delete(recordKey);
    this.messages.set(recordKey, {
      ...message,
      firstSeenAt: existing?.firstSeenAt || at,
      lastSeenAt: at,
      rawHashes: new Set([...(existing?.rawHashes || []), message.hash]),
      needsReconciliation: existing?.needsReconciliation || !this.isCoverageLive(),
    });
    while (this.messages.size > this.maxPool) {
      this.messages.delete(this.messages.keys().next().value);
      this.truncated = true;
    }
    this.observedAt = at;
    this.sseState = "ready";
    this.refreshState();
    this.lastError = null;
    return true;
  }

  // A raw hash matches one of the BOC variants exactly. A confirmed inbound
  // message may instead carry the normalized hash after repacking, in which
  // case the normalized/destination group is still exact. The one-second
  // allowance accepts wall-clock skew but rejects a transaction before the
  // pending observation.
  confirm({ hash, normalizedHash, destination, at = new Date().toISOString() }) {
    const confirmedAt = Date.parse(at);
    if (!Number.isFinite(confirmedAt) || typeof destination !== "string") return false;
    const candidates = [...this.messages.entries()].filter(([, message]) =>
      message.normalizedHash === normalizedHash &&
      message.destination === destination &&
      confirmedAt >= Date.parse(message.firstSeenAt) - 1000,
    );
    if (candidates.length !== 1) return false;
    let removed = false;
    for (const [recordKey] of candidates) {
      this.messages.delete(recordKey);
      this.recentlyConfirmed.set(recordKey, Date.now() + this.unknownRetentionMs);
      while (this.recentlyConfirmed.size > this.maxPool) this.recentlyConfirmed.delete(this.recentlyConfirmed.keys().next().value);
      removed = true;
    }
    if (removed) {
      this.confirmedCount += 1;
      const previous = this.state;
      this.refreshState();
      if (previous !== this.state) this.emit();
      else this.scheduleEmit();
    }
    return removed;
  }

  expireUnknown(now = Date.now()) {
    for (const [key, until] of this.recentlyConfirmed) {
      if (until <= now) this.recentlyConfirmed.delete(key);
    }
    let changed = false;
    for (const [hash, message] of this.messages) {
      if (Date.parse(message.firstSeenAt) + this.unknownRetentionMs <= now) {
        this.messages.delete(hash);
        changed = true;
        this.retiredUnknownCount += 1;
      }
    }
    if (changed) {
      this.refreshState();
      this.scheduleEmit();
    }
    return changed;
  }

  async consume(response) {
    if (!response.ok || !response.body) throw new Error(`TonAPI pending stream HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("Invalid pending stream content type");
    if (this.sseState !== "ready") this.markCoverageGap();
    this.sseState = "ready";
    this.refreshState();
    this.lastError = null;
    this.emit();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    this.armIdleWatchdog();
    while (this.running) {
      const { done, value } = await reader.read();
      if (done) break;
      this.armIdleWatchdog();
      buffered += decoder.decode(value, { stream: true });
      if (buffered.length > MAX_SSE_BUFFER_BYTES) throw new Error("TonAPI pending stream buffer exceeded limit");
      const events = buffered.split(/\r?\n\r?\n/);
      buffered = events.pop();
      for (const event of events) {
        const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) continue;
        try {
          const value = JSON.parse(data);
          if (this.observe(value.boc)) this.scheduleEmit();
        } catch {}
      }
    }
  }

  async loop() {
    while (this.running) {
      this.controller = new AbortController();
      const controller = this.controller;
      const headerTimer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await this.fetch(this.origin + "/v2/sse/mempool", {
          headers: { accept: "text/event-stream", authorization: "Bearer " + this.key },
          signal: controller.signal, redirect: "error",
        });
        clearTimeout(headerTimer);
        await this.consume(response);
        if (!this.running) break;
        this.markCoverageGap();
        this.sseState = "stale";
        this.lastError = "TonAPI pending stream ended";
      } catch (error) {
        if (!this.running) break;
        this.markCoverageGap();
        this.sseState = this.observedAt ? "stale" : "unavailable";
        const message = String(error?.message || error);
        this.lastError = (this.key ? message.replaceAll(this.key, "[redacted]") : message).slice(0, 180);
      } finally {
        clearTimeout(headerTimer);
        clearTimeout(this.idleTimer);
        controller.abort();
      }
      if (!this.running) break;
      this.refreshState();
      this.emit();
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.reconnects++, 5));
      await new Promise((resolve) => { this.wakeReconnect = resolve; this.timer = setTimeout(resolve, delay); });
      this.wakeReconnect = null;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.sseState = this.key ? (this.observedAt ? "stale" : "loading") : "unavailable";
    this.reconciliationState = this.key ? "loading" : "unavailable";
    this.refreshState();
    this.emit();
    if (!this.key) return;
    this.expiryTimer = setInterval(() => this.expireUnknown(), Math.min(5000, this.unknownRetentionMs));
    this.loopTask = this.loop();
  }

  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.wakeReconnect?.();
    clearTimeout(this.publishTimer);
    clearTimeout(this.idleTimer);
    clearInterval(this.expiryTimer);
    this.publishTimer = null;
    this.controller?.abort();
    await this.loopTask;
  }

  armIdleWatchdog() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.controller?.abort(), STREAM_IDLE_MS);
  }
}

module.exports = { PendingCollector, decodeExternalBoc, tonApiOrigin };
