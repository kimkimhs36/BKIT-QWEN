import { score as legacyScore } from './legacyContent.js';
import { learningQuestions, isExtendedId, type LearningConcept } from './catalogue.js';
export { concepts, questions, curriculum, errorLabels } from './legacyContent.js';
export type { Question, ErrorCode } from './legacyContent.js';
export type Concept = LearningConcept;
export const questionById = (id: string) => learningQuestions.find((q) => q.id === id)!;
export function score(id: string, answer: string) {
  const q = questionById(id);
  const normalized = answer
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/^x\s*=\s*/i, '');
  if (!q) return false;
  if (!isExtendedId(id)) return legacyScore(id, answer);
  const value = parseNumericAnswer(normalized);
  return value !== null && value === Number(q.answer);
}
export function parseNumericAnswer(input: string): number | null {
  const value = input.trim().replace(/[−–]/g, '-');
  if (value.length > 100) return null;
  if (/^[+-]?(?:\d{1,10}(?:\.\d{0,9})?|\.\d{1,9})$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= 1e9 ? n : null;
  }
  const fraction = /^([+-]?\d{1,9})\s*\/\s*([+-]?\d{1,9})$/.exec(value);
  if (!fraction || Number(fraction[2]) === 0) return null;
  return Number(fraction[1]) / Number(fraction[2]);
}
