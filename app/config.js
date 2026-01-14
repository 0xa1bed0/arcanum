// Config - detect localhost for development
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';

const CONFIG = {
  relay: isLocalhost
    ? 'ws://localhost:8080'
    : `${wsProtocol}//${location.host}/relay`
};
