FROM node:20-alpine

# Security: Create non-root user first
RUN addgroup -g 1001 -S arcanum && \
    adduser -S arcanum -u 1001 -G arcanum && \
    mkdir -p /app && \
    chown -R arcanum:arcanum /app

WORKDIR /app

# Security: Copy with correct ownership and minimal permissions
COPY --chown=arcanum:arcanum package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --chown=arcanum:arcanum server.js ./

# Security: Run as non-root user
USER arcanum

# Security: Drop all capabilities, read-only hints for runtime
LABEL org.opencontainers.image.source="https://github.com/0xa1bed0/arcanum" \
      org.opencontainers.image.description="Arcanum relay server" \
      org.opencontainers.image.licenses="Elastic-2.0"

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "server.js"]
