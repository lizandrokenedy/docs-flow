FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
RUN npm install --ignore-scripts --workspace=@docs-flow/web --workspace=@docs-flow/types --workspace=@docs-flow/ui --include-workspace-root

FROM base AS dev
COPY . .
RUN npm run build --workspace=@docs-flow/types && npm run build --workspace=@docs-flow/ui
WORKDIR /app/apps/web
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build --workspace=@docs-flow/types && npm run build --workspace=@docs-flow/ui
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@docs-flow/web

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
