# 검증 · 배포 기록

## 소스와 보존 기준

- 기준 운영 소스: `9777ddc4bcb504b6fc24daea4ab5f38f43c12afa`.
- 검증 소스: `bb79f409bd536bd9196a2f4e61532af728620c72`.
- 브랜치: `feat/bkit-material-world-awake-20261023`, [PR #29](https://github.com/kimkimhs36/BKIT-QWEN/pull/29).
- [최종 CI](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40090542880).
- [Preview](https://teambkit.com/previews/bkit-material-world-20261023/).
- 기준 main 체크포인트: `a9b6295948653a590cda8c4a2e1f3adf08096b4c`, 원격 `checkpoint/pre-material-world-20261023`.
- PR #26, #27은 병합하지 않았습니다. 홈 구조, 카드 순서, 내비게이션, 5분 공부 진입 위치를 유지했습니다. 과제·기록·시간표·PDF·GARAGE·AI 저장 키와 스키마를 바꾸지 않았습니다.

## 자동 검증

`npm ci`, `npm run typecheck`, `npm test`, `APP_BASE=/ npm run build`, `node scripts/check-local-vision.mjs`를 실행했습니다. 단위 테스트는 **41개 파일, 262개**입니다.

중간 실행 `6649c1d`에서 iPhone 35개가 통과했고 PC는 34개 통과 후 기존 센서 검사의 입력 전달 타이밍으로 1개가 실패했습니다. iPad는 패키지 다운로드가 10분 제한을 넘겨 브라우저 검사 전에 중단됐습니다. 기존 센서 검사에 지속 샘플 공급을 적용하고 CI를 Ubuntu 24.04로 고정한 뒤, 제품 코드를 바꾸지 않고 전체를 다시 실행하여 최종 105개가 모두 통과했습니다.

최종 CI는 **2026-10-24 성공**, 프로필마다 35개씩 **105/105 통과**, 단위 테스트 **262/262 통과**입니다. 최종 실행에 건너뛴 검사나 Playwright 재시도는 없습니다. Chromium PC, Linux WebKit iPhone 13, Linux WebKit iPad Pro 11 프로필입니다. **WebKit 프로필은 실제 iPhone/iPad가 아닙니다.**

| 범위 | 프로필당 시나리오 | 확인 내용 |
|---|---:|---|
| 기존 Compact Experience | 10 | 카드 배치, 메뉴, 과제, 학습 자료·PDF, 기록, 설정, 백업 |
| 기존 학습·복구 | 9 | 5분·자유·과제 공부, 초안, 이어하기, 새로고침, 타이머·백업 |
| 오프라인 셸 | 1 | 네트워크 없는 공부 진입, 선택적 카메라 UI 실패 격리 |
| 9개 재질·센서 | 11 | 홈·집중·과제·기록·설정·선택기, 회전·복구·절전·모션 감소, 모의 센서 |
| Awake Assist | 4 | 명시적 시작, 보정, 반복 신호·휴식, 실제 MediaStream 트랙 종료, 실패·페이지 이탈 |

인공 신호/의존성 주입 단위 테스트는 정상 깜빡임, 1초 감김, 긴 감김 1회, 반복 감김, 한쪽 눈, 얼굴 없음·가림·낮은 신뢰도, 필기·고개 숙임, 지연·중복·역행 타임스탬프, cooldown, OFF·재시작, 저전력, 모델 실패·권한 거부·정지 프레임·늦게 도착하는 리소스를 포함합니다. 테스트 데이터는 인공 신호와 브라우저 생성 영상입니다. 실제 사람 동영상이나 사용자 얼굴 자료를 수집하지 않았습니다.

최종 CI 이전 실행에서 발견한 3개 실패는 숨기지 않습니다. 105개 중 102개가 통과했고, 짧은 터치 효과를 캡처하기 전 사라짐, WebKit 센서 시나리오의 전체 30초 제한, 저장 진단 결과의 5초 대기 제한이 있었습니다. 실제 애니메이션을 25% 시점에 고정하여 계산된 불투명도·크기와 화면을 검사하고, 느린 브라우저의 명시적 대기 시간을 조정했습니다. 기능 동작 조건은 완화하지 않았습니다. 추가 숨김 검사는 이벤트 리스너 해제 전 대기 이벤트가 수신 상태를 되살릴 수 있는 경쟁 상태를 발견했습니다. 비활성/숨김 입력을 즉시 차단하고 같은 이벤트 작업에서 숨김→표시→센서 입력을 보내는 회귀 검사를 추가했습니다. WebKit 부하 검사에서 중립 보정 후 남은 운동량도 발견하여, 보정 시 입력과 속도를 함께 0으로 초기화했습니다. 시각 검사에서 설정의 기존 flex 규칙이 진단 미리보기를 0폭으로 줄이는 문제도 수정했습니다. 센서 제목 행에만 flex를 적용하고 실제 82×64px 미리보기와 광점의 이동을 검사합니다. 최종 SHA로 전체를 다시 실행하여 105개가 통과했습니다.

## 시각·입력 검증

`before/`는 실제 이전 운영 페이지, `verified/`는 최종 CI의 브라우저 렌더링입니다. 터치/기울기 영상과 일부 실모델 검사는 제품 구현 커밋 `6649c1d`에서 기록했습니다. 배포 후보 `bb79f40`과 전체 제품 파일을 비교하여 `build-info.json` 외 모든 파일이 바이트 단위로 같음을 확인했습니다 (`verification/render-build-equivalence.json`). [비교 갤러리](index.html)와 [터치·모의 기울기 MP4](demo/nine-materials-touch-and-simulated-tilt.mp4)를 제공합니다.

Diamond의 각진 결정면·속이 빈 프리즘 테두리와 Glass의 매끄러운 광학 표면을 구별했습니다. 장식은 텍스트 가장자리 밖에 집중하며 글자와 조작 위치를 기울이지 않습니다. Gold는 브러시 방향, Jelly는 국소 스프링, Droplets는 동심원, Peach는 낮은 속도의 새틴 흐름으로 반응합니다. 작은 한글 본문은 로컬 Pretendard를 유지합니다.

불투명한 주요 버튼의 gradient stop과 실제 계산된 글자색의 최저 대비는 Classic 5.98, Forest 8.09, Glass 4.57, Peach 4.75, Diamond 4.97, Gold 5.19, Jelly 5.03, Droplets 5.13, Night 6.75입니다. 알파 질감·블러 전체의 수학적 대비 인증을 의미하지 않으며 실제 화면을 별도로 검토했습니다. 이전 검사에서 Peach/Gold/Jelly/Droplets의 낮은 대비를 발견해 수정했습니다. `verification/control-contrast-*.json`에 남깁니다.

실제 렌더링 폰트 조사에서 한글·영문·숫자 18개 글리프가 9개 테마 모두 Pretendard Variable을 사용했습니다. 테마별 제목 웨이트·자간과 숫자 인상을 바꾸고 새 폰트 다운로드는 추가하지 않았습니다.

실제 WebKit 진단 녹화에서는 화면 각도 90도에 맞춰 광점이 세로로 이동했습니다 (82px 너비, top 21.69→17.48→24.81→20.41px). `diagnostics/result.json`에 입력/위치를 기록합니다.

센서 권한 요청은 탭 전에 0회, 거부 시 거부, 승인 후 이벤트가 없으면 대기, 유효 입력 이후만 수신·반응 상태입니다. 중립 보정·회전·입력 정지·OFF·절전·모션 감소와 숨김 이후 자동 재연결 금지를 브라우저에서 검증합니다. 모든 센서 이벤트는 **주입한 모의 입력**입니다. 실기기 연결 완료를 주장하지 않습니다.

## 카메라 · 개인정보

`camera-preview/result.json`은 실제 MediaPipe CPU/WASM 모델을 Chromium 생성 카메라에 연결한 검사입니다. 모델은 시작 전 요청하지 않고, 시작 후 같은 출처에서 GET으로 받습니다. POST 등 영상/사용 로그 전송 요청이 없는지 기록하고 종료 후 모든 실제 MediaStream 트랙이 `ended`인지 검사합니다. 사람의 얼굴이 없는 생성 영상은 관찰 불가가 맞는 결과입니다.

`preview-public/visibility-and-fonts.json`은 같은 실제 모델/생성 카메라를 켠 후 숨김 이벤트를 주입하여 트랙 종료와 다시 보일 때 자동 재시작하지 않음을 확인합니다. 합성 blendshape UI 검사는 별도로 `awake-ui/*-simulation.png`에 표시합니다. 이 검사들은 실제 iOS 카메라나 졸음 정확도의 증거가 아닙니다.

기존 MediaPipe 패키지의 기본 Google 사용 로그를 실제 네트워크 검사에서 발견했습니다. 고정 버전의 로그 초기화 한 곳을 제거하고 출력 번들·네트워크에서 부재를 확인합니다. 얼굴 데이터 저장·전송 기능은 추가하지 않았습니다. [구현 설명](IMPLEMENTATION.md)에 상태 머신과 오탐 방지·성능 정책을 기록합니다.

## 운영 전환과 데이터

- 운영: **https://teambkit.com**.
- 실제 배포 릴리스: `849119f8b1474c219bd491986e0e0c77c8010109`.
- 제품 빌드 자산 커밋: `55d1fbcd53b60716f8900b48847d5f2f152c83d8`.
- 제품 소스: `bb79f409bd536bd9196a2f4e61532af728620c72`.
- [Pages 배포 성공](https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/40091771970).
- 롤백 체크포인트: `c183ce0bceef9072720dc4eca6c1dc02e643c240`; 이전 release.json은 `/releases/20261023-before-material-world.json`에 보존했습니다.

배포 후 공개 파일 **271개**의 SHA-256이 검증 빌드와 일치했고 404는 **0개**였습니다. 기존 해시 자산·독립 페이지 **716개**의 파일이 그대로이며, 이전 엔트리 자산도 실제 HTTP로 가져올 수 있습니다. CNAME, exam-lab, mock-rescue, 독립 HTML과 기존 SW 활성화 대기 정책을 유지했습니다. main 최신 HEAD를 확인한 뒤 정상 fast-forward로 배포했으며 강제 덮어쓰기를 하지 않았습니다 (`verification/production-assets.json`).

공개 운영 주소에서 테마 9개 전환, 새로고침, 5분 공부 시작, 설정과 Awake 기본 OFF 진입이 통과했습니다 (`production-public/result.json`). 실제 MediaPipe CPU/WASM과 Chromium 생성 카메라로 모델 요청·추론·즉시 종료를 검사했고 모든 영상 트랙이 ended, 외부 POST 없음, 페이지 오류 없음이었습니다 (`production-camera/result.json`). 숨김 이벤트를 주입한 실제 스트림 종료와 자동 재시작 금지도 다시 확인했습니다 (`production-public/visibility-and-fonts.json`).

이전 운영 소스 `9777ddc`에서 만든 같은 영속 Chromium 프로필을 사용했습니다. 새 Preview 엔트리 `/previews/bkit-material-world-20261023/assets/index-B9En6lpT.js`와 실제 운영 엔트리 `/assets/index-ueiII1hm.js`가 로드됐는지 확인한 뒤 원본과 비교했습니다. 과제·수행평가 2개, 시간표, 공부 기록, 자료·문제 답안 초안과 IndexedDB 사진 원본 바이트가 동일했습니다. 검증용 릴리스 메타데이터는 기존 SW의 JSON 캐시와 구별하도록 고유 GET 쿼리로 조회했습니다. 사용자의 개인 브라우저 저장소에는 접근하지 않았습니다 (`verification/preview-before-upgrade.json`, `preview-after-upgrade.json`, `production-after-upgrade.json`).

영속 Chromium 프로필을 실제 오프라인으로 다시 열고 새로고침해 새 엔트리와 기존 데이터가 유지됨을 확인했습니다 (`verification/production-pwa-offline.json`). 설치된 실제 iOS PWA 검증과 구별합니다. 후속 커밋은 검증 기록과 보고서만 추가하며 제품 자산은 위 소스/자산 커밋으로 고정합니다.

## 추가 실기기 확인

실제 iPhone/iPad에서 Safari 권한 UI, 지속 센서값·보정·화면 회전, 실제 얼굴·안경·필기·가림·조명/역광, 카메라와 테마 동시 부하·발열·배터리, 진동·오디오, Pencil PDF 필기, 설치 PWA의 종료/재실행·오프라인 업데이트를 확인해야 합니다. 의학적 수면 진단이나 검증되지 않은 감지 정확도를 주장하지 않습니다. 카메라 없이 모든 기존 공부 기능을 사용할 수 있습니다.
