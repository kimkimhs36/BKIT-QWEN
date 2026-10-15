// Client-side feature flags; never embed provider credentials here.
export const apiEnabled = import.meta.env.VITE_AI_API_ENABLED === 'true';
const API_URL = 'https://bkit-api.vercel.app';
export async function requestAI(path: 'plan' | 'coach' | 'assistant', body: unknown, googleToken: string) {
  if (!apiEnabled || !navigator.onLine) throw new Error('AI unavailable');
  if (!googleToken) throw new Error('Google 계정을 연결해야 BKIT 멀티 비서를 사용할 수 있어.');
  const res = await fetch(API_URL + '/api/' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + googleToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18000),
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Google 계정 연결을 다시 확인해 줘.');
    if (res.status === 403) throw new Error('BKIT 비서에 접근할 권한이 없어.');
    if (res.status === 503) throw new Error('AI 서버 준비 중이야.');
    throw new Error('AI 서버 연결 오류 (' + res.status + ')');
  }
  return res.json();
}
