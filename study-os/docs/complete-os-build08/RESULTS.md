# TEAM BKIT BUILD 08+ — 검증과 실행 인계

## 실제 결과와 재사용 범위

BUILD 07을 새 제품으로 교체하지 않고 #49의 실제 PDF/공부 왕복과 #43의 동의형 AI
클라이언트를 포함한 통합 소스를 만들었다. API #42는 서버 전용 계보에서 별도로
보존했다. 상세 계보·저장 키·배포 경계는 [RECOVERY.md](RECOVERY.md)에 있다.

| 기존 엔진을 재사용한 부분 | 이번에 개선한 부분 |
| --- | --- |
| 학교 공지/원본 보관, 기존 과제·제출 상태 | 원문·OCR·과목·과제·PDF 이름 검색, 정리/제출 확인/보관 필터 |
| 기존 마감 precision/provenance와 notes | 확인한 날짜·선택 시각, 해야 할 일·준비물·제출물 저장 |
| BOOKS·DigitalPaperRoom·문제 엔진 | 마지막 원본 이어 열기, 빈 PDF scaffold를 문제로 시작하지 않음, 원래 책 복귀 |
| 과제 타이머 | PDF-only 과제도 빈 문제 없이 시작, 공지 PDF는 원본 필기실에서 열기 |
| 일반 DigitalLibrary 가져오기 | 기본은 원본만 보관(문제 0개), 실제 문제 개수는 사용자 입력 |
| 기존 Cloud v2 | 기기 전용 수능 계획·상세 답안 메타데이터 보존, 구형 API 계약 비교 |
| 전체 ZIP·두 maths 저장 파티션 | 연결 원본 누락 거부, 한 ZIP에서 공지·사진·PDF·필기·책갈피·두 풀이 파티션 복원 |
| 소유자 인증·Redis 예산·AI OFF 기본값 | 동의 요약의 실제 16 KiB 계약, OAuth audience/만료 검증, 서버 예외 비밀정보 반사 방지 |
| 기존 9재질·Compact 홈 | BOOKS 폼 CSS가 펜 도구에 번지던 문제 수정, 필기실 색상·선택 도구를 재질 토큰과 연결 |

## 코드 증거

