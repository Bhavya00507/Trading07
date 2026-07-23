const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

console.log('🚀 Starting Quantum Terminal Unified Development Server...');

// 1. Spawn FastAPI Backend
console.log('📦 Launching FastAPI backend (python main.py)...');
const backend = spawn('python', ['main.py'], {
  cwd: backendDir,
  shell: true,
  stdio: 'pipe',
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

backend.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log(`\x1b[36m[Backend]\x1b[0m ${line}`);
});

backend.stderr.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.error(`\x1b[33m[Backend Log]\x1b[0m ${line}`);
});

let frontend = null;
let isShuttingDown = false;

function cleanShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n🛑 Shutting down backend and frontend servers...');

  if (frontend) {
    try {
      if (process.platform === 'win32' && frontend.pid) {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/T', '/F'], { shell: true });
      } else {
        frontend.kill('SIGTERM');
      }
    } catch (e) {}
  }

  if (backend) {
    try {
      if (process.platform === 'win32' && backend.pid) {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/T', '/F'], { shell: true });
      } else {
        backend.kill('SIGTERM');
      }
    } catch (e) {}
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', cleanShutdown);
process.on('SIGTERM', cleanShutdown);
process.on('exit', cleanShutdown);

// 2. Poll Backend Health Endpoint
function checkBackendHealth(retries = 60) {
  if (retries <= 0) {
    console.error('❌ Backend health check timed out after 30 seconds.');
    cleanShutdown();
    return;
  }

  const req = http.get('http://127.0.0.1:8000/health', (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Backend is healthy on http://127.0.0.1:8000! Launching Vite frontend...');
      startFrontend();
    } else {
      setTimeout(() => checkBackendHealth(retries - 1), 500);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkBackendHealth(retries - 1), 500);
  });

  req.end();
}

// 3. Spawn Vite Frontend
function startFrontend() {
  frontend = spawn('npx', ['vite'], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit'
  });

  frontend.on('error', (err) => {
    console.error('❌ Failed to start Vite frontend:', err);
    cleanShutdown();
  });

  frontend.on('exit', (code) => {
    if (!isShuttingDown) {
      console.log(`Vite frontend exited with code ${code}`);
      cleanShutdown();
    }
  });
}

// Start health polling
setTimeout(() => checkBackendHealth(), 1000);
