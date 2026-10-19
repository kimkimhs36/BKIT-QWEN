import { drawInk, currentInkLayers } from './paperInk';
import { uid } from './model';
import { sha256 } from './localZip';
import type { PaperDocument, SourceProvenance } from './paperModel';
import { readPaperFile } from './paperStorage';
let engine: Promise<typeof import('pdfjs-dist')> | undefined;
export function pdfEngine() {
  return (engine ??= import('pdfjs-dist').then(async (pdf) => {
    pdf.GlobalWorkerOptions.workerSrc = (
      await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ).default;
    return pdf;
  }));
}
export async function openPdf(bytes: ArrayBuffer) {
  const pdf = await pdfEngine();
  return pdf.getDocument({
    data: new Uint8Array(bytes.slice(0)),
    isEvalSupported: false,
    disableAutoFetch: true,
    useSystemFonts: true,
    cMapUrl: import.meta.env.BASE_URL + 'pdf-assets/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: import.meta.env.BASE_URL + 'pdf-assets/standard_fonts/',
  }).promise;
}
export async function importPaper(
  file: File,
  resourceId: string | null,
  provenance: SourceProvenance | null = null,
): Promise<{ document: PaperDocument; bytes: ArrayBuffer }> {
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error('원본 파일은 20MB 이하 PDF·PNG·JPEG를 선택하세요.');
  const bytes = await file.arrayBuffer(),
    sig = new Uint8Array(bytes.slice(0, 8));
  const mime =
    String.fromCharCode(...sig.slice(0, 5)) === '%PDF-'
      ? 'application/pdf'
      : sig[0] === 137 && sig[1] === 80 && sig[2] === 78 && sig[3] === 71
        ? 'image/png'
        : sig[0] === 255 && sig[1] === 216 && sig[2] === 255
          ? 'image/jpeg'
          : null;
  if (!mime) throw new Error('파일 내용이 PDF·PNG·JPEG 형식이 아닙니다.');
  const pages: PaperDocument['pages'] = [];
  if (mime === 'application/pdf') {
    const pdf = await openPdf(bytes);
    try {
      if (pdf.numPages > 500) throw new Error('문서는 최대 500페이지까지 지원합니다.');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i),
          v = page.getViewport({ scale: 1, rotation: 0 });
        pages.push({
          id: uid(),
          index: i - 1,
          width: v.width,
          height: v.height,
          rotation: (((page.rotate % 360) + 360) % 360) as 0 | 90 | 180 | 270,
          bookmarked: false,
        });
      }
    } finally {
      await pdf.destroy();
    }
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.width * img.height > 40_000_000)
        throw new Error('사진은 4천만 화소 이하를 사용하세요.');
      pages.push({
        id: uid(),
        index: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rotation: 0,
        bookmarked: false,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const now = new Date().toISOString();
  return {
    bytes,
    document: {
      version: 1,
      id: uid(),
      fileId: uid(),
      resourceId,
      name: file.name,
      mime,
      size: file.size,
      digest: await sha256(new Blob([bytes])),
      revision: 0,
      pages,
      layers: [],
      regions: [],
      inkHistory: [],
      cursor: { pageId: pages[0].id, zoom: 1, scrollLeft: 0, scrollTop: 0 },
      provenance,
      createdAt: now,
      updatedAt: now,
    },
  };
}
export function downloadPaperBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/** Export a new PDF copy; source bytes never pass through an editing write. */
export async function exportInkedPdf(doc: PaperDocument) {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = await readPaperFile(doc.fileId);
  const out =
    doc.mime === 'application/pdf' ? await PDFDocument.load(bytes) : await PDFDocument.create();
  if (doc.mime !== 'application/pdf') {
    // Match the browser's decoded orientation (including phone JPEG EXIF) used by the viewer.
    const url = URL.createObjectURL(new Blob([bytes], { type: doc.mime }));
    let image;
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas'),
        factor = Math.min(1, 4096 / Math.max(doc.pages[0].width, doc.pages[0].height));
      c.width = Math.ceil(doc.pages[0].width * factor);
      c.height = Math.ceil(doc.pages[0].height * factor);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      image = await out.embedPng(c.toDataURL('image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
    const p = out.addPage([doc.pages[0].width, doc.pages[0].height]);
    p.drawImage(image, { x: 0, y: 0, width: p.getWidth(), height: p.getHeight() });
  }
  // Shared canvas renderer preserves pressure, smoothing and shapes. Ink is flattened only in this export.
  for (const page of doc.pages) {
    const canvas = document.createElement('canvas'),
      factor = Math.min(2, 4096 / Math.max(page.width, page.height));
    canvas.width = Math.ceil(page.width * factor);
    canvas.height = Math.ceil(page.height * factor);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(factor, factor);
    for (const layer of currentInkLayers(doc.layers).filter((l) => l.pageId === page.id))
      for (const stroke of layer.strokes) drawInk(ctx, stroke);
    const png = await out.embedPng(canvas.toDataURL('image/png'));
    const p = out.getPage(page.index),
      box = p.getCropBox();
    p.drawImage(png, { x: box.x, y: box.y, width: box.width, height: box.height });
    p.setRotation((await import('pdf-lib')).degrees(page.rotation));
  }
  const result = await out.save();
  return new Blob([result as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}
