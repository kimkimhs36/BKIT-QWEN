export const curriculum = {
  version: 'project-2028.v1',
  year: 2028,
  examDate: '2027-11-18',
  source: 'https://www.moe.go.kr',
  verification: 'PR #36 설계 기준 · 공식 공고 재확인 필요',
  subjects: [
    { name: '국어', scope: '화법과 언어 · 독서와 작문 · 문학' },
    { name: '수학', scope: '대수 · 미적분Ⅰ · 확률과 통계' },
    { name: '영어', scope: '영어Ⅰ · 영어Ⅱ' },
    { name: '한국사', scope: '한국사' },
    { name: '통합사회', scope: '통합사회' },
    { name: '통합과학', scope: '통합과학' },
  ],
} as const;
export const concepts = [
  {
    id: 'balance',
    name: '등식의 성질과 이항',
    note: '등식 양변에 같은 수를 더하거나 빼도 등식은 유지됩니다.',
    example: 'x + 4 = 9 → 양변에서 4를 빼면 x = 5.',
  },
  {
    id: 'distribute',
    name: '괄호와 분배법칙',
    note: '괄호 앞의 수를 괄호 안의 모든 항에 곱합니다.',
    example: '2(x + 3) = 14 → 2x + 6 = 14 → 2x = 8 → x = 4.',
  },
  {
    id: 'negative',
    name: '음수 계수와 검산',
    note: '음수 계수로 나누고, 구한 값을 원래 식에 대입해 확인합니다.',
    example: '−2x + 3 = 9 → −2x = 6 → x = −3. 검산: 6 + 3 = 9.',
  },
] as const;
export type Concept = (typeof concepts)[number]['id'];
export type Question = {
  id: string;
  concept: Concept;
  level: 1 | 2;
  stem: string;
  answer: string;
  options?: string[];
  hints: string[];
  explanation: string;
  a: number;
  b: number;
  c: number; // Independent answer verification: a*x+b=c.
};
// Original, machine-generated numeric variants. Algebraic substitution tests verify every
// key and choice; no official/publisher questions, external text, or protected answer keys.
function make(concept: Concept, index: number): Question {
  const x = index % 2 ? -(index + 1) : index + 2;
  const a =
    concept === 'negative' ? -((index % 3) + 2) : concept === 'distribute' ? (index % 3) + 2 : 1;
  const k = index + 3,
    b = concept === 'distribute' ? a * k : k,
    c = a * x + b;
  const left =
    concept === 'distribute' ? `${a}(x + ${k})` : `${a === 1 ? '' : a < 0 ? '−' + -a : a}x + ${b}`;
  const options =
    index % 2 === 0
      ? [String(x - 1), String(x), String(-x), String(x + 1)].filter(
          (v, i, arr) => arr.indexOf(v) === i,
        )
      : undefined;
  return {
    id: `${concept}-${index}`,
    concept,
    level: index < 3 ? 1 : 2,
    stem: `${left} = ${c}일 때, x의 값은?`,
    answer: String(x),
    options,
    a,
    b,
    c,
    hints: [
      concepts.find((v) => v.id === concept)!.note,
      concept === 'distribute'
        ? `먼저 ${a}x + ${b} = ${c}로 전개합니다. 다음에는 양변에서 ${b}을 빼세요.`
        : `양변에서 ${b}을 빼고 x의 계수 ${a}로 나누세요.`,
    ],
    explanation: `${a}x + ${b} = ${c} → ${a}x = ${c - b} → x = ${x}. 원래 식에 대입하면 ${a} × (${x}) + ${b} = ${c}입니다.`,
  };
}
export const questions: Question[] = concepts.flatMap((c) =>
  Array.from({ length: 8 }, (_, i) => make(c.id, i)),
);
export const questionById = (id: string) => questions.find((q) => q.id === id)!;
export function score(id: string, answer: string) {
  const q = questionById(id);
  const normalized = answer
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/^x\s*=\s*/i, '');
  if (!q || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return false;
  return Number(normalized) === Number(q.answer);
}
export const errorLabels = {
  C: '개념 부족',
  M: '기억 실패',
  R: '독해·해석 오류',
  I: '추론 오류',
  K: '조건 누락',
  A: '계산 실수',
  T: '시간 부족',
  F: '집중 저하',
  G: '우연한 정답',
} as const;
export type ErrorCode = keyof typeof errorLabels;
