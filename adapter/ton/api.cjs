"use strict";
const { ProviderError } = require("./provider.cjs");
const { canonicalBlock, normalize } = require("./collector.cjs");
const { blockContext } = require("./block-context.cjs");
const { LatestNetworkWindow } = require("./latest-network-window.cjs");
const { blockSelection } = require("./block-selection.cjs");
const enc = encodeURIComponent;
const networkSources = new Map();
const latestNetworkWindows = new WeakMap();
function limitParam(q) {
  return Math.min(100, Math.max(1, Number(q.get("limit")) || 24));
}
function validateId(id) {
  if (
    !/^(?:-?\d:[a-fA-F0-9]{64}|[A-Za-z0-9_+\/-]{48}|[A-Za-z0-9_+\/-]{43}=|[a-fA-F0-9]{64}|\d+|\(-?\d+,[a-fA-F0-9]{16},\d+\))$/.test(
      id,
    )
  )
    throw new ProviderError("Invalid identifier", 400);
  return id;
}
function query(q, keys) {
  const p = new URLSearchParams();
  for (const key of keys) {
    const v = q.get(key);
    if (v !== null) {
      if (!/^\d+$/.test(v)) throw new ProviderError("Invalid pagination", 400);
      p.set(key, v);
    }
  }
  return p;
}
function wrap(r) {
  return {
    ...r.data,
    _meta: {
      observedAt: new Date(r.at).toISOString(),
      stale: r.stale,
      provider: r.provider,
    },
  };
}
function page(data, q, key, mode) {
  const list = data[key] || [];
  const limit = limitParam(q),
    offset = Number(q.get("offset")) || 0;
  data._paging = { limit, offset, hasMore: list.length >= limit };
  if (mode === "offset")
    data._paging.nextOffset =
      list.length >= limit ? offset + list.length : null;
  else
    data._paging.nextBeforeLt =
      list.length >= limit
        ? data.next_from || list.at(-1)?.lt || list.at(-1)?.event_id || null
        : null;
  return data;
}
async function api(url, provider, collector) {
  const parts = url.pathname
    .slice("/api/ton/".length)
    .split("/")
    .map(decodeURIComponent);
  const [kind, requestedId, sub] = parts,
    q = url.searchParams;
  let id = requestedId;
  if (
    id &&
    [
      "address",
      "nft",
      "collection",
      "jetton",
      "multisig",
      "multisig-order",
      "staking-pool",
    ].includes(kind)
  )
    id = require("./identity.cjs").address(id);
  if (
    id &&
    ["tx", "trace", "message"].includes(kind) &&
    /^[A-Za-z0-9_+\/-]{43}=?$/.test(id)
  )
    id = Buffer.from(id, "base64url").toString("hex");
  const get = async (route, ttl) => wrap(await provider.request(route, ttl));
  if (kind === "dns") {
    if (id === "auctions") {
      const tld = q.get("tld") || "ton";
      if (!["ton", "t.me"].includes(tld))
        throw new ProviderError("Invalid domain filter", 400);
      return get("/v2/dns/auctions?tld=" + enc(tld), 60000);
    }
    if (!id || id.length > 253 || !/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(id))
      throw new ProviderError("Invalid domain", 400);
    if (sub && !["bids", "resolve"].includes(sub))
      throw new ProviderError("Not found", 404);
    return get(
      "/v2/dns/" + enc(id.toLowerCase()) + (sub ? "/" + sub : ""),
      60000,
    );
  }
  if (kind === "extra-currency") {
    if (!/^\d+$/.test(id || "") || BigInt(id) > 4294967295n)
      throw new ProviderError("Invalid currency", 400);
    return get("/v2/extra-currency/" + id, 60000);
  }
  if (kind === "staking-pool") {
    if (sub === "history") {
      const p = query(q, ["before_lt"]);
      p.set("limit", limitParam(q));
      // Provider APY samples expose time, not logical-time cursors. Never invent one.
      return get("/v2/staking/pool/" + enc(id) + "/history?" + p, 60000);
    }
    if (sub) throw new ProviderError("Not found", 404);
    return get("/v2/staking/pool/" + enc(id), 30000);
  }
  if (kind === "dashboard") {
    const selection = blockSelection(q);
    if (!collector.blocks.length) await collector.refresh();
    return collector.dashboard(selection);
  }
  if (kind === "blocks") {
    const selection = blockSelection(q);
    if (!collector.blocks.length) await collector.refresh();
    const dashboard = collector.dashboard(selection);
    const shard = selection.workchain === -1 ? "8000000000000000" : selection.shard || dashboard.shard;
    const before = q.get("before");
    if (before && !/^\d+$/.test(before))
      throw new ProviderError("Invalid block height", 400);
    const start = before
      ? Number(before) - 1
      : Number(dashboard.head?.seqno);
    const limit = Math.min(16, limitParam(q));
    const blocks = [];
    let partial = false, boundary = false;
    const readHeaders = async () => {
      for (let i = 0; i < limit && start - i > 0; i++) {
        const id = `(${selection.workchain},${shard},${start - i})`;
        const cached = selection.workchain === -1 ? collector.cached?.(start - i) : collector.basechain?.cached(start - i, shard);
        try {
          const header = cached ? { ...cached, _meta: {observedAt:dashboard.observedAt, stale:false, provider:"verified-block-stream"} } : await get("/v2/blockchain/blocks/" + enc(id),86400000);
          if (`(${header.workchain_id},${header.shard},${header.seqno})` !== id)
            throw new ProviderError("Block header does not match requested identity", 502);
          blocks.push(header);
          if (!Array.isArray(header.prev_refs) || header.prev_refs.length !== 1 || header.prev_refs[0] !== `(${selection.workchain},${shard},${start - i - 1})`) {
            boundary = true;
            break;
          }
        }
        catch (error) { if (!blocks.length) throw error; partial = true; break; }
      }
    };
    const deadline = Math.min(provider.context?.getStore()?.deadline || Infinity,Date.now()+20000);
    if (shard && Number.isSafeInteger(start)) {
      if (provider.context) await provider.context.run({deadline},readHeaders); else await readHeaders();
    }
    return {
      blocks,
      workchain: selection.workchain, shard, activeShards: dashboard.activeShards || [],
      _meta: {partial,stale:!blocks.length || blocks.some(block=>block._meta?.stale),observedAt:blocks[0]?._meta?.observedAt || dashboard.observedAt},
      _paging: {nextBefore:boundary ? null : blocks.at(-1)?.seqno,hasMore:!boundary && Number(blocks.at(-1)?.seqno)>1,workchain:selection.workchain,shard,boundary},
    };
  }

  if (kind === "network-transactions") {
    if (!collector.blocks.length) await collector.refresh();
    const height =
      q.get("master_seqno") || q.get("before") || collector.blocks[0].seqno;
    if (!/^\d+$/.test(height))
      throw new ProviderError("Invalid block height", 400);
    const offset = Number(q.get("offset") || 0),
      limit = Math.min(50, limitParam(q));
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new ProviderError("Invalid pagination", 400);
    const readWindow = async () => {
      const result = await provider.request(
        "/v2/blockchain/masterchain/" +
          height +
          "/transactions?limit=" +
          limit +
          "&offset=" +
          offset,
        86400000,
        networkSources.get(height),
      );
      networkSources.set(height, result.provider);
      while (networkSources.size > 256)
        networkSources.delete(networkSources.keys().next().value);
      const data = wrap(result),
        moreInBlock = data.transactions.length === limit;
      return {
        ...data,
        master_seqno: height,
        _paging: {
          masterSeqno: height,
          limit,
          offset,
          hasMore: moreInBlock || Number(height) > 1,
          nextOffset: moreInBlock ? offset + data.transactions.length : null,
          nextBefore: moreInBlock ? null : String(Number(height) - 1),
        },
      };
    };
    if (q.has("master_seqno") || q.has("before")) return readWindow();
    let latest = latestNetworkWindows.get(provider);
    if (!latest) {
      latest = new LatestNetworkWindow();
      latestNetworkWindows.set(provider, latest);
    }
    return latest.get(`${limit}:${offset}`, readWindow);
  }
  if (kind === "transactions") {
    if (!collector.blocks.length) await collector.refresh();
    const height = q.get("before") || collector.blocks[0].seqno;
    if (!/^\d+$/.test(height))
      throw new ProviderError("Invalid block height", 400);
    const result = await get(
      "/v2/blockchain/blocks/" + enc(canonicalBlock(height)) + "/transactions",
      86400000,
    );
    result._paging = {
      nextBefore: String(Number(height) - 1),
      hasMore: Number(height) > 1,
    };
    result.masterchainOnly = true;
    return result;
  }
  if (kind === "rates") {
    if (id === "markets") return get("/v2/rates/markets", 60000);
    if (id === "chart") {
      const currency = (q.get("currency") || "USD").toUpperCase();
      if (!["USD","EUR","GBP","AUD","CAD","CHF","JPY"].includes(currency)) throw new ProviderError("Invalid currency", 400);
      const p = query(q, ["start_date", "end_date"]);
      if ([...p.values()].some(value => BigInt(value) > 2114380800n)) throw new ProviderError("Invalid date",400);
      if (p.has("start_date") && p.has("end_date") && BigInt(p.get("start_date")) > BigInt(p.get("end_date"))) throw new ProviderError("Invalid date range",400);
      p.set("token", "ton"); p.set("currency", currency.toLowerCase()); p.set("points_count", "200");
      const result = await get("/v2/rates/chart?" + p, 60000);
      return { ...result, currency, assetSymbol: "GRAM", points: (result.points || []).map(point => ({timestamp:Number(point[0]), price:String(point[1])})).filter(point => Number.isFinite(point.timestamp) && Number.isFinite(Number(point.price))) };
    }
    if (id) throw new ProviderError("Not found",404);
    return get("/v2/rates?tokens=ton&currencies=usd,eur,gbp,aud,cad,chf,jpy",60000);
  }
  if (kind === "jettons") {
    const p = new URLSearchParams({limit:String(limitParam(q))});
    if (q.get("last_account_id")) p.set("last_account_id",require("./identity.cjs").address(q.get("last_account_id")));
    const result = await get("/v2/jettons?" + p, 30000);
    const items = result.jettons || [];
    const cursor = items.at(-1)?.metadata?.address || items.at(-1)?.address;
    return { ...result, _paging: {limit:limitParam(q), hasMore:items.length >= limitParam(q) && !!cursor, nextAccountId:cursor || null} };
  }
  if (kind === "collections") return require("./inventory.cjs").inventory(provider,"/v2/nfts/collections",q,"nft_collections",100);
  if (kind === "config") {
    const seqno = q.get("master_seqno");
    if (seqno && !/^\d+$/.test(seqno))
      throw new ProviderError("Invalid block height", 400);
    if (id && id !== "raw") throw new ProviderError("Not found", 404);
    return get(
      (seqno
        ? "/v2/blockchain/masterchain/" + seqno + "/config"
        : "/v2/blockchain/config") + (id === "raw" ? "/raw" : ""),
      60000,
    );
  }
  if (kind === "validators") return get("/v2/blockchain/validators", 60000);
  if (kind === "resolve") {
    const value = require("./identity.cjs").input(q.get("value") || "");
    if (/^\d+$/.test(value) || /^\(-?\d+,[a-fA-F0-9]{16},\d+\)$/.test(value)) {
      await get(
        "/v2/blockchain/blocks/" + enc(canonicalBlock(value)),
        86400000,
      );
      return { type: "block", id: value };
    }
    if (/^[a-fA-F0-9]{64}$/.test(value)) {
      try {
        const tx = await get("/v2/blockchain/transactions/" + value, 86400000);
        return { type: "tx", id: tx.hash };
      } catch (error) {
        if (error.status !== 404) throw error;
        const tx = await get(
          "/v2/blockchain/messages/" + value + "/transaction",
          86400000,
        );
        return { type: "tx", id: tx.hash };
      }
    }
    if (/^[a-zA-Z0-9_.-]+\.ton$/i.test(value)) {
      const dns = await get(
        "/v2/dns/" + enc(value.toLowerCase()) + "/resolve",
        60000,
      );
      const id = dns.wallet?.address || dns.wallet;
      if (typeof id !== "string")
        throw new ProviderError("No wallet found", 404);
      return { type: "address", id, dns };
    }
    const id = require("./identity.cjs").address(value);
    const account = await get("/v2/accounts/" + enc(id));
    if (account.status === "nonexist" || account.status === "uninit") {
      // Indexed cNFTs can exist before their account is deployed. Confirm the
      // indexed item itself instead of treating a missing account as absence.
      try {
        const nft = await get("/v2/nfts/" + enc(id), 60000);
        if (typeof nft.address === "string" && nft.address.toLowerCase() === id)
          return { type: "nft", id };
      } catch (error) {
        if (error.status !== 404) throw error;
      }
      if (
        account.status === "nonexist" ||
        !/^\d+$/.test(account.balance || "") ||
        BigInt(account.balance) === 0n
      )
        throw new ProviderError("Not found", 404);
    }
    const interfaces = account.interfaces || [];
    let type = "address";
    if (interfaces.includes("nft_item")) type = "nft";
    else if (interfaces.includes("nft_collection")) type = "collection";
    else if (interfaces.includes("jetton_master")) type = "jetton";
    return { type, id };
  }

  validateId(id || "");
  if (kind === "block") {
    if (sub === "context") return blockContext(provider, collector, id, q);
    if (sub === "boc")
      return get(
        "/v2/blockchain/blocks/" + enc(canonicalBlock(validateId(id))) + "/boc",
        86400000,
      );
    const block = canonicalBlock(id);
    if (sub === "transactions")
      return get(
        "/v2/blockchain/blocks/" + enc(block) + "/transactions",
        86400000,
      );
    if (sub === "shards") {
      const seq = /^\d+$/.test(id) ? id : id.match(/,(\d+)\)$/)?.[1];
      return get("/v2/blockchain/masterchain/" + seq + "/shards", 86400000);
    }
    const header = await get("/v2/blockchain/blocks/" + enc(block), 86400000);
    return { ...header, _strip: normalize(header) };
  }
  if (kind === "trace") return get("/v2/traces/" + enc(id), 86400000);
  if (kind === "message")
    return get("/v2/blockchain/messages/" + enc(id) + "/transaction", 86400000);
  if (kind === "tx") {
    if (sub === "event" || sub === "trace")
      return get((sub === "event" ? "/v2/events/" : "/v2/traces/") + enc(id), 86400000);
    if (sub) throw new ProviderError("Not found", 404);
    const tx = await get("/v2/blockchain/transactions/" + enc(id), 86400000);
    tx.relatedUnavailable = [];
    const master = tx.block?.match(/^\(-1,[a-fA-F0-9]{16},(\d+)\)$/);
    if (master) tx.master_seqno = master[1];
    if (q.get("include") === "core") return { ...tx, relatedPending: ["event", "trace"] };
    for (const [field, route] of [
      ["event", "/v2/events/"],
      ["trace", "/v2/traces/"],
    ]) {
      try {
        tx[field] = await get(route + enc(id), 86400000);
      } catch {
        tx.relatedUnavailable.push(field);
      }
    }
    return tx;
  }
  if (kind === "multisig") return get("/v2/multisig/" + enc(id), 15000);
  if (kind === "multisig-order")
    return get("/v2/multisig/order/" + enc(id), 15000);
  if (kind === "address") {
    if (sub === "dns-expiring") {
      const period = Number(q.get("period") || 3660);
      if (!Number.isInteger(period) || period < 1 || period > 3660)
        throw new ProviderError("Invalid period", 400);
      return get(
        "/v2/accounts/" + enc(id) + "/dns/expiring?period=" + period,
        60000,
      );
    }
    if (sub === "extra-currency") {
      const currency = parts[3];
      if (
        !/^\d+$/.test(currency || "") ||
        BigInt(currency) > 4294967295n ||
        parts[4] !== "history"
      )
        throw new ProviderError("Invalid currency", 400);
      const p = query(q, ["before_lt", "start_date", "end_date"]);
      p.set("limit", limitParam(q));
      return page(
        await get(
          "/v2/accounts/" +
            enc(id) +
            "/extra-currency/" +
            currency +
            "/history?" +
            p,
          15000,
        ),
        q,
        "events",
        "lt",
      );
    }
    if (!sub) {
      const account = await get("/v2/accounts/" + enc(id));
      try {
        account.state = await get("/v2/blockchain/accounts/" + enc(id));
      } catch {
        account.stateUnavailable = true;
      }
      try {
        account.dns = await get(
          "/v2/accounts/" + enc(id) + "/dns/backresolve",
          60000,
        );
      } catch {}
      return account;
    }
    if (sub === "traces") {
      const p = query(q, ["before_lt"]);
      p.set("limit", limitParam(q));
      const result = await get("/v2/accounts/" + enc(id) + "/traces?" + p, 15000);
      // TonAPI's account handler writes logical time into TraceID.utime.
      // Preserve the exact cursor and never render that integer as a date.
      result.traces = (result.traces || []).map(trace => {
        const value = String(trace.utime || "");
        return /^\d+$/.test(value) && BigInt(value) > 1000000000000n
          ? { ...trace, lt: value, utime: undefined }
          : trace;
      });
      const cursor = result.traces.at(-1)?.lt;
      result._paging = { limit: limitParam(q), hasMore: result.traces.length >= limitParam(q) && !!cursor, nextBeforeLt: cursor || null };
      return result;
    }
    if (sub === "jetton-history" && q.get("jetton")) {
      const jetton = require("./identity.cjs").address(q.get("jetton"));
      const p = query(q, ["before_lt", "start_date", "end_date"]);
      p.set("limit", limitParam(q));
      return page(await get("/v2/jettons/" + enc(jetton) + "/accounts/" + enc(id) + "/history?" + p, 15000), q, "events", "lt");
    }
    if (sub === "multisig") return get("/v2/multisig/" + enc(id), 15000);
    if (sub === "multisig-order")
      return get("/v2/multisig/order/" + enc(id), 15000);
    if (sub === "inspect")
      return get("/v2/blockchain/accounts/" + enc(id) + "/inspect", 60000);
    if (sub === "methods") {
      const method = parts[3];
      if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,100}$/.test(method || ""))
        throw new ProviderError("Invalid method", 400);
      const p = new URLSearchParams();
      const args = q.getAll("args");
      if (args.length > 16 || args.some((x) => x.length > 4096))
        throw new ProviderError("Invalid arguments", 400);
      for (const arg of args) p.append("args", arg);
      return get(
        "/v2/blockchain/accounts/" +
          enc(id) +
          "/methods/" +
          enc(method) +
          "?" +
          p,
        15000,
      );
    }
    if (sub === "staking")
      return get("/v2/staking/nominator/" + enc(id) + "/pools", 30000);
    if (sub === "multisigs" || sub === "subscriptions")
      return get("/v2/accounts/" + enc(id) + "/" + sub, 30000);
    if (sub === "defi")
      return get("/v2/accounts/" + enc(id) + "/defi/assets", 30000);
    if (sub === "nft-history" || sub === "jetton-history") {
      const p = query(q, ["before_lt"]);
      p.set("limit", limitParam(q));
      const nft = sub === "nft-history";
      return page(
        await get(
          "/v2/accounts/" +
            enc(id) +
            "/" +
            (nft ? "nfts" : "jettons") +
            "/history?" +
            p,
          15000,
        ),
        q,
        "operations",
        "lt",
      );
    }
    if (sub === "jettons")
      return get("/v2/accounts/" + enc(id) + "/jettons?currencies=usd", 30000);
    if (sub === "transactions") {
      const p = query(q, ["before_lt", "after_lt"]);
      p.set("limit", limitParam(q));
      return page(
        await get(
          "/v2/blockchain/accounts/" + enc(id) + "/transactions?" + p,
          10000,
        ),
        q,
        "transactions",
        "lt",
      );
    }
    if (sub === "nfts") {
      const p = query(q, ["offset"]);
      p.set("limit", limitParam(q));
      p.set(
        "indirect_ownership",
        q.get("indirect_ownership") === "false" ? "false" : "true",
      );
      if (q.get("collection"))
        p.set("collection", validateId(q.get("collection")));
      p.delete("offset");
      p.delete("limit");
      return require("./inventory.cjs").inventory(
        provider,
        "/v2/accounts/" + enc(id) + "/nfts?" + p,
        q,
      );
    }
    if (sub === "events") {
      const p = query(q, ["before_lt"]);
      p.set("limit", limitParam(q));
      return page(
        await get("/v2/accounts/" + enc(id) + "/events?" + p, 10000),
        q,
        "events",
        "lt",
      );
    }
  }
  if (kind === "nft") {
    if (sub === "sbt") {
      const authority = await get(
        "/v2/blockchain/accounts/" + enc(id) + "/methods/get_authority_address",
        60000,
      );
      const revoked = await get(
        "/v2/blockchain/accounts/" + enc(id) + "/methods/get_revoked_time",
        60000,
      );
      return {
        authority: authority.decoded?.address ?? null,
        revokedAt: revoked.decoded?.time ?? null,
        authority_result: authority,
        revoked_result: revoked,
      };
    }
    if (sub === "history") {
      const p = query(q, ["before_lt"]);
      p.set("limit", limitParam(q));
      return page(
        await get("/v2/nfts/" + enc(id) + "/history?" + p, 30000),
        q,
        "events",
        "lt",
      );
    }
    const nft = await get("/v2/nfts/" + enc(id), 60000);
    try {
      const account = await get("/v2/accounts/" + enc(id), 60000);
      nft.interfaces = account.interfaces || [];
      nft.contract_status = account.status;
    } catch {}
    nft.indexed_index = nft.index;
    nft.indexVerified = false;
    try {
      nft.nft_data = await get(
        "/v2/blockchain/accounts/" + enc(id) + "/methods/get_nft_data",
        60000,
      );
      const exact = nft.nft_data.decoded?.index;
      if (typeof exact === "string" && /^\d+$/.test(exact)) {
        nft.index = exact;
        nft.indexVerified = true;
      }
    } catch {}
    return nft;
  }
  if (kind === "collection") {
    if (sub === "items") {
      const p = query(q, ["offset"]);
      p.set("limit", limitParam(q));
      return require("./inventory.cjs").inventory(
        provider,
        "/v2/nfts/collections/" + enc(id) + "/items",
        q,
      );
    }
    const collection = await get("/v2/nfts/collections/" + enc(id), 60000);
    collection.indexed_next_item_index = collection.next_item_index;
    collection.indexVerified = false;
    try {
      collection.collection_data = await get(
        "/v2/blockchain/accounts/" + enc(id) + "/methods/get_collection_data",
        60000,
      );
      const exact = collection.collection_data.decoded?.next_item_index;
      if (typeof exact === "string" && /^\d+$/.test(exact)) {
        collection.next_item_index = exact;
        collection.indexVerified = true;
      }
    } catch {}
    try {
      collection.royalty_params = await get(
        "/v2/blockchain/accounts/" + enc(id) + "/methods/royalty_params",
        60000,
      );
    } catch {}
    return collection;
  }
  if (kind === "jetton") {
    if (sub === "holders") {
      const p = query(q, ["offset"]);
      p.set("limit", limitParam(q));
      return require("./inventory.cjs").inventory(
        provider,
        "/v2/jettons/" + enc(id) + "/holders",
        q,
        "addresses",
      );
    }
    return get("/v2/jettons/" + enc(id), 60000);
  }
  throw new ProviderError("Not found", 404);
}
module.exports = { api };
