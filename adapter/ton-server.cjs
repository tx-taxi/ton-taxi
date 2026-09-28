#!/usr/bin/env node
"use strict";
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { WebSocketServer } = require("ws");
const social = require("./ton-social.cjs");
const { Provider } = require("./ton/provider.cjs");
const { Collector } = require("./ton/collector.cjs");
const { PendingCollector } = require("./ton/pending.cjs");
const { PendingInclusions } = require("./ton/pending-inclusions.cjs");
const { tonApiKey } = require("./ton/credentials.cjs");
const { api } = require("./ton/api.cjs");
const provider = new Provider(),
  collector = new Collector(provider, { onUpdate: value => broadcast({...value, tonPending: pending.snapshot()}) }),
  sockets = new Set();
const pendingKey = tonApiKey();
const pending = new PendingCollector({key: pendingKey, onUpdate: value => {
  const {observedAt, stale} = collector.dashboard();
  // Pending traffic cannot postpone the browser's view of a stalled head.
  // This is the original block observation time, never the pending receipt time.
  broadcast({tonPending: value, ton: {observedAt, stale}});
}});
const inclusions = new PendingInclusions({
  key: pendingKey,
  shouldTrack: address => pending.hasDestination(address),
  onConfirm: value => pending.confirm(value),
  onStatus: value => pending.setReconciliationState(value.state === "live" ? "ready" : value.state),
});
const snapshot = () => ({...collector.snapshot(), tonPending: pending.snapshot()});
const root = path.resolve(
  process.env.TON_STATIC_ROOT ||
    path.join(__dirname, "../frontend/dist/mempool/browser"),
);
const port = Number(process.env.PORT || 4530);
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
async function withDeadline(task) {
  let timer;
  const deadline = Date.now() + 28000;
  try {
    return await Promise.race([
      provider.context.run({ deadline }, task),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new (require("./ton/provider.cjs").ProviderError)(
                "Request timed out",
              ),
            ),
          28000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD")
      return json(res, { error: "Method not allowed" }, 405);
    const url = new URL(req.url, "http://localhost");
    if (
      url.pathname === "/og.png" ||
      /^\/og\/(tx|block|address|nft|collection|jetton|trace|message)\/[^/]+\.png$/.test(
        url.pathname,
      )
    ) {
      const route =
        url.pathname === "/og.png" ? "/" : url.pathname.slice(3, -4);
      const body = await social.image(route, api, provider, collector, root);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      });
      return res.end(body);
    }
    if (url.pathname === "/healthz")
      return json(res, { status: "ok", chain: "ton" });
    if (url.pathname === "/api/provider-health")
      return json(res, {
        ...provider.health(),
        observedAt: collector.observedAt,
        stale: collector.dashboard().stale,
        blocks: collector.health(),
        pending: {...pending.health(), inclusions: inclusions.health()},
      });
    if (url.pathname === "/api/ton/pending") return json(res, pending.snapshot());
    if (url.pathname.startsWith("/api/ton/")) {
      const data = await withDeadline(() => api(url, provider, collector));
      if (/^\/api\/ton\/block\/[^/]+\/boc$/.test(url.pathname)) {
        const bytes = Buffer.from(data.boc, "base64");
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="block.boc"',
          "Cache-Control": "public, max-age=86400",
        });
        return res.end(bytes);
      }
      return json(res, data);
    }
    if (/^\/api\/v1\/blocks\/\d+$/.test(url.pathname)) {
      const height = Number(url.pathname.split("/").pop());
      const result = await withDeadline(() =>
        api(
          new URL(
            "http://localhost/api/ton/blocks?limit=10&before=" + (height + 1),
          ),
          provider,
          collector,
        ),
      );
      return json(
        res,
        result.blocks.map(require("./ton/collector.cjs").normalize),
      );
    }
    if (url.pathname === "/api/v1/blocks" || url.pathname === "/api/blocks") {
      if (!collector.blocks.length) await collector.refresh();
      return json(res, collector.dashboard().blocks);
    }
    if (url.pathname === "/api/v1/init-data")
      return json(res, snapshot());
    if (url.pathname.startsWith("/api/"))
      return json(res, { error: "Not found" }, 404);
    let filename = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!filename.startsWith(root + path.sep) && filename !== root)
      return json(res, { error: "Not found" }, 404);
    let stat;
    try {
      stat = await fs.stat(filename);
    } catch {}
    if (!stat?.isFile()) {
      const entityRoute =
        /^\/(?:dns|staking-pool|extra-currency|address|tx|block|nft|collection|jetton|trace|message)\/[^/]+\/?$/.test(
          url.pathname,
        );
      if (path.extname(url.pathname) && !entityRoute)
        return json(res, { error: "Not found" }, 404);
      filename = path.join(root, "index.html");
    }
    let body = await fs.readFile(filename);
    if (filename.endsWith("index.html"))
      body = Buffer.from(
        await social.inject(
          body.toString(),
          url.pathname,
          api,
          provider,
          collector,
        ),
      );
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
    };
    res.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
      "Cache-Control": filename.endsWith(".html")
        ? "no-cache"
        : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    json(
      res,
      {
        error:
          error.status === 404
            ? "Not found"
            : error.status === 400
            ? error.message
            : "Temporarily unavailable",
      },
      error.status || 503,
    );
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
server.on("upgrade", (req, socket, head) => {
  if (req.url?.split("?")[0] !== "/api/v1/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});
wss.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
  socket.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw);
      if (message.action === "ping") {
        const {observedAt, stale} = collector.dashboard();
        // A healthy browser connection must not hide a stale upstream feed.
        socket.send(JSON.stringify({ pong: true, ton: {observedAt, stale} }));
      }
      if (message.action === "init" || message['refresh-blocks']) {
        if (!collector.blocks.length) await collector.refresh();
        if (socket.readyState === 1) socket.send(JSON.stringify(snapshot()));
      }
    } catch {
      if (socket.readyState === 1) socket.send(JSON.stringify({ ton: { stale: true } }));
    }
  });
});
function broadcast(value) {
  const snapshot = JSON.stringify(value);
  for (const socket of sockets) {
    if (socket.readyState !== 1) continue;
    if (socket.bufferedAmount > 2 * 1024 * 1024) socket.close(1013, "Reconnect for current blocks");
    else socket.send(snapshot);
  }
}
(async () => {
  await collector.restore();
  server.listen(port, process.env.TON_ADAPTER_HOST || "127.0.0.1", () =>
    console.log(`TON review http://127.0.0.1:${port}`),
  );
  collector.start().catch(error => console.error("TON block stream:", error.message));
  inclusions.start();
  pending.start();
  const shutdown = async () => {
    await pending.stop();
    await inclusions.stop();
    await collector.stop();
    for (const socket of sockets) socket.close();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
