# BKIT 3.5 MASTER HANDOFF

## 현재 인수인계 (2026-10-19, 최종 검증 완료)

- 작업 시작 HEAD: release/3.4 `efdaa7921fa28c72382b672aefb5955e57703ead`; feature 자산 `a5a1b517a448a74519d691a9b4bc9893870b9776` 통합.
- 현재 브랜치: `feat/bkit-3-5-product-perfection`
- 마지막 소스 커밋 SHA: `a7ff941335b0c6ea54d384371fac2e69fef19637` (320px P0 추가 수정 후 기능 동결).
- 문서 갱신 직전 마지막 커밋: `db8d938e79dcf3380fa45cb4945357962bb1c355`; 이후 커밋은 문서만. 정확한 최신 문서 HEAD는 `git log -1 --format=%H`로 확인.
- PR: https://github.com/kimkimhs36/BKIT-QWEN/pull/15 (검토 준비 완료; 자동 merge/deploy 금지).
- CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39254199212 — **SUCCESS** (2026-10-19 12:52:31 UTC). 동일 소스 SHA에서 TypeScript·173개 단위·빌드·6개 프로필 E2E 546/546 통과, 실패 0.
- 완료: quickLabel, quick 자료 이어가기/모드/즉시 저장, 이전 quick 기록 편집·실패/미저장 보호, ZIP/JSON 실행 timer 보호, paused export/import, 102구간 경계 보강, 안전한 SW waiting, 터치/포커스·표시 버전 정리. 결함 목록 13건은 docs/BKIT-3-5-AUDIT.md.
- 통과: 최종 로컬 iPhone Chromium/iPad WebKit 핵심 18/18. iPad WebKit 10페이지/105획·회전·문제8→9·ZIP 전송·편집/원본사진 검증 통과, local safety 14/14 통과. 320px exact geometry/axe 6/6 통과.
- 실패 이력: 기준 TS2741·테스트 타입 오류·WebKit 라이브러리·동시 output 충돌·clock 1초 비결정성은 수정/재검증. 최종 a7ff941 CI는 546/546 통과. formatter 기존 80파일 문제는 미정리로 별도 공개.
- 수정 중인 파일: 없음 (코드 동결); 이후는 인수인계·검증 문서만. `git status --short` 확인.
- 남은 문제: 실기기 pen/PWA 두 버전/장시간 절전, 극단 시각 역행/동시 저장 경합. classic 기록 전체 편집·독립 문제 시간·AI는 후속.
- 다음 첫 명령: `cd /workspace/BKIT-QWEN && git status --short && git log -1 --oneline` (그 후 docs/BKIT-3-5-DEVICE-QA.md의 실기기 검수; 배포 승인 아님)
- 실패 시: `gh run view 39254199212 --repo kimkimhs36/BKIT-QWEN --log-failed`; artifacts의 trace 확인 후 해당 프로필/spec만 재현.
- 운영 사이트 배포 여부: **배포하지 않음**. main `9be351a899cce55e96ad5d2af48354343c728fff` 그대로. 동일 원격 `checkpoint/pre-bkit-3-5-development-20261019` 보존. `/mock-rescue/`·`/exam-lab/` HTTP 200.
- 연구: docs/BKIT-PRODUCT-RESEARCH.md; 결과/측정: docs/BKIT-3-5-VALIDATION.md; 기기 검수: docs/BKIT-3-5-DEVICE-QA.md.
- Codex 사용량 조회 수단 없음. 퍼센트/자동 중단 가정 없음.

## 이전 체크포인트 이력


- 작업 시작 HEAD: release/3.4 `efdaa7921fa28c72382b672aefb5955e57703ead`; 최신 feature 자산 `a5a1b517a448a74519d691a9b4bc9893870b9776` fast-forward 반영.
- 현재 브랜치: `feat/bkit-3-5-product-perfection`
- 마지막 커밋: 이 문서를 포함한 체크포인트는 `git log -1`로 확인 (자기 SHA를 문서에 넣는 순환 방지).
- 운영 main 기준: `9be351a899cce55e96ad5d2af48354343c728fff`; live release.json source `577d7558e14af036d1af6685fe310f58c030f838` (3.3).
- 기존 checkpoint/pre-bkit-3-4-release-20261019: `a47020860d65f046e18884438d7c8dad3718425d`.
- 완료: 최신 branches/PR/CI/deployments 조회; 3.4 quickLabel 누락 재현 및 호출부 수정.
- 기준 검증: 단위 163/163 통과; 수정 전 TypeScript TS2741 실패 재현.
- 수정 중: 연구 및 제품/저장 감사. 운영 데이터는 읽거나 변경하지 않음.
- 남은 문제: 전체 화면 감사, 타이머 이력 편집/한도 경계, 학습 흐름 연결, 데이터 안전성 및 6개 프로필 검증.
- 다음 명령: `cd /workspace/BKIT-QWEN/study-os && npm run typecheck && npm run build`
- 운영 배포: 없음. main/기존 release 변경 금지. PR base는 release/3.4 사용, 자동 배포 workflow를 실행하지 않음.
- Codex 사용량: 조회 가능한 도구 없음; 퍼센트 추정하지 않음.

