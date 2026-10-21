/** A Google popup success alone does not establish BKIT owner authorization. */
export async function checkPrivateIdentity(
  base: string,
  token: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(base + '/api/auth-check', {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403)
    throw new Error(
      'AI는 개발자 본인 계정 전용이에요. 무료 OCR과 직접 입력은 누구나 사용할 수 있어요.',
    );
  if (!response.ok)
    throw new Error('서버에서 계정을 확인하지 못했어요. 직접 입력은 계속 사용할 수 있어요.');
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== 'object' ||
    !('authenticated' in result) ||
    result.authenticated !== true
  )
    throw new Error('계정 확인 응답이 올바르지 않아요. 직접 입력은 계속 사용할 수 있어요.');
}
