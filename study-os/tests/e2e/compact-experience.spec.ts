import { test, expect, type Page } from './local-fixture';
import { newState, taskSchema, sessionSchema, type State } from '../../src/model';
import { materials } from '../../src/themes/material';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';

test.setTimeout(90000);

const atNoon = new Date('2026-10-21T04:00:00Z');
const key = 'bkit.study-os.v1';
const qa = new URL('../../../artifacts/compact-experience/', import.meta.url).pathname;
const labels = [
  ['오늘', 'home'],
  ['집중', 'focus'],
  ['과제', 'tasks'],
  ['기록', 'records'],
  ['도구', 'tools'],
] as const;
async function nav(page: Page, name: string) {
  await page.locator('nav:visible').getByRole('button', { name, exact: true }).first().click();
}
async function seed(page: Page, state: State = newState()) {
  await page.clock.install({ time: atNoon });
  await page.addInitScript((state) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '오늘의 공부', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function fit(page: Page, noScroll = false) {
  const m = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    // Production's separately maintained friend-verification banner precedes
    // the full-height app. Preserve it and verify the app's own screen budget.
    appTop: document.querySelector('#root')!.getBoundingClientRect().top + scrollY,
  }));
  expect(m.scrollWidth).toBeLessThanOrEqual(m.width + 1);
  if (noScroll) expect(m.scrollHeight).toBeLessThanOrEqual(m.height + m.appTop + 2);
  return m;
}
async function aboveDock(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  const dock = (await page.getByRole('navigation', { name: '주 메뉴', exact: true }).isVisible())
    ? await page.getByRole('navigation', { name: '주 메뉴', exact: true }).boundingBox()
    : null;
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(dock?.y ?? page.viewportSize()!.height);
}
async function shot(page: Page, project: string, name: string) {
  await mkdir(qa + project, { recursive: true });
  await page.waitForTimeout(650);
  await page.screenshot({ path: qa + project + '/' + name + '.png', animations: 'disabled' });
}
function task(id: string, title: string, extra = {}) {
  return taskSchema.parse({
    id,
    subject: '수학',
    title,
    kind: '숙제',
    due: null,
    priority: 3,
    minutes: 30,
    remaining: 30,
    status: 'todo',
    submitted: false,
    optional: false,
    notes: '기존 메모 보존',
    link: '',
    ...extra,
  });
}
function populated() {
  const s = newState();
  s.tasks = [
    task('math', '수열의 극한 · 교과서 20문제'),
    task('essay', '독서 감상문 제출', {
      subject: '국어',
      kind: '수행평가',
      status: 'done',
      submissionRequired: true,
    }),
    ...Array.from({ length: 4 }, (_, i) =>
      task(
        'task-' + i,
        ['영어 단어 복습', '경제 학습지 풀기', '물리 탐구 보고서', '기출 문제 다시 풀기'][i],
      ),
    ),
  ];
  s.sessions = [
    sessionSchema.parse({
      id: 'recent',
      taskId: null,
      subject: '수학',
      action: '극한 문제 풀이',
      started: '2026-10-20T03:00:00Z',
      ended: '2026-10-20T03:30:00Z',
      seconds: 1800,
      target: 30,
      problems: 7,
      concepts: '수열',
      rating: '이해함',
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
    }),
    sessionSchema.parse({
      id: 'older',
      taskId: null,
      subject: '영어',
      action: '오래된 학습',
      started: '2026-10-01T03:00:00Z',
      ended: '2026-10-01T04:00:00Z',
      seconds: 3600,
      target: 60,
      problems: 90,
      concepts: '',
      rating: '보통',
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
    }),
  ];
  return s;
}

test('empty core screens fit, actions stay above the dock, and all five screens are captured', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page);
  const metrics = [];
  for (const [label, id] of labels) {
    await nav(page, label);
    if (id === 'tools')
      await expect(page.getByRole('button', { name: '공부 자료', exact: true })).toBeVisible();
    if (id === 'focus')
      await expect(page.getByRole('button', { name: '지금 시작', exact: true })).toBeVisible();
    metrics.push({ screen: id, ...(await fit(page, true)) });
    await shot(page, info.project.name, 'empty-' + id);
  }
  await writeFile(qa + info.project.name + '/metrics.json', JSON.stringify(metrics, null, 2));
  await nav(page, '집중');
  await aboveDock(page, '.quick-timer-begin');
  await nav(page, '과제');
  await aboveDock(page, '.task-add-actions');
  await nav(page, '오늘');
  await aboveDock(page, '.study-start-primary');
  expect(errors).toEqual([]);
});

