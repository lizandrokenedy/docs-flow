FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN npm install --workspace=@docs-flow/api --workspace=@docs-flow/types --include-workspace-root

FROM base AS dev
COPY . .
RUN npm run build --workspace=@docs-flow/types
WORKDIR /app/apps/api
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build --workspace=@docs-flow/types
RUN npm run generate --workspace=@docs-flow/api
RUN npm run build --workspace=@docs-flow/api

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && npx prisma db seed --schema=prisma/schema.prisma && node dist/main.js"]
