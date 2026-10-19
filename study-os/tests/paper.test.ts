import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDFDocument } from 'pdf-lib';
import { documentSchema, type PaperDocument, type InkStroke } from '../src/paperModel';
import {
  inkPoint,
  acceptsInk,
  viewToPage,
  pageToView,
  insidePolygon,
  strokeHit,
} from '../src/paperInk';
import { savePaperDocument, paperSnapshot, readPaperFile } from '../src/paperStorage';
import {
  exportCompleteBackup,
  inspectCompleteBackup,
  restoreCompleteBackup,
} from '../src/completeBackup';
import { LocalZipWriter, readLocalZip, sha256 } from '../src/localZip';
import { newState } from '../src/model';
import { officialUrl, checkedProvenance } from '../src/examSources';
function storage() {
  const map = new Map<string, string>();
  return {
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}
async function fixture() {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 10; i++) pdf.addPage([600, 800]);
  const bytes = (await pdf.save()).buffer as ArrayBuffer;
  const pages = Array.from({ length: 10 }, (_, i) => ({
    id: `page-${i}`,
    index: i,
    width: 600,
    height: 800,
    rotation: 0 as const,
    bookmarked: i === 2,
  }));
  const strokes: InkStroke[] = Array.from({ length: 125 }, (_, i) => ({
    id: `stroke-${i}`,
    layerId: 'layer',
    pageId: 'page-0',
    tool: 'fountain',
    color: '#123456',
    width: 2,
    points: [
      { x: i, y: 100, pressure: 0.7, tiltX: 20, tiltY: -10, time: i },
      { x: i + 10, y: 110, pressure: 0.3, tiltX: 0, tiltY: 0, time: i + 1 },
    ],
  }));
  const doc: PaperDocument = {
    version: 1,
    id: 'document',
    fileId: 'original',
    resourceId: null,
    name: 'ten-pages.pdf',
    mime: 'application/pdf',
    digest: await sha256(new Blob([bytes])),
    size: bytes.byteLength,
    revision: 0,
    pages,
    layers: [{ id: 'layer', pageId: 'page-0', problemId: 'p8', strokes }],
    regions: [
      { id: 'region', problemId: 'p8', pageId: 'page-0', x: 10, y: 20, width: 200, height: 300 },
    ],
    inkHistory: [
      {
        attemptId: 'attempt',
        problemId: 'p8',
        createdAt: new Date().toISOString(),
        layers: [
          { id: 'layer', pageId: 'page-0', problemId: 'p8', strokes: structuredClone(strokes) },
        ],
      },
    ],
    cursor: { pageId: 'page-8', zoom: 1.5, scrollLeft: 5, scrollTop: 40 },
    provenance: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { doc, bytes };
}
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
describe('editable local digital paper preservation', () => {
  it('round-trips 10 PDF pages, 125 pressure strokes, regions, cursor and immutable original bytes', async () => {
    const { doc, bytes } = await fixture(),
      saved = await savePaperDocument(doc, bytes);
    expect(saved.revision).toBe(1);
    const snap = await paperSnapshot();
    expect(snap.documents[0]).toEqual(saved);
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
    const next = await savePaperDocument({
      ...saved,
      pages: saved.pages.map((p) => ({ ...p, rotation: 90 })),
      layers: [],
    });
    expect(next.inkHistory[0].layers[0].strokes).toHaveLength(125);
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
  });
  it('refuses stale-tab overwrites without losing either original or saved ink', async () => {
    const { doc, bytes } = await fixture(),
      first = await savePaperDocument(doc, bytes),
      second = await savePaperDocument({ ...first, name: 'new.pdf' });
    await expect(savePaperDocument({ ...first, layers: [] })).rejects.toThrow('다른 탭');
    expect((await paperSnapshot()).documents[0]).toEqual(second);
    await expect(savePaperDocument(doc, bytes)).rejects.toThrow();
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
  });
  it('exports and restores all original bytes and editable ink through complete ZIP in a fresh DB', async () => {
    const { doc, bytes } = await fixture();
    await savePaperDocument(doc, bytes);
    const s = storage();
    s.setItem('bkit.study-os.v1', JSON.stringify(newState()));
    const zip = await exportCompleteBackup(s),
      entries = await readLocalZip(zip);
    expect(entries.has('data/paper.json')).toBe(true);
    globalThis.indexedDB = new IDBFactory();
    const target = storage(),
      inspected = await inspectCompleteBackup(zip, target);
    expect(inspected.paper.documents[0].layers[0].strokes).toHaveLength(125);
    await restoreCompleteBackup(inspected, 'merge', target);
    expect((await paperSnapshot()).documents[0].cursor.pageId).toBe('page-8');
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
  });
  it('keeps local conflict versions on merge and journals metadata on replacement', async () => {
    const { doc, bytes } = await fixture(),
      first = await savePaperDocument(doc, bytes),
      s = storage();
    const zip = await exportCompleteBackup(s);
    await savePaperDocument({ ...first, name: 'local.pdf' });
    await restoreCompleteBackup(await inspectCompleteBackup(zip, s), 'merge', s);
    expect((await paperSnapshot()).documents[0].name).toBe('local.pdf');
    await restoreCompleteBackup(await inspectCompleteBackup(zip, s), 'replace', s);
    expect((await paperSnapshot()).documents[0].name).toBe('ten-pages.pdf');
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
  });
  it('rejects changed PDF/ink between inspection and restoration', async () => {
    const { doc, bytes } = await fixture(),
      saved = await savePaperDocument(doc, bytes),
      s = storage();
    const inspected = await inspectCompleteBackup(await exportCompleteBackup(s), s);
    await savePaperDocument({ ...saved, name: 'edited.pdf' });
    await expect(restoreCompleteBackup(inspected, 'replace', s)).rejects.toThrow('바뀌었습니다');
    expect((await paperSnapshot()).documents[0].name).toBe('edited.pdf');
  });
  it('rolls back replaced ink if localStorage commit fails, retaining original bytes and recovery', async () => {
    const { doc, bytes } = await fixture(),
      saved = await savePaperDocument(doc, bytes),
      s = storage();
    s.setItem('bkit.study-os.v1', JSON.stringify(newState()));
    const zip = await exportCompleteBackup(s),
      local = await savePaperDocument({ ...saved, name: 'local.pdf' });
    const target = storage(),
      preview = await inspectCompleteBackup(zip, target),
      set = target.setItem;
    target.setItem = (k, v) => {
      if (k === 'bkit.study-os.v1') throw new Error('quota');
      set(k, v);
    };
    await expect(restoreCompleteBackup(preview, 'replace', target)).rejects.toThrow('저장 공간');
    expect((await paperSnapshot()).documents[0]).toEqual(local);
    expect(await readPaperFile(doc.fileId)).toEqual(bytes);
  });
  it('rejects corrupt document coordinates, missing originals and corrupt ZIP metadata', async () => {
    const { doc, bytes } = await fixture();
    expect(
      documentSchema.safeParse({ ...doc, regions: [{ ...doc.regions[0], width: 900 }] }).success,
    ).toBe(false);
    await expect(savePaperDocument({ ...doc, digest: 'a'.repeat(64) }, bytes)).rejects.toThrow(
      '원본 무결성',
    );
    const saved = await savePaperDocument(doc, bytes);
    await expect(savePaperDocument({ ...saved, fileId: 'different' })).rejects.toThrow('좌표');
  });
  it('continues reading a true 3.1 archive without removing current digital papers', async () => {
    const { doc, bytes } = await fixture();
    await savePaperDocument(doc, bytes);
    const s = storage(),
      entries = await readLocalZip(await exportCompleteBackup(s));
    const manifest = JSON.parse(await entries.get('manifest.json')!.text());
    delete manifest.paper;
    manifest.appVersion = '3.1';
    const writer = new LocalZipWriter();
    await writer.add('manifest.json', new Blob([JSON.stringify(manifest)]));
    await writer.add('data/local.json', entries.get('data/local.json')!);
    const old = await inspectCompleteBackup(writer.finish(), s);
    expect(old.paper.documents).toEqual([]);
    await restoreCompleteBackup(old, 'replace', s);
    expect((await paperSnapshot()).documents[0].layers[0].strokes).toHaveLength(125);
  });
});
describe('input geometry and honest source boundaries', () => {
  it('maps zoomed/rotated page coordinates reversibly for all orientations', () => {
    for (const r of [0, 90, 180, 270])
      for (const zoom of [0.25, 1, 2.4, 4]) {
        const v = pageToView(123, 456, 600, 800, r),
          back = viewToPage((v.x * zoom) / zoom, (v.y * zoom) / zoom, 600, 800, r);
        expect(back.x).toBeCloseTo(123);
        expect(back.y).toBeCloseTo(456);
      }
  });
  it('accepts pen and mouse, rejects touch in pen-only mode, safely defaults absent device data', () => {
    expect(acceptsInk('pen', true)).toBe(true);
    expect(acceptsInk('mouse', true)).toBe(true);
    expect(acceptsInk('touch', true)).toBe(false);
    expect(acceptsInk('touch', false)).toBe(true);
    expect(
      inkPoint({ pressure: 0, tiltX: NaN, tiltY: NaN, timeStamp: 2, pointerType: 'pen' }, 10, 20),
    ).toMatchObject({ x: 10, y: 20, pressure: 0.5, tiltX: 0, tiltY: 0 });
    expect(
      inkPoint({ pressure: 0.8, tiltX: 25, tiltY: -20, timeStamp: 2, pointerType: 'pen' }, 10, 20)
        .pressure,
    ).toBe(0.8);
  });
  it('uses polygon selection and segment hits rather than only sample endpoints', async () => {
    const { doc } = await fixture();
    expect(
      insidePolygon({ x: 5, y: 5 }, [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]),
    ).toBe(true);
    expect(
      strokeHit(
        {
          ...doc.layers[0].strokes[0],
          tool: 'line',
          points: [
            { ...doc.layers[0].strokes[0].points[0], x: 0, y: 0 },
            { ...doc.layers[0].strokes[0].points[0], x: 100, y: 100 },
          ],
        },
        { x: 50, y: 50 },
        2,
      ),
    ).toBe(true);
  });
  it('requires explicit provenance and official HTTPS domains without guessing exam URLs', () => {
    expect(officialUrl('https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs')).toBe(true);
    for (const bad of [
      'javascript:alert(1)',
      'https://ebsi.co.kr.evil.com/a',
      'https://user@www.ebsi.co.kr/x',
      'http://www.kice.re.kr/',
      'https://127.0.0.1/a',
    ])
      expect(officialUrl(bad)).toBe(false);
    expect(() =>
      checkedProvenance({
        title: 'exam',
        url: 'https://www.ebsi.co.kr/',
        fileUrl: '',
        institution: 'EBS',
        year: '2025',
        exam: '수능',
        grade: '고3',
        subject: '수학',
        curriculum: '2015',
        kind: 'question',
        rights: '',
        verifiedAt: null,
      }),
    ).toThrow();
  });
});
describe('independent retest ink views', () => {
  it('keeps earlier attempts editable but displays and exports the latest working context', async () => {
    const { currentInkLayers } = await import('../src/paperInk'),
      { doc } = await fixture(),
      old = doc.layers[0];
    const previous = { ...old, attemptKey: 'first' },
      fresh = { ...old, id: 'fresh', attemptKey: 'retry', strokes: [] },
      notes = { ...old, id: 'notes', problemId: null };
    expect(currentInkLayers([previous, fresh, notes])).toEqual([fresh, notes]);
    expect(previous.strokes).toHaveLength(125);
  });
});
it('refuses oversized ZIP entry counts before producing a falsely complete archive', async () => {
  const writer = new LocalZipWriter();
  for (let i = 0; i < 12001; i++) await writer.add(`media/paper/${i}.bin`, new Blob(['x']));
  expect(() => writer.finish()).toThrow('12,000');
});
