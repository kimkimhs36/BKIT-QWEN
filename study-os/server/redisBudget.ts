import { ApiFailure } from './apiFailure.js';
// A single Lua transaction reserves before calling the provider. No refunds on
// failures; missing storage and malformed replies fail closed across instances.
const script = `
local cost, limit, maxCalls, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local used = tonumber(redis.call('HGET', KEYS[1], 'reserved') or '0')
local calls = tonumber(redis.call('HGET', KEYS[1], 'calls') or '0')
local previous = tonumber(redis.call('HGET', KEYS[1], 'last') or '0')
if cost <= 0 or used + cost > limit or calls >= maxCalls then return {-1, used} end
if now - previous < 1500 then return {-2, used} end
redis.call('HSET', KEYS[1], 'reserved', used + cost, 'calls', calls + 1, 'last', now)
redis.call('EXPIRE', KEYS[1], 259200)
return {calls + 1, used + cost}`;
export class RedisBudget {
  constructor(
    private config: { url: string; token: string; dailyKRW: number; calls: number },
    private fetcher: typeof fetch = fetch,
  ) {}
  async reserve(upperUSD: number) {
    const { url, token, dailyKRW, calls } = this.config;
    if (
      !url.startsWith('https://') ||
      !token ||
      !Number.isFinite(upperUSD) ||
      upperUSD <= 0 ||
      dailyKRW <= 0 ||
      dailyKRW > 1000 ||
      !Number.isInteger(calls) ||
      calls < 1 ||
      calls > 100
    )
      throw new Error('Budget not configured');
    // Conservative 2,000 KRW/USD conversion, versus ECB 1,332.10 on 2026-10-16.
    // This reserves estimated app usage; it is not a provider invoice guarantee.
    const amount = Math.ceil(upperUSD * 2000 * 1_000_000);
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const response = await this.fetcher(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL',
        script,
        '1',
        'bkit:ai-budget:' + day,
        String(amount),
        String(dailyKRW * 1_000_000),
        String(calls),
        String(Date.now()),
      ]),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!response.ok)
      throw new Error('사용량 장부에 연결하지 못했어요. 유료 요청은 보내지 않았어요.');
    const data: unknown = await response.json();
    const result = data && typeof data === 'object' && 'result' in data ? data.result : null;
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      !result.every((n) => typeof n === 'number' && Number.isSafeInteger(n))
    )
      throw new Error('사용량을 확인하지 못했어요.');
    if (result[0] < 0 && ![-1, -2].includes(result[0]))
      throw new Error('Invalid budget reservation');
    if (result[0] < 0)
      throw new ApiFailure(
        429,
        result[0] === -2 ? 'RATE_LIMITED' : 'DAILY_LIMIT',
        result[0] === -2
          ? '잠시 후 다시 요청해 주세요.'
          : '오늘의 AI 사용 상한에 도달했어요. 직접 입력은 계속 사용할 수 있어요.',
        result[0] === -2 ? 2 : undefined,
      );
    if (result[0] > calls || result[1] < amount || result[1] > dailyKRW * 1_000_000)
      throw new Error('Invalid budget reservation');
    return { calls: result[0], reservedKRW: Math.ceil(result[1] / 1_000_000) };
  }
}
