export const environment = {
  production: false,
  //apiUrl: 'https://opensource.techcedence.net/lcp-altaiseer-api-new',
  // apiUrl: 'https://lcp.techcedence.net/lcp-api',
  //apiUrl: 'https://techopsserver.techcedence.net/techops-api',
  //apiUrl: 'https://opensource.techcedence.net/lcp-trac-projects-api',
  apiUrl: 'http://192.168.31.232:3131', // Network IP for mobile device access
  // apiUrl: 'http://localhost:3131', // Use this for desktop-only development
  apiAddress: '/api/',
  ENCRYPTION_KEY: 'FINfM8x6fs',
  WS_URL: 'ws://192.168.31.232:8089', // Network IP for WebSocket
  // WS_URL: 'ws://localhost:8089', // Use this for desktop-only development
  DB: 'pg', // 'sql' or 'pg'
  PAYLOAD_ENCRYPTION_KEY: '12345678901234567890123456789012', // 32 chars
  PAYLOAD_ENCRYPTION_IV: '1234567890123456', // 16 chars
};
