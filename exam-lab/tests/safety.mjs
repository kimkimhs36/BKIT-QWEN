import { chromium, webkit } from "@playwright/test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const BASE = process.env.BKIT_TEST_URL || "http://127.0.0.1:4175/exam-lab/";
const KEY = "bkit.exam-lab.20261019.v1";
const legacy = {
  v: 1,
  view: "drills",
  subject: "영어",
  mode: "new",
  current: "lab014",
  attempts: {
    lab013: {
      firstCorrect: false,
      lastCorrect: false,
      tries: 1,
      mastered: false,
      when: "2026-10-18T20:00:00Z",
      cause: "독해·해석",
    },
  },
  past: { "수학#3": { pick: 4, mark: "wrong", note: "보존할 메모" } },
  pastSubject: "수학",
  pastNumber: 3,
  mission: { minutes: 120, elapsed: 145, startedAt: 0, running: false },
};
for (const type of [chromium, webkit]) {
  const b = await type.launch({ headless: true });
  // Legacy storage compatibility and unrelated production data preservation.
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.addInitScript(
    ({ KEY, legacy }) => {
      if (!localStorage.getItem("seeded")) {
        localStorage.setItem(KEY, JSON.stringify(legacy));
        localStorage.setItem("bkit.study-os.v1", '{"records":["keep"]}');
        localStorage.setItem(
          "bkit.mock-rescue.20261020.v1",
          '{"attempts":[1,2]}',
        );
        localStorage.setItem("seeded", "yes");
      }
    },
    { KEY, legacy },
  );
  await p.goto(BASE);
  let d = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  assert.deepEqual(d.attempts, legacy.attempts);
  assert.deepEqual(d.past, legacy.past);
  assert.equal(d.mission.elapsed, 145);
  assert.equal(d.current, "lab014");
  await p.locator('[data-choice="3"]').click();
  assert.equal(
    (await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).attempts
      .lab014.firstCorrect,
    true,
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("bkit.study-os.v1")),
    '{"records":["keep"]}',
  );
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("bkit.mock-rescue.20261020.v1"),
    ),
    '{"attempts":[1,2]}',
  );
  // External tab changes must never be overwritten by an active tab.
  const second = await ctx.newPage();
  await second.goto(BASE);
  await second.locator("#tab-past").click();
  await p.waitForTimeout(100);
  assert(await p.locator("#save-warning").isVisible());
  const shared = await p.evaluate((k) => localStorage.getItem(k), KEY);
  await p.locator("#next-drill").click();
  assert.equal(await p.evaluate((k) => localStorage.getItem(k), KEY), shared);
  await ctx.close();
  // A corrupted original must be kept byte-for-byte, even during navigation and export.
  const broken = await b.newContext();
  const bp = await broken.newPage();
  await bp.addInitScript(
    (k) => localStorage.setItem(k, "{broken original"),
    KEY,
  );
  await bp.goto(BASE);
  assert(await bp.locator("#save-warning").isVisible());
  await bp.locator("#tab-report").click();
  assert.equal(
    await bp.evaluate((k) => localStorage.getItem(k), KEY),
    "{broken original",
  );
  const [dl] = await Promise.all([
    bp.waitForEvent("download"),
    bp.locator("#export").click(),
  ]);
  assert.equal(
    JSON.parse(readFileSync(await dl.path(), "utf8")).protectedOriginal,
    "{broken original",
  );
  await broken.close();
  // Quota failures must show a visible warning and keep the current answer in memory/export.
  const fail = await b.newContext();
  const fp = await fail.newPage();
  await fp.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    };
  });
  await fp.goto(BASE);
  await fp.locator("#hero-start").click();
  await fp.locator('[data-choice="0"]').click();
  assert(await fp.locator("#save-warning").isVisible());
  await fp.locator("#tab-report").click();
  const [fd] = await Promise.all([
    fp.waitForEvent("download"),
    fp.locator("#export").click(),
  ]);
  assert.equal(
    JSON.parse(readFileSync(await fd.path(), "utf8")).data.attempts.lab024
      .firstCorrect,
    false,
  );
  await fail.close();
  // Completing a timer records actual attempts; score promises are never manufactured.
  const time = await b.newContext();
  const tp = await time.newPage();
  await tp.clock.install();
  await tp.goto(BASE);
  await tp.locator("#mission-180").click();
  await tp.locator('[data-choice="1"]').click();
  await tp.clock.fastForward(180 * 60 * 1000 + 1000);
  assert.equal(await tp.locator("#mission-toggle").isDisabled(), true);
  tp.once("dialog", (d) => d.accept());
  await tp.locator("#mission-end").click();
  d = await tp.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  assert.equal(d.sessions[0].elapsed, 10800);
  assert.equal(d.sessions[0].solved, 1);
  assert.equal(d.sessions[0].correct, 1);
  assert.equal(d.mission, null);
  await time.close();
  console.log(
    "PASS " +
      type.name() +
      ": v1 compatibility, unrelated keys, cross-tab conflict, corrupt-original preservation, quota warning/export, 180-minute completion",
  );
  await b.close();
}
