// Web Crypto API wrapper for RSA encryption

async function generateKeyPair() {
    return await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportPublicKey(publicKey) {
    const exported = await crypto.subtle.exportKey("spki", publicKey);
    const bytes = new Uint8Array(exported);
    
    console.log('[exportPublicKey] SPKI bytes length:', bytes.length);
    console.log('[exportPublicKey] First bytes:', Array.from(bytes.slice(0, 10)));
    
    // Convert to base64 properly
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    
    console.log('[exportPublicKey] Base64 length:', b64.length);
    
    // Use URL-safe base64 (RawURLEncoding - no padding)
    const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    return "arc1pk_" + urlSafe;
}

async function importPublicKey(keyStr) {
    console.log('[importPublicKey] Starting import...');
    console.log('[importPublicKey] Input:', keyStr?.substring(0, 30) + '...');
    
    try {
        // Validate format
        if (!keyStr || typeof keyStr !== 'string') {
            throw new Error("Key must be a string");
        }
        
        keyStr = keyStr.trim();
        console.log('[importPublicKey] After trim length:', keyStr.length);
        
        if (!keyStr.startsWith("arc1pk_")) {
            throw new Error("Key must start with arc1pk_");
        }
        
        // Extract base64 part
        let b64 = keyStr.substring(7);
        console.log('[importPublicKey] Base64 part length:', b64.length);
        
        if (b64.length === 0) {
            throw new Error("Key is empty");
        }
        
        // Convert from URL-safe base64 to standard base64
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        
        // Add padding if needed (base64 must be multiple of 4)
        while (b64.length % 4 !== 0) {
            b64 += '=';
        }
        
        console.log('[importPublicKey] With padding length:', b64.length);
        console.log('[importPublicKey] Base64 sample:', b64.substring(0, 40) + '...');
        
        // Decode base64 to binary
        let binary;
        try {
            binary = atob(b64);
            console.log('[importPublicKey] Decoded binary length:', binary.length);
        } catch (e) {
            console.error('[importPublicKey] atob failed:', e);
            throw new Error("Invalid base64 encoding: " + e.message);
        }
        
        // Expected SPKI length for 2048-bit RSA key is 294 bytes
        if (binary.length !== 294) {
            console.warn('[importPublicKey] ⚠️ Unexpected length. Expected 294, got', binary.length);
        }
        
        // Convert to Uint8Array
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        console.log('[importPublicKey] Byte array length:', bytes.length);
        console.log('[importPublicKey] First 10 bytes:', Array.from(bytes.slice(0, 10)));
        
        // Check SPKI header (should start with 0x30 0x82)
        if (bytes[0] !== 0x30 || bytes[1] !== 0x82) {
            console.error('[importPublicKey] ❌ Invalid SPKI header. Expected [48, 130], got', [bytes[0], bytes[1]]);
            throw new Error("Invalid SPKI format. This doesn't look like a valid public key.");
        }
        
        // Import the key
        console.log('[importPublicKey] Attempting crypto.subtle.importKey...');
        const publicKey = await crypto.subtle.importKey(
            "spki",
            bytes.buffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256"
            },
            true,
            ["encrypt"]
        );
        
        console.log('[importPublicKey] ✅ Success!');
        return publicKey;
        
    } catch (err) {
        console.error('[importPublicKey] ❌ Error:', err);
        console.error('[importPublicKey] Error name:', err.name);
        console.error('[importPublicKey] Error message:', err.message);
        
        // Provide helpful error messages
        if (err.message.includes("start with arc1pk_")) {
            throw new Error("Invalid key format. Key should start with 'arc1pk_'");
        }
        if (err.message.includes("Invalid base64")) {
            throw new Error("Invalid key encoding. Please copy the complete key.");
        }
        if (err.message.includes("Invalid SPKI format")) {
            throw err;
        }
        if (err.name === 'DataError') {
            throw new Error("Key data is corrupted. The key structure is invalid.");
        }
        throw new Error(`Failed to import key: ${err.message}`);
    }
}

async function encryptData(data, publicKey) {
    const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        data
    );
    return new Uint8Array(encrypted);
}

async function decryptData(encrypted, privateKey) {
    const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encrypted
    );
    return new Uint8Array(decrypted);
}

async function hashPublicKey(keyStr) {
    const encoder = new TextEncoder();
    const data = encoder.encode(keyStr);
    const hash = await crypto.subtle.digest('SHA-256', data);
    
    // Convert hash to base64 URL-safe
    let binary = '';
    const hashBytes = new Uint8Array(hash).slice(0, 16);
    for (let i = 0; i < hashBytes.length; i++) {
        binary += String.fromCharCode(hashBytes[i]);
    }
    const b64 = btoa(binary);
    
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
