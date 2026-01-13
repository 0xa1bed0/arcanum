function showMainButtons() {
    document.getElementById('main-buttons').style.display = 'flex';
    document.getElementById('receive-panel').style.display = 'none';
    document.getElementById('send-panel').style.display = 'none';
    document.getElementById('receive-status').innerHTML = '';
    document.getElementById('send-status').innerHTML = '';
}

function showSendForm() {
    document.getElementById('main-buttons').style.display = 'none';
    document.getElementById('receive-panel').style.display = 'none';
    document.getElementById('send-panel').style.display = 'block';
}

async function startReceive() {
    document.getElementById('main-buttons').style.display = 'none';
    document.getElementById('send-panel').style.display = 'none';
    document.getElementById('receive-panel').style.display = 'block';

    const statusDiv = document.getElementById('receive-status');
    statusDiv.innerHTML = '<div class="status info">Generating keypair...</div>';

    try {
        const { publicKey, privateKey } = await generateKeyPair();
        const publicKeyStr = await exportPublicKey(publicKey);
        const keyHash = await hashPublicKey(publicKeyStr);

        statusDiv.innerHTML = `
            <div class="status success">
                <strong>Ready to receive!</strong><br>
                Share this key with the sender:
            </div>
            <div class="key-display" id="generated-key">${publicKeyStr}</div>
            <button class="copy-btn" onclick="copyKey('${publicKeyStr}')">Copy Key</button>
            <div class="warning-notice">
                <strong>Keep this tab open.</strong> Closing it destroys your private key.
            </div>
            <div class="status info" style="margin-top: 15px;">Waiting for secret...</div>
        `;

        const encryptedData = await waitForRelayData(keyHash);
        const secret = await decryptData(encryptedData, privateKey);

        statusDiv.innerHTML = `
            <div class="status success">
                <strong>Secret received!</strong>
            </div>
            <div class="key-display">${escapeHtml(new TextDecoder().decode(secret))}</div>
            <button class="receive-again-btn" onclick="startReceive()">Receive Another</button>
            <button class="back-btn" onclick="showMainButtons()">Back</button>
        `;

    } catch (err) {
        console.error('Receive error:', err);
        statusDiv.innerHTML = `
            <div class="status error">Error: ${err.message}</div>
            <button class="receive-again-btn" onclick="startReceive()">Try Again</button>
            <button class="back-btn" onclick="showMainButtons()">Back</button>
        `;
    }
}

async function startSend() {
    const btn = document.getElementById('send-btn');
    const statusDiv = document.getElementById('send-status');
    const receiverKeyStr = document.getElementById('receiver-key').value.trim();
    const secret = document.getElementById('secret-input').value;

    statusDiv.innerHTML = '';

    if (!receiverKeyStr) {
        statusDiv.innerHTML = '<div class="status error">Please enter the receiver\'s key</div>';
        return;
    }

    if (!secret) {
        statusDiv.innerHTML = '<div class="status error">Please enter a secret to send</div>';
        return;
    }

    if (!receiverKeyStr.startsWith('arc1pk_')) {
        statusDiv.innerHTML = '<div class="status error">Invalid key format. Key should start with "arc1pk_"</div>';
        return;
    }

    if (receiverKeyStr.length < 20) {
        statusDiv.innerHTML = '<div class="status error">Key is too short. Please copy the complete key.</div>';
        return;
    }

    if (secret.length > 190) {
        statusDiv.innerHTML = '<div class="status error">Secret too long. RSA-OAEP 2048-bit limit is ~190 bytes.</div>';
        return;
    }

    btn.disabled = true;
    statusDiv.innerHTML = '<div class="status info">Encrypting and sending...</div>';

    try {
        const publicKey = await importPublicKey(receiverKeyStr);
        const keyHash = await hashPublicKey(receiverKeyStr);
        const encrypted = await encryptData(new TextEncoder().encode(secret), publicKey);

        await sendViaRelay(keyHash, encrypted);

        statusDiv.innerHTML = '<div class="status success">Secret sent successfully!</div>';

        setTimeout(() => {
            document.getElementById('receiver-key').value = '';
            document.getElementById('secret-input').value = '';
            updateCharCount();
        }, 1000);

    } catch (err) {
        console.error('Send error:', err);

        let errorMsg = err.message;

        if (errorMsg.includes('Failed to import key')) {
            errorMsg = 'Invalid receiver key. Please check that you copied the complete key correctly.';
        } else if (errorMsg.includes('receiver_offline')) {
            errorMsg = 'Receiver is offline. Make sure they clicked "Receive" and are waiting.';
        } else if (errorMsg.includes('Connection timeout')) {
            errorMsg = 'Could not connect to server. Please check your internet connection.';
        } else if (errorMsg.includes('rate_limit')) {
            errorMsg = 'Rate limit exceeded. Please wait a minute before trying again.';
        }

        statusDiv.innerHTML = `<div class="status error">${errorMsg}</div>`;
    } finally {
        btn.disabled = false;
    }
}

function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        event.target.textContent = 'Copied!';
        setTimeout(() => {
            event.target.textContent = 'Copy Key';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        const keyDisplay = document.getElementById('generated-key');
        if (keyDisplay) {
            const range = document.createRange();
            range.selectNode(keyDisplay);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        }
        event.target.textContent = 'Selected - Press Ctrl+C';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadServerConfig() {
    const config = getServerConfig();
    const relayInput = document.getElementById('custom-relay');

    if (relayInput && config.isCustom) {
        relayInput.value = config.relay;
    }
}

function saveSettings() {
    const relayUrl = document.getElementById('custom-relay').value.trim();

    if (relayUrl && !isValidWebSocketUrl(relayUrl)) {
        alert('Invalid server URL. Must start with ws:// or wss://');
        return;
    }

    if (relayUrl) {
        saveCustomServer(relayUrl);
    } else {
        clearCustomServer();
    }

    window.location.reload();
}

function isValidWebSocketUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
        return false;
    }
}

function updateCharCount() {
    const textarea = document.getElementById('secret-input');
    const countEl = document.getElementById('char-count');
    if (textarea && countEl) {
        countEl.textContent = textarea.value.length;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadServerConfig();
    updateCharCount();
});