## 구현 체크포인트 (2026-10-19 12:22 UTC)

- 마지막 보존 커밋: `c0715d4` (3.4 TS 수정+연구). 다음 구현 체크포인트 SHA는 `git log -1` 확인.
- 완료: 오래된 quick session 편집, 사용자 과목/완료 과제 유지, 편집 실패 초안 유지, 미저장 내용 이동 방지.
- 완료: quick timer→기존 자료 학습실 동일 ID/구간 이어가기, 문제 시도/오답 보존, 종료 즉시 session 저장.
- 완료: 반복 일시정지 102구간 제한 확대·경계 가드, 5,000 세션 한도 실패 안내와 timer 유지.
- 완료: quick timer가 있는 ZIP 복원 차단 (merge/replace), 실행 중 export는 기존처럼 일시정지 snapshot.
- 완료: PWA 강제 skipWaiting 제거, 기존 모든 탭 종료 후 버전 적용 안내. 이전 lazy chunk 캐시 조기 삭제 방지.
- 단위 172/172 통과, 빌드 통과. 신규 iPhone Chromium 4/4 통과 (미저장 이동 테스트 추가 이전).
- 로컬 WebKit 시스템 라이브러리 미설치로 launch 실패; 사용자 디렉터리에 Debian 패키지를 추출해 브라우저 runtime을 준비 중. CI는 표준 `playwright install --with-deps` 사용.
- 전체 format:check는 기존 포함 80개 파일 스타일 문제. ESLint 설정 없음. 광범위한 스타일 변경은 미실시.
- 수정 파일: `git status --short` 확인. 연구 문서의 P1 계획에 따라 변경, 새 외부 API/분석 수집은 비활성.
- 다음 명령: `npm run typecheck && npm test && npm run build`; 이어 Playwright 6개 프로필 전체 회귀.
- 신규 verify-bkit-3-5.yml은 읽기 권한만 가지며 deploy 단계 없음. 운영 배포 없음.

## 추가 P0 경계

- ZIP 외의 legacy JSON 가져오기도 quick/active timer를 덮어쓸 수 있어 UI와 commit(force) 경계 모두 차단했다. 다른 탭의 실제 저장 상태도 확인한다.
- JSON export는 live 상태를 바꾸지 않고 paused snapshot을 만든다. legacy JSON import는 저장된 구간만 유지하며 archive 보관 기간이 공부 시간으로 쌓이지 않도록 일시정지한다. 원본 파일은 수정하지 않음.
- 1798274에서 clean CI 테스트 타입 오류 수정. 최종 source checkpoint는 다음 git log 확인. PR #15: https://github.com/kimkimhs36/BKIT-QWEN/pull/15
- CI 중복 비용 방지를 위해 push/manual만 실행, 6개 전체 suite는 유지한다.

## 최종 소스 검증 단계

- baseline 1798274 로컬 핵심 48개 중 47 통과, iPad WebKit 1개는 테스트 clock install이 실시간 진행하는 중 1초 차이 발생. exact assertion은 유지하고 `clock.pauseAt`로 결정적 시계 설정; 해당 3개 재검증 통과.
- JSON export/live 비변경/restore 경계 신규 E2E iPhone 통과. quick 자료 진입 후 stopwatch/countdown 모드도 유지하도록 보강.
- 마지막 전체 단위 173/173, TypeScript 및 production build 통과. 최종 CI는 이 체크포인트 push로 6개 전체 suite를 실행한다.
- 측정/스크린샷 재현: `scripts/measure-product.mjs`; baseline `c0715d4` preview 4174와 현재 preview 4175를 사용. docs/validation에 4 viewport 전후 화면과 원시 lab JSON 보존.
- 코드 변경은 여기서 동결하고 CI 실패 수정에만 집중. 다음 명령: `gh run list --repo kimkimhs36/BKIT-QWEN --branch feat/bkit-3-5-product-perfection --limit 3`

## CI에서 추가 발견한 320px P0 수정

- 7181346 전체 CI의 완료된 5개 프로필에서 각각 90개 통과, 동일 home-clarity 320×740 geometry 1개 실패. (iPad WebKit은 당시 실행 중.)
- 원인: 3.4 비교 빌드에도 있던 홈 capture 버튼의 하단 dock 중첩. 좁은 화면에서 카드 padding과 gap을 줄여 수정. 버튼/텍스트/44px 기준과 기존 assertion을 그대로 유지.
- 수정 후 동일 기존 테스트가 로컬 6개 프로필에서 6/6 통과 (axe 포함). build 통과. baseline/current narrow-320 화면과 갱신 lab JSON 저장.
- 새 소스 체크포인트는 이 문서를 포함한 다음 커밋 (`git log -1`). 해당 push에서 전체 6개 suite를 다시 실행해야 함. 7181346 CI를 최종 통과로 인용하지 말 것.
