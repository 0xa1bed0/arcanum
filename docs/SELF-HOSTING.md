# Self-Hosting Arcanum Server

This guide explains how to deploy your own Arcanum relay server for full control over your infrastructure.

## Overview

Arcanum requires one server:
- **Relay Server** (port 8080) - Forwards encrypted messages between sender and receiver

The server is a stateless Node.js application with no database requirements.

## Quick Start with Docker Compose

The easiest way to self-host is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/0xa1bed0/arcanum.git
cd arcanum

# Start the server
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Your server will be available at:
- Relay: `ws://localhost:8080`

## Manual Docker Deployment

### Build Image

```bash
cd server
docker build -t arcanum-server .
```

### Run Container

```bash
docker run -d \
  --name arcanum-server \
  -p 8080:8080 \
  --restart unless-stopped \
  arcanum-server
```

## Manual Node.js Deployment

### Requirements
- Node.js 18+ (recommended: Node.js 20 LTS)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/0xa1bed0/arcanum.git
cd arcanum

# Install server dependencies
cd server
npm install
```

### Running the Server

```bash
cd server
PORT=8080 node server.js
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start server
cd server
pm2 start server.js --name arcanum-server

# Save PM2 configuration
pm2 save

# Enable startup on boot
pm2 startup
```

## Production Deployment

### Reverse Proxy with Nginx

For production, use Nginx as a reverse proxy with SSL termination:

```nginx
# /etc/nginx/sites-available/arcanum

server {
    listen 443 ssl http2;
    server_name arcanum.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/arcanum.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arcanum.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d arcanum.yourdomain.com
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |

### Rate Limiting

The server includes built-in rate limiting to prevent abuse:

- **General rate limit**: 60 requests per minute per IP
- **Session limit**: 20 sessions per minute per IP

Rate limits are relaxed to accommodate users behind shared IPs (NAT, VPN, corporate networks). For real DDoS protection, deploy behind Cloudflare or similar.

## Connecting the Web App

Once your server is running, configure the Arcanum web app to use it:

1. Open the web app
2. Enter your server URL in the "Relay server" field (e.g., `wss://relay.yourdomain.com`)
3. Click "Save"

## Health Check

The server exposes a health endpoint:

```bash
curl http://localhost:8080/health
```

Response format:
```json
{
  "status": "ok",
  "waiting": 3,      // waiting receivers
  "uptime": 3600.5   // server uptime in seconds
}
```

## Monitoring

### Docker Stats

```bash
docker stats arcanum-server
```

### PM2 Monitoring

```bash
pm2 monit
```

### Logs

```bash
# Docker
docker logs -f arcanum-server

# PM2
pm2 logs arcanum-server
```

## Security Considerations

1. **Always use HTTPS/WSS in production** - Use a reverse proxy with SSL
2. **Firewall rules** - Only expose port 443 (HTTPS) publicly
3. **Regular updates** - Keep Node.js and dependencies updated
4. **Resource limits** - Set memory/CPU limits in Docker or systemd

## Troubleshooting

### Connection refused
- Check if server is running: `docker ps` or `pm2 list`
- Verify port is not blocked by firewall
- Check server logs for errors

### WebSocket upgrade failed
- Ensure Nginx is configured for WebSocket proxying
- Check `proxy_http_version 1.1` and `Upgrade` headers

### Rate limit errors
- Wait a minute and try again
- Check if your IP is being shared (NAT/VPN) - limits are relaxed but may still trigger

## Architecture

```
                    ┌─────────────────┐
                    │   Nginx/SSL     │
                    │   (port 443)    │
                    └────────┬────────┘
                             │
                   ┌─────────▼─────────┐
                   │   Relay Server    │
                   │   (port 8080)     │
                   │                   │
                   │ - Message relay   │
                   │ - Encrypted fwd   │
                   └───────────────────┘
```

## Support

- [GitHub Issues](https://github.com/0xa1bed0/arcanum/issues)
- [Documentation](https://github.com/0xa1bed0/arcanum/blob/main/README.md)
