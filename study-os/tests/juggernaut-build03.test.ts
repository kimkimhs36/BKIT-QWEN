import { describe, expect, it } from 'vitest';
import { addedQuestions, conceptRelations, learningConcepts } from '../src/juggernaut/catalogue';
import { parseNumericAnswer, score } from '../src/juggernaut/content';
import {
  DAY,
  EXT_KEY,
  KEY,
  advance,
  documentSchema,
  emptyDocument,
  evidence,
  independent,
  legacyDocumentSchema,
  mergeDocuments,
  partitionDocument,
  putSession,
  readDocument,
  saveDocument,
  startSession,
  submit,
} from '../src/juggernaut/engine';
import { performance } from '../src/juggernaut/performance';
const time = Date.parse('2026-10-26T03:00:00Z');
const solve = (questionId: string, answer: string, hints = 0) => {
  const d = emptyDocument(),
    s = {
      ...startSession(d, 'training', time, 'm28-substitution'),
      questionId,
      answer,
      hints,
      reasoning: '문자를 괄호로 바꾸고 곱셈부터 계산했다.',
    };
  return submit(d, s, time + 1000);
};
const fixture = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};
describe('BUILD 03 authored maths and meaningful evidence', () => {
  it('independently checks each key, including sign, square, fractions and coefficient distinctions', () => {
    const oracle = [
      2 * 3 + 5,
      3 * -2 + 4,
      2 * (4 - 1),
      (-3) ** 2 + 2 * -3,
      3 * (1 / 2) - 1,
      4 + 2 * 3,
      2 + 3,
      7 - 2,
      -1 + 4,
      2 + 1,
      5 - 2,
      2 + 3,
    ];
    expect(addedQuestions).toHaveLength(oracle.length);
    addedQuestions.forEach((q, index) => {
      expect(Number(q.answer)).toBe(oracle[index]);
      expect(score(q.id, q.answer)).toBe(true);
      expect(q.hints).toHaveLength(2);
      expect(q.explanation.length).toBeGreaterThan(20);
      expect(q.prerequisiteSkills!.length).toBeGreaterThan(0);
      expect(q.errorFocus).toBeTruthy();
      expect(q.retest).toBeTruthy();
    });
    for (const x of [-3, -1, 0, 0.5, 2, 5]) {
      expect(5 * x - (2 * x - 1)).toBe(3 * x + 1);
      expect(x * x + 2 * x + 3 * x).toBe(x * x + 5 * x);
    }
    expect(score('m28-substitution-4', '1/2')).toBe(true);
    expect(score('m28-substitution-4', '2/4')).toBe(true);
    expect(new Set(addedQuestions.map((q) => q.id)).size).toBe(12);
    for (const r of conceptRelations) {
      expect(learningConcepts.some((c) => c.id === r.from)).toBe(true);
      expect(learningConcepts.some((c) => c.id === r.to)).toBe(true);
      expect(r.basis.length).toBeGreaterThan(20);
    }
  });
  it.each([
    '1/0',
    '0/0',
    'sqrt(4)',
    '2+3',
    'x/2',
    'Infinity',
    '1e9',
    '0.50000000000000001',
    '1/2/3',
  ])('rejects unsupported or ambiguous answer %s', (value) => {
    // Decimal rounding must not turn an inexact typed number into an exact key.
    expect(score('m28-substitution-4', value)).toBe(false);
  });
  it('keeps assisted success separate and requires a different delayed item', () => {
    const r = solve('m28-substitution-0', '11', 1);
    expect(independent(r.document.attempts[0])).toBe(false);
    expect(evidence(r.document, 'm28-substitution', time + 2000).state).toBe('도움 후 해결');
    const next = advance(r.document, r.session, time + 2000);
    expect(next.questionId).not.toBe(r.session.questionId);
    const independentRetry = submit(
      r.document,
      { ...next, answer: '-2', reasoning: '음수를 괄호로 넣었다.' },
      time + 3000,
    );
    expect(independent(independentRetry.document.attempts[1])).toBe(true);
    expect(performance(independentRetry.document, time + 4000).changes[0].hintsReduced).toBe(true);
    const review = {
      ...startSession(independentRetry.document, 'review', time + 2 * DAY, 'm28-substitution'),
      answer: '6',
      questionId: 'm28-substitution-2',
      reasoning: '괄호부터 계산했다.',
    };
    const delayed = submit(independentRetry.document, review, time + 2 * DAY + 1000);
    expect(evidence(delayed.document, 'm28-substitution', time + 2 * DAY + 2000).delayed).toBe(1);
  });
});
describe('separate extension storage and rollback safety', () => {
  it('resolves simultaneous review-budget edits deterministically without doubling work', () => {
    const a = { ...emptyDocument(), budget: { value: 1, updatedAt: time } };
    const b = { ...emptyDocument(), budget: { value: 5, updatedAt: time } };
    expect(mergeDocuments(a, b)).toEqual(mergeDocuments(b, a));
    expect(mergeDocuments(a, b).budget.value).toBe(1);
  });
  it('reads legacy bytes unchanged and never places new IDs in the old key/API', () => {
    const storage = fixture();
    const legacy = solve('balance-0', '2').document;
    storage.setItem(KEY, JSON.stringify(legacy));
    const before = storage.getItem(KEY);
    expect(readDocument(storage).document).toEqual(legacy);
    expect(storage.getItem(KEY)).toBe(before);
    const extended = solve('m28-substitution-0', '11');
    saveDocument(storage, putSession(mergeDocuments(legacy, extended.document), extended.session));
    expect(legacyDocumentSchema.parse(JSON.parse(storage.getItem(KEY)!)).attempts).toEqual(
      legacy.attempts,
    );
    expect(JSON.parse(storage.getItem(EXT_KEY)!).attempts[0].questionId).toBe('m28-substitution-0');
    expect(readDocument(storage).document.attempts).toHaveLength(2);
    expect(legacyDocumentSchema.safeParse(readDocument(storage).document).success).toBe(false);
    expect(
      documentSchema.parse(JSON.parse(JSON.stringify(readDocument(storage).document))),
    ).toEqual(readDocument(storage).document);
    const rollback = partitionDocument(readDocument(storage).document).legacy;
    expect(legacyDocumentSchema.parse(rollback)).toEqual(legacy);
  });
  it('survives partial writes, retries idempotently, protects corrupt sidecars and keeps tombstones sticky', () => {
    const storage = fixture();
    const d = mergeDocuments(
      solve('balance-0', '2').document,
      solve('m28-substitution-0', '11').document,
    );
    expect(() =>
      saveDocument(
        {
          ...storage,
          setItem: (key, value) => {
            if (key === KEY) throw Error('quota');
            storage.setItem(key, value);
          },
        },
        d,
      ),
    ).toThrow('quota');
    expect(JSON.parse(storage.getItem(EXT_KEY)!).attempts).toHaveLength(1);
    expect(saveDocument(storage, d).attempts).toHaveLength(2);
    expect(saveDocument(storage, d).attempts).toHaveLength(2);
    const deleted = {
      ...d,
      attempts: d.attempts.map((a) => ({ ...a, deleted: true, updatedAt: time + 2000 })),
    };
    const stale = { ...d, attempts: d.attempts.map((a) => ({ ...a, updatedAt: time + 9000 })) };
    expect(mergeDocuments(deleted, stale).attempts.every((a) => a.deleted)).toBe(true);
    expect(mergeDocuments(deleted, stale)).toEqual(mergeDocuments(stale, deleted));
    storage.setItem(EXT_KEY, 'corrupt');
    const original = storage.getItem(KEY);
    expect(readDocument(storage).error).toBeTruthy();
    expect(() => saveDocument(storage, d)).toThrow();
    expect(storage.getItem(EXT_KEY)).toBe('corrupt');
    expect(storage.getItem(KEY)).toBe(original);
  });
});
