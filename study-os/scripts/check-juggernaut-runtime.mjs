import { mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
// Vite/tsx resolve extensionless paths that deployed Node ESM refuses. Execute
// emitted server JS without either runner, in a disposable folder next to deps.
const temporary = await mkdtemp(join(process.cwd(), '.runtime-check-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--target', 'ES2022',
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--outDir', temporary,
    'api/juggernaut.ts'], { stdio: 'inherit' });
  const { createJuggernautApi } = await import(pathToFileURL(join(temporary, 'server/juggernautApi.js')));
  const app = createJuggernautApi({});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(origin + '/api/juggernaut/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).configured, false);
    assert.equal((await fetch(origin + '/api/juggernaut')).status, 503);
    console.log('Emitted Node ESM API: health 200 configured:false; unconfigured writes/reads fail closed (503).');
  } finally { await new Promise(resolve => server.close(resolve)); }
} finally { await rm(temporary, { recursive: true, force: true }); }
