# Arcanum

**Encrypted secret sharing. No storage. No accounts. Just cryptography.**

Share API keys, passwords, and secrets securely. Data is encrypted in your browser before it leaves - the server only sees encrypted blobs it cannot decrypt.

## Why Trust This?

**The code is tiny. Read it yourself.**

| Component | Lines | What it does |
|-----------|-------|--------------|
| [server.js](server/server.js) | ~60 | WebSocket relay - forwards encrypted blobs |
| [crypto.js](app/crypto.js) | ~55 | RSA-OAEP encryption via Web Crypto API |
| [relay.js](app/relay.js) | ~65 | WebSocket client with retry logic |
| [app.js](app/app.js) | ~90 | UI logic |

No frameworks. No build step. One dependency (`ws` for WebSocket). Audit the entire thing in 10 minutes.

## Why Not Just Use...

| Alternative | Problem |
|-------------|---------|
| **Slack DM** | Logged forever, visible to admins, searchable |
| **Email** | Stored on servers, often unencrypted in transit |
| **Signal** | Both parties need accounts and the app installed |
| **PGP** | Nobody has it set up, key exchange is painful |
| **1Password/LastPass sharing** | Requires paid subscription, both need accounts |
| **Pastebin + "delete after read"** | They still store it, you're trusting them |

**Arcanum:** Open browser → share key → done. No accounts, no installs, verifiable encryption.

## How It Works

```
Receiver                        Server                         Sender
   │                              │                               │
   │  1. Generate RSA keypair     │                               │
   │  2. Share public key ───────────────────────────────────────>│
   │                              │                               │
   │                              │   3. Encrypt with public key  │
   │                              │<───────── Encrypted blob ─────│
   │                              │                               │
   │<──────── Forward blob ───────│                               │
   │  4. Decrypt with private key │                               │
   │  5. Keys destroyed           │                               │
```

The server is a **dumb pipe**. It forwards encrypted data without being able to read it.

## Quick Start

**Try it:** [arcanum.sh](https://arcanum.sh)

No signup. Works in any modern browser.

## Self-Hosting

```bash
# Full app (webapp + relay)
docker run -d -p 8080:8080 ghcr.io/0xa1bed0/arcanum:latest

# Relay only
docker run -d -p 8080:8080 ghcr.io/0xa1bed0/arcanum-relay:latest
```

See [Self-Hosting Guide](docs/SELF-HOSTING.md) for Kubernetes, Heroku, Digitalocean, building from source, etc.

## Security

| Property | Implementation |
|----------|----------------|
| Encryption | RSA-OAEP 2048-bit, SHA-256 (Web Crypto API) |
| Key lifecycle | Generated per session, never leaves browser, destroyed after use |
| Server storage | None - real-time relay only |
| Large secrets | Automatically chunked (no size limit) |

**Found a vulnerability?** Email security@arcanum.sh or open a [security advisory](https://github.com/0xa1bed0/arcanum/security/advisories/new).

## Development

```bash
cd server && npm install && node server.js  # Relay on :8080
cd app && npx serve                          # App on :3000
```

## License

[Elastic License 2.0](LICENSE.md)
