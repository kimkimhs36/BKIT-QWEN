# 연동 현황과 남은 설정 — 2026-10-18

오늘 공부를 시작하는 데 계정이나 유료 API는 필요하지 않습니다. 현재 공개 서비스는
https://teambkit.com/ 이고, 실제 과제·사진·집중 기록은 이 기기의 브라우저에 저장됩니다.

| 연동                    | 확인된 현재 상태                                                                                                     | 필요한 사용자 행동                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 사진 보관·카메라/갤러리 | IndexedDB에 원본 저장. 외부 업로드 없음                                                                              | Safari에서 사진 선택 또는 직접 촬영                                                |
| 사진 글자 추출          | 무료 Tesseract.js 7.0.0, 한글·영어 인쇄물, 기기 내 처리                                                              | 자료 추가 → 사진 선택 → 사진에서 글자 가져오기. API 키·결제 불필요                 |
| 브리핑 기본 정리        | 줄 단위 분리·과목·종류·분량의 규칙 기반 초안                                                                         | 과목·내용·마감을 직접 확인. 상대 날짜는 자동 확정하지 않음                         |
| 외부 AI                 | DeepSeek V4.1 Flash (`deepseek-flash`), 본인 Google 이메일 인증, 일일 1,000원 승인. Vercel production 서버 설정 완료 | 공개 브리핑의 AI 선택 메뉴에서 Google 연결. 실제 모델 응답 검증은 아래 기록과 구분 |
| 공개 앱의 AI 요청       | 새 브리핑 정리만 별도 서버 상태와 본인 인증 후 사용. 과거 plan/coach/assistant는 비활성 유지                         | 정리 버튼을 누를 때 입력 글자만 전송. 사진은 전송하지 않음                         |
| Google Sheets 동기화    | OAuth·충돌 확인·과제/시간표 동기화 코드 있음. 사용자 연결 상태는 브라우저마다 다름                                   | 본인 Sheet와 웹 OAuth 클라이언트 등록, 본인이 Google 동의 화면 완료                |
| 기기 간 사진 동기화     | 구현 안 됨. Sheets/JSON 내보내기에 사진 원본은 포함되지 않음                                                         | 원본 사진을 보관. 사진 공유 저장소·계정 경계는 후속 구현 필요                      |
| 백그라운드 푸시         | 구현 안 됨                                                                                                           | 푸시 서버·구독·예약 발송 구현 후 권한 요청                                         |

## 지금 사용할 무료 OCR

사진을 첨부해도 자동으로 인식을 시작하지 않습니다. 사용자가 글자 읽기 버튼을 눌러야
엔진과 언어 자료를 teambkit.com에서 내려받고 이 기기에서 처리합니다. 첫 이용은
약 8.6MB(엔진 선택에 따라 차이)의 추가 다운로드가 필요합니다. 도구는 앱의 초기
오프라인 설치 목록에 넣지 않아 공부 시작을 지연시키지 않습니다. 성공적으로 받은
도구는 브라우저 캐시에 보관되지만 저장 공간과 캐시 삭제에 따라 다시 받아야 합니다.

읽은 글자를 과제마다 한 줄로 수정한 뒤 ‘이 내용으로 과제 확인’을 누릅니다. 기존에
수정하던 과제는 유지하고 새 초안을 추가합니다. 확인 체크와 ‘확인하고 BKIT에 저장’이
끝나기 전에는 실제 과제를 만들지 않습니다. 손글씨·수식·표·기울어진 사진은 잘못 읽을
수 있습니다. 읽기 취소나 실패 후에도 사진 첨부와 직접 입력으로 계속 진행할 수 있습니다.

