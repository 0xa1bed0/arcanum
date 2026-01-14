const { WebSocketServer } = require('ws');
const http = require('http');

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      waiting: waitingReceivers.size,
      uptime: process.uptime()
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

// Map: keyHash -> { ws, ip }
// Only stores WebSocket references, NOT data
// Data is piped directly from sender to receiver with zero storage
const waitingReceivers = new Map();

wss.on('connection', (ws, req) => {
  const ip = getClientIP(req);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'wait') {
        const { keyHash } = msg;
        if (!keyHash) {
          ws.send(JSON.stringify({ error: 'missing_keyhash' }));
          return;
        }

        waitingReceivers.set(keyHash, { ws, ip });
        ws.send(JSON.stringify({ status: 'waiting' }));

      } else if (msg.type === 'send') {
        const { keyHash, data } = msg;
        if (!keyHash || !data) {
          ws.send(JSON.stringify({ error: 'missing_fields' }));
          return;
        }

        const receiver = waitingReceivers.get(keyHash);

        if (!receiver) {
          ws.send(JSON.stringify({ error: 'receiver_not_found' }));
        } else if (receiver.ws.readyState !== 1) {
          ws.send(JSON.stringify({ error: 'receiver_offline' }));
          waitingReceivers.delete(keyHash);
        } else {
          // PIPE: Forward immediately, zero storage
          receiver.ws.send(JSON.stringify({ type: 'data', data }));
          ws.send(JSON.stringify({ status: 'delivered' }));
          waitingReceivers.delete(keyHash);
          console.log('delivered');
        }

      } else {
        ws.send(JSON.stringify({ error: 'unknown_type' }));
      }

    } catch (err) {
      ws.send(JSON.stringify({ error: 'invalid_json' }));
    }
  });

  ws.on('close', () => {
    for (const [keyHash, receiver] of waitingReceivers.entries()) {
      if (receiver.ws === ws) {
        waitingReceivers.delete(keyHash);
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Arcanum Server running on port ${PORT}`);
});
