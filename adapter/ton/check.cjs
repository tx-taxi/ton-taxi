"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { Provider, parseExact } = require("./provider.cjs");
(async () => {
  const provider = new Provider(),
    out = path.join(__dirname, "evidence");
  await fs.mkdir(out, { recursive: true });
  const checks = [];
  async function check(name, route) {
    const start = Date.now();
    try {
      const r = await provider.request(route, 60000);
      await fs.writeFile(
        path.join(out, name + ".json"),
        JSON.stringify(r.data, null, 2),
      );
      checks.push({
        name,
        route,
        status: "pass",
        provider: r.provider,
        at: new Date(r.at).toISOString(),
        durationMs: Date.now() - start,
      });
      return r.data;
    } catch (e) {
      checks.push({ name, route, status: "fail", error: e.message });
    }
  }
  const head = await check("head", "/v2/blockchain/masterchain-head");
  await check(
    "historical",
    "/v2/blockchain/blocks/" +
      encodeURIComponent("(-1,8000000000000000,40000000)"),
  );
  const wallet =
    "0:c1e826971e9bbd38884b9761d1d5b7385af2e98e8558c8f188b37e82d332b2d2";
  await check("account", "/v2/accounts/" + wallet);
  const txs = await check(
    "transactions",
    "/v2/blockchain/accounts/" + wallet + "/transactions?limit=2",
  );
  if (txs?.transactions?.length) {
    const last = txs.transactions.at(-1);
    await check(
      "transactions-page2",
      "/v2/blockchain/accounts/" +
        wallet +
        "/transactions?limit=2&before_lt=" +
        last.lt,
    );
    const tx = txs.transactions[0];
    await check("transaction", "/v2/blockchain/transactions/" + tx.hash);
    await check("event", "/v2/events/" + tx.hash);
    await check("trace", "/v2/traces/" + tx.hash);
  }
  const nfts = await check(
    "nfts",
    "/v2/accounts/" + wallet + "/nfts?limit=2&offset=0&indirect_ownership=true",
  );
  await check(
    "nfts-page2",
    "/v2/accounts/" + wallet + "/nfts?limit=2&offset=2&indirect_ownership=true",
  );
  if (nfts?.nft_items?.length) {
    const nft = nfts.nft_items[0];
    await check("nft", "/v2/nfts/" + nft.address);
    await check("nft-history", "/v2/nfts/" + nft.address + "/history?limit=10");
    if (nft.collection) {
      await check(
        "collection",
        "/v2/nfts/collections/" + nft.collection.address,
      );
      await check(
        "collection-items",
        "/v2/nfts/collections/" +
          nft.collection.address +
          "/items?limit=2&offset=0",
      );
    }
  }
  const jettons = await check(
    "jettons",
    "/v2/accounts/" + wallet + "/jettons?currencies=usd",
  );
  if (jettons?.balances?.length) {
    const id = jettons.balances[0].jetton.address;
    await check("jetton", "/v2/jettons/" + id);
    await check("holders", "/v2/jettons/" + id + "/holders?limit=2&offset=0");
  }
  await check("dns", "/v2/dns/memorabilia.ton/resolve");
  await check("validators", "/v2/blockchain/validators");
  await check("shards", "/v2/blockchain/masterchain/" + head.seqno + "/shards");
  const precision = parseExact(
    '{"a":2453364339710673263,"b":"literal 123 \\"end","c":1.25,"d":-8596388163365981490}',
  );
  checks.push({
    name: "integer-precision",
    status:
      precision.a === "2453364339710673263" &&
      precision.d === "-8596388163365981490"
        ? "pass"
        : "fail",
  });
  await fs.writeFile(
    path.join(out, "report.json"),
    JSON.stringify(checks, null, 2),
  );
  console.log(
    JSON.stringify(
      checks.map(({ name, status, error }) => ({ name, status, error })),
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
