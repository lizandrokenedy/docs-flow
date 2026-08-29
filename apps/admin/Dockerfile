FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
RUN npm install --workspace=@docs-flow/admin --workspace=@docs-flow/types --workspace=@docs-flow/ui --include-workspace-root

FROM base AS dev
COPY . .
RUN npm run build --workspace=@docs-flow/types && npm run build --workspace=@docs-flow/ui
WORKDIR /app/apps/admin
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build --workspace=@docs-flow/types && npm run build --workspace=@docs-flow/ui
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@docs-flow/admin

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
