import { webkit, devices } from "@playwright/test";
import assert from "node:assert/strict";
const b = await webkit.launch();
for (const [name, width, height] of [
  ["ipad-pro-11", 1194, 834],
  ["ipad-air-11", 1180, 820],
]) {
  const ctx = await b.newContext({
    ...devices["iPad Pro 11 landscape"],
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.BKIT_TEST_URL || "http://127.0.0.1:4175/exam-lab/");
  await p.locator("#hero-start").tap();
  await p.locator("#skip-diagnostic").tap();
  const left = await p.locator(".reading-column").boundingBox(),
    right = await p.locator(".response-column").boundingBox();
  assert(
    left.x + left.width < right.x,
    "passage and choices should be side by side",
  );
  assert(
    Math.abs(left.y - right.y) < 2,
    "columns should share their starting line",
  );
  await p.locator("#focus-toggle").tap();
  assert.equal(await p.locator(".sidebar").isVisible(), false);
  assert.equal(
    await p.locator("#focus-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await p.locator('[data-word="replaced"]').first().tap();
  assert(await p.locator("#word-meaning").isVisible());
  await p.screenshot({
    path: "/tmp/bkit-qa/" + name + "-reading-desk.png",
    fullPage: true,
  });
  await p.locator('[data-choice="0"]').tap();
  assert(await p.locator(".feedback.is-wrong").isVisible());
  await p.setViewportSize({ width: height, height: width });
  const stacked = await p.locator(".response-column").boundingBox(),
    reading = await p.locator(".reading-column").boundingBox();
  assert(
    stacked.y >= reading.y + reading.height,
    "portrait should stack for reading",
  );
  assert(await p.locator(".feedback.is-wrong").isVisible());
  await p.setViewportSize({ width, height });
  assert(await p.locator(".feedback.is-wrong").isVisible());
  await p.locator("#focus-toggle").tap();
  await p.locator("#tab-past").tap();
  await p
    .locator("#past-file")
    .setInputFiles({
      name: "sample.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% Local QA fixture\n%%EOF"),
    });
  const preview = await p.locator("#file-preview").boundingBox(),
    sheet = await p.locator(".paper-workspace").boundingBox();
  assert(
    preview.x + preview.width < sheet.x,
    "PDF and answer sheet should be side by side",
  );
  await p.locator("#past-subject").selectOption("수학");
  await p.locator('[data-past-number="22"]').tap();
  await p.locator("#short-answer").fill("125");
  await p.locator("#past-note").fill("iPad 가로 풀이");
  await p.reload();
  assert.equal(await p.locator("#short-answer").inputValue(), "125");
  assert.equal(await p.locator("#past-note").inputValue(), "iPad 가로 풀이");
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS " +
      name +
      ": landscape reading/choice columns, touch, focus, rotation preserves feedback, PDF/answer columns, saved short answer and notes",
  );
  await ctx.close();
}
await b.close();
