import { describe, it, expect } from 'vitest';
import { concepts, questions, score } from '../src/juggernaut/content';
import {
  DAY,
  KEY,
  advance,
  documentSchema,
  dueReviews,
  emptyDocument,
  evidence,
  independent,
  mergeDocuments,
  readDocument,
  saveDocument,
  startSession,
  submit,
  type StudyDocument,
} from '../src/juggernaut/engine';
const at = Date.parse('2026-10-25T04:00:00Z');
function answer(
  d: StudyDocument,
  kind: 'training' | 'review' = 'training',
  time = at,
  questionId = 'balance-0',
  extra = {},
) {
  const s = {
    ...startSession(d, kind, time, 'balance'),
    questionId,
    answer: questions.find((q) => q.id === questionId)!.answer,
    reasoning: '양변에서 상수를 빼고 계수로 나누었다',
    ...extra,
  };
  return submit(d, s, time + 1000);
}
describe('JUGGERNAUT verified content and evidence', () => {
  it('checks all 24 original answer keys by substitution and unambiguous choices', () => {
    expect(questions).toHaveLength(24);
    for (const q of questions) {
      expect(q.a * Number(q.answer) + q.b).toBe(q.c);
      expect(score(q.id, q.answer)).toBe(true);
      expect(score(q.id, '')).toBe(false);
      expect(score(q.id, 'Infinity')).toBe(false);
      if (q.options) {
        expect(q.options.filter((v) => score(q.id, v))).toEqual([q.answer]);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
    }
    expect(score('negative-1', 'x=−2')).toBe(true);
  });
  it('never invents initial mastery or due work', () => {
    const d = emptyDocument();
    expect(dueReviews(d, at)).toEqual([]);
    for (const c of concepts) {
      expect(evidence(d, c.id, at).state).toBe('미진단');
      expect(evidence(d, c.id, at).confidence).toBe('낮음');
    }
  });
  it('preserves first wrong answer, hints and guess separately, repairs using a new item', () => {
    const s = {
      ...startSession(emptyDocument(), 'training', at, 'balance'),
      answer: '999',
      hints: 1,
      guessed: true,
    };
    const r = submit(emptyDocument(), s, at + 5000);
    expect(r.document.attempts[0]).toMatchObject({
      answer: '999',
      hints: 1,
      guessed: true,
      error: 'G',
      durationMs: 5000,
    });
    expect(independent(r.document.attempts[0])).toBe(false);
    const next = advance(r.document, r.session, at + 6000);
    expect(next.questionId).not.toBe(s.questionId);
    expect(next.phase).toBe('question');
    expect(submit(r.document, r.session, at + 7000).document.attempts).toHaveLength(1);
    expect(submit(r.document, s, at + 7000).document.attempts).toHaveLength(1);
    const after = answer(r.document, 'training', at + 10000, next.questionId);
    expect(after.document.attempts).toHaveLength(2);
    expect(after.document.attempts[0].answer).toBe('999');
  });
  it.each([{ hints: 1 }, { guessed: true }, { reasoning: '' }])(
    'does not count assisted or unexplained correct answers as independent (%j)',
    (extra) => {
      const r = answer(emptyDocument(), 'training', at, 'balance-0', extra);
      expect(independent(r.document.attempts[0])).toBe(false);
      expect(evidence(r.document, 'balance', at + 2000).state).toBe('도움 후 해결');
    },
  );
  it('requires spaced, different-item independent reviews before stable readiness', () => {
    let d = answer(emptyDocument()).document;
    expect(dueReviews(d, at + DAY - 1)).toHaveLength(0);
    expect(dueReviews(d, at + DAY + 1001)).toHaveLength(1);
    d = answer(d, 'review', at + DAY + 2000, 'balance-3').document;
    expect(evidence(d, 'balance', at + DAY + 5000)).toMatchObject({ delayed: 1, interval: 2 });
    d = answer(d, 'review', at + 3 * DAY + 4000, 'balance-4').document;
    expect(evidence(d, 'balance', at + 3 * DAY + 6000)).toMatchObject({
      delayed: 2,
      state: '지연 검증 안정',
      interval: 4,
    });
    d = answer(d, 'review', at + 7 * DAY + 7000, 'balance-5', { answer: '999' }).document;
    expect(evidence(d, 'balance', at + 8 * DAY)).toMatchObject({
      delayed: 0,
      state: '선수개념 복구',
      interval: 1,
    });
  });
  it('does not accept early or repeated identical-item tests as delayed verification', () => {
    let d = answer(emptyDocument()).document;
    d = answer(d, 'review', at + 10000, 'balance-1').document;
    expect(evidence(d, 'balance', at + 20000).delayed).toBe(0);
    d = answer(d, 'review', at + 2 * DAY, 'balance-1').document;
    expect(evidence(d, 'balance', at + 3 * DAY).delayed).toBe(0);
  });
  it('caps review work across the entire Korean calendar day', () => {
    let d = emptyDocument();
    d.budget.value = 1;
    for (const c of concepts) d = answer(d, 'training', at, c.id + '-0').document;
    expect(dueReviews(d, at + 2 * DAY)).toHaveLength(1);
    d = answer(d, 'review', at + 2 * DAY, 'balance-1').document;
    expect(dueReviews(d, at + 2 * DAY + 2000)).toHaveLength(0);
    expect(dueReviews(d, at + 3 * DAY)).toHaveLength(1);
  });
  it('derives schedules again after deletion and merges concurrent devices idempotently', () => {
    const a = answer(emptyDocument()).document,
      b = answer(emptyDocument(), 'training', at + 100, 'distribute-0').document;
    const both = mergeDocuments(a, b);
    expect(both.attempts).toHaveLength(2);
    expect(mergeDocuments(both, a)).toEqual(both);
    expect(mergeDocuments(a, b)).toEqual(mergeDocuments(b, a));
    const deleted = {
      ...a,
      attempts: a.attempts.map((v) => ({ ...v, deleted: true, updatedAt: at + 5000 })),
    };
    const merged = mergeDocuments(both, deleted);
    expect(evidence(merged, 'balance').state).toBe('미진단');
    expect(evidence(merged, 'balance').due).toBeNull();
    expect(mergeDocuments(merged, a)).toEqual(merged);
  });
  it('protects legacy keys and corrupt originals, backs up before writing, fails on quota', () => {
    const map = new Map([
      ['bkit.study-os.v1', 'legacy'],
      [KEY, 'bad json'],
    ]);
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    };
    expect(readDocument(storage).error).not.toBe('');
    expect(() => saveDocument(storage, emptyDocument())).toThrow();
    expect(map.get(KEY)).toBe('bad json');
    map.delete(KEY);
    saveDocument(storage, emptyDocument());
    saveDocument(storage, answer(emptyDocument()).document);
    expect(map.get('bkit.study-os.v1')).toBe('legacy');
    expect(documentSchema.parse(JSON.parse(map.get(KEY + '.backup')!)).attempts).toEqual([]);
    expect(() =>
      saveDocument(
        {
          ...storage,
          setItem: () => {
            throw Error('quota');
          },
        },
        emptyDocument(),
      ),
    ).toThrow();
  });
});
