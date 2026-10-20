import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('safe service worker lifecycle', () => {
  it('precaches a new shell without forcing activation over existing study clients', async () => {
    const handlers = new Map<
      string,
      (event: { waitUntil: (promise: Promise<unknown>) => void }) => void
    >();
    let forced = false;
    const added: string[] = [];
    runInNewContext(
      readFileSync('public/sw.js', 'utf8').replace('__PRECACHE__', '["index.html"]'),
      {
        URL,
        self: {
          location: { href: 'https://example.test/study-os/sw.js' },
          addEventListener: (
            name: string,
            cb: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void,
          ) => handlers.set(name, cb),
          skipWaiting: () => {
            forced = true;
          },
        },
        caches: {
          open: async () => ({
            addAll: async (paths: string[]) => {
              added.push(...paths);
            },
          }),
        },
      },
    );
    let installed: Promise<unknown> = Promise.resolve();
    handlers.get('install')!({
      waitUntil: (promise) => {
        installed = promise;
      },
    });
    await installed;
    expect(added).toEqual(['https://example.test/study-os/index.html']);
    expect(forced).toBe(false);
  });
});

describe('preview and production cache isolation', () => {
  for (const scope of ['/', '/preview-compact/']) {
    it(`activation at ${scope} cleans only its own versioned shell`, async () => {
      const handlers = new Map<string, (e: { waitUntil: (p: Promise<unknown>) => void }) => void>();
      const deleted: string[] = [];
      const prefix = 'bkit-study-os@' + scope + '@shell-';
      runInNewContext(
        readFileSync('public/sw.js', 'utf8')
          .replace('__PRECACHE__', '[]')
          .replace('__VERSION__', 'new'),
        {
          URL,
          self: {
            location: { href: 'https://teambkit.test' + scope + 'sw.js' },
            addEventListener: (name: string, cb: any) => handlers.set(name, cb),
            clients: { claim: async () => {} },
          },
          caches: {
            keys: async () => [
              'bkit-study-os@/@shell-new',
              'bkit-study-os@/@shell-old',
              'bkit-study-os@/preview-compact/@shell-new',
              'bkit-study-os@/preview-compact/@shell-old',
              'private-pdf-originals',
            ],
            delete: async (k: string) => {
              deleted.push(k);
              return true;
            },
          },
        },
      );
      let activation = Promise.resolve();
      handlers.get('activate')!({
        waitUntil: (p) => {
          activation = p as Promise<void>;
        },
      });
      await activation;
      expect(deleted).toEqual([prefix + 'old']);
    });
  }
});
