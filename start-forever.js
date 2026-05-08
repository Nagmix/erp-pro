const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log('[start-forever] Starting server at', new Date().toISOString());
  
  const server = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  server.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  server.on('exit', (code) => {
    console.log('[start-forever] Server exited with code', code, '- restarting in 3s...');
    setTimeout(startServer, 3000);
  });
  
  server.on('error', (err) => {
    console.error('[start-forever] Error:', err.message);
    setTimeout(startServer, 3000);
  });
}

startServer();
