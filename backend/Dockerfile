FROM node:20-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache openssl

COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
RUN apk add --no-cache openssl wget

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV PORT=3000

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/healthz || exit 1

CMD ["node", "dist/main.js"]
