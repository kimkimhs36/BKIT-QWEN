import type { StudyDocument } from './juggernaut/engine';
import { activeAttempts, dueReviews, independent } from './juggernaut/engine';

export function isMathBook(subject: string) {
  return /(?:수학|미적분|대수|확률\s*과\s*통계|기하)/.test(subject);
}

/** Independent study evidence is NOT textbook chapter completion or CSAT score prediction. */
export function foundationSnapshot(doc: StudyDocument, subject: string, now = Date.now()) {
  if (!isMathBook(subject)) return null;
  const attempts = activeAttempts(doc);
  const independentAnswers = attempts.filter(independent);
  return {
    attempted: attempts.length,
    independent: independentAnswers.length,
    pendingConcepts: dueReviews(doc, now).length,
    lastAttemptAt: attempts.length ? Math.max(...attempts.map(a => a.at)) : null,
    claim: '풀이 기록은 수학 기초 연습에 한정돼요. 이 책의 단원 완료나 수능 등급으로 환산되지 않아요.',
  };
}
