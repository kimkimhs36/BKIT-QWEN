# BKIT 3.5 MASTER HANDOFF

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
