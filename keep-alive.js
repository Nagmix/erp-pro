const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log('[keep-alive] Starting Next.js DEV server...');
  const server = spawn('node', [
    path.join(__dirname, 'node_modules/.bin/next'),
    'dev', '-p', '3000', '-H', '0.0.0.0'
  ], {
    cwd: __dirname,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  server.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  server.on('exit', (code, signal) => {
    console.log(`[keep-alive] Server exited with code ${code}, signal ${signal}. Restarting in 5s...`);
    setTimeout(startServer, 5000);
  });

  server.on('error', (err) => {
    console.error('[keep-alive] Server error:', err.message);
    setTimeout(startServer, 5000);
  });
}

startServer();

// Keep this process alive
process.on('SIGTERM', () => { console.log('[keep-alive] SIGTERM received'); });
process.on('SIGINT', () => { console.log('[keep-alive] SIGINT received'); });
