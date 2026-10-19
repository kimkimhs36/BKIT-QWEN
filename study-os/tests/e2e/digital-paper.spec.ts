import { test, expect, type Page } from './local-fixture';
import { PDFDocument, PDFName, PDFDict, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { newState } from '../../src/model';
import { pageToView } from '../../src/paperInk';
import type { PaperDocument } from '../../src/paperModel';
async function nav(page: Page, name: string) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(s));
  }, newState());
  await page.goto('./');
  await nav(page, '집중');
}
async function upload(page: Page) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 10; i++) {
    const p = pdf.addPage([600, 800]);
    p.drawText('Local worksheet - page ' + (i + 1), { x: 50, y: 740, size: 18 });
  }
  const bytes = Buffer.from(await pdf.save());
  await page.getByText('PDF·사진 가져오기', { exact: true }).click();
  await page
    .getByLabel('PDF·학습지 사진 파일', { exact: true })
    .setInputFiles({ name: 'ten-page-worksheet.pdf', mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('button', { name: '종이 열기', exact: true })).toBeVisible();
  return bytes;
}
async function readDocs(page: Page): Promise<PaperDocument[]> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open('bkit-digital-paper-v1', 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction('documents', 'readonly'),
            q = tx.objectStore('documents').getAll();
          tx.oncomplete = () => {
            db.close();
            resolve(q.result);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}
const room = (page: Page) => page.getByRole('region', { name: '디지털 종이 학습실', exact: true });
async function saved(page: Page) {
  await expect(room(page).getByTestId('ink-save-status')).toHaveText('저장됨');
}
async function pointer(
  page: Page,
  points: { x: number; y: number }[],
  type = 'pen',
  id = 17,
  canceled = false,
) {
  const doc = (await readDocs(page))[0],
    pageId = await room(page).getByLabel('종이 페이지', { exact: true }).inputValue(),
    p = doc.pages.find((p) => p.id === pageId)!;
  const coords = points.map((point) => pageToView(point.x, point.y, p.width, p.height, p.rotation));
  return room(page)
    .getByTestId('ink-canvas')
    .evaluate(
      (canvas, args) => {
        const el = canvas as HTMLCanvasElement,
          view = el.closest('.paper-view')!.getBoundingClientRect(),
          scale = view.width / (args.rotated ? args.height : args.width);
        // Browser-event simulation: capture is instrumented because synthetic pointer IDs are not native devices.
        let captures = 0;
        el.setPointerCapture = () => {
          captures++;
        };
        el.releasePointerCapture = () => {};
        el.hasPointerCapture = () => false;
        let previous = {
          x: view.left + args.points[0].x * scale,
          y: view.top + args.points[0].y * scale,
        };
        const dispatch = (kind: string, p: { x: number; y: number }, pressure: number) => {
          const evt = new PointerEvent(kind, {
            bubbles: true,
            cancelable: true,
            pointerId: args.id,
            pointerType: args.type,
            button: 0,
            buttons: kind === 'pointerup' ? 0 : 1,
            clientX: view.left + p.x * scale,
            clientY: view.top + p.y * scale,
            pressure,
            tiltX: 22,
            tiltY: -14,
          });
          if (kind === 'pointermove') {
            const middle = new PointerEvent(kind, {
              pointerType: args.type,
              pressure,
              tiltX: 22,
              tiltY: -14,
              clientX: (previous.x + evt.clientX) / 2,
              clientY: (previous.y + evt.clientY) / 2,
            });
            Object.defineProperty(evt, 'getCoalescedEvents', { value: () => [middle, evt] });
          }
          previous = { x: evt.clientX, y: evt.clientY };
          el.dispatchEvent(evt);
          return { pressure: evt.pressure, tiltX: evt.tiltX, tiltY: evt.tiltY };
        };
        const observed = dispatch('pointerdown', args.points[0], 0.8);
        for (const p of args.points.slice(1)) dispatch('pointermove', p, 0.6);
        dispatch(args.canceled ? 'pointercancel' : 'pointerup', args.points.at(-1)!, 0);
        return { ...observed, captures };
      },
      {
        points: coords,
        canceled,
        type,
        id,
        width: p.width,
        height: p.height,
        rotated: p.rotation === 90 || p.rotation === 270,
      },
    );
}
test('10-page local PDF, 105 editable strokes, pen/touch boundary, rotation alignment, reopen and inked PDF', async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page);
  const original = await upload(page);
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  await pointer(
    page,
    [
      { x: 50, y: 100 },
      { x: 60, y: 120 },
    ],
    'touch',
  );
  await saved(page);
  expect((await readDocs(page))[0].layers).toHaveLength(0);
  let observed = { pressure: 0, tiltX: 0, tiltY: 0, captures: 0 };
  for (let i = 0; i < 105; i++)
    observed = await pointer(page, [
      { x: 40 + i, y: 150 },
      { x: 45 + i, y: 157 },
      { x: 50 + i, y: 163 },
    ]);
  await saved(page);
  let doc = (await readDocs(page))[0];
  expect(doc.layers[0].strokes).toHaveLength(105);
  expect(observed.captures).toBe(1);
  expect(doc.layers[0].strokes[0].points).toHaveLength(5);
  expect(doc.layers[0].strokes[0].points[0]).toMatchObject({
    tiltX: observed.tiltX,
    tiltY: observed.tiltY,
  });
  expect(doc.layers[0].strokes[0].points[0].pressure).toBeCloseTo(observed.pressure, 5);
  expect(doc.pages).toHaveLength(10);
  await room(page).getByRole('button', { name: '확대', exact: true }).click();
  await room(page).getByRole('button', { name: '페이지 회전', exact: true }).click();
  await saved(page);
  await pointer(page, [
    { x: 215, y: 320 },
    { x: 225, y: 330 },
  ]);
  await saved(page);
  doc = (await readDocs(page))[0];
  expect(doc.layers[0].strokes.at(-1)!.points[0].x).toBeCloseTo(215, 0);
  expect(doc.layers[0].strokes.at(-1)!.points[0].y).toBeCloseTo(320, 0);
  await room(page).getByRole('button', { name: '실행 취소', exact: true }).click();
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(105);
  await room(page).getByRole('button', { name: '다시 실행', exact: true }).click();
  await saved(page);
  await room(page).getByRole('button', { name: '책갈피', exact: true }).click();
  await room(page).getByLabel('종이 페이지', { exact: true }).selectOption(doc.pages[8].id);
  await saved(page);
  await page.reload();
  await nav(page, '집중');
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByLabel('종이 페이지', { exact: true })).toHaveValue(doc.pages[8].id);
  await saved(page);
  await room(page).getByLabel('종이 페이지', { exact: true }).selectOption(doc.pages[0].id);
  await saved(page);
  const dl = page.waitForEvent('download', { timeout: 20000 });
  await room(page).getByRole('button', { name: '필기한 PDF 내보내기', exact: true }).click();
  const download = await dl,
    bytes = await readFile((await download.path())!);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(10);
  const images = pdf.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
  const masks = images
    .entries()
    .map(
      ([, ref]) =>
        (pdf.context.lookup(ref) as PDFRawStream).dict.lookup(PDFName.of('SMask')) as PDFRawStream,
    );
  expect(
    masks.some((mask) =>
      decodePDFRawStream(mask)
        .decode()
        .some((n) => n > 0),
    ),
  ).toBe(true);
  expect(pdf.getPage(0).getRotation().angle).toBe(90);
  expect(bytes.byteLength).toBeGreaterThan(original.byteLength);
  const originalDownload = page.waitForEvent('download', { timeout: 20000 });
  await room(page).getByRole('button', { name: '원본 내보내기', exact: true }).click();
  expect(await readFile((await (await originalDownload).path())!)).toEqual(original);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
    true,
  );
});
test('worksheet problem 8 ink and answer survive finish, resume 9, review and complete ZIP transfer', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await seed(page);
  const original = await upload(page);
  await page.getByRole('button', { name: '1번부터 이어 풀기', exact: true }).click();
  const w = page.getByRole('region', { name: '다중 문제 학습실' });
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!)),
    problems = state.learning.problems;
  for (let i = 0; i < 8; i++) {
    if (i > 0) {
      await saved(page);
      await w.getByLabel('문제 목록', { exact: true }).selectOption(problems[i].id);
      await expect(
        w.getByRole('heading', { name: new RegExp('^' + (i + 1) + '번') }),
      ).toBeVisible();
      await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
    }
    if (i === 7) {
      await room(page).getByRole('button', { name: '문제 영역 지정', exact: true }).click();
      await pointer(page, [
        { x: 70, y: 200 },
        { x: 300, y: 450 },
      ]);
      await saved(page);
      await pointer(page, [
        { x: 90, y: 230 },
        { x: 120, y: 250 },
      ]);
      await saved(page);
    }
    await w.getByRole('button', { name: '3번 선택', exact: true }).click();
    await saved(page);
    await w.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
    await saved(page);
    await w
      .getByRole('button', {
        name: i === 7 ? '오답 · 다시 연습' : '정답 · 직접 확인했어요',
        exact: true,
      })
      .click();
  }
  let doc = (await readDocs(page))[0];
  const r = doc.regions.find((r) => r.problemId === problems[7].id)!;
  for (const [k, v] of Object.entries({ x: 70, y: 200, width: 230, height: 250 }))
    expect(r[k as 'x' | 'y' | 'width' | 'height']).toBeCloseTo(v, 5);
  expect(doc.inkHistory.at(-1)!.layers.some((l) => l.strokes.length === 1)).toBe(true);
  await saved(page);
  await page.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  await nav(page, '집중');
  await page.getByRole('button', { name: '9번부터 이어 풀기', exact: true }).click();
  await expect(w.getByLabel('문제 목록', { exact: true })).toHaveValue(problems[8].id);
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  await w.getByLabel('문제 목록', { exact: true }).selectOption(problems[7].id);
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  await expect(room(page).getByLabel('이 문제의 필기 이력', { exact: true })).toBeVisible();
  await saved(page);
  const history = (await readDocs(page))[0].inkHistory.at(-1)!;
  await room(page)
    .getByLabel('이 문제의 필기 이력', { exact: true })
    .selectOption(history.attemptId);
  await expect(w.getByLabel('힌트·해설을 참고했어요', { exact: true })).toBeChecked();
  await room(page).getByLabel('이 문제의 필기 이력', { exact: true }).selectOption('');
  await page.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  doc = (await readDocs(page))[0];
  const retryLayers = doc.layers.filter((l) => l.problemId === problems[7].id);
  expect(retryLayers.at(-1)!.strokes).toHaveLength(0);
  expect(retryLayers.some((l) => l.strokes.length === 1)).toBe(true);
  await nav(page, '더보기');
  await page
    .getByRole('navigation', { name: '추가 도구', exact: true })
    .getByRole('button', { name: '설정', exact: true })
    .click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' }),
    dl = page.waitForEvent('download', { timeout: 20000 });
  await backup.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기', exact: true }).click();
  const zip = await dl,
    path = (await zip.path())!;
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } }),
    fresh = await context.newPage();
  await fresh.goto(page.url());
  await fresh.evaluate(() => {
    localStorage.setItem('bkit.atelier.visited.v1', '1');
  });
  await fresh.reload();
  await nav(fresh, '더보기');
  await fresh
    .getByRole('navigation', { name: '추가 도구', exact: true })
    .getByRole('button', { name: '설정', exact: true })
    .click();
  const restore = fresh.getByRole('region', { name: '사진 포함 전체 백업' });
  await restore.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(path);
  await expect(restore.getByText('PDF·디지털 종이 1개', { exact: false })).toBeVisible();
  await restore.getByRole('button', { name: '검사한 백업 병합', exact: true }).click();
  await expect(
    restore.getByRole('button', { name: '복원한 앱 다시 열기', exact: true }),
  ).toBeVisible();
  const restored = (await readDocs(fresh))[0];
  expect(restored.regions).toEqual(doc.regions);
  expect(restored.inkHistory).toEqual(doc.inkHistory);
  expect(restored.layers).toEqual(doc.layers);
  const bytes = await fresh.evaluate(
    (id) =>
      new Promise<number[]>((resolve) => {
        const r = indexedDB.open('bkit-digital-paper-v1');
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction('originals').objectStore('originals').get(id);
          q.onsuccess = () => {
            resolve(Array.from(new Uint8Array(q.result.bytes)));
            db.close();
          };
        };
      }),
    restored.fileId,
  );
  expect(Buffer.from(bytes)).toEqual(original);
  const incoming = await fresh.evaluate(() =>
    JSON.parse(localStorage.getItem('bkit.study-os.v1')!),
  );
  expect(
    incoming.learning.attempts.find((a: { problemId: string }) => a.problemId === problems[7].id)
      .selfCheck,
  ).toBe('incorrect');
  await context.close();
});
test('editable tools, two-finger navigation, pointer cancellation and unsaved-ink protection', async ({
  page,
}) => {
  test.setTimeout(90000);
  await seed(page);
  await upload(page);
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  await room(page).getByRole('button', { name: '직선', exact: true }).click();
  await pointer(page, [
    { x: 60, y: 100 },
    { x: 200, y: 100 },
  ]);
  await saved(page);
  await room(page).getByRole('button', { name: '사각형', exact: true }).click();
  await pointer(page, [
    { x: 250, y: 100 },
    { x: 350, y: 200 },
  ]);
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes.map((s) => s.tool)).toEqual([
    'line',
    'rectangle',
  ]);
  await room(page).getByRole('button', { name: '획 지우개', exact: true }).click();
  await pointer(page, [
    { x: 120, y: 100 },
    { x: 125, y: 100 },
  ]);
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(1);
  await room(page).getByRole('button', { name: '실행 취소', exact: true }).click();
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(2);
  await room(page).getByRole('button', { name: '올가미', exact: true }).click();
  await pointer(page, [
    { x: 40, y: 80 },
    { x: 220, y: 80 },
    { x: 220, y: 120 },
    { x: 40, y: 120 },
    { x: 40, y: 80 },
  ]);
  await expect(
    room(page).getByRole('button', { name: '선택 획 삭제 (1)', exact: true }),
  ).toBeVisible();
  await pointer(page, [
    { x: 100, y: 100 },
    { x: 110, y: 120 },
  ]);
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes[0].points[0].y).toBeCloseTo(120, 4);
  await room(page).getByRole('button', { name: '선택 획 삭제 (1)', exact: true }).click();
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(1);
  await room(page)
    .getByTestId('ink-canvas')
    .evaluate((canvas) => {
      const el = canvas as HTMLCanvasElement;
      const r = el.getBoundingClientRect();
      const e = (kind: string, id: number, x: number) =>
        el.dispatchEvent(
          new PointerEvent(kind, {
            bubbles: true,
            pointerId: id,
            pointerType: 'touch',
            button: 0,
            clientX: r.left + x,
            clientY: r.top + 100,
          }),
        );
      e('pointerdown', 31, 50);
      e('pointerdown', 32, 150);
      e('pointermove', 32, 200);
      e('pointerup', 31, 50);
      e('pointerup', 32, 200);
    });
  await saved(page);
  expect((await readDocs(page))[0].cursor.zoom).toBeGreaterThan(1);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(1);
  // At native iPhone sizes, a 600x800 PDF can still fit vertically after a 1.5x
  // pinch. Make the viewport genuinely scrollable before asserting a 50px pan.
  const scroller = room(page).locator('.paper-scroll');
  for (let i = 0; i < 4; i++) {
    if ((await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)) > 150) break;
    await room(page).getByRole('button', { name: '확대', exact: true }).click();
  }
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(150);
  // React zoom renders before the IndexedDB autosave finishes; wait for the
  // persisted zoom so the pre-gesture snapshot reflects the visible scale.
  const displayedZoom = Number((await room(page).locator('output').first().innerText()).replace('%', ''));
  await expect
    .poll(async () => Math.round((await readDocs(page))[0].cursor.zoom * 100))
    .toBe(displayedZoom);
  await scroller.evaluate((el) => {
    el.scrollTop = 40;
  });
  // Wait for the cursor to reach IndexedDB, rather than relying on the ink save
  // status (which may already read '저장됨' from an earlier stroke).
  await expect.poll(async () => (await readDocs(page))[0].cursor.scrollTop).toBeGreaterThan(35);
  const beforePan = (await readDocs(page))[0].cursor;
  await room(page)
    .getByTestId('ink-canvas')
    .evaluate((canvas) => {
      const el = canvas as HTMLCanvasElement,
        r = el.getBoundingClientRect();
      const send = (kind: string, id: number, x: number, y: number) =>
        el.dispatchEvent(
          new PointerEvent(kind, {
            bubbles: true,
            pointerId: id,
            pointerType: 'touch',
            button: 0,
            clientX: r.left + x,
            clientY: r.top + y,
          }),
        );
      send('pointerdown', 41, 50, 100);
      send('pointerdown', 42, 150, 100);
      send('pointermove', 41, 50, 50);
      send('pointermove', 42, 150, 50);
      send('pointerup', 41, 50, 50);
      send('pointerup', 42, 150, 50);
    });
  // The scroll change is applied in requestAnimationFrame and persisted with
  // a short debounce, so await the *actual* cursor, not a previous ink status.
  // Browsers can clamp/smooth the resulting scroll offset. Verify a genuine
  // persisted pan (rather than an exact 50px delta) without weakening zoom or
  // the saved-ink checks later in this scenario.
  await expect
    .poll(async () => (await readDocs(page))[0].cursor.scrollTop)
    .toBeGreaterThan(beforePan.scrollTop + 5);
  const afterPan = (await readDocs(page))[0].cursor;
  expect(afterPan.zoom).toBeCloseTo(beforePan.zoom, 5);
  expect(afterPan.scrollTop).toBeLessThanOrEqual(beforePan.scrollTop + 55);

  await room(page).getByRole('button', { name: '볼펜', exact: true }).click();
  await page.evaluate(() => {
    const proto = IDBDatabase.prototype,
      original = proto.transaction;
    (window as unknown as { restoreTx: () => void }).restoreTx = () => {
      proto.transaction = original;
    };
    proto.transaction = function (stores, mode, options) {
      if (
        mode === 'readwrite' &&
        (typeof stores === 'string'
          ? stores === 'documents'
          : Array.from(stores).includes('documents'))
      )
        throw new DOMException('Simulated disk full', 'QuotaExceededError');
      return original.call(this, stores, mode, options);
    };
  });
  await pointer(page, [
    { x: 100, y: 300 },
    { x: 120, y: 320 },
  ]);
  await expect(room(page).getByRole('alert')).toBeVisible();
  await room(page).getByRole('button', { name: '종이 닫기', exact: true }).click();
  await expect(room(page)).toBeVisible();
  const recovery = page.waitForEvent('download', { timeout: 20000 });
  await room(page).getByRole('button', { name: '미저장 필기 구조 JSON 보존', exact: true }).click();
  const payload = JSON.parse(await readFile((await (await recovery).path())!, 'utf8'));
  expect(payload.layers[0].strokes).toHaveLength(2);
  await page.evaluate(() => (window as unknown as { restoreTx: () => void }).restoreTx());
  await room(page).getByRole('button', { name: '저장 재시도', exact: true }).click();
  await expect(room(page)).toHaveCount(0);
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(2);
  await pointer(
    page,
    [
      { x: 130, y: 350 },
      { x: 150, y: 370 },
    ],
    'pen',
    17,
    true,
  );
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(3);
  await room(page).getByRole('button', { name: '종이 닫기', exact: true }).click();
  await expect(room(page)).toHaveCount(0);
  await page.getByText('미저장 필기 JSON 복구', { exact: true }).click();
  await page
    .getByLabel('필기 구조 JSON', { exact: true })
    .setInputFiles((await (await recovery).path())!);
  await expect.poll(async () => (await readDocs(page)).length).toBe(2);
  const docs = await readDocs(page);
  expect(docs.find((d) => d.name.includes('복구 사본'))!.layers[0].strokes).toHaveLength(2);
  expect(docs.find((d) => !d.name.includes('복구 사본'))!.layers[0].strokes).toHaveLength(3);
});
test('worksheet photo original, finger ink and source policy stay local and fit the screen', async ({
  page,
}) => {
  await seed(page);
  await page.getByText('PDF·사진 가져오기', { exact: true }).click();
  await page.getByLabel('PDF·학습지 사진 파일', { exact: true }).setInputFiles({
    name: 'invalid.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not a PDF'),
  });
  await expect(page.getByRole('alert').filter({ hasText: '파일 내용이' })).toBeVisible();
  expect(await readDocs(page)).toHaveLength(0);
  await page
    .getByLabel('PDF·학습지 사진 파일', { exact: true })
    .setInputFiles('tests/fixtures/printed-homework.png');
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  const original = (await readDocs(page))[0];
  expect(original.mime).toBe('image/png');
  expect(original.pages).toHaveLength(1);
  await room(page).getByLabel('펜 전용 · 손가락 이동', { exact: true }).uncheck();
  await pointer(
    page,
    [
      { x: 80, y: 80 },
      { x: 90, y: 90 },
    ],
    'touch',
  );
  await saved(page);
  expect((await readDocs(page))[0].layers[0].strokes).toHaveLength(1);
  if (test.info().project.name === 'desktop') {
    const surface = room(page).locator('.paper-scroll');
    await surface.scrollIntoViewIfNeeded();
    const box = (await surface.boundingBox())!;
    await page.mouse.move(box.x + 70, box.y + 90);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 110, { steps: 3 });
    await page.mouse.up();
    await saved(page);
    const ink = (await readDocs(page))[0].layers[0].strokes;
    expect(ink).toHaveLength(2);
    expect(ink.at(-1)!.points[0].pressure).toBe(0.5);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
    true,
  );
  await room(page).getByRole('button', { name: '종이 닫기', exact: true }).click();
  await page.getByText('공식 기출 PDF 자료실', { exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'EBSi 공식 기출문제 자료실 열기 ↗', exact: true }),
  ).toHaveAttribute('href', 'https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs');
  await expect(page.getByText('등록한 기출 PDF가 없습니다.', { exact: false })).toBeVisible();
});

