// RSA-OAEP 2048-bit encryption via Web Crypto API

const CHUNK_SIZE = 190; // RSA-OAEP 2048-bit with SHA-256 max plaintext

async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportPublicKey(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
  return 'arc1pk_' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importPublicKey(keyStr) {
  if (!keyStr?.startsWith('arc1pk_')) throw new Error('Invalid key format');
  let b64 = keyStr.slice(7).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', bytes, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
}

async function encryptData(data, publicKey) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const chunks = [];

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, chunk);
    chunks.push(btoa(String.fromCharCode(...new Uint8Array(encrypted))));
  }

  return chunks;
}

async function decryptData(chunks, privateKey) {
  const decrypted = [];

  for (const chunk of chunks) {
    const bytes = Uint8Array.from(atob(chunk), c => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes);
    decrypted.push(...new Uint8Array(plain));
  }

  return new Uint8Array(decrypted);
}

async function hashPublicKey(keyStr) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyStr));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(hash).slice(0, 16)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
