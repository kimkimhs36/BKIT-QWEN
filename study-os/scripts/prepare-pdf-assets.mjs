import { cp, mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/pdf-assets', { recursive: true });
for (const dir of ['cmaps', 'standard_fonts'])
  await cp(`node_modules/pdfjs-dist/${dir}`, `public/pdf-assets/${dir}`, { recursive: true });
await copyFile('node_modules/pdfjs-dist/LICENSE', 'public/pdf-assets/LICENSE');

await copyFile('node_modules/pdf-lib/LICENSE.md', 'public/pdf-assets/LICENSE-pdf-lib.md');
