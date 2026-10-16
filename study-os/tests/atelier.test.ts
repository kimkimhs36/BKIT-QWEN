import { describe, expect, it } from 'vitest';
import {
  createMission,
  emptyDraft,
  mergeMissions,
  missionToTask,
  prepareMissions,
} from '../src/atelier';
import { stateSchema, newState } from '../src/model';
const task = (title = '수학 학습지 20문제', due = '') =>
  missionToTask({ ...createMission(title), due, checked: true });
describe('human-confirmed preparation and replay-safe BKIT save', () => {
  it('splits one task per line, extracts subject/quantity, never guesses relative dates', () => {
    const missions = prepareMissions({
      ...emptyDraft(),
      text: '내일 수학 숙제 20문제\n금요일 영어 수행평가',
      attachmentIds: ['private-photo'],
    });
    expect(missions).toHaveLength(2);
    expect(missions[0]).toMatchObject({
      subject: '수학',
      quantityTotal: '20',
      due: '',
      checked: false,
      attachmentIds: ['private-photo'],
    });
    expect(missions[1]).toMatchObject({ kind: '수행평가', due: '' });
  });
  it('photo-only preparation is a blank editable mission, with no fake extracted text', () => {
    expect(prepareMissions({ ...emptyDraft(), attachmentIds: ['photo'] })[0]).toMatchObject({
      title: '',
      subject: '',
      due: '',
      attachmentIds: ['photo'],
    });
  });
  it('requires a human confirmation and valid dates, quantities and estimates', () => {
    expect(() => missionToTask(createMission('수학 숙제'))).toThrow();
    expect(() => task('수학 숙제', '2026-02-30')).toThrow();
    expect(() =>
      missionToTask({ ...createMission('수학 숙제'), checked: true, minutes: '0' }),
    ).toThrow();
    expect(() =>
      missionToTask({
        ...createMission('수학 숙제'),
        checked: true,
        quantityUnit: 'pages',
        quantityTotal: '',
      }),
    ).toThrow();
    expect(task().due).toBeNull();
    expect(task('수학 숙제', '2026-10-21').deadline).toEqual({
      date: '2026-10-21',
      precision: 'date-only',
      provenance: 'user-confirmed',
    });
  });
  it('preserves same-day task identity and merges private references on replay', () => {
    const first = { ...task(), attachmentIds: ['photo-a'] };
    const second = { ...task(' 수학  학습지 20문제 '), attachmentIds: ['photo-b'] };
    const merged = mergeMissions([first], [second, second]);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0]).toMatchObject({ id: first.id, attachmentIds: ['photo-a', 'photo-b'] });
    expect(merged.ids).toEqual([first.id]);
    expect(merged.duplicates).toBe(2);
    expect(mergeMissions(merged.tasks, [first]).tasks).toHaveLength(1);
    stateSchema.parse({ ...newState(), tasks: merged.tasks });
  });
  it('allows recurring assignments with different confirmed deadlines', () => {
    expect(
      mergeMissions([], [task('수학 숙제', '2026-10-20'), task('수학 숙제', '2026-10-21')]).tasks,
    ).toHaveLength(2);
  });
  it('rejects excessive or oversized briefing lines before any save', () => {
    expect(() => prepareMissions({ ...emptyDraft(), text: 'a'.repeat(201) })).toThrow();
    expect(() =>
      prepareMissions({ ...emptyDraft(), text: Array(21).fill('수학 숙제').join('\n') }),
    ).toThrow();
  });
});
