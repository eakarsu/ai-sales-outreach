'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

const root = __dirname;
const backendPort = String(process.env.BACKEND_PORT);
const frontendPort = String(process.env.FRONTEND_PORT);
const children = [
  spawn('npm', ['start'], {
    cwd: path.join(root, 'backend'),
    env: { ...process.env, PORT: backendPort },
    stdio: 'inherit',
  }),
  spawn('npm', ['start'], {
    cwd: path.join(root, 'frontend'),
    env: {
      ...process.env,
      PORT: frontendPort,
      HOST: '127.0.0.1',
      BROWSER: 'none',
      REACT_APP_API_URL: `http://127.0.0.1:${backendPort}/api`,
    },
    stdio: 'inherit',
  }),
];

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of children) {
  child.on('error', (error) => {
    console.error('Unable to start application process', error);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', (code, signal) => {
    if (!stopping && (code !== 0 || signal)) {
      process.exitCode = code || 1;
      stop();
    }
    if (children.every((candidate) => candidate.exitCode !== null || candidate.signalCode !== null)) {
      process.exit(process.exitCode || 0);
    }
  });
}
