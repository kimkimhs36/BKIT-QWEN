/** Safe, read-only diagnostics. No secrets, credentials, or paid model requests. */
export type ApiHealth = {
  available: boolean;
  serverMode: 'configured' | 'demo' | 'unknown';
  briefingReady: boolean;
  authConfigured: boolean;
  budgetConfigured: boolean;
  model: string | null;
  reason: string | null;
};
export async function checkApiHealth(
  base: string,
  fetcher: typeof fetch = fetch,
): Promise<ApiHealth> {
  const down = (reason: string): ApiHealth => ({
    available: false, serverMode: 'unknown', briefingReady: false,
    authConfigured: false, budgetConfigured: false, model: null, reason,
  });
  try {
    const url = new URL('/api/health', base.endsWith('/') ? base : base + '/');
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')
      return down('안전하지 않은 서버 주소라 요청하지 않았어요.');
    const res = await fetcher(url.toString(), {
      method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return down('서버 상태를 가져오지 못했어요. (HTTP ' + res.status + ')');
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object') return down('서버 상태 응답 형식이 올바르지 않아요.');
    const value = data as Record<string, unknown>;
    if (value.service !== 'bkit-api' || !['configured', 'demo'].includes(String(value.mode)))
      return down('현재 BKIT 비공개 API가 아닌 응답이야. 연결 설정을 확인해 주세요.');
    const features = (value.features && typeof value.features === 'object')
      ? value.features as Record<string, unknown> : {};
    return {
      available: true,
      serverMode: value.mode as 'configured' | 'demo',
      briefingReady: value.mode === 'configured' && features.briefing === true,
      authConfigured: value.authConfigured === true,
      budgetConfigured: value.budgetConfigured === true,
      model: typeof value.model === 'string' ? value.model.slice(0, 80) : null,
      reason: null,
    };
  } catch {
    return down('연결이 불안정하거나 응답 시간이 초과됐어요. 기존 과제 직접 입력은 사용할 수 있어요.');
  }
}
