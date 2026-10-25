# server/Dockerfile
# Production Dockerfile for Node.js API server
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=5000

# Set user permissions
RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
