# BKIT STUDY OS 3.0 — 작업 중단 시점 보고

사용자의 즉시 마무리 요청으로 추가 개발과 배포를 중단하고 현재 결과를 보존합니다.

- 개발 브랜치: `feat/bkit-3-sleep-guard`
- 기준/복구 지점: `be8147a49a39256e9c57bfdf7f2b0ca9153c8981`, 원격 `checkpoint/pre-bkit-3-20261018`
- 중단 직전 검증 대상 커밋: `81e5602b715645dc6d1273919fa7b74d67abbf7b`
- 운영 사이트: https://teambkit.com — 기존 기준 버전 유지. 3.0 운영 배포/병합 없음.
- 원격 CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39153442543 — 실패, 원인 확인 및 재검증 필요.

## 구현된 기능

Sleep Guard의 별도 검증 스키마/저장 키, 요일별 취침·기상, 자정 경계, 60분 전 준비, 4개 수동 체크, 독립 IndexedDB 인증 사진, 야간 테마, 실제 취침·기상 수동 입력, 회고, 기록 삭제, 백업/원본 보존 복구, 켜기·끄기·오늘 건너뛰기·일시 중지, 선택적 전경 알림과 PWA/Screen Time 안내.

학습 종료 시 실제 문제 수와 남은 분량 연결, 수동 남은 단위 입력, 중복 세션 저장 방지, 메뉴 포커스 복귀, 모달 스크롤/포커스/배경 클릭 처리, 반응형 폼, visualViewport 키보드 대응, reduced-motion, 공유 디자인 토큰, 작은 로컬 풍경 사진과 개인 원본 교체, Sleep/JUGGERNAUT 지연 로딩, 폰트 서브셋 축소.

기존 학습 저장 키·사진 참조·Git 이력·API/서버 파일·비밀값은 유지했습니다. 외부 AI 호출, 유료 모델 호출, Vercel 재배포를 수행하지 않았습니다.

## 검증 결과 — 통과와 미완료 구분

- 기준 단위 테스트: 89/89 통과.
- 확장 단위 테스트: 98/98 통과. 18개 테스트 파일.
- TypeScript 및 프로덕션 빌드: 마지막 검증 대상 코드 통과. 초기 JS 약 506 kB / gzip 152 kB, 500 kB 번들 경고는 남음.
- 새 핵심 E2E 10개: 통합 실행에서 9개 통과, 실패했던 야간/집중 보존 시나리오는 수정 후 별도 실행 통과(1/1). **최종 10개 동시 전체 통과로 보고하지 않습니다.**
- 확인한 내용: 메뉴 10회, 과제 생성·수정·삭제, 사진 복원, 분량 차감 및 세션 보존, 수면 일정·자정·체크·사진·회고·삭제, 권한 거부·손상 원본 복구, 오프라인, 두 탭, 모의 알림 2회 제한, 키보드/핀치 확대 구분, 수면 화면 낮/야간 axe 및 320~1440 CSS 폭 겹침 검사.
- 전체 iPhone 회귀 61개 실행 중, 예전 UI 제목/등록 경로를 기대하는 `app.spec.ts`가 기준 브랜치부터 현재 화면과 불일치한 것을 확인. 시나리오를 유지하여 현재 UI 경로로 갱신 중이었고 **수정 후 전체 재실행은 미완료**.
- 원격 5환경 CI는 실패. API로 상태는 확인했으나 로그 다운로드 대상에 네트워크 프록시 403이 발생해 상세 로그를 확보하지 못함. 다음 실행부터 GitHub reporter가 오류를 annotations에 남기도록 설정함. 성공으로 간주하지 않음.
- 마지막 추가 변경: TODAY 제출 확인 안내/전체 완료 안내와 오래된 회귀 테스트 경로 갱신. **이 마지막 변경의 빌드·E2E 검증은 미완료**.

## 주요 수정 파일

`src/App.tsx`, `src/SleepGuard.tsx`, `src/sleep.ts`, `src/useSleepGuard.ts`, `src/sleepMedia.ts`, `src/SleepSummary.tsx`, `src/taskProgress.ts`, `src/useViewport.ts`, `src/LandscapeNote.tsx`, `src/TaskCheckIn.tsx`, `src/StudyAtelier.tsx`, `src/experience.css`, `src/sleep-guard.css`, `src/clarity.css`, `src/main.tsx`, `index.html`, manifest, Vite/Playwright 설정, 테스트와 GitHub Actions.

## 다음 작업

1. 마지막 변경의 `npm run typecheck`, `npm test`, `npm run build` 실행.
2. `app.spec.ts`의 갱신된 13개 회귀 시나리오를 검증하고 남은 선택자/실제 오류 수정. 테스트 삭제·skip 금지.
3. `npm run test:e2e -- --project=iphone` 61개와 5개 환경 CI를 재실행. GitHub reporter annotations에서 원격 실패 상세 확인.
4. 모두 통과하면 기존 소스 브랜치 `feat/study-os-visual-v2`로 정상 병합. 기존 publish workflow만 사용하며, GitHub Pages `main:/`와 live `release.json.sourceCommit`을 대조. force push/임의 main 변경 금지.

실제 iPhone/iPad Safari 소프트웨어 키보드·시간 선택·설치형 권한, Galaxy Tab S7 FE의 Samsung Internet/Chrome·S Pen·회전·DeX, Windows Chrome 확대/축소·알림은 실기기 확인이 필요합니다. 자동화는 삼성 실기기 검증을 대체하지 않습니다.

기본 풍경은 출처/라이선스를 기록한 실제 사진입니다. 별도로 제작한 BKIT 오리지널 사진은 포함하지 않았으며 개인 원본 사진으로 기기 내 교체할 수 있습니다. 백그라운드 예약 알림은 지원하지 않습니다. 사진 원본은 JSON 백업에 포함되지 않습니다.
