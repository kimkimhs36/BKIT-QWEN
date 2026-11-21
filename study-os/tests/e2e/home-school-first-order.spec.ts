import { test, expect } from './local-fixture';
import { newState, type Task } from '../../src/model';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const assessment = (status: Task['status']): Task => ({
  id: 'fixture-school-1', subject: 'Chemistry', title: 'Fixture assessment',
  kind: '수행평가', due: null, priority: 2, minutes: 20, remaining: 20,
  status, submitted: false, optional: false, notes: '', link: '',
});

for (const scenario of [
  { label: 'empty school record', urgent: false },
  { label: 'completed but unsubmitted assessment', urgent: true },
]) {
  test(`mobile home DOM and visual order: ${scenario.label}`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T10:00:00+09:00') });
    const initial = newState();
    if (scenario.urgent) initial.tasks = [assessment('done')];
    await page.addInitScript((state) => {
      localStorage.setItem('bkit.study-os.v1', JSON.stringify(state));
      localStorage.setItem('bkit.atelier.visited.v1', '1');
    }, initial);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    const school = page.locator('.study-home > .bkit-assessment-rescue');
    const study = page.locator('.study-home > .study-start');
    await expect(school).toBeVisible();
    await expect(study).toBeVisible();
    const positions = await page.locator('.study-home > section').evaluateAll(nodes =>
      nodes.map(node => ({ name: node.className, top: node.getBoundingClientRect().top }))
    );
    const schoolIndex = positions.findIndex(x => x.name === 'bkit-assessment-rescue');
    const studyIndex = positions.findIndex(x => x.name.includes('study-start'));
    expect(schoolIndex).toBeGreaterThanOrEqual(0);
    expect(studyIndex).toBeGreaterThanOrEqual(0);
    expect(scenario.urgent ? schoolIndex < studyIndex : studyIndex < schoolIndex).toBe(true);
    expect(scenario.urgent ? positions[schoolIndex].top < positions[studyIndex].top :
      positions[studyIndex].top < positions[schoolIndex].top).toBe(true);
    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBe(false);
    const primary = school.locator('.bkit-assessment-rescue-main');
    await expect(primary).toHaveCount(1);
    await expect(primary).toContainText(scenario.urgent ? /제출 미확인/ : /공지함 열기/);
    await expect(school.locator('.bkit-assessment-rescue-actions > button')).toHaveCount(1);
    await expect(school.locator('.bkit-assessment-more').first()).not.toHaveAttribute('open');
    await page.screenshot({ path: test.info().outputPath('home-order-' + (scenario.urgent ? 'school' : 'study') + '.png'), fullPage: true });
  });
}
