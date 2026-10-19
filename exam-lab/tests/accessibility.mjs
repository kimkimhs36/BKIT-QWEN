import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const p = await ctx.newPage();
await p.goto(process.env.BKIT_TEST_URL || "http://127.0.0.1:4175/exam-lab/");
for (const state of [
  "welcome",
  "study",
  "feedback",
  "tutor",
  "past",
  "report",
]) {
  if (state === "study") await p.locator("#hero-start").click();
  if (state === "feedback") await p.locator('[data-choice="0"]').click();
  if (state === "tutor") await p.locator("#ai-prompt").click();
  if (state === "past") {
    await p.locator("#tutor-close").click();
    await p.locator("#tab-past").click();
  }
  if (state === "report") await p.locator("#tab-report").click();
  const results = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  console.log(
    state,
    JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      null,
      2,
    ),
  );
  if (results.violations.length) process.exitCode = 1;
}
await b.close();
