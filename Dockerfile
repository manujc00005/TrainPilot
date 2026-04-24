# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
# Install only production deps + rebuild native modules (better-sqlite3)
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Persistent data directory (mounted as Fly volume)
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "dist/index.js"]
