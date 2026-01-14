// UI logic

// Initialize relay URL input on page load
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('relay-url');
  if (input) input.value = CONFIG.relay;
});

function updateRelay() {
  const input = document.getElementById('relay-url');
  const url = input.value.trim();
  if (url) {
    CONFIG.relay = url;
    input.style.borderColor = '#10b981';
    setTimeout(() => input.style.borderColor = '', 1000);
  }
}

function showMain() {
  document.getElementById('main-buttons').style.display = 'flex';
  document.getElementById('receive-panel').style.display = 'none';
  document.getElementById('send-panel').style.display = 'none';
}

function showSend() {
  document.getElementById('main-buttons').style.display = 'none';
  document.getElementById('send-panel').style.display = 'block';
}

async function startReceive() {
  document.getElementById('main-buttons').style.display = 'none';
  document.getElementById('receive-panel').style.display = 'block';
  const status = document.getElementById('receive-status');

  try {
    status.innerHTML = '<div class="status info">Generating keypair...</div>';
    const { publicKey, privateKey } = await generateKeyPair();
    const pubKeyStr = await exportPublicKey(publicKey);
    const keyHash = await hashPublicKey(pubKeyStr);

    status.innerHTML = `
      <div class="status success"><strong>Ready to receive!</strong><br>Share this key with sender:</div>
      <div class="key-display">${pubKeyStr}</div>
      <button class="btn copy" onclick="copyKey('${pubKeyStr}', this)">Copy Key</button>
      <div class="warning">Keep this tab open. Closing destroys your private key.</div>
      <div class="status info">Waiting for secret...</div>
    `;

    const chunks = await waitForData(keyHash);
    const secret = await decryptData(chunks, privateKey);

    status.innerHTML = `
      <div class="status success"><strong>Secret received!</strong></div>
      <div class="key-display">${escapeHtml(new TextDecoder().decode(secret))}</div>
      <button class="btn" onclick="startReceive()">Receive Another</button>
      <button class="btn secondary" onclick="showMain()">Back</button>
    `;
  } catch (err) {
    status.innerHTML = `
      <div class="status error">Error: ${escapeHtml(err.message)}</div>
      <button class="btn" onclick="startReceive()">Try Again</button>
      <button class="btn secondary" onclick="showMain()">Back</button>
    `;
  }
}

async function startSend() {
  const keyInput = document.getElementById('receiver-key');
  const secretInput = document.getElementById('secret-input');
  const status = document.getElementById('send-status');
  const btn = document.getElementById('send-btn');

  const key = keyInput.value.trim();
  const secret = secretInput.value;

  if (!key) return status.innerHTML = '<div class="status error">Enter receiver key</div>';
  if (!secret) return status.innerHTML = '<div class="status error">Enter secret</div>';
  if (!key.startsWith('arc1pk_')) return status.innerHTML = '<div class="status error">Invalid key format</div>';

  btn.disabled = true;
  status.innerHTML = '<div class="status info">Encrypting and sending...</div>';

  try {
    const publicKey = await importPublicKey(key);
    const keyHash = await hashPublicKey(key);
    const chunks = await encryptData(secret, publicKey);
    await sendData(keyHash, chunks, (s) => status.innerHTML = `<div class="status info">${s}</div>`);

    status.innerHTML = '<div class="status success">Secret sent!</div>';
    keyInput.value = '';
    secretInput.value = '';
  } catch (err) {
    status.innerHTML = `<div class="status error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function copyKey(key, btn) {
  navigator.clipboard.writeText(key).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy Key', 2000);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
