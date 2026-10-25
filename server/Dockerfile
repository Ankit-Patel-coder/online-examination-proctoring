# server/Dockerfile
# Production multi-stage Dockerfile for Node.js API server
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Create application directory and set permissions
RUN chown -R node:node /app
USER node

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
