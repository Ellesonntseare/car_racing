import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteEntrypoint=resolve(root,'node_modules','vite','bin','vite.js');
const jobs = [
 spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: 'inherit' }),
 spawn(process.execPath, [viteEntrypoint, '--host', '0.0.0.0'], { cwd: root, stdio: 'inherit' })
];
let exiting = false;
function close(code = 0) { if (exiting) return; exiting = true; for (const job of jobs) if (job.exitCode == null) job.kill(); process.exitCode = code; }
for (const job of jobs) job.on('exit', code => close(code || 0));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => close(0));
