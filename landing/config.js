// Config - detect localhost for development
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const CONFIG = {
  relay: isLocalhost
    ? 'ws://localhost:8080'
    : 'wss://relay.arcanum.sh'
};