- 프런트: `feat/bkit-complete-os-build08`, [Draft #51](https://github.com/kimkimhs36/BKIT-QWEN/pull/51),
  대상은 `codex/daily-driver-02-source`이다. 정적 운영 `main`으로 병합하지 않았다.
- API: `feat/bkit-complete-os-api-build08`, [Draft #50](https://github.com/kimkimhs36/BKIT-QWEN/pull/50),
  HEAD `142eadb7e0f89e35517d3e441c1864b79f0e7e0d`, 대상 `deploy/bkit-api`.
- 주요 기능 커밋: `85378cf` 공지, `7dfbc12` BOOKS, `242c09a` 로컬 근거 보존,
  `056a35c` AI 요청, `79c56ca` ZIP, `7446f49` PDF-only 공부,
  `616c695` 구형 workspace 보존, `6e17e3c` 필기 도구 재질/레이아웃, `deb3aa6` 일반 PDF 가져오기.
- 주요 파일: `SchoolInbox.tsx`, `noticeIndex.ts`, `Books.tsx`, `bookLaunch.ts`,
  `bookStudyOrigin.ts`, `portableStudyState.ts`, `completeBackup.ts`,
  `assistantAI.ts`, `digital-paper.css`, API `server/auth.ts`, `server/privateApi.ts`.

## 확인된 품질 증거

| 검사 | 확인한 결과 |
| --- | --- |
| 프런트 TypeScript | 통과 |
| 프런트 전체 단위 | 58파일, 351개 통과 |
| 별도 API TypeScript/단위 | 통과 / 17파일, 112개 통과 |
| 실제 격리 Redis | 5개 통과: CAS 충돌·장애·응답 유실·로그인 유지·재시작·복구 |
| 실제 API 소스 계약 | canonical signature 일치, 로컬 수능 계획·답안 근거·사진 참조 보존 |
| 설치된 오프라인 셸 | 네트워크를 실제 차단한 뒤 reload, 보관 공지 재열람과 수학 답안 영구 저장 통과 |
| production build | 통과; 기존 500 kB 초과 번들 경고는 남아 있음 |
| 학교 Chromium 회귀 | 17개 통과: 원본/실제 OCR/용량 부족/시간표 변경/준비·출발/명시적 제출/외부 ZIP 복구 |
| PDF·필기·저장 진단 Chromium | 7개 통과: 10페이지/105획, 회전·확대 좌표, 취소/재실행, 두 손가락·포인터 취소, 미저장 필기, 문항 8→9와 외부 ZIP 원본 복구 |
| BOOKS/수능관/AI/클립보드 Chromium | 선택 회귀와 GitHub CI의 통합 iPhone 단계 통과 |
| WebKit iPhone 선택 회귀 | 14개 시나리오 모두 확인. 최초 PDF 전체 생애주기 30초 제한 실패 후 60초에서 29.4초에 재통과; 나머지 13개 통과 |
| 4 viewport × 9재질 여정 | 4개 검사 통과, 196장. 마지막 필기 CSS 변경 뒤 캡처도 다시 실행 |
| 백업/복원 | 새 IndexedDB/빈 저장소에서 원본 bytes·편집 가능한 필기·페이지·책갈피·공지·미제출·두 maths 파티션 재열람 |
| API CI | [40611804944 성공](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40611804944) |
| 프런트 최종 CI/Preview | #51의 최신 커밋 체크와 Preview 링크를 기준으로 확인. 오래된 Preview를 최신 HEAD라고 간주하지 않음 |

브라우저 검사는 실제 사용자 기록을 사용하지 않았다. `local-fixture.ts`가 외부 요청을
차단하고, AI/OAuth는 합성 응답으로 검증한다. 실제 유료 AI 성공의 증거가 아니다.
Redis 테스트는 운영 Redis에 접속하지 않았다.

실행 환경 연결이 한 차례 끊겼다가 복구되었다. 잘못된 로컬 preview base 경로,
테스트가 공유하던 서버 수명, 빌드 중 변경되는 dist를 사용하는 검사도 중단 후
안정된 별도 preview 서버에서 다시 실행했다. 이 중단 실행을 통과 개수에 합치지 않았다.
기존 테스트의 오래된 `새 공지 보관`/완료 후 제출 버튼 기대는 현재 실제 경로로 고쳤으며
테스트를 삭제하거나 skip하지 않았다.

## 디자인 증거

대상: 320×568, 390×664, iPad Pro 11 834×1194, 데스크톱 1440×1000의 브라우저 에뮬레이션.
홈·학교 공지·수행평가 수정·하루 일정·책장·책 상세·PDF 필기·수능관·비서를 렌더링했다.
9재질은 유효한 설정 JSON을 저장한 뒤 reload하여 검사한다. HTML dataset만 바꾸는
이전 테마 검사도 실제 설정 복원 검증으로 개선했다. Reduced Motion을 사용한 화면
검사와 저장된 과제/풀이 불변 검사를 함께 수행했다.

전체 합성 PNG는 GitHub CI artifact `bkit-build08-visual-evidence`에 7일 보관한다.
대표 화면 6장은 `evidence/`에 보존한다. 빌드 성공과 화면 합격을 같은 증거로 취급하지 않았다.
기본 자료가 적은 상태의 빈 화면/한 권 책장을 검토했으며, 아주 큰 개인 서재에서의
스크롤 성능이나 실제 펜의 지연까지 인증하지 않았다.

## 운영 안전과 남은 검증

- 운영은 여전히 Build 02. 운영 프런트/API 배포, main 병합, 사용자 기록 변경·초기화 없음.
- 저장 키·스키마 버전·마이그레이션 없음. 기존 자료와 풀이를 지워 빈 문제를 고치지 않았다.
- 유료 AI 호출 0회. 플래그/키/잔액/결제/자동 충전/추적 SDK 설정 변경 없음.
- 원본·BOOKS·수능관 기록의 기기 전용 경계를 유지. 다중 사용자 서버는 아직 소유자 전용.
- 실제 Google 계정·Safari OAuth 팝업·만료/권한 조합, 실제 AI 제공업체 모델·가격·월간 상한은
  별도 승인과 검증이 필요하다. 현재 API의 production Origin 제한을 Preview용으로 풀지 않았다.
- 물리 iPhone/iPad/Apple Pencil/Samsung Internet, 전체 과거 E2E 매트릭스, 실제 7일 사용은 미검증.
- 앱 종료 후 예약 Push는 구현하지 않았다. 기존 캘린더 내보내기와 제한 설명을 보존했다.
- rollback은 RECOVERY.md의 기존 운영 소스/정적 publication/API 체크포인트로 준비한다.
  코드 rollback을 위해 저장소나 Redis의 사용자 데이터를 삭제하지 않는다.

## 1분 안에 할 첫 행동과 다음 실행점

프리뷰에서 **학교 공지 보관 → 복사한 공지 바로 보관**으로 오늘 안내문 한 건을 보관하고
새로고침해서 다시 열어 본다. 클립보드 권한이 차단되면 **사진·PDF 공지 추가**의 원문
입력칸에 직접 붙여넣는다. 마감이 없으면 비워 두고, 확인한 과제만 별도로 등록한다.

다음 우선순위는 물리 기기에서 위 실제 공지 한 건을 다시 열고 제출 확인까지 사용하는
첫날 여정, 마지막 학습지 재진입/펜 감각, 그리고 실제 7일 사용 기록이다. 자동 검사 통과를
그 사용 검증의 대체물로 보고하지 않는다. 운영/과금 승인이 없으면 프리뷰에서 계속 검증한다.

재실행 명령은 `study-os`에서:

```sh
npm ci
npm run typecheck
npm test
npm run test:api-contract -- /path/to/BKIT-API
APP_BASE=/ npm run build
APP_BASE=/ BKIT_TEST_BASE_URL=http://127.0.0.1:4173/ npm run test:e2e -- tests/e2e/notice-management.spec.ts tests/e2e/books.spec.ts tests/e2e/exam-lab.spec.ts --project=iphone
APP_BASE=/ BKIT_TEST_BASE_URL=http://127.0.0.1:4173/ npm run test:e2e -- tests/e2e/complete-os-visual.spec.ts --project=iphone-small --project=iphone --project=ipad --project=desktop --output=test-results-visual
```
