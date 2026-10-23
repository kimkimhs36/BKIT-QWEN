import { readdir, readFile } from 'node:fs/promises';
const files = (await readdir('dist/assets')).filter((x) => /^awake-engine-.*\.js$/.test(x));
if (files.length !== 1) throw Error('Expected one pinned vision bundle');
const code = await readFile('dist/assets/' + files[0], 'utf8');
if (/odml\.pa\.googleapis\.com|Logging failed with HTTP/.test(code))
  throw Error('Third-party vision telemetry remains in the output');
console.log('Verified: inference bundle has no MediaPipe usage logger or telemetry endpoint');
