/** Only known, actionable messages reach the student; server internals stay private. */
export function briefingFailure(status: number, code?: unknown): string {
  if (code === 'AUTH_NOT_CONFIGURED')
    return '서버 인증 설정을 확인해야 해요. 무료 OCR과 직접 입력은 계속 사용할 수 있어요.';
  if (status === 401 || code === 'OWNER_AUTH_REQUIRED')
    return '개인 계정 권한이나 로그인 만료를 확인해 주세요. 무료 OCR과 직접 입력은 계속 사용할 수 있어요.';
  if (status === 403)
    return '이 계정 또는 접속 주소에는 AI 권한이 없어요. 무료 OCR과 직접 입력을 이용해 주세요.';
  if (code === 'DAILY_LIMIT')
    return '오늘 AI 사용 한도에 도달했어요. 내일 다시 시도하거나 직접 정리해 주세요.';
  if (status === 429 || code === 'RATE_LIMITED')
    return 'AI 요청이 잠시 제한됐어요. 잠시 뒤 다시 시도하거나 직접 정리해 주세요.';
  if (code === 'PROVIDER_404')
    return '서버의 DeepSeek 모델 설정을 확인해야 해요. 직접 정리는 계속 사용할 수 있어요.';
  if (code === 'PROVIDER_401' || code === 'PROVIDER_402')
    return '서버의 AI 연결 설정을 확인해야 해요. 직접 정리는 계속 사용할 수 있어요.';
  if (code === 'INVALID_MODEL_RESPONSE')
    return 'AI 초안의 근거를 확인하지 못했어요. 공지를 나누거나 직접 정리해 주세요.';
  if (status === 504 || code === 'PROVIDER_TIMEOUT')
    return 'AI 응답 시간이 초과됐어요. 잠시 뒤 다시 시도하거나 직접 정리해 주세요.';
  if (code === 'BUDGET_UNAVAILABLE')
    return 'AI 사용량 한도를 확인하지 못해 요청을 중단했어요. 직접 정리를 이용해 주세요.';
  if (status === 503)
    return 'AI 서버 연결을 준비하고 있어요. 무료 OCR과 직접 입력은 계속 사용할 수 있어요.';
  return 'AI 응답을 확인하지 못했어요. 무료 OCR과 직접 입력은 계속 사용할 수 있어요.';
}
