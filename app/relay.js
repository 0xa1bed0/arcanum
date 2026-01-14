// WebSocket relay client

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error('Connection failed'));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function waitForData(keyHash) {
  const ws = await connect(CONFIG.relay);
  ws.send(JSON.stringify({ type: 'wait', keyHash }));

  return new Promise((resolve, reject) => {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'data') {
        ws.close();
        resolve(msg.data); // Array of base64 chunks
      } else if (msg.error) {
        ws.close();
        reject(new Error(msg.error));
      }
    };
    ws.onclose = () => reject(new Error('Connection closed'));
  });
}

async function sendOnce(keyHash, chunks) {
  const ws = await connect(CONFIG.relay);
  ws.send(JSON.stringify({ type: 'send', keyHash, data: chunks }));

  return new Promise((resolve, reject) => {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      ws.close();
      if (msg.status === 'delivered') resolve();
      else reject(new Error(msg.error || 'Send failed'));
    };
    setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 5000);
  });
}

async function sendData(keyHash, chunks, onStatus) {
  const deadline = Date.now() + 120000; // 2 min

  while (true) {
    try {
      await sendOnce(keyHash, chunks);
      return;
    } catch (err) {
      if (err.message === 'receiver_not_found') {
        throw new Error('Receiver not found. Check key and ensure receiver is waiting.');
      }
      if (Date.now() >= deadline) {
        throw new Error('Failed to deliver after 2 minutes.');
      }
      onStatus?.(`Retrying... (${Math.ceil((deadline - Date.now()) / 1000)}s left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}
