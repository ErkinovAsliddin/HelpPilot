# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/src/frontend
COPY src/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY src/frontend/ ./
RUN npm run build

# ---------- Stage 2: build backend (TypeScript) ----------
FROM node:20-alpine AS backend-builder
WORKDIR /app
# build tools needed for native modules like better-sqlite3 (no musl prebuilds)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
# typescript isn't in package.json devDependencies yet — installing explicitly so the build works
RUN npm install --no-save typescript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ---------- Stage 3: final runtime image ----------
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# same build tools needed here since this is a separate npm ci run
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/src/frontend/dist ./src/frontend/dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
