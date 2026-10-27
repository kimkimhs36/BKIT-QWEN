import { describe, it, expect } from 'vitest';
import { foundationSnapshot, isMathBook } from '../src/booksExamBridge';
import {
  emptyDocument, startSession, submit, type StudyDocument,
} from '../src/juggernaut/engine';

describe('BOOKS × BKIT EXAM LAB evidence boundary', () => {
  it('only shows matching maths and electives without treating science as maths', () => {
    for (const s of ['미적분Ⅰ', '대수', '확률과 통계', '수학', '기하']) {
      expect(isMathBook(s)).toBe(true);
      expect(foundationSnapshot(emptyDocument(), s)).not.toBeNull();
    }
    for (const s of ['문학', '물질과 에너지', '역학과 에너지', '영어Ⅱ']) {
      expect(isMathBook(s)).toBe(false);
      expect(foundationSnapshot(emptyDocument(), s)).toBeNull();
    }
  });

  it('does not present empty practice data as book understanding', () => {
    const snapshot = foundationSnapshot(emptyDocument(), '미적분Ⅰ');
    expect(snapshot).toMatchObject({ attempted: 0, independent: 0, pendingConcepts: 0 });
    expect(snapshot?.claim).toContain('단원 완료');
  });

  it('separates hinted/wrong answers from independent work', () => {
    const now = Date.parse('2026-10-28T07:00:00+09:00');
    let d: StudyDocument = emptyDocument();
    const independent = startSession(d, 'training', now, 'm28-substitution');
    d = submit(d, { ...independent,
      answer: '11', reasoning: 'x=3을 대입해서 2*3+5=11로 계산',
      hints: 0, guessed: false }, now + 15000).document;
    const assisted = startSession(d, 'training', now + 30000, 'm28-substitution');
    d = submit(d, { ...assisted,
      answer: '99999', reasoning: '', hints: 1, guessed: true,
    }, now + 45000).document;
    const status = foundationSnapshot(d, '수학', now + 90000);
    expect(status?.attempted).toBe(2);
    expect(status?.independent).toBe(1);
    expect(status?.lastAttemptAt).toBe(now + 45000);
  });
});
