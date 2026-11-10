import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? files(join(dir, d.name)) : /\.(m?js)$/.test(d.name) ? [join(dir,d.name)] : []); }
for (const file of [...files('src'),...files('server'),...files('scripts'),...files('test'),'vite.config.js']) {
 const p=spawnSync(process.execPath, ['--check',file], {stdio:'inherit'}); if(p.status!==0)process.exit(p.status || 1);
}
console.log('Syntax checks passed.');
