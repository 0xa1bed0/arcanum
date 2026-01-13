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

        // 60 second timeout
        setTimeout(() => {
            ws.removeEventListener('message', handler);
            ws.close();
            reject(new Error('Receive timeout'));
        }, 60000);
    });
}

async function sendViaRelay(keyHash, encrypted) {
    const ws = await connectWebSocket(RELAY_SERVER);

    return new Promise((resolve, reject) => {
        const b64 = btoa(String.fromCharCode(...encrypted));

        ws.send(JSON.stringify({
            type: 'send',
            keyHash: keyHash,
            data: b64
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
        setTimeout(() => reject(new Error('Send timeout')), 5000);
    });
}