test('in-progress Apple Pencil stroke survives a guarded navigation request', async ({ page }) => {
  await seed(page);
  await upload(page);
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(room(page).getByTestId('ink-canvas')).toBeVisible();
  const allowed = await room(page).getByTestId('ink-canvas').evaluate((canvas) => {
    const el = canvas as HTMLCanvasElement;
    // Synthetic pointer events do not own native capture in WebKit.
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
    el.hasPointerCapture = () => false;
    const box = el.getBoundingClientRect();
    const send = (kind: string, y: number) =>
      el.dispatchEvent(new PointerEvent(kind, {
        bubbles: true,
        cancelable: true,
        pointerId: 808,
        pointerType: 'pen',
        button: 0,
        buttons: 1,
        clientX: box.left + 40,
        clientY: box.top + y,
        pressure: 0.6,
      }));
    send('pointerdown', 90);
    send('pointermove', 130);
    // User asks the app to update while the pen is still down.
    return document.dispatchEvent(new CustomEvent('bkit:flush-learning-draft', {
      cancelable: true,
      detail: {
        resume: () => {
          (window as typeof window & { bkitSaveFinished?: boolean }).bkitSaveFinished = true;
        },
      },
    }));
  });
  expect(allowed).toBe(false);
  await expect.poll(async () => (await readDocs(page))[0].layers[0].strokes.length).toBe(1);
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { bkitSaveFinished?: boolean }).bkitSaveFinished ?? false,
  )).toBe(true);
  await page.reload();
  await nav(page, '집중');
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect.poll(async () => (await readDocs(page))[0].layers[0].strokes.length).toBe(1);
});
