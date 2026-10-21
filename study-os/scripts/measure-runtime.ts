// Local lab measurement, without CPU throttling. Never connects to production.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { newState, type Session } from '../src/model';
import { startQuick } from '../src/quickTimer';

const [label = 'current', url = 'http://127.0.0.1:4173/study-os/', secondsInput = '30'] = process.argv.slice(2);
const seconds = Number(secondsInput);
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || !(seconds >= 10 && seconds <= 3600))
  throw new Error('Use a local preview and a 10–3600 second measurement.');
const state = newState();
const before = Date.now() - 86_400_000;
state.sessions = Array.from({ length: 1000 }, (_, i): Session => ({
  id: 'history-' + i, taskId: null, subject: '수학', action: '실제로 기록한 학습',
  started: new Date(before - 60_000).toISOString(), ended: new Date(before).toISOString(),
  seconds: 60, target: 1, problems: 1, concepts: '', rating: '보통', reason: '',
  pauses: [], mistake: '', reviewDate: null,
}));
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await context.route('**/*', (route) => new URL(route.request().url()).origin === new URL(url).origin
  ? route.continue() : route.abort());
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript((initial) => {
  localStorage.setItem('bkit.atelier.visited.v1', '1');
  if (!localStorage.getItem('bkit.study-os.v1')) localStorage.setItem('bkit.study-os.v1', JSON.stringify(initial));
  const stringify = JSON.stringify;
  const counters = { studySerializations: 0, serializationMs: 0 };
  (window as any).runtimeCounters = counters;
  JSON.stringify = function (value: any, ...args: any[]) {
    const study = value?.version === 1 && Array.isArray(value?.sessions);
    const start = performance.now();
    const result = (stringify as any).call(JSON, value, ...args);
    if (study) { counters.studySerializations++; counters.serializationMs += performance.now() - start; }
    return result;
  } as typeof JSON.stringify;
}, startQuick(state, 'stopwatch', 480, Date.now(), 'runtime-study'));
await page.goto(url, { waitUntil: 'networkidle' });
await page.locator('nav:visible').getByRole('button', { name: '집중', exact: true }).first().click();
await page.locator('.quick-timer-active').waitFor();
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
const first = await metrics();
const initial = await page.evaluate(() => ({ ...(window as any).runtimeCounters }));
const clockStart = performance.now();
for (let i = 0; i < seconds; i++) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (seconds > 60 && i % 60 === 59) console.log(JSON.stringify({ label, elapsedSeconds: i + 1 }));
}
const last = await metrics();
const final = await page.evaluate(() => ({ ...(window as any).runtimeCounters }));
const report = {
  label, url, measuredAt: new Date().toISOString(), browser: browser.version(),
  environment: 'Linux Chromium headless, 390x844, 1000 saved sessions, active stopwatch, no CPU/network throttling, service worker blocked',
  wallSeconds: (performance.now() - clockStart) / 1000,
  studySerializations: final.studySerializations - initial.studySerializations,
  serializationMs: final.serializationMs - initial.serializationMs,
  taskSeconds: last.TaskDuration - first.TaskDuration,
  scriptSeconds: last.ScriptDuration - first.ScriptDuration,
  heapStart: first.JSHeapUsedSize, heapEnd: last.JSHeapUsedSize,
  errors,
};
await browser.close();
await mkdir('docs/validation/internal-reliability', { recursive: true });
await writeFile(`docs/validation/internal-reliability/runtime-${label}.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
