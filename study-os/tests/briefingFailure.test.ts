import { expect, it } from 'vitest';
import { briefingFailure } from '../src/briefingFailure';
it('separates known authentication, budget, timeout and model failures', () => {
  expect(briefingFailure(401)).toContain('로그인 만료');
  expect(briefingFailure(403)).toContain('접속 주소');
  expect(briefingFailure(503, 'AUTH_NOT_CONFIGURED')).toContain('인증 설정');
  expect(briefingFailure(429, 'DAILY_LIMIT')).toContain('내일');
  expect(briefingFailure(429, 'RATE_LIMITED')).toContain('잠시');
  expect(briefingFailure(502, 'PROVIDER_404')).toContain('모델 설정');
  expect(briefingFailure(504)).toContain('시간이 초과');
  expect(briefingFailure(503, 'BUDGET_UNAVAILABLE')).toContain('한도');
  expect(briefingFailure(502, 'INVALID_MODEL_RESPONSE')).toContain('근거');
});
it('does not reflect arbitrary diagnostic strings or provider internals', () => {
  expect(briefingFailure(500, 'secret=private-token')).not.toContain('private-token');
  expect(briefingFailure(502, { error: 'stack trace' })).not.toContain('stack');
});
