// Search aliases affect matching only; stored subject names are never rewritten.
const subjectAliases: Record<string, string> = {
  수학: '수학',
  수학과: '수학',
  math: '수학',
  mathematics: '수학',
  영어: '영어',
  영어과: '영어',
  english: '영어',
  국어: '국어',
  국어과: '국어',
  한국어: '국어',
  korean: '국어',
  과학: '과학',
  science: '과학',
  사회: '사회',
  사회과: '사회',
};

export function matchesResourceSearch(query: string, subject: string, content: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const subjectKey = subject.trim().toLocaleLowerCase();
  const alias = subjectAliases[q];
  return (
    (alias !== undefined && subjectAliases[subjectKey] === alias) ||
    `${subject} ${content}`.toLocaleLowerCase().includes(q)
  );
}
