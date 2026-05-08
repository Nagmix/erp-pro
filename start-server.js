const { spawn } = require('child_process');
const fs = require('fs');

const logFile = fs.openSync('/tmp/next-server.log', 'a');

const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: '/home/z/my-project',
  detached: true,
  stdio: ['ignore', logFile, logFile],
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' }
});

child.unref();

fs.writeFileSync('/tmp/next-server.pid', child.pid.toString());
console.log(`Server started with PID ${child.pid}`);
