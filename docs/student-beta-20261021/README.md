# BKIT 3.9 Student Beta · 구현 및 검증 기록

프런트엔드 미리보기: https://bkit-study-os-36-preview-r4i1til75-teambkit.vercel.app

구현 커밋: `ad2aeeb16cc81b912e6ac6c7b43c472f496fe228` · 브랜치: `feat/bkit-39-student-beta-20261021`
API 수정 커밋: `9d8e542ed07d7b8f689719a7cc1af218e0b89db6` · 브랜치: `fix/bkit-api-diagnostics-20261021` · 검토 초안: https://github.com/kimkimhs36/BKIT-QWEN/pull/21

## 실제 변경

- 홈의 공부 시작 버튼을 유지하고 과제/수행평가를 작은 두 액션으로 구분했다. 남은 항목 수에는 학습 완료 후 제출 확인이 필요한 항목도 포함된다. 바로가기는 같은 과제 저장소의 해당 유형을 선택하며, 추가 화면에도 선택이 이어진다.
- 빠른 등록 화면에 직접 입력/사진 촬영/갤러리 선택을 통합했다. `capture=environment` 입력과 일반 이미지 입력을 구분하고, 사용자의 탭 안에서 네이티브 선택기를 연다. 취소하면 작성 상태를 유지한다.
- 사진 원본을 기존 IndexedDB에 먼저 보관한 다음, 기존 로컬 OCR을 필요할 때 로딩한다. 선택 후 검토 화면이 바로 열리고, 추출 결과는 편집/확인 후에만 과제 입력으로 가져온다. 원문은 메모에 보관하며 사진과 OCR 자료가 상세 입력에도 이어진다. OCR 실패 중에도 사진 첨부와 직접 저장이 가능하다.
- 톱니바퀴와 ‘설정’ 레이블을 추가했다. 닫기 동작과 설정 내 테마 항목, 로고를 통한 테마 접근, 도움말, 5개 기본 내비게이션을 보존했다.
- Google 팝업 성공 후 `/api/auth-check`의 긍정 응답을 받아야 AI 권한이 연결된 것으로 표시한다. 일반 사용자에게 개발자 본인 전용임을 표시하고 무료 OCR/수동 등록을 안내한다.
- API 수정본은 예산/호출 초과 429, 모델 응답 오류 502, 모델 시간 초과 504, 구성·장부 장애 503을 구분한다. 알려진 공개 메시지만 반환하여 내부 전송 오류가 응답에 섞이지 않도록 했다. 개인 인증, CORS 허용 범위, Redis 원자적 예약과 비용 한도를 유지했다.

## 기존 구현 통합과 디자인

`main@0f63f235055b`는 GitHub Pages 배포 산출물이며 Vite 원본 브랜치가 아니다. `feat/bkit-compact-experience-20261021@a193cae`의 후속인 `feat/bkit-product-recovery-20261021@9d49ed0`를 기반으로 작업했다. 해당 복구 브랜치에 이미 있던 통합 달력, 일/주/월/연도/여러 해 보기, 확장 표면 전환과 스와이프 닫기, 반복 일정의 날짜별 변경·휴강·보충, 충돌 미리보기와 사용자 승인 후 재계획을 재사용했다. 이번 변경으로 새로 개발했다고 계산하지 않는다.

안정성 브랜치의 최신 3개 커밋 `be66a22`, `d69d6e5`, `597ddb9`를 통합했다. 타이머 시계 변화 보정, 단일 쓰기 잠금, 저장 실패 보호, 백업 타이머 일시정지 복원, 지연된 클라우드 응답 차단, IndexedDB/PDF 실패 정리가 포함된다. 저장 키와 데이터 버전 1을 유지하며 자동 데이터 삭제나 초기화는 하지 않았다.

진주빛 표면, 절제된 피치 배경, 기존 보라색 Jelly 애니메이션과 9개 팔레트를 보존했다. 학교 바로가기는 큰 설명 카드 대신 한 줄 액션으로 배치했다. 등록 시트는 읽기 표면을 불투명하게 만들고 입력/저장 버튼의 대비와 모서리, 네이티브 상세 펼침 표시를 정돈했다.

