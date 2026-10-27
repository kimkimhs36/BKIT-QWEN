import { OCR_ASSET_DIR } from './ocrAssets';
import type { Worker } from 'tesseract.js';

let starting: Promise<Worker> | null = null;

/** One device-local worker, loaded only after a learner asks to read a photo. */
export async function readPhotoText(
  blob: Blob,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<string> {
  signal.throwIfAborted();
  onProgress('글자 읽기 도구를 준비하고 있어요…');
  const { createWorker } = await import('tesseract.js');
  signal.throwIfAborted();
  if (starting)
    throw new Error('이전 글자 읽기 도구를 정리하고 있어요. 잠시 뒤 다시 시도해 주세요.');
  const root = new URL(import.meta.env.BASE_URL + OCR_ASSET_DIR + '/', location.origin).href;
  // A failed worker script fetch can leave createWorker's handshake unresolved.
  // Check availability with a cancellable request before creating that worker.
  try {
    const response = await fetch(root + 'worker.min.js', { signal });
    if (!response.ok) throw new Error('unavailable');
  } catch {
    signal.throwIfAborted();
    throw new Error('글자 읽기 도구를 불러오지 못했어요. 원본은 보관되어 있어요. 직접 입력하거나 다시 시도해 주세요.');
  }
  // Use our own origin for every asset. No CDN, image URL or provider API.
  let failInitialization: (error: Error) => void = () => {};
  const initializationError = new Promise<never>((_, reject) => {
    failInitialization = reject;
  });
  const pending = createWorker(['kor', 'eng'], 1, {
    workerPath: root + 'worker.min.js',
    corePath: root + 'core',
    langPath: root + 'lang',
    workerBlobURL: false,
    cachePath: 'bkit-ocr-v1',
    errorHandler: () =>
      failInitialization(
        new Error(
          '글자 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나 직접 입력해 주세요.',
        ),
      ),
    logger: ({ status, progress }) => {
      if (signal.aborted) return;
      onProgress(
        status === 'recognizing text'
          ? `사진의 글자를 읽고 있어요… ${Math.round(progress * 100)}%`
          : '처음에는 도구를 내려받아 준비해요. 잠시만 기다려 주세요…',
      );
    },
  });
  starting = pending;
  void pending.then(
    () => {
      if (starting === pending) starting = null;
    },
    () => {
      if (starting === pending) starting = null;
    },
  );
  let abort: () => void = () => {};
  const canceled = new Promise<never>((_, reject) => {
    abort = () => reject(new DOMException('Canceled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
  let worker: Worker | undefined;
  let objectURL = '';
  try {
    worker = await Promise.race([pending, initializationError, canceled]);
    signal.throwIfAborted();
    // Decode with Safari's own image support (including HEIC where supported),
    // and cap the recognition bitmap to limit memory on mobile devices.
    objectURL = URL.createObjectURL(blob);
    const image = new Image();
    image.src = objectURL;
    await Promise.race([image.decode(), canceled]).catch(() => {
      signal.throwIfAborted();
      throw new Error(
        '이 사진을 읽을 수 없어요. JPEG·PNG 사진이나 스크린샷으로 다시 첨부해 주세요.',
      );
    });
    signal.throwIfAborted();
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('사진을 준비하지 못했어요. 글자를 직접 입력해 주세요.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = await Promise.race([worker.recognize(canvas), initializationError, canceled]);
    canvas.width = canvas.height = 1;
    signal.throwIfAborted();
    return data.text.trim();
  } finally {
    signal.removeEventListener('abort', abort);
    if (objectURL) URL.revokeObjectURL(objectURL);
    if (worker) await worker.terminate();
    else {
      // createWorker exposes the handle after initialization. Dispose a late
      // worker even when the user has already navigated away or canceled.
      void pending.then(
        (w) => w.terminate(),
        () => {},
      );
      if (!signal.aborted && starting === pending) starting = null;
    }
  }
}
