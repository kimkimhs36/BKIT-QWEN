import { it, expect } from 'vitest';
import { missionToTask, createMission } from '../src/atelier';
import { applyStudyProgress } from '../src/taskProgress';
const task = () =>
  missionToTask({
    ...createMission('수학 20문제'),
    subject: '수학',
    checked: true,
    quantityTotal: '20',
    quantityUnit: 'problems',
  });
it('links reported problems to remaining task quantity and preserves photos', () => {
  const t = { ...task(), attachmentIds: ['original-photo'] };
  expect(
    applyStudyProgress(t, { complete: false, remainingMinutes: 15, completedProblems: 6 }),
  ).toMatchObject({
    quantity: { total: 20, remaining: 14 },
    remaining: 15,
    status: 'doing',
    attachmentIds: ['original-photo'],
  });
  expect(
    applyStudyProgress(t, { complete: false, remainingMinutes: 15, completedProblems: 30 }).quantity
      ?.remaining,
  ).toBe(0);
});
it('accepts explicit remaining units and marks complete quantity zero', () => {
  const t = { ...task(), quantity: { unit: 'pages' as const, total: 20, remaining: 20 } };
  expect(
    applyStudyProgress(t, { complete: false, remainingMinutes: 10, completedProblems: 5 }).quantity
      ?.remaining,
  ).toBe(20);
  expect(
    applyStudyProgress(t, {
      complete: false,
      remainingMinutes: 10,
      completedProblems: 5,
      quantityRemaining: 7,
    }).quantity?.remaining,
  ).toBe(7);
  expect(
    applyStudyProgress(t, { complete: true, remainingMinutes: 10, completedProblems: 0 }).quantity
      ?.remaining,
  ).toBe(0);
});
