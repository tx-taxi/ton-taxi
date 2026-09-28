"use strict";
const fs = require("node:fs/promises");
const { Provider } = require("./provider.cjs");
const http = require("node:http");
(async () => {
  const results = [],
    wallet =
      "0:c1e826971e9bbd38884b9761d1d5b7385af2e98e8558c8f188b37e82d332b2d2";
  async function check(name, route) {
    const r = await fetch("http://127.0.0.1:4530" + route, {
      signal: AbortSignal.timeout(60000),
    });
    const d = await r.json();
    results.push({
      name,
      status: r.status,
      at: new Date().toISOString(),
      stale: d._meta?.stale,
      error: d.error,
    });
    return d;
  }
  const dashboard = await check("dashboard", "/api/ton/dashboard");
  const a = await check(
      "nfts-page1",
      `/api/ton/address/${wallet}/nfts?limit=2`,
    ),
    b = await check(
      "nfts-page2",
      `/api/ton/address/${wallet}/nfts?limit=2&offset=2`,
    );
  results.push({
    name: "nft-pages-disjoint",
    pass:
      a.nft_items?.length === 2 &&
      b.nft_items?.length === 2 &&
      !a.nft_items.some((x) =>
        b.nft_items.some((y) => y.address === x.address),
      ),
  });
  const hist = await check(
    "transactions-page1",
    `/api/ton/address/${wallet}/transactions?limit=2`,
  );
  if (hist._paging?.nextBeforeLt) {
    const next = await check(
      "transactions-page2",
      `/api/ton/address/${wallet}/transactions?limit=2&before_lt=${hist._paging.nextBeforeLt}`,
    );
    results.push({
      name: "history-pages-disjoint",
      pass: next.transactions?.every(
        (x) => !hist.transactions.some((y) => x.hash === y.hash),
      ),
    });
  }
  await check("full-account", `/api/ton/address/${wallet}`);
  await check("validators", "/api/ton/validators");
  await check("shards", `/api/ton/block/${dashboard.head.seqno}/shards`);
  await check("native-block-scroll", `/api/v1/blocks/${dashboard.head.seqno}`);
  await check("historical", "/api/ton/block/40000000");
  await check("invalid-input", "/api/ton/address/bad");
  await check("dns", "/api/ton/resolve?value=memorabilia.ton");
  let mode = "ok",
    calls = 0;
  const fixture = http.createServer((req, res) => {
    calls++;
    if (mode === "fail") {
      res.writeHead(503);
      res.end("{}");
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end('{"balance":2453364339710673263}');
    }
  });
  await new Promise((r) => fixture.listen(0, "127.0.0.1", r));
  process.env.TON_PROVIDER_URLS = `http://127.0.0.1:1,http://127.0.0.1:${
    fixture.address().port
  }`;
  const provider = new Provider();
  const first = await Promise.all(
    Array.from({ length: 8 }, () => provider.request("/sample", 60000)),
  );
  results.push({
    name: "dedup-failover-precision",
    pass:
      calls === 1 &&
      first.every((x) => x.data.balance === "2453364339710673263"),
  });
  mode = "fail";
  const stale = await provider.request("/sample", 0);
  results.push({
    name: "outage-preserves-stale-observation",
    pass: stale.stale && stale.at === first[0].at,
  });
  provider.states.forEach((s) => (s.cooldown = 0));
  mode = "ok";
  const recovered = await provider.request("/sample", 0);
  results.push({
    name: "recovery",
    pass: !recovered.stale && recovered.at > stale.at,
  });
  fixture.close();
  await fs.writeFile(
    __dirname + "/evidence/local-report.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
})();
