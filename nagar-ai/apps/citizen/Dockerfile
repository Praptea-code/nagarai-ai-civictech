# Multi-stage production image for the citizen/admin Next.js app.
# NEXT_PUBLIC_* vars are inlined at build time, so Supabase config is supplied
# as build args (wired from the root .env by docker-compose.yml).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
# next.config.mjs resolves rewrites at BUILD time (they are baked into .next),
# so the compose-network origin must be set here or the production server
# proxies /api/v1/* to localhost and every API call returns 500.
ARG BACKEND_ORIGIN="http://backend:8000"
# Same-origin API: next.config.mjs proxies /api/v1/* to BACKEND_ORIGIN.
ENV NEXT_PUBLIC_API_BASE_URL=/api/v1 \
    BACKEND_ORIGIN=$BACKEND_ORIGIN \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
