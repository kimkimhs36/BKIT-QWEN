import { API_URL } from './ai';
import type { State } from './model';
import { assistantContext } from './assistantLogic';

export type AssistantConfig = { available: boolean; clientId: string; message: string };

export async function checkAssistantConfig(fetcher: typeof fetch = fetch): Promise<AssistantConfig> {
  try {
    const response = await fetcher(API_URL + '/api/config', {
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('서버 상태를 확인할 수 없어요.');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') throw new Error('서버 응답이 올바르지 않아요.');
    const config = data as Record<string, unknown>;
    if (config.assistantEnabled !== true || typeof config.googleClientId !== 'string' ||
        !config.googleClientId.trim()) {
      return { available: false, clientId: '', message: 'AI 채팅은 아직 서버에서 비활성화돼 있어요. 로컬 비서는 사용할 수 있어요.' };
    }
    return { available: true, clientId: config.googleClientId,
      message: 'AI 서버 설정이 준비돼 있어요. 실제 모델 응답은 연결 후 확인할 수 있어요.' };
  } catch {
    return { available: false, clientId: '', message: 'AI 서버 확인에 실패했어요. 로컬 비서는 계속 사용할 수 있어요.' };
  }
}

export async function askLiveAssistant(
  question: string,
  token: string,
  state: State,
  shareStudyContext: boolean,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const query = question.trim();
  if (!token || query.length < 1 || query.length > 1000)
    throw new Error('Google 인증과 1,000자 이내의 질문을 확인해 주세요.');
  const payload = {
    question: query,
    // Only share this carefully scoped summary after explicit user consent.
    ...(shareStudyContext ? { context: assistantContext(state) } : {}),
  };
  let response: Response;
  try {
    response = await fetcher(API_URL + '/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(22000),
    });
  } catch {
    throw new Error('AI 서버 연결이 끊겼어요. 로컬 비서를 사용할 수 있어요.');
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data && typeof data === 'object' && 'error' in data &&
      typeof data.error === 'string' ? data.error : '';
    if (response.status === 401) throw new Error('Google 연결이 만료됐어요. AI를 다시 연결해 주세요.');
    if (response.status === 403) throw new Error('현재 계정에서는 AI 기능을 이용할 수 없어요.');
    throw new Error(error && error.length <= 180 ? error : 'AI 응답 오류 (' + response.status + ')');
  }
  if (!data || typeof data !== 'object' || !('mode' in data) || data.mode !== 'live' ||
      !('answer' in data) || typeof data.answer !== 'string' ||
      !data.answer.trim() || data.answer.length > 2000)
    throw new Error('AI 응답이 검증되지 않았어요. 로컬 비서를 사용해 주세요.');
  return data.answer.trim();
}
