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
