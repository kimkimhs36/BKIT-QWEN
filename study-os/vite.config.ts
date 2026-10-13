import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'bkit-offline-shell',
      apply: 'build',
      async closeBundle() {
        const assets = await readdir('dist/assets');
        const shell = [
          'index.html',
          'icon.svg',
          'icon-192.png',
          'icon-512.png',
          'apple-touch-icon.png',
          'manifest.webmanifest',
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
  base: loadEnv(mode, process.cwd(), 'APP_').APP_BASE || '/study-os/',
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
}));
