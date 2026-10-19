import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from './local-fixture';
import { newState, type State } from '../../src/model';
import { addResource } from '../../src/learningEngine';
import { defaultSleep } from '../../src/sleep';
async function nav(page: Page, name: string) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
async function more(page: Page, name: string) {
  await nav(page, '더보기');
  await page
    .getByRole('navigation', { name: '추가 도구', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
}
async function seed(page: Page, state: State) {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await page.addInitScript((value) => {
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(value));
  }, state);
  await page.goto('./');
}
function taskState() {
  const s = newState();
  s.tasks = [
    {
      id: 'math-task',
      subject: '수학',
      title: '학원 수학 20문제',
      kind: '숙제',
      due: null,
      priority: 2,
      minutes: 40,
      remaining: 40,
      status: 'todo',
      submitted: false,
      submissionRequired: true,
      optional: false,
      notes: '기존 메모',
      link: '',
      quantity: { unit: 'problems', total: 20, remaining: 20 },
    },
  ];
  return s;
}
function resourceState(subject = '수학', bodies = ['문제 하나', '문제 둘']) {
  return addResource(
    taskState(),
    {
      title: subject + ' 실제 학습지',
      subject,
      sourceType: 'academy-sheet',
      linkedTaskId: 'math-task',
      linkedMediaIds: [],
    },
    bodies,
  );
}
async function finish(page: Page) {
  await page.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
}
test('20 actual problems: solve 1–8, preserve error, resume 9, finish quantity without submission', async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page, taskState());
  await nav(page, '집중');
  const library = page.getByRole('region', { name: '자료 라이브러리' });
  await library.getByRole('button', { name: '자료 추가', exact: true }).click();
  await library.getByLabel('자료 제목', { exact: true }).fill('수학 숙제 20문제');
  await library.getByLabel('연결 과제', { exact: true }).selectOption('math-task');
  await library.getByLabel('등록할 실제 문제 수', { exact: true }).fill('20');
  await library.getByRole('button', { name: '자료 저장', exact: true }).click();
  await library.getByRole('button', { name: '1번부터 이어 풀기', exact: true }).click();
  let w = page.getByRole('region', { name: '다중 문제 학습실' });
  for (let i = 1; i <= 8; i++) {
    await expect(w.getByLabel('문제 목록', { exact: true })).toContainText(i + '번');
    await w.getByLabel('최종 답', { exact: true }).fill('직접 푼 답 ' + i);
    await w.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
    if (i === 3) {
      await w.getByLabel('오류 유형', { exact: true }).selectOption('calculation');
      await w.getByRole('button', { name: '오답 · 다시 연습', exact: true }).click();
      await w.getByRole('button', { name: '답을 가리고 재시도', exact: true }).click();
      await w.getByLabel('최종 답', { exact: true }).fill('당일 바로 고쳐 푼 답');
      await w.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
      await w.getByRole('button', { name: '정답 · 직접 확인했어요', exact: true }).click();
    } else await w.getByRole('button', { name: '정답 · 직접 확인했어요', exact: true }).click();
    if (i < 8) await w.getByRole('button', { name: '다음 문제', exact: true }).click();
  }
  await finish(page);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0].quantity.remaining).toBe(12);
  expect(saved.learning.attempts[2].errorTag).toBe('calculation');
  expect(saved.sessions[0].problems).toBe(8);
  await page.reload();
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  w = page.getByRole('region', { name: '다중 문제 학습실' });
  await expect(w.getByLabel('문제 목록', { exact: true })).toHaveValue(
    saved.learning.problems[8].id,
  );
  for (let i = 9; i <= 20; i++) {
    await w.getByLabel('최종 답', { exact: true }).fill('내 풀이 ' + i);
    await w.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
    await w.getByRole('button', { name: '정답 · 직접 확인했어요', exact: true }).click();
    if (i < 20) await w.getByRole('button', { name: '다음 문제', exact: true }).click();
  }
  await w.getByRole('button', { name: '저장하고 학습 종료', exact: true }).click();
  await page.getByLabel('이 과제의 학습 분량을 모두 완료했어요', { exact: false }).check();
  await page.getByRole('button', { name: '학습 기록 저장 · 종료', exact: true }).click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0]).toMatchObject({
    status: 'done',
    submitted: false,
    quantity: { total: 20, remaining: 0 },
  });
  expect(saved.learning.attempts).toHaveLength(21);
  await page.clock.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  await page.reload();
  await page.getByRole('button', { name: '답을 가리고 다시 풀기', exact: false }).click();
  const reviews = page.getByRole('region', { name: '자료 문제 복습' });
  await reviews.getByRole('button', { name: '답을 가리고 재시험', exact: true }).click();
  await page.getByLabel('최종 답', { exact: true }).fill('계산을 고친 답');
  await page.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
  await page.getByRole('button', { name: '정답 · 직접 확인했어요', exact: true }).click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.tasks[0].quantity.remaining).toBe(0);
  expect(saved.learning.attempts).toHaveLength(22);
});
test('draft and subject steps survive reload and safe Sleep Guard transition', async ({ page }) => {
  const s = resourceState('물리');
  await seed(page, s);
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await page.getByLabel('결과와 단위', { exact: true }).fill('v = 3 m/s · 작성 중');
  await page.getByText('풀이 단계·회상 기록', { exact: true }).click();
  await page.getByLabel('단위 점검', { exact: true }).fill('미터와 초 확인');
  await page.reload();
  await nav(page, '집중');
  await expect(page.getByLabel('결과와 단위', { exact: true })).toHaveValue('v = 3 m/s · 작성 중');
  await page.getByRole('button', { name: '답안 저장 상태로 취침 준비', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.active.segmentStart).toBeNull();
  expect(saved.learning.problems[0].draft).toContain('작성 중');
  expect(saved.learning.problems[0].draftFields.units).toBe('미터와 초 확인');
  await nav(page, '집중');
  await expect(page.getByLabel('결과와 단위', { exact: true })).toHaveValue('v = 3 m/s · 작성 중');
});
test('English original and reference translation stay hidden until an attempt; five local templates', async ({
  page,
}) => {
  const s = resourceState('영어', ['I have been studying.']);
  s.learning!.problems[0].referenceAnswer = '나는 계속 공부해 왔다.';
  for (const subject of ['수학', '물리', '화학', '경제']) {
    const next = addResource(
      s,
      {
        title: subject + ' 자료',
        subject,
        sourceType: 'user-note',
        linkedTaskId: null,
        linkedMediaIds: [],
      },
      ['실제 질문'],
    );
    s.learning = next.learning;
  }
  await seed(page, s);
  await nav(page, '집중');
  await page.getByRole('button', { name: '1번부터 이어 풀기', exact: true }).first().click();
  await expect(page.getByText('나는 계속 공부해 왔다.', { exact: true })).toHaveCount(0);
  await page.getByLabel('내가 직접 쓴 해석', { exact: true }).fill('나는 공부하고 있었다');
  await page.getByRole('button', { name: '내 답 저장 · 직접 확인하기', exact: true }).click();
  await page.getByRole('button', { name: '참고 정답·번역 확인', exact: true }).click();
  await expect(page.getByText('나는 계속 공부해 왔다.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '오답 · 다시 연습', exact: true }).click();
  await finish(page);
  for (const [subject, label] of [
    ['수학', '최종 답'],
    ['물리', '결과와 단위'],
    ['화학', '결과와 조건 확인'],
    ['경제', '내 말로 설명하기'],
  ]) {
    await nav(page, '집중');
    const card = page
      .locator('.resource-card')
      .filter({ has: page.getByRole('heading', { name: subject + ' 자료', exact: true }) });
    await card.getByRole('button', { name: '1번부터 이어 풀기', exact: true }).click();
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await finish(page);
  }
});
test('exam links only user-selected resources and shows real remaining work', async ({ page }) => {
  const s = resourceState();
  await seed(page, s);
  await more(page, '시험 관리');
  await page.getByRole('button', { name: '시험 추가', exact: true }).click();
  await page.getByLabel('시험 과목', { exact: true }).fill('수학');
  await page.getByLabel('시험 이름', { exact: true }).fill('중간고사');
  await page.getByLabel('확인된 시험 날짜 (모르면 비우기)', { exact: true }).fill('2026-10-23');
  await page.getByLabel('확인된 시험 범위', { exact: true }).fill('함수');
  await page.getByLabel('시험 범위 출처', { exact: true }).fill('선생님 공지');
  await page.getByLabel('수학 · 수학 실제 학습지', { exact: true }).check();
  await page.getByRole('button', { name: '시험 정보 저장', exact: true }).click();
  await expect(page.getByRole('region', { name: '시험 범위 관리' })).toContainText('남은 문제 2/2');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.exams[0].linkedResourceIds).toEqual([s.learning!.resources[0].id]);
});
test('complete ZIP with original study and sleep photos restores in a fresh browser context', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const s = resourceState();
  s.tasks[0].attachmentIds = ['study-original'];
  s.learning!.resources[0].linkedMediaIds = ['study-original'];
  const sleep = defaultSleep();
  sleep.records = [
    {
      date: '2026-10-19',
      targetBed: '2026-10-19T23:00:00Z',
      targetWake: '2026-10-20T07:00:00Z',
      checks: [true, false, false, false],
      actualBed: null,
      actualWake: null,
      reflection: '수면 기록',
      photoIds: ['sleep-original'],
    },
  ];
  await seed(page, s);
  await page.evaluate(async (sleep) => {
    localStorage.setItem('bkit.sleep-guard.v3', JSON.stringify(sleep));
    for (const [dbName, id] of [
      ['bkit-private-materials-v1', 'study-original'],
      ['bkit-sleep-photos-v3', 'sleep-original'],
    ]) {
      const bytes = Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAvsAAAAASUVORK5CYII=',
        ),
        (c) => c.charCodeAt(0),
      );
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('');
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
        req.onsuccess = () => {
          const db = req.result,
            tx = db.transaction('photos', 'readwrite');
          tx.objectStore('photos').put({
            id,
            bytes: bytes.buffer,
            mime: 'image/png',
            name: id + '.png',
            size: bytes.length,
            digest,
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    }
  }, sleep);
  await more(page, '설정');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '사진 포함 전체 ZIP 내보내기', exact: true }).click();
  const file = await download;
  const path = testInfo.outputPath('complete.zip');
  await file.saveAs(path);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    return /^https?:/.test(url) && new URL(url).origin !== new URL(page.url()).origin
      ? route.abort('blockedbyclient')
      : route.continue();
  });
  const target = await context.newPage();
  await target.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
  await target.addInitScript(() => localStorage.setItem('bkit.atelier.visited.v1', '1'));
  await target.goto(page.url());
  await more(target, '설정');
  await target.getByLabel('전체 ZIP 백업 검사', { exact: true }).setInputFiles(path);
  await expect(target.getByText('원본 사진 2장', { exact: false })).toBeVisible();
  await target.getByLabel('복원 방식', { exact: true }).selectOption('replace');
  // Replacing local study data intentionally asks the learner for explicit consent.
  // An unattended browser test must acknowledge this protection, not bypass it.
  target.once('dialog', (dialog) => dialog.accept());
  await target.getByRole('button', { name: '검사한 백업 교체', exact: true }).click();
  await expect(
    target.getByRole('button', { name: '복원한 앱 다시 열기', exact: true }),
  ).toBeVisible();
  await Promise.all([
    target.waitForEvent('domcontentloaded'),
    target.getByRole('button', { name: '복원한 앱 다시 열기', exact: true }).click(),
  ]);
  await expect(
    target.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }),
  ).toBeVisible();
  const result = await target.evaluate(async () => {
    const read = (name: string, id: string) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onsuccess = () => {
          const db = req.result,
            tx = db.transaction('photos', 'readonly'),
            get = tx.objectStore('photos').get(id);
          tx.oncomplete = () => {
            resolve(get.result.bytes.byteLength);
            db.close();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    return {
      state: JSON.parse(localStorage.getItem('bkit.study-os.v1')!),
      sleep: JSON.parse(localStorage.getItem('bkit.sleep-guard.v3')!),
      studyBytes: await read('bkit-private-materials-v1', 'study-original'),
      sleepBytes: await read('bkit-sleep-photos-v3', 'sleep-original'),
    };
  });
  expect(result.state.learning.resources[0].linkedMediaIds).toEqual(['study-original']);
  expect(result.sleep.records[0].reflection).toBe('수면 기록');
  expect(result.studyBytes).toBeGreaterThan(0);
  expect(result.sleepBytes).toBe(result.studyBytes);
  await context.close();
});
test('new learning screens fit mobile tablet and desktop and preserve old record IDs', async ({
  page,
}) => {
  const s = resourceState();
  s.sessions = [
    {
      id: 'old-session',
      taskId: 'math-task',
      subject: '수학',
      action: '기존 풀이',
      started: '2026-10-18T10:00:00Z',
      ended: '2026-10-18T10:01:00Z',
      seconds: 60,
      target: 5,
      problems: 1,
      concepts: '',
      rating: '보통',
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
      workspace: {
        problem: '기존 질문',
        source: '기존 자료',
        attempts: [
          {
            id: 'old-attempt',
            answer: '기존 답',
            submittedAt: '2026-10-18T10:00:30Z',
            selfCheck: 'remembered',
            hintUsed: false,
          },
        ],
      },
    },
  ];
  await seed(page, s);
  await nav(page, '집중');
  await expect(page.getByRole('region', { name: '자료 라이브러리' })).toBeVisible();
  await page.getByRole('button', { name: '1번부터 이어 풀기', exact: true }).click();
  await page.getByLabel('최종 답', { exact: true }).fill('가'.repeat(100));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  expect((await new AxeBuilder({ page }).include('.multi-workspace').analyze()).violations).toEqual(
    [],
  );
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.sessions[0].id).toBe('old-session');
  expect(saved.sessions[0].workspace.attempts[0].id).toBe('old-attempt');
});

