FROM node:20-alpine AS builder
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

FROM nginxinc/nginx-unprivileged:1.27-alpine
WORKDIR /usr/share/nginx/html

# Pull in the latest patched Alpine packages available for the pinned base tag.
# This avoids Trivy failures caused only by stale OS packages in the base layer.
USER root
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/out ./

USER 101
EXPOSE 8080
