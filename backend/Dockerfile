ARG NODE_ALPINE_BASE=node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

FROM ${NODE_ALPINE_BASE} AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache openssl=3.5.6-r0

COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
RUN npm ci

COPY src ./src
RUN npm run build

FROM builder AS migrator
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM ${NODE_ALPINE_BASE} AS runner
WORKDIR /usr/src/app
RUN apk add --no-cache \
    openssl=3.5.6-r0 \
    wget=1.25.0-r2

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# The runtime image does not need package managers. Removing them cuts the
# attack surface and avoids Trivy findings coming only from bundled npm/yarn.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /opt/yarn-v* \
 && rm -f /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY scripts/grant-test-non-premium-accounts.mjs ./scripts/grant-test-non-premium-accounts.mjs
COPY scripts/grant-test-premium-subscriptions.mjs ./scripts/grant-test-premium-subscriptions.mjs
COPY scripts/upload-object-audit.mjs ./scripts/upload-object-audit.mjs
COPY scripts/upload-temp-cleanup.mjs ./scripts/upload-temp-cleanup.mjs

RUN mkdir -p /usr/src/app/storage/uploads/_tmp \
 && chown -R node:node /usr/src/app/storage

ENV NODE_ENV=production
ENV PORT=3000

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/healthz || exit 1

CMD ["node", "dist/main.js"]