test('a full store keeps the typed draft and blocks navigation until it can save', async ({
  page,
}) => {
  const s = resourceState();
  await seed(page, s);
  await page.getByRole('button', { name: '마지막 문제부터 5분 시작', exact: true }).click();
  await expect(page.getByLabel('최종 답', { exact: true })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'));
  await page.evaluate(() => {
    sessionStorage.setItem('bkit-test-quota', '1');
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'bkit.study-os.v1' && sessionStorage.getItem('bkit-test-quota') === '1')
        throw new DOMException('full', 'QuotaExceededError');
      set.call(this, k, v);
    };
  });
  await page.getByLabel('최종 답', { exact: true }).fill('사라지면 안 되는 답');
  await page.getByRole('button', { name: '다음 문제', exact: true }).click();
  await expect(page.getByLabel('문제 목록', { exact: true })).toHaveValue(
    s.learning!.problems[0].id,
  );
  await page.getByRole('button', { name: '오늘로 · 타이머 유지', exact: true }).click();
  await expect(page.getByLabel('최종 답', { exact: true })).toHaveValue('사라지면 안 되는 답');
  expect(await page.evaluate(() => localStorage.getItem('bkit.study-os.v1'))).toBe(before);
  await page.evaluate(() => sessionStorage.removeItem('bkit-test-quota'));
  await page.getByRole('button', { name: '다음 문제', exact: true }).click();
  await expect(page.getByLabel('문제 목록', { exact: true })).toHaveValue(
    s.learning!.problems[1].id,
  );
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bkit.study-os.v1')!));
  expect(saved.learning.problems[0].draft).toBe('사라지면 안 되는 답');
});

