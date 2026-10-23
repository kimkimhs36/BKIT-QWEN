import { chromium } from '@playwright/test';
import { newState, taskSchema, sessionSchema, scheduleSchema } from '../src/model';
import { addResource } from '../src/learningEngine';
import { writeFile, readFile } from 'node:fs/promises';
const mode = process.argv[2];
const context = await chromium.launchPersistentContext('/workspace/evidence/upgrade-profile', {
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
if (mode === 'before') {
  let state = newState();
  state.tasks = ['legacy-homework', 'legacy-assessment'].map((id, i) =>
    taskSchema.parse({
      id,
      subject: '수학',
      title: i ? '기존 수행평가' : '기존 학습지',
      kind: i ? '수행평가' : '숙제',
      due: null,
      priority: 2,
      minutes: 25,
      remaining: 25,
      status: 'todo',
      submitted: false,
      optional: false,
      notes: '운영 버전에서 보존할 메모',
      link: '',
      attachmentIds: i ? [] : ['preserved-photo'],
    }),
  );
  state.schedules = [
    scheduleSchema.parse({
      id: 'legacy-class',
      title: '기존 학원',
      subject: '수학',
      kind: 'academy',
      days: [5],
      date: null,
      start: '20:00',
      end: '20:50',
      prep: 0,
      travel: 0,
      buffer: 0,
      materials: '교재',
      excluded: [],
    }),
  ];
  state.sessions = [
    sessionSchema.parse({
      id: 'legacy-record',
      taskId: 'legacy-homework',
      subject: '수학',
      action: '기존 공부',
      started: '2026-10-22T04:00:00Z',
      ended: '2026-10-22T04:05:00Z',
      seconds: 300,
      target: 5,
      problems: 1,
      concepts: '기존 개념',
      rating: '보통',
      reason: '',
      pauses: [],
      mistake: '',
      reviewDate: null,
    }),
  ];
  state = addResource(
    state,
    {
      title: '기존 문제 자료',
      subject: '수학',
      sourceType: 'school-worksheet',
      linkedTaskId: 'legacy-homework',
      linkedMediaIds: [],
    },
    ['기존 실제 문제'],
  );
  state.learning!.problems[0].draft = '배포 전 작성한 답안';
  await context.addInitScript((state) => {
    localStorage.setItem('bkit.atelier.visited.v1', '1');
    if (!localStorage.getItem('bkit.study-os.v1'))
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
  }, state);
}
await page.goto('https://teambkit.com/');
await page.getByRole('button', { name: '지금 공부 시작', exact: true }).waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
if (mode === 'before') {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('bkit-private-materials-v1', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction('photos', 'readwrite');
          t.objectStore('photos').put({
            id: 'preserved-photo',
            bytes: new Uint8Array([1, 3, 7, 9]).buffer,
            mime: 'image/png',
            name: '기존 원본',
            size: 4,
            digest: 'synthetic',
          });
          t.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
}
const snapshot = await page.evaluate(async () => ({
  state: JSON.parse(localStorage.getItem('bkit.study-os.v1')!),
  photos: await new Promise<any[]>((resolve, reject) => {
    const r = indexedDB.open('bkit-private-materials-v1', 1);
    r.onsuccess = () => {
      const db = r.result,
        t = db.transaction('photos', 'readonly'),
        q = t.objectStore('photos').getAll();
      q.onsuccess = () => {
        resolve(q.result.map((v) => ({ ...v, bytes: [...new Uint8Array(v.bytes)] })));
        db.close();
      };
      q.onerror = () => reject(q.error);
    };
  }),
  release: await fetch('/release.json?upgrade=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()),
}));
await writeFile('/workspace/evidence/' + mode + '-upgrade.json', JSON.stringify(snapshot, null, 2));
if (mode === 'after') {
  const before = JSON.parse(await readFile('/workspace/evidence/before-upgrade.json', 'utf8'));
  for (const field of ['tasks', 'schedules', 'sessions', 'learning'])
    if (JSON.stringify(before.state[field]) !== JSON.stringify(snapshot.state[field]))
      throw new Error('Changed legacy field: ' + field);
  if (JSON.stringify(before.photos) !== JSON.stringify(snapshot.photos))
    throw new Error('Changed photo bytes');
  console.log('Existing production browser state and IndexedDB photo bytes preserved');
}
await page.screenshot({ path: '/workspace/evidence/' + mode + '-upgrade.png' });
await context.close();
