import { chromium, webkit, devices } from "@playwright/test";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const KEY = "bkit.exam-lab.20261019.v1";
const results = await Promise.all(
  [chromium, webkit].map(async (type) => {
    const b = await type.launch();
    const ctx = await b.newContext({
      ...devices["iPad Pro 11 landscape"],
      reducedMotion: "reduce",
    });
    const p = await ctx.newPage();
    await p.goto(
      process.env.BKIT_TEST_URL || "http://127.0.0.1:4175/exam-lab/",
    );
    const data = () =>
      p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    const start = performance.now();
    await p.locator("#mission-120").click();
    await p.waitForTimeout(12_000);
    await p.locator("#mission-toggle").click();
    const first = (await data()).mission.elapsed,
      expected1 = (performance.now() - start) / 1000;
    assert(
      Math.abs(first - expected1) < 1.5,
      "active time should follow the independent real clock",
    );
    await p.waitForTimeout(4000);
    assert.equal(
      (await data()).mission.elapsed,
      first,
      "pause must add no focus time",
    );
    const restStart = performance.now();
    await p.locator("#mission-break").click();
    await p.waitForTimeout(8000);
    await p.locator("#mission-toggle").click();
    const rest = (await data()).mission.breakSeconds,
      expectedRest = (performance.now() - restStart) / 1000;
    assert(
      Math.abs(rest - expectedRest) < 1.5,
      "break should follow real time separately",
    );
    const resume = performance.now();
    await p.waitForTimeout(6000);
    await p.locator("#mission-toggle").click();
    const final = (await data()).mission.elapsed,
      expectedFocus = first + (performance.now() - resume) / 1000;
    assert(
      Math.abs(final - expectedFocus) < 1.5,
      "resumed focus should exclude break/pause",
    );
    await p.reload();
    assert.equal((await data()).mission.elapsed, final);
    assert.equal((await data()).mission.running, false);
    assert.equal((await data()).mission.breakSeconds, rest);
    const result = {
      engine: type.name(),
      realExpectedFocusSeconds: Number(expectedFocus.toFixed(2)),
      recordedFocusSeconds: Number(final.toFixed(2)),
      realExpectedBreakSeconds: Number(expectedRest.toFixed(2)),
      recordedBreakSeconds: Number(rest.toFixed(2)),
      pauseExcluded: true,
      reloadPreserved: true,
    };
    console.log("PASS real clock", JSON.stringify(result));
    await b.close();
    return result;
  }),
);
mkdirSync("/tmp/bkit-qa", { recursive: true });
writeFileSync("/tmp/bkit-qa/timer-real.json", JSON.stringify(results, null, 2));