실제 WebKit 렌더링에서 정지한 비보존 WebGL 캔버스가 어두운 표면으로 남는 문제를 확인했다. 모션 축소·저전력·보호 학습·느린 프레임의 정적 경로는 캔버스를 숨기고 CSS 분위기 배경을 사용한다. 일반 상태의 재질 반응과 보라색 테마 물리는 유지한다. 불필요한 헤더 블러도 제거했다.

## 배포와 API 진단

| 단계 | 확인한 결과 |
| --- | --- |
| GitHub 운영 코드 | main `0f63f235055b`, API 배포 브랜치 `95d7a4f0737d` 유지 |
| 운영 웹사이트 | teambkit.com HTTP 200, GitHub Pages `main:/`; 최종 재확인 HTML이 main과 바이트 단위로 같음 |
| www | apex 도메인으로 리다이렉트됨 |
| 프런트엔드 API 주소 | 실제 운영 번들이 `https://bkit-api.vercel.app` 사용 |
| 운영 API 배포 | Vercel bkit-api, Express, 기존 커밋 READY |
| 운영 health/config | 실제 JSON 200; 인증·예산 구성됨, briefing 활성, plan/coach/assistant 비활성 |
| 운영 CORS | teambkit.com POST/PUT 사전 요청 204; 외부/미리보기 출처 403 |
| 인증 | 토큰 없음·잘못된 토큰 401; 실제 본인 Google 세션은 제공되지 않아 미검증 |
| DeepSeek 계약 | 현재 공식 문서의 deepseek-flash, chat/completions, JSON 출력, thinking disabled와 일치 |
| Redis | 환경 이름·대상 범위 확인, 합성 응답과 로컬 HTTP 서버로 원자적 예약·상한·실패 차단 검증; 운영 장부 예약 자체는 미검증 |
| 유료 모델 | 호출하지 않음. 예약 한도나 결제·자동 충전을 변경하지 않음 |
| 최종 프런트 미리보기 | Vercel Vite READY, ad2aeeb, 실제 HTTP 200 및 아래 실사용 흐름 통과 |
| API 수정 미리보기 | https://bkit-as6qm0t1g-teambkit.vercel.app · READY, 9d8e542, 기존 Vercel 보호 유지 |
| API 미리보기 실제 접근 | 인증 보호 화면으로 이동. 팀 접근 권한 부족으로 커넥터 보호 접근도 403; READY를 실제 API JSON 성공으로 계산하지 않음 |
| 관리 권한 | 기본 프로젝트/배포 및 환경 이름 읽기는 가능하나 명시적 teambkit 범위·빌드 로그·보호된 API 접근은 403. Vercel 연결에 팀 권한 부여가 필요 |

프런트 미리보기는 `study-os` 원본 루트, `npm ci`, `APP_BASE=/ npm run build`, `dist`를 명시하여 생성했다. 운영 Pages 경로, Vercel 프로젝트의 생산 브랜치, DNS/alias, 소유권, 보호 설정, 환경 변수 값과 비용 설정을 변경하지 않았다. 운영 배포는 별도 승인 대상이다.

미리보기 주소는 운영 API의 CORS 허용 출처가 아니다. 설정에서 개인 클라우드를 준비하면 WebKit에 CORS 진단이 나타나는 것을 실제로 관찰했다. 로컬 등록·OCR·타이머·테마 저장은 계속 성공했다. 이를 AI 성공이나 무료 공개 AI로 표시하지 않는다. 운영 도메인에서 Google OAuth 승인을 받은 실제 본인 세션으로 최종 AI 추론과 장부 적용을 확인해야 한다.

## 검증

