import { concepts, questions, type Question } from './legacyContent.js';

export const catalogueVersion = 'math-prerequisites.2028.build03.v1';
export const addedConcepts = [
  {
    id: 'm28-substitution',
    name: '문자 대입과 식의 값',
    note: '문자 자리에 수를 괄호로 넣고, 거듭제곱과 곱셈을 먼저 계산합니다.',
    example: 'x = −2일 때 3x + 1 = 3 × (−2) + 1 = −5.',
  },
  {
    id: 'm28-like-terms',
    name: '동류항과 계수',
    note: '문자와 차수가 같은 항만 계수를 더합니다. 상수항은 따로 계산합니다.',
    example: '2x + 3 − x + 4 = (2 − 1)x + (3 + 4) = x + 7.',
  },
] as const;
export type LearningConcept =
  (typeof concepts)[number]['id'] | (typeof addedConcepts)[number]['id'];
export type LearningQuestion = Omit<Question, 'concept' | 'a' | 'b' | 'c'> & {
  concept: LearningConcept;
  answerLabel?: string;
  prerequisite?: LearningConcept;
  errorFocus?: string;
  retest?: string;
  verification?: { coefficients: number[]; x: number };
};
// Authored tasks: substitution, sign/square distinction, fractional value, interpreting
// a situation, coefficient vs constant and unlike powers. These are not generated copies.
const item = (
  id: string,
  concept: (typeof addedConcepts)[number]['id'],
  level: 1 | 2,
  stem: string,
  answer: string,
  hints: string[],
  explanation: string,
  coefficients: number[],
  x: number,
  errorFocus: string,
): LearningQuestion => ({
  id,
  concept,
  level,
  stem,
  answer,
  hints,
  explanation,
  answerLabel: concept === 'm28-like-terms' ? 'x의 계수' : '식의 값',
  prerequisite: id === 'm28-like-terms-3' || id === 'm28-like-terms-4' ? 'distribute' : undefined,
  verification: { coefficients, x },
  errorFocus,
  retest: '풀이를 가린 뒤 다른 문항을 힌트 없이 해결하고, 하루 뒤 다른 문항으로 다시 확인합니다.',
});
export const addedQuestions: LearningQuestion[] = [
  item(
    'm28-substitution-0',
    'm28-substitution',
    1,
    'x = 3일 때, 2x + 5의 값은?',
    '11',
    ['2x는 2 × x를 뜻합니다.', '2 × 3을 먼저 계산한 다음 5를 더하세요.'],
    '2 × 3 + 5 = 6 + 5 = 11. x는 구하는 미지수가 아니라 주어진 수 3입니다.',
    [5, 2],
    3,
    '문자와 곱셈의 의미',
  ),
  item(
    'm28-substitution-1',
    'm28-substitution',
    1,
    'x = −2일 때, 3x + 4의 값은?',
    '-2',
    ['음수를 대입할 때 괄호로 감싸세요.', '3 × (−2) + 4에서 곱셈을 먼저 합니다.'],
    '3 × (−2) + 4 = −6 + 4 = −2.',
    [4, 3],
    -2,
    '음수 대입의 부호',
  ),
  item(
    'm28-substitution-2',
    'm28-substitution',
    1,
    'x = 4일 때, 2(x − 1)의 값은?',
    '6',
    ['괄호 안을 먼저 계산해도 됩니다.', 'x − 1에 4 − 1을 넣고, 그 결과에 2를 곱하세요.'],
    '2 × (4 − 1) = 2 × 3 = 6. 전개한 2x − 2에 대입해도 8 − 2 = 6입니다.',
    [-2, 2],
    4,
    '괄호의 계산 순서',
  ),
  item(
    'm28-substitution-3',
    'm28-substitution',
    2,
    'x = −3일 때, x² + 2x의 값은?',
    '3',
    ['x²는 x × x입니다.', '(−3)²와 2 × (−3)을 각각 계산하세요.'],
    '(−3) × (−3) + 2 × (−3) = 9 − 6 = 3. (−3)² = 9이며 −3² = −9와 구분합니다.',
    [0, 2, 1],
    -3,
    '음수의 제곱과 부호',
  ),
  item(
    'm28-substitution-4',
    'm28-substitution',
    2,
    'x = 1/2일 때, 3x − 1의 값은? (분수 또는 소수)',
    '0.5',
    ['1/2는 0.5와 같습니다.', '3 × (1/2)에서 1을 빼세요.'],
    '3 × (1/2) − 1 = 3/2 − 2/2 = 1/2 = 0.5.',
    [-1, 3],
    0.5,
    '분수 대입과 통분',
  ),
  item(
    'm28-substitution-5',
    'm28-substitution',
    2,
    '기본요금 4천 원에 이용 1시간마다 2천 원이 추가됩니다. 3시간 이용요금은 몇 천 원인가요?',
    '10',
    ['요금을 2t + 4 (천 원)로 나타내세요.', '시간 t 자리에 3을 대입합니다.'],
    '2 × 3 + 4 = 10 (천 원). 단위가 천 원이므로 답은 10입니다.',
    [4, 2],
    3,
    '문장과 식·단위 연결',
  ),
  item(
    'm28-like-terms-0',
    'm28-like-terms',
    1,
    '2x + 3x를 정리했을 때, x의 계수는?',
    '5',
    ['두 항은 같은 문자 x를 갖는 동류항입니다.', '계수 2와 3을 더하세요.'],
    '2x + 3x = (2 + 3)x = 5x. 계수는 5입니다.',
    [2, 3],
    1,
    '계수의 합',
  ),
  item(
    'm28-like-terms-1',
    'm28-like-terms',
    1,
    '7x − 2x + 4를 정리했을 때, x의 계수는?',
    '5',
    ['상수 4는 x항과 동류항이 아닙니다.', '7x − 2x의 계수만 계산하세요.'],
    '(7 − 2)x + 4 = 5x + 4. 상수 4를 계수에 더하지 않습니다.',
    [7, -2],
    1,
    '상수항과 문자항 구분',
  ),
  item(
    'm28-like-terms-2',
    'm28-like-terms',
    1,
    '−x + 4x − 3을 정리했을 때, x의 계수는?',
    '3',
    ['−x의 계수는 −1입니다.', '−1 + 4를 계산하세요. 상수 −3은 따로 둡니다.'],
    '(−1 + 4)x − 3 = 3x − 3. x의 계수는 3입니다.',
    [-1, 4],
    1,
    '생략된 계수 −1',
  ),
  item(
    'm28-like-terms-3',
    'm28-like-terms',
    2,
    '2(x + 3) + x를 전개하고 정리했을 때, x의 계수는?',
    '3',
    ['2를 괄호 안의 모든 항에 곱합니다.', '2x + 6 + x에서 x의 계수 2와 1을 더하세요.'],
    '2x + 6 + x = 3x + 6. 계수는 3이고 상수항은 6입니다.',
    [2, 1],
    1,
    '분배 후 동류항 정리',
  ),
  item(
    'm28-like-terms-4',
    'm28-like-terms',
    2,
    '5x − (2x − 1)을 정리했을 때, x의 계수는?',
    '3',
    ['괄호 앞의 −를 모든 항에 적용합니다.', '5x − 2x + 1에서 계수를 계산하세요.'],
    '5x − 2x + 1 = 3x + 1. 괄호 안 −1은 빼면 +1이 됩니다.',
    [5, -2],
    1,
    '괄호 앞 음수',
  ),
  item(
    'm28-like-terms-5',
    'm28-like-terms',
    2,
    'x² + 2x + 3x를 정리했을 때, x의 계수는? (x²의 계수와 구분)',
    '5',
    ['차수가 같은 항끼리만 모읍니다.', 'x²는 남겨 두고 2x + 3x만 정리하세요.'],
    'x² + 5x. x²와 x는 차수가 달라 동류항이 아닙니다. x의 계수는 5입니다.',
    [2, 3],
    1,
    '차수가 다른 항 구분',
  ),
];
export const learningConcepts = [...concepts, ...addedConcepts];
export const learningQuestions: LearningQuestion[] = [...questions, ...addedQuestions];
export const isExtendedId = (id: string) => addedQuestions.some((q) => q.id === id);
export const conceptRelations: {
  from: LearningConcept;
  to: LearningConcept;
  kind: 'prerequisite' | 'practice';
  basis: string;
  source: string;
}[] = [
  {
    from: 'm28-substitution',
    to: 'negative',
    kind: 'prerequisite',
    basis: '구한 해를 원래 식에 대입해 검산하려면 음수 대입으로 식의 값을 구할 수 있어야 합니다.',
    source: 'OpenStax Algebra 1 · 1.7.1 대입 검산 예시 + 자체 풀이 단계 분석',
  },
  {
    from: 'distribute',
    to: 'm28-like-terms',
    kind: 'prerequisite',
    basis:
      '동류항 적용 문항 중 괄호가 있는 두 문항에서 먼저 분배법칙으로 전개해야 합니다. 모든 동류항 문항의 필수 선수조건은 아닙니다.',
    source: 'OpenStax Algebra 1 · 1.7.2 분배법칙·동류항 예시 + 적용 문항 단계 분석',
  },
  {
    from: 'balance',
    to: 'distribute',
    kind: 'practice',
    basis:
      '이 파일럿에서 등식 유지 연습 뒤 괄호가 있는 방정식을 권합니다. 필수 선수관계가 아닙니다.',
    source: 'BUILD 01/02 연습 설계',
  },
  {
    from: 'distribute',
    to: 'negative',
    kind: 'practice',
    basis: '괄호 전개 후 음수 계수와 검산을 연습하는 권장 순서입니다.',
    source: 'BUILD 01/02 연습 설계',
  },
];
export const conceptMetadata = (id: LearningConcept) => ({
  subject: '수학',
  year: 2028,
  curriculum: '2022 개정 준비 · 중학교 선수학습',
  scope: '수능 직접 출제범위 아님 · 선수학습',
  verification: '수학적 항등식·수치 검증 완료 / 교사 검수 대기',
  prerequisites: conceptRelations.filter((r) => r.to === id && r.kind === 'prerequisite'),
  related: conceptRelations.filter((r) => r.from === id || r.to === id),
  available: learningQuestions.filter((q) => q.concept === id),
});
// Different subject engines must supply their own response/evidence policies before launch.
export const subjectEngines = [
  { subject: '수학', tasks: '수치 인출 · 계수 판별 · 식과 상황 해석', available: true },
  { subject: '영어', tasks: '지연 어휘 인출 · 구문 분해 · 짧은 독해 근거', available: false },
  { subject: '국어', tasks: '문단 핵심 · 구조 연결 · 선지 근거 지정', available: false },
  { subject: '한국사', tasks: '시대 순서 배열 · 인과 연결 · 사료 판별', available: false },
  { subject: '통합사회', tasks: '자료 해석 · 사례에 개념 적용', available: false },
  { subject: '통합과학', tasks: '개념 설명 · 그래프 해석 · 예측 근거', available: false },
];
