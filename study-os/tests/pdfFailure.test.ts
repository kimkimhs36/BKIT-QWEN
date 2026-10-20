import { expect, it, vi } from 'vitest';
const failed = vi.hoisted(() => ({ destroy: vi.fn(async () => {}) }));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({ promise: Promise.reject(new Error('Invalid PDF bytes')), destroy: failed.destroy }),
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/local-worker.mjs' }));
import { openPdf } from '../src/paperPdf';

it('destroys a failed PDF loading task so repeated corrupt imports do not retain workers', async () => {
  await expect(openPdf(new Uint8Array([37, 80, 68, 70]).buffer)).rejects.toThrow('Invalid PDF bytes');
  expect(failed.destroy).toHaveBeenCalledTimes(1);
});
