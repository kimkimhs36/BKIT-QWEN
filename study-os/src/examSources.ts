import type { SourceProvenance } from './paperModel';
/** Portals checked with HTTP GET on 2026-10-19. These are directories, never fabricated exam results. */
export const OFFICIAL_PORTALS = [
  {
    title: 'EBSi 공식 기출문제 자료실',
    url: 'https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs',
    institution: 'EBSi',
    note: '학년·시행연도·시험을 공식 자료실에서 선택하고 이용 조건을 확인하세요.',
  },
  {
    title: '한국교육과정평가원',
    url: 'https://www.kice.re.kr/',
    institution: '한국교육과정평가원',
    note: '공식 홈페이지에서 수능·모의평가 자료와 저작권 조건을 확인하세요.',
  },
];
export function officialUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname === 'kice.re.kr' ||
        u.hostname.endsWith('.kice.re.kr') ||
        u.hostname === 'ebsi.co.kr' ||
        u.hostname.endsWith('.ebsi.co.kr') ||
        u.hostname === 'ebs.co.kr' ||
        u.hostname.endsWith('.ebs.co.kr') ||
        u.hostname.endsWith('.go.kr'))
    );
  } catch {
    return false;
  }
}
export function checkedProvenance(p: SourceProvenance) {
  if ([p.year, p.exam, p.grade, p.subject, p.curriculum].some((v) => !v.trim()))
    throw new Error('학년도·시험·학년·과목·교육과정을 원문에서 확인해 입력하세요.');
  if (
    !officialUrl(p.url) ||
    !p.verifiedAt ||
    !p.rights.trim() ||
    !p.title.trim() ||
    !p.institution.trim() ||
    (p.fileUrl && !officialUrl(p.fileUrl))
  )
    throw new Error('공식 HTTPS 출처, 실제 자료 제목·시행 기관, 이용 조건 확인이 필요합니다.');
  return p;
}
/** User-initiated, credential-free CORS request; no server proxy or speculative URL generation. */
export async function fetchOfficialPdf(source: SourceProvenance): Promise<File> {
  checkedProvenance(source);
  if (!source.fileUrl)
    throw new Error('공식 파일 URL이 없습니다. 공식 사이트에서 다운로드 후 등록하세요.');
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(source.fileUrl, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error('공식 파일을 직접 가져올 수 없습니다.');
    if (Number(response.headers.get('content-length') || 0) > 20 * 1024 * 1024)
      throw new Error('PDF가 20MB 한도를 초과합니다.');
    const reader = response.body.getReader(),
      chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('PDF가 20MB 한도를 초과합니다.');
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
    return new File(chunks, source.title + '.pdf', { type: 'application/pdf' });
  } finally {
    clearTimeout(timer);
  }
}
export interface ExamSourceProvider {
  search(
    filters: Partial<
      Pick<SourceProvenance, 'year' | 'exam' | 'grade' | 'subject' | 'curriculum' | 'institution'>
    >,
  ): Promise<SourceProvenance[]>;
}
// A future permitted API provider can implement this contract. No crawler/API key is required locally.