test('home limits tasks, submission is separate, and weekly time and problems share a period', async ({
  page,
}, info) => {
  const original = populated();
  await seed(page, original);
  await expect(page.locator('.study-task')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '5개 전체 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '제출 확인 1개 남았어요' })).toBeVisible();
  await shot(page, info.project.name, 'populated-home');
  await page.getByRole('button', { name: '5개 전체 보기' }).click();
  await expect(page.locator('.task-row')).toHaveCount(5);
  await page
    .getByRole('button', { name: '수열의 극한 · 교과서 20문제 학습 완료로 변경', exact: true })
    .click();
  await page
    .getByRole('group', { name: '과제 필터' })
    .getByRole('button', { name: '제출 확인', exact: true })
    .click();
  await expect(page.getByRole('button', { name: '독서 감상문 제출 제출 완료 기록' })).toBeVisible();
  await page.getByRole('button', { name: '독서 감상문 제출 제출 완료 기록' }).click();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(stored.tasks[0]).toMatchObject({
    status: 'done',
    submitted: false,
    notes: '기존 메모 보존',
  });
  expect(stored.tasks[1]).toMatchObject({ status: 'done', submitted: true });
  await nav(page, '기록');
  await expect(page.locator('.compact-record-stats strong')).toHaveText(['30분', '7문제']);
  await shot(page, info.project.name, 'populated-records');
  await fit(page);
});

test('all nine themes apply instantly while running and paused timers survive navigation and reload', async ({
  page,
}, info) => {
  await seed(page, populated());
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await expect(page.locator('.quick-timer-active')).toBeVisible();
  const original = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  await page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' }).click();
  await expect(page.getByRole('dialog', { name: '나의 공부 공간' })).toBeVisible();
  for (const m of materials) {
    await page.getByRole('button', { name: m.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-material', m.id);
    const data = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    expect(data.quickTimer).toEqual(original.quickTimer);
    expect(data.tasks).toEqual(original.tasks);
    expect(data.sessions).toEqual(original.sessions);
  }
  await page.getByRole('button', { name: 'Liquid Glass', exact: true }).click();
  await shot(page, info.project.name, 'theme-picker');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('button', { name: 'BKIT 로고 · 테마 선택' })).toBeFocused();
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '일시정지', exact: true })
    .click();
  const paused = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).quickTimer,
    key,
  );
  await nav(page, '오늘');
  await expect(page.getByRole('button', { name: '공부 이어가기', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-material', 'glass');
  await nav(page, '집중');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).quickTimer, key),
  ).toEqual(paused);
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '이어하기', exact: true })
    .click();
  await shot(page, info.project.name, 'running-focus');
  await aboveDock(page, '.quick-timer-actions');
  await page
    .locator('.quick-timer-actions')
    .getByRole('button', { name: '끝내고 시간 저장', exact: true })
    .click();
  const ended = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(ended.quickTimer).toBeNull();
  expect(ended.sessions).toHaveLength(original.sessions.length + 1);
  expect(ended.tasks).toEqual(original.tasks);
});

test('gyro requires a tap, calibrates smoothly, and reduced motion and low power stop the effect', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    (window as any).__sensorRequests = 0;
    Object.defineProperty(window.DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => {
        (window as any).__sensorRequests++;
        return Promise.resolve('granted');
      },
    });
  });
  await seed(page);
  expect(await page.evaluate(() => (window as any).__sensorRequests)).toBe(0);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 연결', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__sensorRequests)).toBe(1);
  const tilt = async (beta: number, gamma: number) =>
    page.evaluate(
      ({ beta, gamma }) => {
        const e = new Event('deviceorientation');
        Object.defineProperties(e, { beta: { value: beta }, gamma: { value: gamma } });
        window.dispatchEvent(e);
      },
      { beta, gamma },
    );
  await expect(page.locator('.material-sensor-control')).toContainText('센서 대기 중');
  // Keep supplying real input samples while the effect listener/render loop settles.
  await expect
    .poll(async () => {
      await tilt(30, 0);
      await tilt(40, 16);
      return page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--sensor-x')));
    })
    .toBeGreaterThan(0.02);
  await shot(page, info.project.name, 'gyro-enabled');
  await page.getByRole('combobox', { name: '테마 움직임' }).selectOption('off');
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await expect
    .poll(() =>
      page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--sensor-x'))),
    )
    .toBe(0);
  await page.getByRole('combobox', { name: '테마 움직임' }).selectOption('auto');
  await page.getByRole('switch', { name: '배터리 절약' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
});

test('denied sensor access leaves all study controls usable', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window.DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    }),
  );
  await seed(page);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: '센서 연결', exact: true }).click();
  await expect(page.locator('.material-sensor-control')).toContainText('권한 없이도');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '지금 공부 시작', exact: true }).click();
  await expect(page.locator('.quick-timer-active')).toBeVisible();
});

