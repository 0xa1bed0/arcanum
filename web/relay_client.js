// WebSocket client for relay server

// Import config (will be loaded first in HTML)
const RELAY_SERVER = SERVER_CONFIG.relay;

function connectWebSocket(url) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        ws.onopen = () => resolve(ws);
        ws.onerror = (err) => {
            console.log('Relay server connection error:', err);
            reject(new Error('Failed to connect'));
        }

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
}

async function waitForRelayData(keyHash) {
    const ws = await connectWebSocket(RELAY_SERVER);

    // Register as waiting
    ws.send(JSON.stringify({
        type: 'wait',
        keyHash: keyHash
    }));

    return new Promise((resolve, reject) => {
        const handler = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'data') {
                ws.removeEventListener('message', handler);
                ws.close();

                // Decode base64
                const binary = atob(msg.data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                resolve(bytes);
            } else if (msg.error) {
                ws.removeEventListener('message', handler);
                ws.close();
                reject(new Error(msg.error));
            }
        };

        ws.addEventListener('message', handler);

        // No timeout - receiver stays connected until data arrives or tab closes
        ws.onclose = () => {
            ws.removeEventListener('message', handler);
            reject(new Error('Connection closed'));
        };
    });
}

async function sendOnce(keyHash, b64Data) {
    const ws = await connectWebSocket(RELAY_SERVER);

    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: 'send',
            keyHash: keyHash,
            data: b64Data
        }));

        const handler = (event) => {
            const msg = JSON.parse(event.data);
            ws.removeEventListener('message', handler);
            ws.close();

            if (msg.status === 'delivered') {
                resolve();
            } else if (msg.error) {
                reject(new Error(msg.error));
            }
        };

        ws.addEventListener('message', handler);
        setTimeout(() => {
            ws.removeEventListener('message', handler);
            ws.close();
            reject(new Error('Send timeout'));
        }, 5000);
    });
}

// Send with retry logic
// - Fails fast on 'receiver_not_found' (unknown key)
// - Retries for up to 2 minutes on other errors
async function sendViaRelay(keyHash, encrypted, onStatus) {
    const b64 = btoa(String.fromCharCode(...encrypted));
    const maxRetryTime = 2 * 60 * 1000; // 2 minutes
    const retryInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (true) {
        try {
            await sendOnce(keyHash, b64);
            return; // Success
        } catch (err) {
            // Fail fast on unknown key
            if (err.message === 'receiver_not_found') {
                throw new Error('Receiver not found. Check that the key is correct and receiver is waiting.');
            }

            // Check if we've exceeded retry time
            if (Date.now() - startTime >= maxRetryTime) {
                throw new Error('Failed to deliver after 2 minutes of retrying.');
            }

            // Retry on other errors (receiver_offline, connection issues, etc.)
            const remaining = Math.ceil((maxRetryTime - (Date.now() - startTime)) / 1000);
            if (onStatus) {
                onStatus(`Retrying... (${remaining}s remaining)`);
            }

            await new Promise(r => setTimeout(r, retryInterval));
        }
    }
}
