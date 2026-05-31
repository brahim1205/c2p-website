ARG NODE_ALPINE_BASE=node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
ARG NGINX_UNPRIVILEGED_BASE=nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0

FROM ${NODE_ALPINE_BASE} AS builder
WORKDIR /usr/src/app

COPY package.json package-lock.json tsconfig*.json vite.config.ts postcss.config.ts tailwind.config.ts ./
COPY public ./public
COPY src ./src
COPY index.html ./index.html
COPY eslint.config.ts ./eslint.config.ts
COPY auto-imports.d.ts ./auto-imports.d.ts

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm ci
RUN npm run build

FROM ${NGINX_UNPRIVILEGED_BASE}
WORKDIR /usr/share/nginx/html

# Keep the runtime image deterministic by pinning the exact patched Alpine
# package set instead of floating on whatever `apk upgrade` resolves that day.
USER root
RUN apk add --no-cache --upgrade \
    alpine-release=3.21.7-r0 \
    busybox=1.37.0-r14 \
    busybox-binsh=1.37.0-r14 \
    c-ares=1.34.6-r0 \
    ca-certificates=20260413-r0 \
    ca-certificates-bundle=20260413-r0 \
    curl=8.14.1-r2 \
    libcrypto3=3.3.7-r0 \
    libcurl=8.14.1-r2 \
    libexpat=2.7.5-r0 \
    libpng=1.6.57-r0 \
    libssl3=3.3.7-r0 \
    libxml2=2.13.9-r1 \
    libxpm=3.5.19-r0 \
    musl=1.2.5-r11 \
    musl-utils=1.2.5-r11 \
    nghttp2-libs=1.69.0-r0 \
    ssl_client=1.37.0-r14 \
    tiff=4.7.1-r0 \
    tzdata=2026b-r0 \
    xz-libs=5.8.3-r0 \
    zlib=1.3.2-r0

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/out ./

USER 101
EXPOSE 8080
