const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const waitingReceivers = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', waiting: waitingReceivers.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'wait') {
        if (!msg.keyHash) {
          ws.send(JSON.stringify({ error: 'missing_keyhash' }));
          return;
        }

        waitingReceivers.set(msg.keyHash, ws);
        ws.send(JSON.stringify({ status: 'waiting' }));

      } else if (msg.type === 'send') {
        if (!msg.keyHash || !msg.data) {
          ws.send(JSON.stringify({ error: 'missing_fields' }));
          return;
        }

        const receiver = waitingReceivers.get(msg.keyHash);

        if (!receiver) {
          ws.send(JSON.stringify({ error: 'receiver_not_found' }));
        } else if (receiver.readyState !== 1) {
          ws.send(JSON.stringify({ error: 'receiver_offline' }));
          waitingReceivers.delete(msg.keyHash);
        } else {
          receiver.send(JSON.stringify({ type: 'data', data: msg.data }));
          ws.send(JSON.stringify({ status: 'delivered' }));
          waitingReceivers.delete(msg.keyHash);
          console.log('delivered');
        }

      } else {
        ws.send(JSON.stringify({ error: 'unknown_type' }));
      }
    } catch {
      ws.send(JSON.stringify({ error: 'invalid_json' }));
    }
  });

  ws.on('close', () => {
    for (const [hash, socket] of waitingReceivers) {
      if (socket === ws) waitingReceivers.delete(hash);
    }
  });
});

server.listen(PORT, () => console.log(`Relay running on port ${PORT}`));
