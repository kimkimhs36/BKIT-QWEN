import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readdir, readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildMetadata } from './buildMetadata';
import { OCR_ASSET_DIR } from './src/ocrAssets';
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'bkit-offline-shell',
      apply: 'build',
      async closeBundle() {
        // A public, allowlisted identity makes preview source verification possible
        // without management API permissions or disclosing runtime configuration.
        await writeFile('dist/build-info.json', JSON.stringify(buildMetadata(process.env), null, 2) + '\n');
        // Keep OCR out of the initial app shell. Only a user tap downloads the
        // engine/languages; the existing same-origin worker caches fetched assets.
        const ocr = 'dist/' + OCR_ASSET_DIR;
        await mkdir(ocr + '/core', { recursive: true });
        await mkdir(ocr + '/lang', { recursive: true });
        await copyFile('node_modules/tesseract.js/dist/worker.min.js', ocr + '/worker.min.js');
        const cores = (await readdir('node_modules/tesseract.js-core')).filter((x) =>
          x.endsWith('.wasm.js'),
        );
        await Promise.all(
          cores.map((x) => copyFile('node_modules/tesseract.js-core/' + x, ocr + '/core/' + x)),
        );
        for (const lang of ['kor', 'eng']) {
          await copyFile(
            `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
            `${ocr}/lang/${lang}.traineddata.gz`,
          );
        }
        await copyFile('node_modules/tesseract.js/LICENSE.md', ocr + '/LICENSE-tesseract-js');
        await copyFile('node_modules/tesseract.js-core/LICENSE', ocr + '/LICENSE-core');
        await writeFile(
          ocr + '/LANGUAGE-NOTICE.txt',
          'Korean and English traineddata: @tesseract.js-data/kor and @tesseract.js-data/eng 1.0.0.\nSource: https://github.com/naptha/tessdata\nPackage authors: Balearica and Jerome Wu. Package license: MIT.\nUnderlying Tesseract language models: https://github.com/tesseract-ocr/tessdata (Apache-2.0; see LICENSE-core).\n',
        );
        // PDF.js CMaps and standard fonts are served locally, including Korean legacy PDFs.
        await mkdir('dist/pdf-assets', { recursive: true });
        await cp('node_modules/pdfjs-dist/cmaps', 'dist/pdf-assets/cmaps', { recursive: true });
        await cp('node_modules/pdfjs-dist/standard_fonts', 'dist/pdf-assets/standard_fonts', {
          recursive: true,
        });
        await copyFile('node_modules/pdfjs-dist/LICENSE', 'dist/pdf-assets/LICENSE');
        await copyFile('node_modules/pdf-lib/LICENSE.md', 'dist/pdf-assets/LICENSE-pdf-lib.md');
        // Camera WASM/model assets are fetched only after explicit camera permission.
        await mkdir('dist/awake/wasm', { recursive: true });
        await cp('node_modules/@mediapipe/tasks-vision/wasm', 'dist/awake/wasm', {
          recursive: true,
        });
        const assets = (await readdir('dist/assets')).filter(
          (x) =>
            !/^(awake-engine|AwakeAssist|MaterialEffects|MaterialSettings|materials|ambientSound)-/.test(
              x,
            ),
        );
        const shell = [
          'index.html',
          'fonts/PretendardVariable.woff2',
          'icon.svg',
          'icon-192.png',
          'icon-512.png',
          'apple-touch-icon.png',
          'manifest.webmanifest',
          'landscapes/forest.jpg',
          ...assets.map((x) => 'assets/' + x),
        ];
        const version = createHash('sha256')
          .update(JSON.stringify(shell))
          .digest('hex')
          .slice(0, 12);
        const source = await readFile('public/sw.js', 'utf8');
        await writeFile(
          'dist/sw.js',
          source.replace('__PRECACHE__', JSON.stringify(shell)).replace('__VERSION__', version),
        );
      },
    },
  ],
  // Stable vendor chunks can stay cached when local learning screens change.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (id.includes('/node_modules/@mediapipe/tasks-vision/')) return 'awake-engine';
          if (id.includes('/node_modules/zod/')) return 'schema-vendor';
        },
      },
    },
  },
  base: loadEnv(mode, process.cwd(), 'APP_').APP_BASE || '/study-os/',
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
}));
