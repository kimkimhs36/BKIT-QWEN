export type SubjectTemplate = {
  name: string;
  steps: string[];
  answerLabel: string;
  fields: { key: string; label: string }[];
  example: string;
};
const templates: Record<string, SubjectTemplate> = {
  math: {
    name: '수학',
    steps: [
      '선수개념 회상',
      '짧은 예제 확인 (선택)',
      '독립 풀이',
      '과정·최종 답',
      '오류 검토·재시험',
    ],
    answerLabel: '최종 답',
    fields: [
      { key: 'recall', label: '이 문제에 필요한 개념' },
      { key: 'steps', label: '풀이 과정' },
      { key: 'stuck', label: '막힌 단계 (선택)' },
    ],
    example:
      '방법 예시 · 실제 학습지 문제 아님\n2x + 3 = 7 → 양변에서 3을 빼고 2로 나눕니다. 다른 수로 직접 확인해 보세요.',
  },
  physics: {
    name: '물리',
    steps: ['법칙 회상', '변수 관계', '단위 확인', '식 세우기', '계산·오류 검토'],
    answerLabel: '결과와 단위',
    fields: [
      { key: 'law', label: '사용할 법칙' },
      { key: 'variables', label: '주어진 값·변수 관계' },
      { key: 'units', label: '단위 점검' },
      { key: 'equation', label: '식과 계산 과정' },
    ],
    example:
      '방법 예시 · 실제 자료 아님\nv = d/t를 쓸 때 거리와 시간의 단위를 먼저 맞춥니다. 결과가 무엇을 뜻하는지 말해 보세요.',
  },
  chemistry: {
    name: '화학',
    steps: ['개념 회상', '조건 구분', '공식 적용', '계산', '결과 검토·재시험'],
    answerLabel: '결과와 조건 확인',
    fields: [
      { key: 'recall', label: '떠올린 개념' },
      { key: 'conditions', label: '문제의 조건' },
      { key: 'formula', label: '공식·반응식·계산 과정' },
    ],
    example:
      '방법 예시 · 실제 자료 아님\n물질량 계산에서는 질량과 몰질량의 단위를 확인한 뒤 n = m/M을 적용합니다.',
  },
  english: {
    name: '영어',
    steps: ['단어 회상', '문장 직접 해석', '원문·참고 번역 비교', '표현 수정', '다시 해석'],
    answerLabel: '내가 직접 쓴 해석',
    fields: [
      { key: 'words', label: '모르는 단어·내가 떠올린 뜻' },
      { key: 'expressions', label: '복습할 표현' },
      { key: 'correction', label: '해석을 수정한 이유 (선택)' },
    ],
    example:
      '방법 예시 · 실제 자료 아님\n문장의 주어와 동사를 먼저 찾고, 수식하는 부분을 연결해 보세요. 참고 번역은 직접 해석한 다음 비교하세요.',
  },
  economics: {
    name: '경제',
    steps: ['개념 정의', '원인과 결과', '그래프 관계', '실제 사례', '서술형 회상'],
    answerLabel: '내 말로 설명하기',
    fields: [
      { key: 'definition', label: '개념 정의' },
      { key: 'causality', label: '원인 → 결과' },
      { key: 'graph', label: '그래프의 축·이동 방향' },
      { key: 'case', label: '실제 사례' },
    ],
    example:
      '방법 예시 · 실제 자료 아님\n수요 변화와 수요량 변화를 구분하고, 어떤 조건이 변했는지 먼저 설명해 보세요.',
  },
  general: {
    name: '능동 회상',
    steps: ['개념 떠올리기', '독립 시도', '답 비교', '오류 수정', '지연 재시험'],
    answerLabel: '내 답',
    fields: [
      { key: 'recall', label: '필요한 개념' },
      { key: 'steps', label: '생각·풀이 과정' },
    ],
    example:
      '자료를 잠깐 가리고 아는 내용을 먼저 적어 보세요. 모르는 부분을 확인한 뒤 다시 떠올립니다.',
  },
};
export function subjectTemplate(subject: string) {
  const key = /수학|math/i.test(subject)
    ? 'math'
    : /물리|physics/i.test(subject)
      ? 'physics'
      : /화학|chem/i.test(subject)
        ? 'chemistry'
        : /영어|english/i.test(subject)
          ? 'english'
          : /경제|econ/i.test(subject)
            ? 'economics'
            : 'general';
  return templates[key];
}
