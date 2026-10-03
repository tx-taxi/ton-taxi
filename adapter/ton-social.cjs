"use strict";
// Composition copied from router scripts/generate-og.ts native explorer card.
const fs = require("node:fs/promises"),
  path = require("node:path"),
  sharp = require("sharp"),
  parse5 = require("parse5");
const { tonSite } = require("./ton/block-selection.cjs");
const { blockRouteIdentity, blockUrl } = require("./ton/block-route.cjs");
const PAGE_CAPTURE = Object.freeze({url:"https://tx.taxi/assets/screenshots/hub-c0f1a521a7ad.jpg",width:1440,height:2611,alt:"The tx.taxi hub showing its native blockchain explorer strips and external explorer blocks."});
const cache = new Map(),
  pending = new Map();
let active = 0;
const short = (s, n = 50) => {
  s = String(s ?? "")
    .replace(/[\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};
const abbrev = (s) => (s.length > 18 ? s.slice(0, 8) + "…" + s.slice(-6) : s);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
function amount(value) {
  try {
    const n = BigInt(value);
    const whole = n / 1000000000n,
      part = (n % 1000000000n).toString().padStart(9, "0").replace(/0+$/, "");
    return whole + (part ? "." + part : "");
  } catch {
    return null;
  }
}
function identity(pathname) {
  const match = pathname.match(
    /^((?:\/[a-z]{2}(?:-[A-Z]{2})?)?)\/(tx|block|address|nft|collection|jetton|trace|message)\/([^/]+)\/?$/,
  );
  if (!match) return null;
  try {
    return { locale: match[1], kind: match[2], id: decodeURIComponent(match[3]) };
  } catch {
    return null;
  }
}
function isIndexableEntity(pathname) {
  const route = new URL(pathname, "https://ton.tx.taxi").pathname;
  return Boolean(identity(route) || /^\/(dns|staking-pool|extra-currency)\/[^/]+\/?$/.test(route));
}
async function metadata(pathname, api, provider, collector, host) {
  const site = tonSite(host);
  const origin = site.origin;
  const route = new URL(pathname, origin);
  pathname = route.pathname;
  const entity = identity(pathname);
  let canonical = origin + (pathname === "/" ? "/" : pathname);
  if (entity?.kind === "block") {
    const block = blockRouteIdentity(entity.id, route.searchParams, site.host);
    entity.id = block.id;
    entity.displayId = String(block.seqno);
    const destination = new URL(blockUrl(block.id));
    destination.pathname = entity.locale + destination.pathname;
    canonical = destination.href;
  }
  let title = `${site.host} - TON Explorer`,
    description =
      site.workchain === -1 ? "Explore TON masterchain blocks, transactions and network activity." : "Explore TON blocks, transactions, accounts, jettons and NFTs.",
    line1 = "TON",
    line2 = site.workchain === -1 ? "masterchain" : "explorer",
    summary = site.workchain === -1 ? "Live TON masterchain blocks and transactions." : "Live TON blocks, accounts, jettons and NFTs.",
    type = "TON";
  const page = pathname.split("/").filter(Boolean)[0];
  const pages = {
    jettons: ["Jettons", "Browse indexed TON jettons, supply and metadata."],
    collections: ["NFT collections", "Browse TON NFT collections and their items."],
    market: ["Market", "Explore GRAM price history and market quotes."],
    blocks: [
      "Blocks",
      "Explore TON basechain blocks, masterchain blocks and shard references.",
    ],
    txs: [
      "Transactions",
      "Explore recent TON transactions across masterchain and shards.",
    ],
    validators: [
      "Validators",
      "Explore TON validators and network configuration.",
    ],
    dns: [
      "DNS",
      "Explore TON domains, ownership, expiration and auction bids.",
    ],
    config: [
      "Network configuration",
      "Explore TON network configuration parameters.",
    ],
    docs: [
      "Documentation",
      "Learn how to explore TON blocks, accounts, jettons and NFTs with tx.taxi.",
    ],
    about: [
      "About",
      "About the TON explorer and automatic routing with tx.taxi.",
    ],
    legal: ["Legal", "Legal information for the TON tx.taxi explorer."],
    "staking-pool": [
      "Staking pool",
      "Explore TON staking pool parameters and APY observations.",
    ],
    "extra-currency": [
      "Extra currency",
      "Explore TON extra currency metadata and transfers.",
    ],
  };
  if (!entity && pages[page]) {
    const [label, detail] = pages[page];
    let id = "";
    if (["dns", "staking-pool", "extra-currency"].includes(page)) {
      try {
        id = decodeURIComponent(pathname.split("/")[2] || "");
      } catch {}
    }
    title = `${label}${id ? " " + id : ""} - ${site.host} - TON Explorer`;
    description = detail;
    line1 = label;
    line2 = id ? abbrev(id) : "TON";
    summary = detail;
    type = "TON / " + label;
  }
  if (entity) {
    const { kind, id } = entity;
    const label = {
      tx: "Transaction",
      block: "Block",
      address: "Account",
      nft: "NFT",
      collection: "Collection",
      jetton: "Jetton",
      trace: "Trace",
      message: "Message",
    }[kind];
    title = `${label} ${entity.displayId || id} - TON - tx.taxi`;
    description = `View TON ${label.toLowerCase()} ${entity.displayId || id}.`;
    line1 = label;
    line2 = abbrev(entity.displayId || id);
    summary = short(entity.displayId || id, 60);
    type = "TON / " + label;
    let timer;
    try {
      const data = await Promise.race([
        provider.context.run({ deadline: Date.now() + 4000 }, () =>
          api(
            new URL(origin + "/api/ton/" + kind + "/" + encodeURIComponent(id)),
            provider,
            collector,
          ),
        ),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 4000);
        }),
      ]);
      if (kind === "tx" || kind === "message") {
        const fees = amount(data.total_fees);
        summary = short(
          `${
            data.success === true
              ? "Confirmed"
              : data.success === false
              ? "Failed"
              : "Transaction"
          }${fees !== null ? " · " + fees + " GRAM fees" : ""}`,
          60,
        );
        description = `TON transaction ${id}. ${summary}`;
      } else if (kind === "block") {
        line2 = "#" + data.seqno;
        summary = short(
          `${data.tx_quantity} transactions · ${
            amount(data.value_flow?.fees_collected?.grams) ?? "—"
          } GRAM collected fees`,
          60,
        );
        description = `TON block ${data.seqno}. ${summary}`;
      } else if (kind === "address") {
        line2 = short(data.name || abbrev(id), 18);
        summary = short(
          `${amount(data.balance) ?? "—"} GRAM${
            data.status ? " · " + data.status : ""
          }`,
          60,
        );
        description = `TON account ${data.name || id}. ${summary}`;
      } else if (["nft", "collection", "jetton"].includes(kind)) {
        const name = data.metadata?.name || data.name;
        line2 = short(name || abbrev(id), 18);
        summary = short(
          data.metadata?.description || data.description || id,
          60,
        );
        description = `${label} ${name || id} on TON. ${short(
          data.metadata?.description || data.description || "",
          180,
        )}`;
      }
    } catch {
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    title: short(title, 240),
    description: short(description, 300),
    canonical,
    image: PAGE_CAPTURE.url,
    line1,
    line2,
    summary,
    type,
  };
}
async function inject(html, pathname, api, provider, collector, host, staticPage) {
  const meta = await metadata(pathname, api, provider, collector, host),
    document = parse5.parse(html);
  if (staticPage) {
    const site = tonSite(host);
    meta.title = staticPage.path === '/' ? `${site.host} - TON Explorer` : `${staticPage.title} - ${site.host} - TON Explorer`;
    meta.description = staticPage.path === "/" && site.workchain === -1 ? "Explore TON masterchain blocks, transactions and network activity." : staticPage.description;
    meta.canonical = site.origin + staticPage.path;
    if (staticPage.preview) meta.image = staticPage.preview.url;
  }
  let head;
  function find(n) {
    if (n.tagName === "head") head = n;
    else for (const child of n.childNodes || []) find(child);
  }
  find(document);
  if (!head) return html;
  const attr = (node, key) => node.attrs?.find((x) => x.name === key)?.value;
  const set = (tag, match, attrs, text) => {
    let node = head.childNodes.find((n) => n.tagName === tag && match(n));
    if (!node) {
      node = {
        nodeName: tag,
        tagName: tag,
        attrs: [],
        namespaceURI: "http://www.w3.org/1999/xhtml",
        childNodes: [],
        parentNode: head,
      };
      head.childNodes.push(node);
    }
    for (const [name, value] of Object.entries(attrs)) {
      const a = node.attrs.find((a) => a.name === name);
      if (a) a.value = value;
      else node.attrs.push({ name, value });
    }
    if (text !== undefined)
      node.childNodes = [{ nodeName: "#text", value: text, parentNode: node }];
  };
  // The shared build shell describes the base host; native site identities follow tonSite.
  const siteSchema = head.childNodes.find(node => node.tagName === "script" && attr(node,"id") === "jsonld-site");
  if (siteSchema) {
    try {
      const schema = JSON.parse(siteSchema.childNodes.map(node => node.value || "").join(""));
      const site = tonSite(host);
      function rewriteSiteIdentity(value) {
        if (!value || typeof value !== "object") return;
        const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
        if (types.some(type => type === "WebSite" || type === "WebApplication")) {
          value.url = site.origin + "/";
          value.name = site.host;
          if (typeof value["@id"] === "string") {
            const id = new URL(value["@id"], site.origin);
            value["@id"] = site.origin + id.pathname + id.search + id.hash;
          }
        }
        for (const child of Object.values(value)) if (child && typeof child === "object") rewriteSiteIdentity(child);
      }
      rewriteSiteIdentity(schema);
      set("script", node => attr(node,"id") === "jsonld-site", {}, JSON.stringify(schema).replace(/</g,"\\u003c"));
    } catch {}
  }
  set("title", () => true, {}, meta.title);
  set("meta", (n) => attr(n,"name") === "robots", {name:"robots",content:staticPage || isIndexableEntity(pathname) ? "index, follow" : "noindex, follow"});
  set("link", (n) => attr(n, "rel") === "canonical", {
    id: "canonical",
    rel: "canonical",
    href: meta.canonical,
  });
  for (const [key, value] of Object.entries({
    description: meta.description,
    "twitter:title": meta.title,
    "twitter:description": meta.description,
    "twitter:image": meta.image,
    "twitter:card": "summary_large_image",
  }))
    set("meta", (n) => attr(n, "name") === key, { name: key, content: value });
  for (const [key, value] of Object.entries({
    "og:title": meta.title,
    "og:description": meta.description,
    "og:url": meta.canonical,
    "og:image": meta.image,
    "og:image:type": "image/jpeg",
    "og:image:width": String(staticPage?.preview?.width || PAGE_CAPTURE.width),
    "og:image:height": String(staticPage?.preview?.height || PAGE_CAPTURE.height),
    "og:type": "website",
  }))
    set("meta", (n) => attr(n, "property") === key, {
      property: key,
      content: value,
    });
  const capture = staticPage?.preview || PAGE_CAPTURE;
  set("meta", (n) => attr(n,"property") === "og:image:alt", {property:"og:image:alt",content:capture.alt});
  set("meta", (n) => attr(n,"name") === "twitter:image:alt", {name:"twitter:image:alt",content:capture.alt});
  if (!staticPage) {
    head.childNodes = head.childNodes.filter(node => !(node.tagName === "link" && attr(node,"rel") === "alternate" && attr(node,"type") === "text/markdown"));
    const schema = {"@context":"https://schema.org","@type":"WebPage",name:meta.title,description:meta.description,url:meta.canonical};
    set("script", (n) => attr(n,"id") === "native-page-schema", {id:"native-page-schema",type:"application/ld+json"},JSON.stringify(schema).replace(/</g,"\\u003c"));
    if (pathname !== "/") {
      const fragment = parse5.parseFragment(`<main class="container-xl" data-native-seo><h1>${escape(meta.title)}</h1><p>${escape(meta.description)}</p></main>`);
      function body(node) { if (node.tagName === "app-root") {node.childNodes=fragment.childNodes;for(const child of node.childNodes)child.parentNode=node;} else for(const child of node.childNodes || []) body(child); }
      body(document);
    }
  }
  if (staticPage) {
    const origin = tonSite(host).origin;
    if (staticPage.preview) {
      set("meta", (n) => attr(n,"property") === "og:image:alt", {property:"og:image:alt",content:staticPage.preview.alt});
      set("meta", (n) => attr(n,"name") === "twitter:image:alt", {name:"twitter:image:alt",content:staticPage.preview.alt});
    }
    set("link", (n) => attr(n,"rel") === "alternate" && attr(n,"type") === "text/markdown", {rel:"alternate",type:"text/markdown",href:origin + (staticPage.path === "/"?"/index":staticPage.path) + ".md"});
    set("link", (n) => attr(n,"rel") === "describedby", {rel:"describedby",type:"text/plain",href:origin + "/llms.txt"});
    set("script", (n) => attr(n,"id") === "native-page-schema", {id:"native-page-schema",type:"application/ld+json"}, JSON.stringify({"@context":"https://schema.org","@type":staticPage.kind === "docs"?"TechArticle":"WebPage",name:meta.title,description:meta.description,url:meta.canonical}));
  }
  return parse5.serialize(document);
}
async function image(pathname, api, provider, collector, root, host) {
  const site = tonSite(host);
  const key = site.host + pathname;
  const old = cache.get(key);
  if (old && Date.now() - old.at < 300000) return old.body;
  if (pending.has(key)) return pending.get(key);
  if (active >= 4) throw Object.assign(new Error("Busy"), { status: 503 });
  active++;
  const task = (async () => {
    const meta = await metadata(pathname, api, provider, collector, site.host);
    const template = await fs.readFile(
      path.join(__dirname, "ton/og-template.svg"),
      "utf8",
    );
    let logo;
    try {
      logo = await fs.readFile(
        path.join(root, "resources/branding/ton-dark-navbar.svg"),
      );
    } catch {
      logo = await fs.readFile(
        path.join(
          __dirname,
          "../frontend/src/resources/branding/ton-dark-navbar.svg",
        ),
      );
    }
    const tokens = {
      LOGO: "data:image/svg+xml;base64," + logo.toString("base64"),
      META: escape(meta.type),
      LINE1: escape(meta.line1),
      LINE2: escape(meta.line2),
      SUMMARY: escape(meta.summary),
    };
    const svg = template.replace(
      /\{\{([A-Z0-9]+)\}\}/g,
      (_, key) => tokens[key],
    );
    const body = await sharp(Buffer.from(svg)).png().toBuffer();
    cache.set(key, { body, at: Date.now() });
    while (cache.size > 128) cache.delete(cache.keys().next().value);
    return body;
  })().finally(() => {
    active--;
    pending.delete(key);
  });
  pending.set(key, task);
  return task;
}
module.exports = { metadata, inject, image, isIndexableEntity };