test('task modal handles a keyboard viewport and long text without dock or horizontal overlap', async ({
  page,
}, info) => {
  await seed(page);
  await nav(page, '과제');
  await page.getByRole('button', { name: '과제 추가', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '상세 입력', exact: true }).click();
  await dialog
    .getByLabel('과제 이름 · 바로 할 행동', { exact: true })
    .fill('아름다운 한글과 English · ' + '아주긴과제이름'.repeat(15));
  await dialog.getByLabel('과목', { exact: true }).fill('수학');
  await page.evaluate(() => {
    if (!window.visualViewport) return;
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 360 });
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-os-keyboard', 'true');
  expect(await dialog.evaluate((e) => e.getBoundingClientRect().height)).toBeLessThanOrEqual(330);
  const keyboardBox = await dialog.boundingBox();
  expect(keyboardBox!.y).toBeGreaterThanOrEqual(8);
  expect(keyboardBox!.y + keyboardBox!.height).toBeLessThanOrEqual(352);
  await fit(page);
  await shot(page, info.project.name, 'keyboard-modal');
  await page.evaluate(() => {
    if (window.visualViewport) {
      delete (window.visualViewport as any).height;
      window.visualViewport.dispatchEvent(new Event('resize'));
    }
  });
  await dialog.getByRole('button', { name: '과제 저장', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.task-row')).toHaveCount(1);
  await fit(page);
  await page.evaluate(() => (document.documentElement.style.fontSize = '20px'));
  await fit(page);
  await shot(page, info.project.name, 'long-task');
});

test('PDF originals, ink metadata, attachments and study records survive themes and reload', async ({
  page,
}, info) => {
  const state = populated();
  state.tasks[0].attachmentIds = ['qa-photo'];
  await seed(page, state);
  await nav(page, '도구');
  await page.getByRole('button', { name: '공부 자료', exact: true }).click();
  await page.getByText('PDF · 필기 도구', { exact: true }).click();
  await page.getByText('PDF·사진 가져오기', { exact: true }).click();
  const doc = await PDFDocument.create();
  doc.addPage([600, 800]).drawText('BKIT preserved worksheet');
  const bytes = Buffer.from(await doc.save());
  await page
    .getByLabel('PDF·학습지 사진 파일', { exact: true })
    .setInputFiles({ name: '보존할 학습지.pdf', mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('button', { name: '종이 열기', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('bkit-private-materials-v1', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').put({
          id: 'qa-photo',
          bytes: new Uint8Array([1, 3, 7, 9]).buffer,
          mime: 'image/png',
          name: '기존 첨부',
          size: 4,
          digest: 'test',
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  const snapshot = () =>
    page.evaluate(async () => {
      const read = async (name: string, stores: string[]) =>
        new Promise<Record<string, unknown[]>>((resolve, reject) => {
          const r = indexedDB.open(name, 1);
          r.onsuccess = () => {
            const db = r.result;
            const tx = db.transaction(stores, 'readonly');
            const out: Record<string, unknown[]> = {};
            for (const s of stores) {
              const q = tx.objectStore(s).getAll();
              q.onsuccess = () => {
                out[s] = q.result.map((v) => ({
                  ...v,
                  ...(v.bytes ? { bytes: Array.from(new Uint8Array(v.bytes)) } : {}),
                }));
              };
            }
            tx.oncomplete = () => {
              db.close();
              resolve(out);
            };
            tx.onerror = () => reject(tx.error);
          };
        });
      return {
        paper: await read('bkit-digital-paper-v1', ['documents', 'originals']),
        photos: await read('bkit-private-materials-v1', ['photos']),
        state: JSON.parse(localStorage.getItem('bkit.study-os.v1')!),
      };
    });
  const before = await snapshot();
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: 'Peach Flow', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await nav(page, '도구');
  await page.getByRole('button', { name: '공부 자료', exact: true }).click();
  await page.getByText('PDF · 필기 도구', { exact: true }).click();
  await page.getByText('PDF·사진 가져오기', { exact: true }).click();
  await expect(page.getByRole('button', { name: '종이 열기', exact: true })).toBeVisible();
  const after = await snapshot();
  expect(after.paper).toEqual(before.paper);
  expect(after.photos).toEqual(before.photos);
  expect(after.state.tasks).toEqual(before.state.tasks);
  expect(after.state.sessions).toEqual(before.state.sessions);
  await page.getByRole('button', { name: '종이 열기', exact: true }).click();
  await expect(page.getByRole('region', { name: '디지털 종이 학습실', exact: true })).toBeVisible();
  await fit(page);
  await shot(page, info.project.name, 'preserved-pdf');
});

test('task focus keeps the clock and controls first and retains its session across theme and routes', async ({
  page,
}, info) => {
  await seed(page, populated());
  await page
    .getByRole('button', { name: '수열의 극한 · 교과서 20문제 5분 시작', exact: true })
    .click();
  await expect(page.locator('.app-shell')).toHaveClass(/is-focusing/);
  await expect(page.getByRole('timer', { name: '집중 타이머', exact: true })).toBeVisible();
  await aboveDock(page, '.focus-actions');
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active, key);
  await page.getByRole('button', { name: '테마 선택', exact: true }).click();
  await page.getByRole('button', { name: 'Forest Dark', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await nav(page, '오늘');
  await page.getByRole('button', { name: '공부 이어가기', exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active, key)).toEqual(
    before,
  );
  await shot(page, info.project.name, 'task-focus');
  await page
    .locator('.focus-actions')
    .getByRole('button', { name: '일시정지', exact: true })
    .click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('일시정지 사유').fill('잠깐 휴식');
  await modal.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.reload();
  await nav(page, '집중');
  await expect(page.getByRole('button', { name: '다시 시작', exact: true })).toBeVisible();
  await aboveDock(page, '.focus-actions');
});

test('liquid background has full color coverage on tall Safari surfaces and touch waves stay bounded', async ({
  page,
}, info) => {
  await seed(page);
  const surface = page.locator('.surreal-surface');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  const coverage = () =>
    surface.evaluate((c) => {
      const canvas = c as HTMLCanvasElement,
        gl = canvas.getContext('webgl')!;
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const colors = [];
      for (const x of [0.01, 0.25, 0.5, 0.75, 0.99])
        for (const y of [0.01, 0.25, 0.5, 0.75, 0.99]) {
          const color = new Uint8Array(4);
          gl.readPixels(
            Math.floor(x * canvas.width),
            Math.floor(y * canvas.height),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            color,
          );
          colors.push([...color]);
        }
      return { colors, error: gl.getError() };
    });
  let pixels = await coverage();
  expect(pixels.error).toBe(0);
  expect(pixels.colors.every((c) => c[0] > 100 && c[1] > 80 && c[2] > 70)).toBe(true);
  if (info.project.use.hasTouch) await page.touchscreen.tap(8, 300);
  else await page.mouse.click(8, 300);
  await page.waitForTimeout(250);
  pixels = await coverage();
  expect(pixels.colors.every((c) => c[0] > 100 && c[1] > 80 && c[2] > 70)).toBe(true);
  await shot(page, info.project.name, 'liquid-wave');
});

test('every tool has a reachable route and advanced backup and recovery remain inside settings', async ({
  page,
}) => {
  // Route/backup coverage also exercises an existing learner's saved classic theme.
  // Liquid motion, coverage and all nine live selections are covered independently.
  await page.addInitScript(() => {
    localStorage.setItem('bkit.study-os.theme.v1', 'light');
    localStorage.setItem(
      'bkit.material.v1',
      JSON.stringify({ id: 'classic', motion: 'auto', intensity: 0.5, lowPower: false }),
    );
  });
  await seed(page, populated());
  for (const [label, heading] of [
    ['공부 자료', '공부 자료'],
    ['시간표', '시간표'],
    ['시험 관리', '시험 관리'],
    ['AI ZONE', 'AI ZONE.'],
    ['공부 사이트', '공부 사이트 백과사전'],
    ['수면 루틴', 'Sleep Guard'],
  ]) {
    await nav(page, '도구');
    await page
      .getByRole('navigation', { name: '추가 도구' })
      .getByRole('button', { name: label, exact: true })
      .click();
    if (label === '수면 루틴')
      await expect(page.getByRole('region', { name: 'Sleep Guard', exact: true })).toBeVisible();
    else
      await expect(
        page.getByRole('heading', { name: heading, exact: true }).filter({ visible: true }).first(),
      ).toBeVisible();
    await fit(page);
  }
  await nav(page, '도구');
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.locator('.compact-section>summary').filter({ hasText: '백업 · 복구' }).click();
  const backup = page.getByRole('region', { name: '사진 포함 전체 백업' });
  await expect(backup).toBeVisible();
  await backup.getByRole('button', { name: '내 공부 기록·PDF·필기 원본 정밀 검사' }).click();
  await expect(backup.getByRole('region', { name: '저장 무결성 진단 결과' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: '공부 계획 다시 정리', exact: true }).click();
  const modal = page.getByRole('dialog', { name: '지금부터, 다시 시작' });
  await expect(modal.getByRole('button', { name: '다시 계산', exact: true })).toBeVisible();
  await modal.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '학습 시간 직접 고정', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '직접 학습 시간 고정' })).toBeVisible();
});
