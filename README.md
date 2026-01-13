# Arcanum

Encrypted secret sharing with relay transfer.

[![License](https://img.shields.io/badge/License-Elastic_2.0-blue.svg)](https://github.com/0xa1bed0/arcanum/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-0xa1bed0%2Farcanum-blue)](https://github.com/0xa1bed0/arcanum)

## Features

- **End-to-end encryption** - RSA-OAEP 2048-bit
- **Encrypted relay** - Server only sees encrypted blobs
- **No secrets stored** - Zero retention policy
- **Ephemeral keys** - One-time use only
- **Self-hostable** - Run your own server
- **Custom server support** - Use your own infrastructure

## Quick Start

Visit: **https://arcanum.sh**

No installation required. Works directly in your browser.

## How It Works

1. **Receiver** generates ephemeral RSA keypair
2. **Receiver** shares public key with sender (via Slack, email, etc)
3. **Sender** encrypts secret with receiver's public key
4. **Encrypted transfer** - Data sent via relay server
5. **Receiver** decrypts with private key
6. **Keys destroyed** - No trace left

## Architecture

```
┌─────────┐                                        ┌──────────┐
│ Sender  │ ──encrypted blob──> Server ──────────>│ Receiver │
└─────────┘                                        └──────────┘
```

- **Server** - Encrypted message relay (port 8080)
- **Web App** - Browser interface

## Self-Hosting

You can run your own server for full control over your infrastructure.

### Quick Start with Docker

```bash
git clone https://github.com/0xa1bed0/arcanum.git
cd arcanum
docker-compose up -d
```

### Configure Custom Server

1. Enter your server URL in the input field (e.g., `wss://relay.yourdomain.com`)
2. Click "Save"

See [Self-Hosting Guide](docs/SELF-HOSTING.md) for detailed instructions including:
- Docker deployment
- Manual Node.js setup
- Nginx reverse proxy with SSL
- PM2 process management
- Health checks and monitoring

## Development

```bash
# Run server
cd server
npm install
node server.js

# Serve web app (new terminal)
cd web
npx live-server --port=8000
```

## Rate Limiting

The server includes built-in rate limiting to prevent casual abuse:
- **60 requests** per minute per IP
- **20 sessions** per minute per IP

For real DDoS protection, deploy behind Cloudflare or similar.

## Security

- All encryption happens client-side
- Server cannot decrypt secrets
- No data written to disk or databases
- Keys are ephemeral and destroyed after use
- Open source for security audits

## License

[Elastic License 2.0](LICENSE)

## Contributing

Issues and pull requests welcome!

## Support

- [Report Bug](https://github.com/0xa1bed0/arcanum/issues)
- [Request Feature](https://github.com/0xa1bed0/arcanum/issues)
- [Self-Hosting Guide](docs/SELF-HOSTING.md)
