import { test, expect } from './local-fixture';
import { newState } from '../../src/model';

// G3 diagnostic: test-only fixtures, never school records. Run with the iPhone project.
// This measures the first fold rather than assuming that a green functional test means usable UI.
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });

for (const urgent of [false, true]) {
  test(`G3 first-fold evidence: ${urgent ? 'urgent assessment' : 'empty inbox'} at 390x844`, async ({ page }, testInfo) => {
    const state = newState();
    if (urgent) {
      state.tasks = [{
        id: 'fixture-g3-urgent', subject: '물질과 에너지',
        title: '테스트 전용 실험 보고서', kind: '수행평가',
        due: null, priority: 2, minutes: 25, remaining: 25,
        status: 'done', submitted: false, submissionRequired: true,
        optional: false, notes: 'FIXTURE — 실제 학교 공지 아님', link: '',
      }];
    }
    await page.addInitScript((fixture) => {
      if (!localStorage.getItem('bkit.study-os.v1')) {
        localStorage.setItem('bkit.study-os.v1', JSON.stringify(fixture));
      }
      localStorage.setItem('bkit.atelier.visited.v1', '1');
    }, state);
    await page.goto('./');
    const assessment = page.getByRole('region', { name: '수행평가 긴급 점검' });
    const nextMove = page.getByRole('region', { name: '지금 할 일 한 가지' });
    await expect(assessment).toBeVisible();
    await expect(nextMove).toBeVisible();

    const evidence = await page.evaluate(() => {
      const fold = 844;
      const assessment = document.querySelector('.bkit-assessment-rescue');
      const nextMove = document.querySelector('.bkit-action-first');
      const main = document.querySelector('.bkit-assessment-rescue-main');
      const rect = (node: Element | null) => {
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom),
          width: Math.round(r.width), height: Math.round(r.height) };
      };
      const visibleControls = [...document.querySelectorAll('button, a[href], summary, input, select, textarea')]
        .filter((node) => {
          const r = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return r.width > 0 && r.height > 0 && r.top < fold && r.bottom > 0 &&
            style.visibility !== 'hidden' && style.display !== 'none';
        });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        firstFoldControlCount: visibleControls.length,
        firstFoldControlNames: visibleControls.map((node) =>
          (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 70)),
        assessment: rect(assessment), primaryAssessmentAction: rect(main),
        nextMove: rect(nextMove),
      };
    });
    await testInfo.attach('g3-first-fold.json', {
      body: JSON.stringify({ fixture: urgent ? 'urgent' : 'empty', ...evidence }, null, 2),
      contentType: 'application/json',
    });
    await page.screenshot({ path: testInfo.outputPath('g3-first-fold.png'), fullPage: true });
    expect(evidence.viewport.width).toBe(390);
    expect(evidence.firstFoldControlCount).toBeGreaterThan(0);
    // Report overflow as evidence first. Do not silently claim the G3 gate passed.
  });
}