기술 근거: [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md),
[자체 호스팅](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

## 승인된 외부 AI와 운영 경계

- 사용자 승인: DeepSeek V4.1 Flash, 하루 최대 1,000원. API 모델 ID는 `deepseek-flash`,
  정리 작업은 thinking disabled, JSON 출력, 최대 출력 2,200토큰입니다.
- 운영 서버 소스는 같은 저장소의 `deploy/bkit-api` 브랜치 `study-os/server.ts`,
  `server/privateApi.ts`, `server/redisBudget.ts`입니다. 프런트엔드 개발용 서버와 별개입니다.
- 기존 `AI_API_KEY`, `BKIT_OWNER_EMAIL`, `BKIT_GOOGLE_CLIENT_ID`는 Vercel의 비밀 설정에
  이미 있었습니다. 값은 조회하거나 채팅·공개 코드로 복사하지 않았습니다.
- 사용자가 Vercel 로그인과 Upstash 약관 동의를 직접 완료했고, Upstash Redis Free가
  bkit-api에 연결됐습니다. 자동 제공 `KV_REST_API_URL/TOKEN`을 서버에서 읽습니다.
- 운영 일반 설정: `BKIT_AI_LIVE=true`, `AI_DAILY_KRW_LIMIT=1000`,
  `AI_DAILY_CALL_LIMIT=60`. Google 본인 확인과 공유 Redis 장부가 없으면 요청을 차단합니다.
- Redis Lua 한 번으로 한국 날짜별 사용 예약액·호출 수·호출 간격을 원자적으로 검사합니다.
  최악 입력량과 최대 출력량을 정가($0.30/M input, $1.20/M output), 보수 환산 2,000원/USD로
  선차감합니다. 실패 요청도 환급하지 않으므로 여러 서버 인스턴스가 같은 상한을 지킵니다.
  저장소 오류나 예산 초과 때는 유료 모델 호출 없이 실패합니다.
- 1,000원은 이 앱의 보수적인 호출 예약 상한입니다. 공급자의 전체 계정 청구 한도를
  설정한 것은 아니며, 다른 앱의 키 사용·공급자 요금/환율 변경까지 제한하지 않습니다.
  충전·자동 충전·유료 저장소 전환은 실행하지 않았습니다.
- 브라우저 로그인은 이메일 확인 권한만 요청합니다. Google 토큰은 메모리에만 보관하고,
  서버가 OAuth 대상 클라이언트와 설정된 본인 이메일을 검증합니다. Origin은 teambkit.com만
  허용합니다. 사진과 기존 학습 기록은 AI 요청에 포함하지 않습니다.
- AI 초안도 과목·내용·마감·분량을 직접 수정하고 확인 체크 후에만 BKIT에 저장됩니다.
  입력 중 내용을 바꾸면 늦게 도착한 AI 응답은 적용하지 않습니다.

운영 건강 확인: `/api/health`는 `sourceCommit`, `mode:configured`,
`authConfigured:true`, `budgetConfigured:true`, `dailyKRW:1000`을 반환합니다.
이는 설정 존재와 배포 소스를 확인하는 결과이며, 실제 Google 동의·DeepSeek 키 유효성·잔액·
Redis 쓰기·모델 응답 성공을 증명하지 않습니다. 브라우저 UI 자동 검사의 AI 응답은 합성
응답으로 확인하며, 실제 공급자 호출 결과와 구분합니다. 최신 검증 기록은 RESUME-20261018.md.

공개 값 `VITE_AI_API_BASE_URL`만 브라우저 빌드에서 사용할 수 있습니다. 비밀키를 `VITE_`
변수·Pages·코드·채팅에 넣지 않습니다. 기존 `VITE_AI_API_ENABLED`는 이전 plan/coach 기능용으로
계속 false이며 새 브리핑은 서버 `/api/config`의 활성 여부를 따릅니다.

근거: [DeepSeek 공식 요금·모델](https://api-docs.deepseek.com/quick_start/pricing/),
[JSON 출력](https://api-docs.deepseek.com/guides/json_mode/),
[Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## Google 연결

본인 Google Cloud 프로젝트에서 Sheets API와 웹 OAuth 클라이언트를 설정하고 승인된
JavaScript 원본에 `https://teambkit.com`을 등록합니다. 동의 화면이 Testing이면 본인
Google 계정을 테스트 사용자로 등록합니다. 사용자가 만든 개인 Sheet 주소와 공개 OAuth
클라이언트 ID(`*.apps.googleusercontent.com`)만 앱의 ‘더 보기 → 설정 → 연결 설정’에
입력합니다. OAuth client secret은 앱에 입력하지 않습니다.

Google 동의는 본인이 완료해야 합니다. 현재 구현은 `spreadsheets`와 `userinfo.email`
권한을 요청하므로 선택한 시트보다 넓은 Sheets 접근 권한임을 확인해야 합니다. 로그인
토큰은 메모리에만 보관합니다. Sheets의 실제 읽기·쓰기는 이번 작업에서 검증하지 않았습니다.
브리핑 AI의 이메일 전용 로그인과 Sheets 동기화 동의는 별개입니다. 사진 원본과 전체 집중 세션은 이 동기화의 대상이 아닙니다.

설정 근거: [웹 OAuth 설정](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid),
[토큰 모델](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

## 아직 본인이 확인해야 할 iOS 항목

실물 iPhone/iPad Safari에서 카메라를 열어 한 장 촬영하고, 갤러리의 HEIC 사진을 첨부한 뒤
키보드가 열린 상태의 입력·회전·홈 화면 설치·화면 잠금 후 복귀를 확인해야 합니다.
WebKit 자동 검사는 실제 카메라·권한 팝업·소프트웨어 키보드·메모리 압박 검증을 대체하지 않습니다.