test('library adds problems, reorders pages and questions, and saves source and concept without changing IDs', async ({
  page,
}) => {
  await seed(page, newState());
  await nav(page, '집중');
  const library = page.getByRole('region', { name: '자료 라이브러리' });
  await library.getByRole('button', { name: '자료 추가', exact: true }).click();
  await library.getByLabel('자료 제목', { exact: true }).fill('학교 프린트');
  await library
    .getByLabel('여러 문제 일괄 입력 (한 줄에 한 문제, 선택)', { exact: true })
    .fill('원문 첫 문제\n원문 두 번째 문제');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAvsAAAAASUVORK5CYII=',
    'base64',
  );
  await library.getByLabel('여러 페이지 사진 첨부', { exact: true }).setInputFiles([
    { name: 'page1.png', mimeType: 'image/png', buffer: png },
    { name: 'page2.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(library.locator('.resource-pages>div')).toHaveCount(2);
  await library.getByRole('button', { name: '자료 저장', exact: true }).click();
  const old = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).learning,
  );
  await library.getByRole('button', { name: '자료 수정', exact: true }).click();
  await library.getByRole('button', { name: '페이지 2 앞으로', exact: true }).click();
  await library.getByRole('button', { name: '자료 저장', exact: true }).click();
  await library.getByRole('button', { name: '2번 앞으로', exact: true }).click();
  await library.getByLabel('추가 문제 수', { exact: true }).fill('3');
  await library.getByRole('button', { name: '문제 추가 · 일괄 등록', exact: true }).click();
  const current = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).learning,
  );
  expect(current.resources[0].linkedMediaIds).toEqual(
    [...old.resources[0].linkedMediaIds].reverse(),
  );
  expect(current.problems).toHaveLength(5);
  expect(current.problems.find((p: { id: string }) => p.id === old.problems[1].id).ordinal).toBe(1);
  expect(current.problems[0].id).toBe(old.problems[0].id);
  await library.getByRole('button', { name: '문제 수정', exact: true }).first().click();
  await library.getByLabel('출처·원본 문제 번호', { exact: true }).fill('교재 12쪽 7번');
  await library.getByLabel('연결 개념', { exact: true }).fill('함수');
  await library
    .getByLabel('문제 페이지', { exact: true })
    .selectOption(current.resources[0].linkedMediaIds[0]);
  await library.getByRole('button', { name: '문제 저장', exact: true }).click();
  const changed = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bkit.study-os.v1')!).learning.problems,
  );
  expect(changed.find((p: { id: string }) => p.id === old.problems[1].id)).toMatchObject({
    sourceReference: '교재 12쪽 7번',
    concept: '함수',
    mediaId: current.resources[0].linkedMediaIds[0],
  });

  await library.getByRole('button', { name: '편집 닫기', exact: true }).click();
  await library.getByLabel('자료 검색', { exact: true }).fill('없는 과목');
  await expect(library.locator('.resource-card')).toHaveCount(0);
  await library.getByLabel('자료 검색', { exact: true }).fill('원문');
  await expect(library.locator('.resource-card')).toHaveCount(1);
});
