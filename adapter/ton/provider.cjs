"use strict";
const { tonApiKey } = require("./credentials.cjs");
// Preserve atomic amounts, logical times and uint256 NFT indices before JSON.parse.
function parseExact(text) {
  return JSON.parse(
    text.replace(
      /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      (token) =>
        token[0] === '"' || /[.eE]/.test(token) ? token : JSON.stringify(token),
    ),
  );
}
class ProviderError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.status = status;
  }
}
class Provider {
  constructor() {
    this.apiKey = tonApiKey();
    this.urls = (
      process.env.TON_PROVIDER_URLS ||
      "https://tonapi.io,https://keeper.tonapi.io"
    )
      .split(",")
      .map((x) => x.trim().replace(/\/$/, ""));
    this.context = new (require("node:async_hooks").AsyncLocalStorage)();
    this.cache = new Map();
    this.pending = new Map();
    this.states = this.urls.map((url) => ({
      url,
      cooldown: 0,
      lastSuccess: null,
      lastFailure: null,
    }));
    this.queue = [];
    this.timer = null;
    this.next = 0;
    this.requests = 0;
    this.cacheBytes = 0;
  }
  async request(route, ttl = 15000, preferred, priority) {
    const key = route + (preferred ? `@${preferred}` : "");
    const old = this.cache.get(key);
    if (old && Date.now() - old.at < ttl) return { ...old, stale: false };
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.pending.size >= 100) throw new ProviderError("Service busy");
    const deadline = Math.min(
      Date.now() + 25000,
      this.context.getStore()?.deadline || Infinity,
    );
    if (deadline <= Date.now()) throw new ProviderError("Request timed out");
    const task = this.fetch(route, preferred, priority, deadline)
      .then((result) => {
        if (this.cache.has(key))
          this.cacheBytes -= this.cache.get(key).bytes || 0;
        result.bytes = Buffer.byteLength(JSON.stringify(result.data));
        this.cache.delete(key);
        this.cache.set(key, result);
        this.cacheBytes += result.bytes;
        while (this.cache.size > 1500 || this.cacheBytes > 64 * 1024 * 1024) {
          const oldest = this.cache.keys().next().value;
          this.cacheBytes -= this.cache.get(oldest).bytes || 0;
          this.cache.delete(oldest);
        }
        return { ...result, stale: false };
      })
      .catch((error) => {
        if (old && Date.now() - old.at < 24 * 3600000 && error.status !== 404)
          return { ...old, stale: true };
        throw error;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }
  slot(route, requestedPriority, deadline) {
    const priority =
      requestedPriority ??
      (route.includes("masterchain-head")
        ? 0
        : /[?&](offset|before_lt)=/.test(route)
        ? 2
        : 1);
    return new Promise((resolve, reject) => {
      let timer;
      const item = {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        priority,
        created: Date.now(),
        expires: deadline,
      };
      timer = setTimeout(
        () => {
          const index = this.queue.indexOf(item);
          if (index >= 0) this.queue.splice(index, 1);
          reject(new ProviderError("Request timed out"));
        },
        Math.max(0, deadline - Date.now()),
      );
      this.queue.push(item);
      this.pump();
    });
  }
  pump() {
    if (this.timer || !this.queue.length) return;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        const rank = (item) =>
          item.priority > 0 &&
          item.priority < 3 &&
          Date.now() - item.created > 5000
            ? 0.5
            : item.priority;
        this.queue.sort((a, b) => rank(a) - rank(b) || a.expires - b.expires);
        let item;
        while ((item = this.queue.shift())) {
          if (item.expires < Date.now()) {
            item.reject(new ProviderError("Service busy"));
            continue;
          }
          this.next =
            Date.now() +
            Math.max(200, Number(process.env.TON_REQUEST_INTERVAL_MS || 1100));
          item.resolve();
          break;
        }
        this.pump();
      },
      Math.max(0, this.next - Date.now()),
    );
  }
  async fetch(route, preferred, priority, deadline) {
    const states = preferred
      ? this.states.filter((s) => s.url === preferred)
      : this.states;
    let absent = 0;
    for (const state of states) {
      if (state.cooldown > Date.now()) continue;
      if (Date.now() >= deadline) throw new ProviderError("Request timed out");
      await this.slot(route, priority, deadline);
      if (Date.now() >= deadline) throw new ProviderError("Request timed out");
      try {
        const headers = { accept: "application/json" };
        if (this.apiKey && state.url === "https://tonapi.io")
          headers.Authorization = "Bearer " + this.apiKey;
        this.requests++;
        const response = await fetch(state.url + route, {
          headers,
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(12000, deadline - Date.now())),
          ),
        });
        if (response.status === 404) {
          absent++;
          continue;
        }
        if (!response.ok) {
          const error = new Error("HTTP " + response.status);
          error.status = response.status;
          throw error;
        }
        if (route.endsWith("/boc")) {
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length > 16 * 1024 * 1024)
            throw new Error("Oversized response");
          state.lastSuccess = new Date().toISOString();
          state.cooldown = 0;
          return {
            data: { boc: bytes.toString("base64") },
            at: Date.now(),
            provider: state.url,
          };
        }
        const text = await response.text();
        if (text.length > 16 * 1024 * 1024)
          throw new Error("Oversized response");
        const data = parseExact(text);
        state.lastSuccess = new Date().toISOString();
        state.cooldown = 0;
        return { data, at: Date.now(), provider: state.url };
      } catch (error) {
        state.lastFailure = {
          at: new Date().toISOString(),
          message: error.message,
          status: error.status || null,
          route: route.split("?")[0],
        };
        if (!error.status || error.status === 429 || error.status >= 500)
          state.cooldown = Date.now() + 15000;
      }
    }
    const notFound = states.length > 0 && absent === states.length;
    throw new ProviderError(
      notFound ? "Not found" : "Temporarily unavailable",
      notFound ? 404 : 503,
    );
  }
  health() {
    return {
      providers: this.states,
      requests: this.requests,
      cacheEntries: this.cache.size,
      inFlight: this.pending.size,
      independentFallback: false,
    };
  }
}
module.exports = { Provider, ProviderError, parseExact };
