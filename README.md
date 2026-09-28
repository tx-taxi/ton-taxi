<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/src/resources/branding/ton-dark-full.svg">
    <img src="frontend/src/resources/branding/ton-light-full.svg" width="360" alt="ton.tx.taxi banner logo">
  </picture>
</p>

<h1 align="center">TON Explorer · ton.tx.taxi</h1>

<p align="center">TON blocks, transactions, accounts, jettons, and NFTs.<br>
<a href="https://ton.tx.taxi">Open ton.tx.taxi</a> · <a href="https://tx.taxi">Explorer hub</a></p>

## Overview

This explorer adapts the existing tx.taxi/mempool interface to TON. Public chain data comes from configured indexing services and verified block data from public lite servers. Shared collectors provide consecutive masterchain blocks, actual block fees, and observed pending external messages over WebSocket. Account and asset pages expose indexed transactions, messages, jetton balances, NFT metadata and available history.

## Features

- Consecutive masterchain blocks, shard context, exact collected fees, transactions and message traces.
- Live observed pending messages with confirmation removal and explicit stale states.
- Wallet and contract pages with jetton balances, NFTs and available indexed history.
- NFT, collection and jetton details, including on-chain Telegram collectibles.
- Explorer REST and WebSocket documentation in the application.

## Development

Install frontend and adapter dependencies with `npm ci` in each directory. Build the TON frontend with:

```sh
cd frontend
cp mempool-frontend-config.ton.json mempool-frontend-config.json
SKIP_SYNC=1 npm run build
```

Start the chain adapter and built frontend from the repository root:

```sh
TON_API_KEY_FILE=/absolute/path/to/tonapi.key \
TON_STATIC_ROOT="$PWD/frontend/dist/mempool/browser" \
TON_DATA_DIR="$PWD/.ton-data" PORT=8080 node adapter/ton-server.cjs
```

Open <http://localhost:8080>. Keep the TonAPI key outside the repository; it is used only by the server. The frontend's `TX_TAXI_ROUTER_URL` setting selects the shared search router. The adapter serves `/api/ton/`, the native `/api/v1/` compatibility routes, `/api/v1/ws`, and `/healthz`. Provider freshness is available at `/api/provider-health`.

## Container

Build with `docker build -t ton-taxi .`. Mount a durable volume at `/data/ton` and mount the provider key read-only; set `TON_API_KEY_FILE` to its container path. The image serves port 8080 by default. Pending and confirmed acquisition run once per service instance; do not scale replicas without coordinating those collectors.

Pending messages are provider-observed external messages. Missing fees, delivery times, network capacity and unavailable historical metadata are not estimated. Source interruptions preserve observations with explicit stale/unavailable states.

## Attribution and license

This repository derives from the tx.taxi Ethereum explorer and the [Mempool Open Source Project](https://github.com/mempool/mempool). Previous upstream setup guidance is preserved in [UPSTREAM_README.md](UPSTREAM_README.md).

The code is distributed under [LICENSE](LICENSE) and [COPYING.md](COPYING.md), including the GNU Affero General Public License v3 and applicable trademark notices. Original tx.taxi modifications and documentation are credited to tx.taxi contributors (2026); upstream notices are preserved.

The software license does not grant trademark rights to the tx.taxi name or logos. Independent deployments should use their own branding and must not imply tx.taxi endorsement.

## Links

- [Live explorer](https://ton.tx.taxi)
- [tx.taxi hub](https://tx.taxi)
- [Telegram channel](https://t.me/txtaxi)
- [Contact](https://t.me/hiss)
