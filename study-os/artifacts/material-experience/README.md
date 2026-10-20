# BKIT · The Material Experience

실행 중인 앱에서 캡처한 실제 화면입니다. 목업이나 생성 이미지를 포함하지 않습니다.

- [9개 테마 비교 갤러리](index.html)
- iPhone 화면: 390px CSS 너비, 기기 배율 3.
- 기본 폴더는 Chromium, `webkit/` 폴더는 Playwright WebKit입니다.
- WebKit 확인은 실제 iPhone 하드웨어의 Safari·센서 검증을 대체하지 않습니다.

| 재질 | 실제 홈 화면 | 표현 |
| --- | --- | --- |
| Classic Light | [보기](home-classic-iphone.png) | 종이 가장자리, 인쇄물 비례, 세이지 |
| Forest Dark | [보기](home-forest-iphone.png) | 숲의 다층 명암, 벨벳 질감 |
| Liquid Glass | [보기](home-glass-iphone.png) | 두꺼운 테두리, 내부 반사, 선택적 광학 처리 |
| Peach Flow | [보기](home-peach-iphone.png) | 따뜻한 세라믹, 새틴 광택 |
| Diamond | [보기](home-diamond-iphone.png) | 정밀한 면 분할, 얇은 분광 경계 |
| Champagne Gold | [보기](home-gold-iphone.png) | 방향성 금속 반사, 선삭·브러시 결 |
| Soft Jelly | [보기](home-jelly-iphone.png) | 부드러운 내부 음영, 비대칭 스프링 반응 |
| Living Droplets | [보기](home-droplets-iphone.png) | 메니스커스, 표면 장력, 분리·접촉 반응 |
| Night Sprint | [보기](home-night-iphone.png) | 정밀 계기판, 네이비·샴페인 포인트 |

변경 범위: 재질 엔진, 쇼룸, 홈, 타이머, 공통 내비게이션·입력·메뉴·모달,
AI ZONE 및 TOHEŞAR GARAGE/DRIVE의 표면. 저장 키·학습 스키마·보상 계산은 유지합니다.

새 애니메이션 의존성은 추가하지 않았습니다. 스프링·센서 필터·CSS 소재는 독자 구현이며,
기존 React(MIT), Lucide(ISC), DM Sans(SIL OFL 1.1)를 사용합니다.

검증 스크립트: `node scripts/material-capture.mjs` (로컬 앱 필요).
선택 환경 변수: `MATERIAL_BASE_URL`, `MATERIAL_ENGINE=chromium`,
`MATERIAL_CAPTURE_DIR`, `MATERIAL_SEED`(검증 전용 스냅샷), `MATERIAL_THEMES`(쉼표 구분).
실제 사용자 저장소에는 실행하지 마세요. 스크립트는 별도 브라우저 컨텍스트를 만듭니다.

확인 결과: 타입 검사·프로덕션 빌드 통과. Chromium에서 9개 테마 적용·재접속 유지 및
가로 넘침 없음을 확인했고, WebKit에서 glass/jelly/droplets의 적용·재접속·기존 과제와
학습 세션 보존을 확인했습니다. WebKit의 젤리 눌림·복원과 타이머 진행·집중 시 장식
중지/일시정지 후 복귀는 `webkit/interaction.json`에 기록했습니다.

`webkit/smoke.json`에는 로컬 주소에서 기존 `bkit-api.vercel.app/api/config`에 접근할 때
발생한 CORS 오류도 원문 그대로 남겼습니다. 해당 백엔드는 수정하지 않았습니다.
프런트엔드 재질·로컬 학습 흐름과 구분되는 연결 제한입니다.
Vercel 기존 preview 프로젝트는 팀 접근 권한 403으로 새 배포를 만들지 못했습니다.
