import { ZodError } from 'zod';
const labels: Record<string, string> = {
  title: '이름',
  subject: '과목',
  minutes: '예상 시간',
  remaining: '남은 분량',
  days: '반복 요일',
  start: '시작',
  end: '종료',
  prep: '준비 시간',
  travel: '이동 시간',
  buffer: '안전 여유',
  excluded: '제외 날짜',
  due: '마감',
  link: '자료 링크',
  status: '학습 상태',
  submitted: '제출 상태',
  wake: '기상',
  bed: '취침',
  minSleep: '최소 수면',
  focus: '집중 구간',
};
export function inputError(e: unknown) {
  if (!(e instanceof ZodError)) return '날짜·시간과 입력값을 확인해주세요.';
  return [
    ...new Set(
      e.issues.map((i) => {
        const name = labels[String(i.path.find((p) => typeof p === 'string'))] || '입력';
        if (i.code === 'custom') return i.message;
        if (i.code === 'too_small')
          return `${name}: ${i.minimum}${i.type === 'array' ? '개 이상 선택' : ' 이상으로 입력'}해주세요.`;
        if (i.code === 'too_big') return `${name}: ${i.maximum} 이하로 입력해주세요.`;
        return `${name} 값을 확인해주세요.`;
      }),
    ),
  ].join(' ');
}
