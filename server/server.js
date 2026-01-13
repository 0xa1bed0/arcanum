const { WebSocketServer } = require('ws');
const http = require('http');

// Rate limiting configuration (relaxed - real DDoS protection should be at infrastructure level)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP
const SESSION_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SESSIONS_PER_WINDOW = 20; // 20 sessions per minute per IP

// Rate limiting maps
const requestCounts = new Map(); // IP -> { count, windowStart }
const sessionCounts = new Map(); // IP -> { count, windowStart }

// Cleanup rate limiting data every minute
setInterval(() => {
  const now = Date.now();

  // Clean up old request counts
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      requestCounts.delete(ip);
    }
  }

  // Clean up old session counts
  for (const [ip, data] of sessionCounts.entries()) {
    if (now - data.windowStart > SESSION_WINDOW_MS * 2) {
      sessionCounts.delete(ip);
    }
  }
}, 60 * 1000);

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const data = requestCounts.get(ip);

  if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    requestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  data.count++;
  return true;
}

function checkSessionLimit(ip) {
  const now = Date.now();
  const data = sessionCounts.get(ip);

  if (!data || now - data.windowStart > SESSION_WINDOW_MS) {
    // New window
    return true;
  }

  return data.count < MAX_SESSIONS_PER_WINDOW;
}

function recordSession(ip) {
  const now = Date.now();
  const data = sessionCounts.get(ip);

  if (!data || now - data.windowStart > SESSION_WINDOW_MS) {
    sessionCounts.set(ip, { count: 1, windowStart: now });
  } else {
    data.count++;
  }
}

function getSessionRemaining(ip) {
  const data = sessionCounts.get(ip);
  if (!data) return 0;
  const remaining = Math.ceil((SESSION_WINDOW_MS - (Date.now() - data.windowStart)) / 1000);
  return Math.max(0, remaining);
}

const server = http.createServer((req, res) => {
  const clientIP = getClientIP(req);

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      waiting: waitingReceivers.size,
      uptime: process.uptime()
    }));
    return;
  }

  // Rate limit HTTP requests
  if (!checkRateLimit(clientIP)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'rate_limit_exceeded' }));
    console.log(`[RATE_LIMIT] HTTP request blocked for ${clientIP}`);
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

// Map: keyHash -> { ws, timestamp, ip }
const waitingReceivers = new Map();

// Cleanup stale receivers every minute
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [keyHash, receiver] of waitingReceivers.entries()) {
    if (receiver.timestamp < tenMinutesAgo) {
      waitingReceivers.delete(keyHash);
      console.log(`[CLEANUP] Removed stale receiver: ${keyHash.substring(0, 8)}...`);
    }
  }
}, 60 * 1000);

wss.on('connection', (ws, req) => {
  const clientIP = getClientIP(req);
  console.log(`[CONNECT] Client from ${clientIP}`);

  // Check general rate limit on connection
  if (!checkRateLimit(clientIP)) {
    ws.send(JSON.stringify({ error: 'rate_limit_exceeded' }));
    ws.close(1008, 'Rate limit exceeded');
    console.log(`[RATE_LIMIT] Connection blocked for ${clientIP}`);
    return;
  }

  ws.clientIP = clientIP;

  ws.on('message', (data) => {
    // Check rate limit for each message
    if (!checkRateLimit(clientIP)) {
      ws.send(JSON.stringify({ error: 'rate_limit_exceeded' }));
      console.log(`[RATE_LIMIT] Message blocked for ${clientIP}`);
      return;
    }

    try {
      const msg = JSON.parse(data);

      if (msg.type === 'wait') {
        // Receiver waiting for encrypted message
        const { keyHash } = msg;

        if (!keyHash) {
          ws.send(JSON.stringify({ error: 'missing_keyhash' }));
          return;
        }

        // Check session limit for wait operations
        if (!checkSessionLimit(clientIP)) {
          const remaining = getSessionRemaining(clientIP);
          ws.send(JSON.stringify({
            error: 'session_rate_limit',
            retry_after: remaining,
            message: `Rate limit reached (${MAX_SESSIONS_PER_WINDOW}/min). Please wait ${remaining} seconds.`
          }));
          console.log(`[SESSION_LIMIT] Wait blocked for ${clientIP}, retry in ${remaining}s`);
          return;
        }

        // Record this session
        recordSession(clientIP);

        waitingReceivers.set(keyHash, {
          ws: ws,
          timestamp: Date.now(),
          ip: clientIP
        });

        ws.send(JSON.stringify({ status: 'waiting' }));
        console.log(`[WAIT] ${keyHash.substring(0, 8)}... waiting`);

      } else if (msg.type === 'send') {
        // Sender sending encrypted data
        const { keyHash, data: msgData } = msg;

        if (!keyHash || !msgData) {
          ws.send(JSON.stringify({ error: 'missing_fields' }));
          return;
        }

        const receiver = waitingReceivers.get(keyHash);

        if (receiver && receiver.ws.readyState === 1) {
          // Forward encrypted data to receiver
          receiver.ws.send(JSON.stringify({
            type: 'data',
            data: msgData  // base64 encrypted blob
          }));

          ws.send(JSON.stringify({ status: 'delivered' }));

          // Clean up - one-time delivery
          waitingReceivers.delete(keyHash);

          console.log(`[RELAY] ${keyHash.substring(0, 8)}... delivered (${msgData.length} bytes)`);
        } else {
          ws.send(JSON.stringify({ error: 'receiver_offline' }));
          console.log(`[RELAY] ${keyHash.substring(0, 8)}... receiver offline`);
        }

      } else {
        ws.send(JSON.stringify({ error: 'unknown_type' }));
      }

    } catch (err) {
      console.error('[ERROR]', err.message);
      ws.send(JSON.stringify({ error: 'invalid_json' }));
    }
  });

  ws.on('close', () => {
    // Remove from waiting list
    for (const [keyHash, receiver] of waitingReceivers.entries()) {
      if (receiver.ws === ws) {
        waitingReceivers.delete(keyHash);
        console.log(`[DISCONNECT] ${keyHash.substring(0, 8)}...`);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[WS_ERROR]', err.message);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Arcanum Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Rate limit: ${MAX_REQUESTS_PER_WINDOW} req/${RATE_LIMIT_WINDOW_MS/1000}s`);
  console.log(`   Session limit: ${MAX_SESSIONS_PER_WINDOW} per ${SESSION_WINDOW_MS/1000}s`);
  console.log(`   Ready for connections`);
});
