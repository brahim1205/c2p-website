ARG NODE_ALPINE_BASE=node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
ARG NGINX_UNPRIVILEGED_BASE=nginxinc/nginx-unprivileged:1.29-alpine3.23@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6

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

USER root
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/out ./

USER 101
EXPOSE 8080
