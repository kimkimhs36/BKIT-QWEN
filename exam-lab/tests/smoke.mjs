import { readFileSync, mkdirSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert/strict";
import { chromium, webkit, devices } from "@playwright/test";
const BASE = process.env.BKIT_TEST_URL || "http://127.0.0.1:4175/exam-lab/";
const KEY = "bkit.exam-lab.20261019.v1";
const scope = { window: {} };
for (const file of ["questions.js", "learning.js", "app.js"]) {
  const code = readFileSync(new URL("../" + file, import.meta.url), "utf8");
  new Script(code, { filename: file });
  if (file !== "app.js") new Script(code).runInNewContext(scope);
}
const bank = [
  ...scope.window.BKIT_EXAM_QUESTIONS,
  ...scope.window.BKIT_SIMILAR,
];
assert.equal(bank.length, 92);
assert.equal(new Set(bank.map((q) => q.id)).size, 92);
for (const q of bank) {
  const l = scope.window.BKIT_LESSONS[q.id];
  assert.equal(q.options.length, 5);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 5);
  assert(l.concept && l.hint2 && l.steps.length >= 2);
  assert.equal(l.reasons.length, 5);
  q.options.forEach((_, i) => {
    if (i !== q.answer)
      assert(l.reasons[i].length > 5, q.id + " missing reason " + i);
  });
}
console.log(
  "PASS syntax, 46 preserved original IDs, 46 transfer questions, 92 complete teaching records",
);
const matrix = [
  ["iphone-webkit", webkit, { ...devices["iPhone 13"] }],
  ["ipad-portrait-webkit", webkit, { ...devices["iPad Pro 11"] }],
  ["ipad-landscape-webkit", webkit, { ...devices["iPad Pro 11 landscape"] }],
  ["desktop-chromium", chromium, { viewport: { width: 1440, height: 1000 } }],
  [
    "galaxy-tablet-chromium",
    chromium,
    { viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true },
  ],
  ["small-iphone-chromium", chromium, { ...devices["iPhone SE"] }],
];
mkdirSync("/tmp/bkit-qa", { recursive: true });
for (const [label, type, options] of matrix) {
  const browser = await type.launch({ headless: true });
  const ctx = await browser.newContext({ ...options, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const data = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
  await page.clock.install();
  await page.goto(BASE, { waitUntil: "networkidle" });
  assert.match(await page.title(), /BKIT EXAM LAB/);
  assert.match(await page.locator("#hero-start").innerText(), /지금 시작/);
  await page.screenshot({
    path: "/tmp/bkit-qa/" + label + "-welcome.png",
    fullPage: true,
  });
  await page.locator("#hero-start").click();
  assert.match(await page.locator(".question-stem").innerText(), /Unless/);
  await page.locator(".understanding summary").click();
  await page.locator("#understanding-note").fill("unless는 if not이다");
  await page.locator("#hint-toggle").click();
  await page.locator("#hint-toggle").click();
  assert.match(await page.locator(".hint-box").innerText(), /02/);
  await page.locator('[data-choice="0"]').click();
  assert.equal(await page.locator(".feedback.is-wrong").count(), 1);
  await page.locator('[data-cause="독해·해석"]').click();
  assert.equal((await data()).attempts.lab024.cause, "독해·해석");
  await page.locator(".solution summary").first().click();
  assert((await page.locator(".solution ol li").count()) >= 2);
  await page.locator(".solution summary").nth(1).click();
  assert.equal(await page.locator(".option-reasons li").count(), 4);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".feedback.is-wrong").count(), 1);
  assert.equal(
    (await data()).attempts.lab024.reflection,
    "unless는 if not이다",
  );
  await page.locator("#ai-prompt").click();
  assert(await page.locator("#tutor-text").inputValue());
  await page.locator("#tutor-copy").click();
  assert.match(await page.locator("#tutor-status").innerText(), /복사|선택/);
  assert.equal(
    await page.locator("#tutor-open").getAttribute("href"),
    "https://chatgpt.com/",
  );
  await page.locator("#tutor-close").click();
  await page.locator("#similar-drill").click();
  assert.match(await page.locator(".question-meta").innerText(), /유사/);
  await page.locator('[data-choice="1"]').click();
  assert.equal((await data()).attempts.sim024.mastered, true);
  await page.locator("#next-drill").click();
  assert.match(await page.locator(".question-meta").innerText(), /수학/);
  await page.locator("#study-controls summary").click();
  await page.locator('[data-subject="영어"]').click();
  await page.locator("#mode-review").click();
  await page.locator("#cause-filter").selectOption("독해·해석");
  assert.match(await page.locator(".question-stem").innerText(), /Unless/);
  await page.locator('[data-choice="1"]').click();
  assert.equal((await data()).attempts.lab024.mastered, true);
  await page.locator("#retry-drill").click();
  await page.locator("#hint-toggle").click();
  await page.locator('[data-choice="1"]').click();
  assert.equal(
    (await data()).attempts.lab024.mastered,
    false,
    "hinted answer must stay in review",
  );
  await page.locator("#mode-all").click();
  await page.locator('[data-subject="영어"]').click();
  assert.match(await page.locator(".question-reading").innerText(), /A school/);
  await page.locator('[data-word="replaced"]').first().click();
  assert.match(await page.locator("#word-meaning").innerText(), /대체/);
  await page.locator(".reading-support summary").click();
  assert.match(await page.locator(".reading-support").innerText(), /한 학교/);
  await page.locator("#focus-toggle").click();
  assert.equal(
    await page.locator("#focus-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#focus-toggle").click();
  await page.locator("#tab-past").click();
  await page.locator("#past-subject").selectOption("수학");
  assert.equal(await page.locator("#past-grid button").count(), 30);
  await page.locator('[data-past-number="3"]').click();
  await page.locator('[data-pick="4"]').click();
  await page.locator('[data-mark="wrong"]').click();
  await page.locator("#past-note").fill("함수 조건을 놓침");
  await page.locator('[data-past-number="22"]').click();
  await page.locator("#short-answer").fill("125");
  await page.locator('[data-mark="correct"]').click();
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n2 0 obj <</Type/Pages/Count 0/Kids []>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF",
  );
  await page
    .locator("#past-file")
    .setInputFiles({
      name: "my-practice.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  assert.equal(await page.locator("#file-preview iframe").count(), 1);
  assert.match(await page.locator("#file-name").innerText(), /my-practice.pdf/);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#short-answer").inputValue(), "125");
  assert.equal((await data()).past["수학#3"].note, "함수 조건을 놓침");
  assert.equal((await data()).past["수학#22"].mark, "correct");
  await page.locator("#mission-120").click();
  await page.clock.fastForward(65_000);
  await page.locator("#mission-toggle").click();
  assert((await data()).mission.elapsed >= 64);
  await page.locator("#mission-break").click();
  await page.clock.fastForward(30_000);
  await page.locator("#mission-toggle").click();
  assert((await data()).mission.breakSeconds >= 29);
  assert((await data()).mission.running);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal((await data()).mission.running, false);
  assert.match(await page.locator("#mission-toggle").innerText(), /이어하기/);
  page.once("dialog", (d) => d.accept());
  await page.locator("#mission-end").click();
  assert.equal((await data()).sessions.length, 1);
  assert((await data()).sessions[0].elapsed >= 64);
  await page.locator("[data-session-subject]").fill("수학 · 영어");
  await page.locator("[data-session-note]").fill("조건과 unless 복습");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.locator("[data-session-note]").inputValue(),
    "조건과 unless 복습",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export").click(),
  ]);
  const backup = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(backup.data.past["수학#22"].answer, "125");
  assert.equal(backup.data.sessions[0].subject, "수학 · 영어");
  await page
    .locator("#import")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"app":"BKIT_EXAM_LAB","data":{"v":1,"attempts":{"lab001":null},"past":{}}}',
      ),
    });
  await page.waitForFunction(() =>
    document.getElementById("backup-status").textContent.includes("실패"),
  );
  assert.match(await page.locator("#backup-status").innerText(), /실패/);
  assert.equal((await data()).sessions.length, 1);
  page.once("dialog", (d) => d.accept());
  await page
    .locator("#import")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.waitForTimeout(200);
  assert.equal((await data()).sessions[0].note, "조건과 unless 복습");
  assert(
    await page.evaluate(
      (key) =>
        Object.keys(localStorage).some((k) =>
          k.startsWith(key + ".before-restore."),
        ),
      KEY,
    ),
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    label + " horizontal overflow",
  );
  await page.screenshot({
    path: "/tmp/bkit-qa/" + label + "-report.png",
    fullPage: true,
  });
  assert.deepEqual(errors, [], label + " browser errors");
  console.log(
    "PASS " +
      label +
      ": diagnosis, 2 hints, reflection, feedback reload, tutor, transfer, retest, vocabulary, focus, PDF, short-answer, timer, breaks, session edit, backup/restore",
  );
  await ctx.close();
  await browser.close();
}
