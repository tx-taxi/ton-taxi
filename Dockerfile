FROM node:26-bookworm-slim AS frontend-builder

WORKDIR /app/frontend
RUN apt-get update \
    && apt-get install -y --no-install-recommends rsync \
    && rm -rf /var/lib/apt/lists/*
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
COPY frontend/mempool-frontend-config.ton.json ./mempool-frontend-config.json
RUN SKIP_SYNC=1 npm run build

FROM node:26-bookworm-slim

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY adapter/package.json adapter/package-lock.json ./adapter/
RUN cd adapter && npm ci --omit=dev
COPY adapter ./adapter
COPY --from=frontend-builder /app/frontend/dist/mempool/browser ./public
# Keep runtime configuration, theme assets, and the TON favicon available
# even when an Angular build omits the copied resources directory.
COPY --from=frontend-builder /app/frontend/src/resources ./public/resources

ENV TON_ADAPTER_HOST=0.0.0.0
ENV TON_STATIC_ROOT=/app/public
ENV TON_DATA_DIR=/data/ton
ENV PORT=8080
RUN mkdir -p /data/ton
VOLUME ["/data/ton"]
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "adapter/ton-server.cjs"]
