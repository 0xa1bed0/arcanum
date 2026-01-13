// Server configuration with custom URL support
const DEFAULT_SERVER = 'wss://relay.arcanum.sh';
const LOCAL_SERVER = 'ws://localhost:8080';

function isLocalEnvironment() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname === '' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.');
}

function getCustomServer() {
    try {
        const saved = localStorage.getItem('arcanum_custom_server');
        if (saved) {
            return saved;
        }
    } catch (e) {
        console.error('Failed to load custom server:', e);
    }
    return null;
}

function saveCustomServer(url) {
    try {
        if (url) {
            localStorage.setItem('arcanum_custom_server', url);
        } else {
            localStorage.removeItem('arcanum_custom_server');
        }
    } catch (e) {
        console.error('Failed to save custom server:', e);
    }
}

function clearCustomServer() {
    try {
        localStorage.removeItem('arcanum_custom_server');
    } catch (e) {
        console.error('Failed to clear custom server:', e);
    }
}

function getServerConfig() {
    // Check for custom server first
    const custom = getCustomServer();
    if (custom) {
        return {
            relay: custom,
            isCustom: true
        };
    }

    // Auto-detect environment
    if (isLocalEnvironment()) {
        return { relay: LOCAL_SERVER, isCustom: false };
    }

    return { relay: DEFAULT_SERVER, isCustom: false };
}

const SERVER_CONFIG = getServerConfig();

console.log('Environment:', window.location.hostname);
console.log('Server:', SERVER_CONFIG.relay);
console.log('Custom config:', SERVER_CONFIG.isCustom);