- 최종 원본의 TypeScript/Vite 빌드 및 프런트 단위 테스트 253개/43파일 통과. 기존 큰 번들 경고는 보존했다.
- API 브랜치의 자체 잠금 의존성으로 테스트 100개/16파일과 TypeScript 통과. 실제 로컬 HTTP 서버를 사용하며 Google/Redis/모델 응답은 합성이다.
- 첫 통합 CI: 108개 브라우저 시나리오 통과, https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39630546572 .
- 최종 원본 CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39632583129 . 최종 결과는 verification/ci-final.json에 기록한다. iPhone WebKit, iPad 세로/가로 WebKit, Chromium 데스크톱에서 기기별 27개 시나리오와 일반 모션의 9개 테마 회귀를 실행한다.
- 최종 배포에서 iPhone/iPad 가로 WebKit으로 실제 OCR, 수행평가 유형 유지, 확인 후 저장, 10월 22일 달력 반영, 사진 원본 SHA-256 일치, 65초 공부 기록의 단일 저장·새로고침, Jelly 테마 유지와 가로 넘침 없음 확인. 원본 사진이나 공지는 외부 AI에 보내지 않았다. `live-preview.json`에는 의도된 개인 API CORS 진단도 기록했다.
- 로컬 추가 확인: 네이티브 선택기 실행/빈 선택, OCR 도구 차단 후 수동 저장, 사진 원본 보존, 중복 저장 방지, 제출과 학습 완료 구분, 과제 편집·삭제, 일정 예외/보충·승인 재계획, 저장 실패 입력 유지, 키보드 크기 뷰포트, 320px/회전, 캘린더 접근성 검사.
- 초기 로컬 실행의 잘못된 완료 과제 픽스처(remaining=0)와 틀린 OCR 차단 경로로 2개 새 테스트가 실패했다. 올바른 스키마/실제 경로로 수정한 재실행은 통과했다. 기존 테스트는 제거하지 않았다. 중간 디자인 커밋의 CI는 최종 커밋 실행으로 대체되어 취소됐으며 통과 수에 포함하지 않는다.

실물 iPhone/iPad의 카메라·사진 접근 OS 화면, 실제 Safari 키보드와 Apple Pencil/프레임 품질은 테스트하지 않았다. WebKit 기기 에뮬레이션을 실물 기기 검증으로 부르지 않는다. 실제 학생 대상 발견성 시간 측정과 열품타 직접 비교도 수행하지 않았다.

같은 iPhone 13 Chromium·빈 데이터·모션 축소 조건에서 복구 버전 9d49ed0과 이번 원본을 비교했다. 홈의 공통 등록 버튼에서 갤러리 선택기를 여는 앱 내부 탭은 3→2회였다. OS 선택기·타이핑·OCR 처리 시간은 제외한다. 공부 시작은 기존과 동일하게 1탭이다. 수행평가 바로가기는 해당 유형을 선택한 목록을 1탭으로 연다. 사람의 실제 등록 시간이나 경쟁 앱 대비 우위로 일반화하지 않는다.

## 주요 파일

| 파일 | 사용자 동작 |
| --- | --- |
| study-os/src/PremiumHome.tsx, App.tsx | 구분된 학교 바로가기, 유형 목록과 추가 연계, 설정 레이블 |
| QuickCapture.tsx, TaskMaterials.tsx, PhotoText.tsx | 카메라/갤러리 직접 호출, 원본 보관, 자동 로컬 OCR 검토와 수동 대안 |
| BriefingAI.tsx, privateAuth.ts, ApiReadinessPanel.tsx | 서버 권한 확인 후 연결 표시, 개인 전용 상태 안내 |
| recovery.css, themes/SurrealLiquid.tsx | 표면·등록 시트·모션 정적 경로 정돈 |
| tests/e2e/student-beta.spec.ts, verify-bkit-student-beta.yml | 기기별 등록·OCR·기록 보호 검증 |
| 별도 API 브랜치 server/privateApi.ts, redisBudget.ts, apiFailure.ts | 오류 분류와 안전한 응답 |

스크린샷은 screenshots/의 합성 데이터이며 실제 학생 기록이나 기본 샘플 데이터가 아니다. 미리보기는 별도 origin이므로 teambkit.com의 기존 로컬 기록을 자동으로 공유하지 않는다. 기존 기기 기록을 옮길 때는 기존 전체 ZIP 백업/복원을 사용한다.
