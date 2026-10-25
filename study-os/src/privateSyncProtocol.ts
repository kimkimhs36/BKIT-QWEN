export type SyncFailureKind =
  | 'expired'
  | 'forbidden'
  | 'conflict'
  | 'network'
  | 'server'
  | 'rate-limit'
  | 'invalid-data'
  | 'storage';
export class SyncFailure extends Error {
  constructor(
    readonly kind: SyncFailureKind,
    message: string,
    readonly httpStatus?: number,
    readonly retryAfterMs?: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}
export const MAX_SYNC_RETRIES = 5;
export function retryDelay(attempt: number, retryAfterMs = 0) {
  return Math.min(
    120000,
    Math.max(Math.min(30000, 1000 * 2 ** Math.max(0, attempt - 1)), retryAfterMs),
  );
}
export function transientFailure(error: SyncFailure) {
  return ['network', 'server', 'rate-limit'].includes(error.kind);
}
/** No response body or credential is used as an error message or written to logs. */
export async function syncResponse(response: Response): Promise<unknown> {
  const requestId = response.headers
    .get('X-Bkit-Request-Id')
    ?.replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
  const retry = response.headers.get('Retry-After');
  const retryAfter = retry
    ? /^\d+$/.test(retry)
      ? Number(retry) * 1000
      : Math.max(0, Date.parse(retry) - Date.now())
    : 0;
  if (!response.ok) {
    let code = '';
    try {
      const body = await response.json();
      if (typeof body?.code === 'string') code = body.code;
    } catch {
      /* Platform errors can be HTML. */
    }
    if (response.status === 401)
      throw new SyncFailure(
        'expired',
        '로그인 세션이 만료됐어요. 다시 연결해 주세요.',
        401,
        undefined,
        requestId,
      );
    if (response.status === 403)
      throw new SyncFailure(
        'forbidden',
        '클라우드 접근이 거부됐어요. 로그인은 보관 중이며 연결 설정 확인이 필요해요.',
        403,
        undefined,
        requestId,
      );
    if (response.status === 409)
      throw new SyncFailure(
        'conflict',
        '다른 기기에서 기록이 바뀌었어요. 어느 기록을 유지할지 확인해 주세요.',
        409,
        undefined,
        requestId,
      );
    if (code === 'SYNC_DATA_INVALID')
      throw new SyncFailure(
        'invalid-data',
        '클라우드 자료 형식을 확인하지 못했어요. 이 기기의 원본은 유지돼요.',
        response.status,
        undefined,
        requestId,
      );
    if (response.status === 429)
      throw new SyncFailure(
        'rate-limit',
        '요청이 많아 잠시 기다려요. 로그인은 유지돼요.',
        429,
        Number.isFinite(retryAfter) ? retryAfter : 0,
        requestId,
      );
    if (response.status >= 500 || response.status === 408)
      throw new SyncFailure(
        'server',
        '클라우드 서버에 잠시 연결할 수 없어요. 로그인과 이 기기의 공부 기록은 유지돼요.',
        response.status,
        Number.isFinite(retryAfter) ? retryAfter : 0,
        requestId,
      );
    throw new SyncFailure(
      'invalid-data',
      '클라우드에서 자료를 처리하지 못했어요. 이 기기의 원본은 유지돼요.',
      response.status,
      undefined,
      requestId,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new SyncFailure(
      'invalid-data',
      '클라우드 응답을 확인하지 못했어요. 이 기기의 원본은 유지돼요.',
      response.status,
      undefined,
      requestId,
    );
  }
}
