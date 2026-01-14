FROM node:20-alpine

# Security: Install nginx with no cache
RUN apk add --no-cache nginx && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S arcanum && \
    adduser -S arcanum -u 1001 -G arcanum && \
    mkdir -p /app /var/www/html /run/nginx /var/lib/nginx/tmp && \
    chown -R arcanum:arcanum /app /var/www/html /run/nginx /var/lib/nginx /var/log/nginx

WORKDIR /app

# Relay server
COPY --chown=arcanum:arcanum server/package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --chown=arcanum:arcanum server/server.js ./

# Web app - static files
COPY --chown=arcanum:arcanum app/ /var/www/html/

# Nginx config
COPY --chown=arcanum:arcanum docker/nginx.conf /etc/nginx/nginx.conf

# Entrypoint
COPY --chown=arcanum:arcanum docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

# Security: Run as non-root user
USER arcanum

# Metadata labels
LABEL org.opencontainers.image.source="https://github.com/0xa1bed0/arcanum" \
      org.opencontainers.image.description="Arcanum - Encrypted secret sharing" \
      org.opencontainers.image.licenses="Elastic-2.0"

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["/entrypoint.sh"]
