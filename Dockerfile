# Stage 1: build Vue frontend
FROM oven/bun:1.3 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bunx vite build

# Stage 2: production server
FROM oven/bun:1.3
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production
COPY server/ ./server/
COPY tsconfig.json ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
EXPOSE 8080

CMD ["bun", "server/index.ts"]
