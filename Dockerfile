# Pakka on Cloud Run: one container serves the API, Bolna's tool calls and webhooks, and the web app.

# ── Build the web app ──
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Server ──
FROM node:22-alpine
ENV NODE_ENV=production STORE=firestore
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ server/
COPY lib/ lib/
COPY agents/ agents/
COPY data/listings.seed.json data/listings.seed.json
COPY --from=web /web/dist web/dist
USER node
CMD ["node", "server/index.mjs"]
