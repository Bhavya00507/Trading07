const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const appPath = path.join(__dirname, '..');

console.log(`[Electron Launcher] Spawning Electron from: ${electronExe}`);

const child = spawn(`"${electronExe}"`, ['.'], {
  cwd: appPath,
  stdio: 'inherit',
  shell: true,
  windowsHide: false
});

child.on('error', (err) => {
  console.error('[Electron Launcher Error]', err);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});
