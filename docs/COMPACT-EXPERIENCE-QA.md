# Compact Experience — 검증 결과

구현 커밋: `ce5bfac9108887995277ab9e769b19e9733db280`

- TypeScript 및 루트/미리보기용 Vite 프로덕션 빌드 통과.
- 단위 테스트: 37개 파일, 223개 통과.
- iOS: WebKit iPhone 13, iPad Pro 11 세로·가로에서 고유 시나리오 30개 검증. 최종 변경 관련 재검증을 포함해 로컬 성공 실행 39회.
- 화면별 실제 렌더링 PNG 45개와 스크롤 측정값 보존.
- 0개 항목인 핵심 화면: 모든 기본 프로필에서 문서 높이가 화면 높이와 같고 가로 넘침 없음.
- 키보드 모의 높이 360px에서 모달 전체가 표시 영역 안에 위치하며 하단 메뉴 숨김 확인.
- 9개 테마 즉시 적용, 기존 테마 존중, 새로고침 유지, 센서 권한·거부·절전 처리 확인.
- 공부 중 테마 변경·화면 이동·새로고침 후 타이머 유지, 일시정지·재개·종료 저장 확인.
- 과제·제출 상태, PDF 원본 바이트, 필기 구조, 첨부 및 기존 공부 기록 보존 확인.
- iPad의 검은 사선은 mediump 픽셀 해시 오버플로를 수정. 25개 지점의 배경 색상과 터치 후 유효 렌더링 검증.
- 미리보기와 운영 서비스 워커가 서로의 캐시를 삭제하지 않는 단위 검증 포함.

[화면 갤러리](../artifacts/compact-experience/index.html) · [측정 및 결과 JSON](../artifacts/compact-experience/results.json) · [GitHub CI](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39465448500)

실제 WebKit 엔진의 모바일 프로필을 사용했습니다. 물리 iPhone/iPad, 실제 자이로 값 및 OS 소프트웨어 키보드는 자동 테스트에서 직접 조작할 수 없으므로 센서 이벤트와 visual viewport 변화를 모의했습니다. Android·PC 추가 검증은 사용자의 iPhone/iPad 우선 지시에 따라 보류했습니다.

## 변경 파일

- 화면: `App.tsx`, `PremiumHome.tsx`, `QuickStudyTimer.tsx`, `MoreHub.tsx`, `RecordOverview.tsx`, `StudyRhythm.tsx`
- 테마·반응: `MaterialSettings.tsx`, `MaterialEffects.tsx`, `SurrealLiquid.tsx`, `liquidWorld.ts`, `compact-atmosphere.css`, `compact-first-screen.css`
- 모바일·접근: `Modal.tsx`, `useViewport.ts`, `index.html`, `main.tsx`, 자체 호스팅 Pretendard 및 OFL
- 보존·검증: `public/sw.js`, `vite.config.ts`, `serviceWorker.test.ts`, `compact-experience.spec.ts`, `verify-live-compact.ts`, iOS CI 워크플로, 구현·검증 문서와 스크린샷
