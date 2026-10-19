import { mergeStudy } from '../src/completeBackup';
import { describe, it, expect } from 'vitest';
import { newState, stateSchema, taskSchema } from '../src/model';
import { addResource, moveProblem } from '../src/learningEngine';
import { expireMockExam, mockExamSummary } from '../src/mockExam';
import { elapsed, closeSegment } from '../src/session';
import { questionSeconds } from '../src/drive/questionPace';
import { newRace, stageRace, launchRace, tickRace, shiftRace } from '../src/drive/race';
import { newGarage, garageSchema, saveRaceRecord, rewardLearning } from '../src/drive/garage';
import { restoreMaterial, saveMaterial } from '../src/themes/material';
import { newObservation, observeEyes } from '../src/awakeSignals';
const time = Date.parse('2026-10-19T05:00:00Z');
function exam() {
  const s = addResource(
    newState(),
    {
      title: '모의시험',
      subject: '국어',
      sourceType: 'user-note',
      linkedMediaIds: [],
      linkedTaskId: null,
    },
    ['첫 문제', '두 번째 문제'],
    time,
  );
  const ids = s.learning!.problems.map((p) => p.id);
  s.active = {
    id: 'exam-1',
    subject: '국어',
    action: '실전 연습',
    taskId: null,
    resourceId: s.learning!.resources[0].id,
    target: 1,
    started: new Date(time).toISOString(),
    segmentStart: new Date(time).toISOString(),
    elapsed: 0,
    pauses: [],
    segments: [],
    questionPace: {
      current: ids[0],
      anchor: 0,
      seconds: {},
      target: 30,
      review: [],
      skipped: [],
      targets: { [ids[0]]: 30 },
    },
    exam: { duration: 60, problemIds: ids, finishedAt: null },
  };
  return s;
}
describe('shared-clock mock exams', () => {
  it('rejects corrupted exam references while leaving the input untouched', () => {
    const s = exam();
    s.active!.exam!.problemIds = ['missing'];
    const original = JSON.stringify(s);
    expect(stateSchema.safeParse(s).success).toBe(false);
    expect(JSON.stringify(s)).toBe(original);
  });
  it('keeps cumulative question times through pause, reload, return and expiry without discarding drafts', () => {
    let s = exam();
    const [p, q] = s.learning!.problems;
    s = moveProblem(s, p.resourceId, q.id, time + 15000);
    s.active = closeSegment(s.active!, time + 25000);
    s = stateSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(questionSeconds(s.active!, p.id, elapsed(s.active!, time + 60000))).toBe(15);
    expect(questionSeconds(s.active!, q.id, elapsed(s.active!, time + 60000))).toBe(10);
    s.active!.segmentStart = new Date(time + 60000).toISOString();
    s = moveProblem(s, p.resourceId, p.id, time + 65000);
    s.learning!.problems[0].draft = '작성하던 답';
    s.learning!.problems[0].paceNote = '풀이 메모';
    s = expireMockExam(s, time + 200000);
    expect(s.active!.elapsed).toBe(60);
    expect(s.active!.segmentStart).toBeNull();
    expect(questionSeconds(s.active!, p.id, 60)).toBe(45);
    expect(questionSeconds(s.active!, q.id, 60)).toBe(15);
    expect(s.active!.exam!.finishedAt).toBe(new Date(time + 95000).toISOString());
    expect(s.learning!.problems[0]).toMatchObject({ draft: '작성하던 답', paceNote: '풀이 메모' });
    expect(expireMockExam(s, time + 900000)).toBe(s);
  });
  it('reports this exam’s answers and marks without counting old attempts', () => {
    const s = exam();
    const ids = s.active!.exam!.problemIds;
    s.active!.questionPace!.skipped = [ids[1]];
    s.active!.questionPace!.review = [ids[0]];
    expect(mockExamSummary(s)).toMatchObject({ total: 2, attempted: 0, skipped: 1, review: 1 });
    expect(stateSchema.parse(s).active!.questionPace!.targets![ids[0]]).toBe(30);
  });
});
function timedRace(frame: number, distance: 200 | 400 = 200) {
  let r = launchRace(stageRace(0, distance), 3100);
  const shifts = [4700, 6700, 8900, 12000];
  let next = 0;
  for (let t = 3100 + frame; t < 40000 && r.phase === 'racing'; t += frame) {
    while (next < shifts.length && shifts[next] <= t) {
      r = tickRace(r, shifts[next], true, 'balanced');
      r = shiftRace(r);
      next++;
    }
    r = tickRace(r, t, true, 'balanced');
  }
  return r;
}
describe('race physics and archive', () => {
  it('preserves elapsed integration across 10Hz, 30Hz and 60Hz', () => {
    const races = [16, 33, 100].map((f) => timedRace(f));
    races.forEach((r) => expect(r.result).toBe('finish'));
    expect(
      Math.max(...races.map((r) => r.elapsed)) - Math.min(...races.map((r) => r.elapsed)),
    ).toBeLessThan(0.025);
    expect(timedRace(33, 400).elapsed).toBeGreaterThan(races[1].elapsed);
    expect(newRace(400).targetDistance).toBe(400);
  });
  it('stores separate distance records once, retaining personal bests after recent history rolls over', () => {
    let g = newGarage(time),
      r = timedRace(33);
    g = saveRaceRecord(g, r, time);
    expect(saveRaceRecord(g, r, time + 1)).toBe(g);
    const best = g.raceRecords[0].elapsed;
    for (let i = 0; i < 30; i++)
      g = saveRaceRecord(
        g,
        { ...r, goAt: r.goAt + i + 1, elapsed: r.elapsed + 1 + i },
        time + i + 1,
      );
    g = saveRaceRecord(g, timedRace(33, 400), time + 100);
    expect(g.raceRecords.length).toBeLessThanOrEqual(22);
    expect(Math.min(...g.raceRecords.filter((x) => x.distance === 200).map((x) => x.elapsed))).toBe(
      best,
    );
    expect(g.raceRecords.some((x) => x.distance === 400)).toBe(true);
    expect(garageSchema.safeParse(g).success).toBe(true);
  });
});
describe('event rewards and compatibility', () => {
  it('merges incoming exam plans without overwriting the local subject plan', () => {
    const local = newState(),
      incoming = newState();
    const plan = {
      subject: '수학',
      target: '내 목표',
      scope: '내 범위',
      review: '두 문제',
      weekly: '월요일',
    };
    local.juggernaut = { examDate: null, weeklyMinutes: 120, subjects: [plan] };
    incoming.juggernaut = {
      examDate: '2026-11-01',
      weeklyMinutes: 300,
      subjects: [
        { ...plan, target: '백업 목표' },
        { ...plan, subject: '영어' },
      ],
    };
    const merged = mergeStudy(local, incoming);
    expect(merged.juggernaut).toMatchObject({ examDate: '2026-11-01', weeklyMinutes: 120 });
    expect(merged.juggernaut!.subjects).toHaveLength(2);
    expect(merged.juggernaut!.subjects![0].target).toBe('내 목표');
  });
  it('rewards a real task completion once and refuses historical completion', () => {
    const s = newState();
    s.tasks = [
      taskSchema.parse({
        id: 'task',
        subject: '영어',
        title: '수행 발표',
        kind: '수행평가',
        due: null,
        priority: 2,
        minutes: 25,
        remaining: 1,
        status: 'done',
        submitted: false,
        optional: false,
        notes: '',
        link: '',
        completedAt: new Date(time + 2000).toISOString(),
      }),
    ];
    const g = rewardLearning(newGarage(time), s, time + 3000);
    expect(g.credits).toBe(15);
    expect(g.stamps[0].id).toBe('first-task');
    expect(rewardLearning(g, s, time + 5000)).toBe(g);
    expect(rewardLearning(newGarage(time + 10000), s, time + 12000).credits).toBe(0);
  });
  it('reads pre-expansion cars without discarding credits or owned parts', () => {
    const original = newGarage(time);
    const legacy = {
      ...original,
      credits: 30,
      car: { color: 'blue', wheels: 'classic', spoiler: false, scene: 'dusk', tune: 'balanced' },
    };
    const g = garageSchema.parse(legacy);
    expect(g.credits).toBe(30);
    expect(g.car).toMatchObject({
      name: 'TOURING 36',
      finish: 'metallic',
      bumper: 'touring',
      decal: 'none',
    });
  });
  it('honors old dark mode and contains malformed material settings', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({ id: 'peach', motion: 'auto', intensity: 0.5, lowPower: false }),
      setItem: () => {
        throw Error('quota');
      },
    };
    expect(restoreMaterial(storage, 'dark').id).toBe('forest');
    expect(restoreMaterial({ getItem: () => '{broken' }, 'light').id).toBe('classic');
    expect(
      saveMaterial(storage, { id: 'peach', motion: 'off', intensity: 0, lowPower: true }),
    ).toBe(false);
  });
});
describe('experimental camera uncertainty', () => {
  it('never interprets missing faces, occlusion, or uncertain pose as sleep', () => {
    let s = newObservation();
    for (let at = 0; at < 20000; at += 250)
      s = observeEyes(s, { at, face: false, left: 1, right: 1, angled: false });
    expect(s.status).toBe('uncertain');
    expect(s.episodes).toHaveLength(0);
    s = observeEyes(s, { at: 21000, face: true, left: 1, right: 1, angled: true });
    expect(s.status).toBe('uncertain');
  });
  it('requires sustained binocular signals and repeated separate episodes before suggesting rest', () => {
    let s = newObservation();
    for (let episode = 0; episode < 3; episode++) {
      const start = episode * 4000;
      for (let at = start; at <= start + 2250; at += 250)
        s = observeEyes(s, { at, face: true, left: 0.9, right: 0.9, angled: false });
      s = observeEyes(s, { at: start + 2500, face: true, left: 0.1, right: 0.1, angled: false });
    }
    expect(s.status).toBe('rest');
    expect(s.episodes).toHaveLength(3);
    s = observeEyes(s, { at: 200000, face: true, left: 0, right: 0, angled: false });
    expect(s.status).toBe('observing');
  });
});
