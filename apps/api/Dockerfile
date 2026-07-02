FROM node:20-slim AS build
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @dnd/api prisma:generate
RUN pnpm --filter @dnd/api build
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @dnd/api exec prisma migrate deploy && node apps/api/dist/src/main.js"]
