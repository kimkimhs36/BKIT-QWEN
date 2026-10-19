# BKIT 3.5 검증 결과

## 검증 대상·보존

- 최종 소스: `a7ff941335b0c6ea54d384371fac2e69fef19637`
- 개발 브랜치: `feat/bkit-3-5-product-perfection`
- PR: https://github.com/kimkimhs36/BKIT-QWEN/pull/15
- 최종 소스 CI: https://github.com/kimkimhs36/BKIT-QWEN/actions/runs/39254199212
- 운영 기준/추가 원격 checkpoint: `checkpoint/pre-bkit-3-5-development-20261019` → `9be351a899cce55e96ad5d2af48354343c728fff`
- 운영 배포 없음. main·기존 release/PR 수정 없음. `/mock-rescue/`, `/exam-lab/` 공개 HTTP 200 확인.

## 자동 검증

| 항목 | 결과 |
| --- | --- |
| TypeScript strict (`npm run typecheck`) | 로컬 통과; tests/server 포함 |
| 단위 (`npm test`) | 27 파일, 173 테스트 통과. 기존 163개에서 10개 추가 |
| production build | 통과; Node 24.19.0 로컬, CI Node 22 |
| 신규 흐름+quick timer 로컬 최종 | iPhone Chromium/iPad WebKit 18/18 통과 |
| 전체 E2E 6 프로필 | 총 546개, 최종 a7ff941 CI 재검증 중. 이전 CI의 320px 겹침 수정 후 기존 테스트 로컬 6/6 통과 |
| 정적 스타일 | ESLint 설정 없음. `format:check` 기존 포함 80개 파일 문제; 기능 제거·전면 포맷으로 숨기지 않음 |
| 접근성 | 신규 timer 범위 axe WCAG2/2.1/2.2 태그 검사와 회전·조작 확인. 전체 WCAG 인증 아님 |

회귀 실행은 모든 기존 28개 E2E spec을 대상으로 한다. Chromium iPhone/iPad/desktop/Galaxy CSS와 WebKit iPhone/iPad. Galaxy는 1280×800 CSS @2x로 2560×1600 물리 화면을 모의하며 실제 S Pen 검증이 아니다.

로컬 WebKit은 root 설치 권한이 없어 Debian 라이브러리를 사용자 디렉터리에 추출했다. 브라우저 wrapper의 sys/lib에 필요한 파일을 추가했고, ldconfig 정적 사전검사만 `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`로 생략했다. 브라우저 자체와 테스트 assertion은 그대로 실행했다. CI는 기본 `playwright install --with-deps`로 독립 검증한다.

생산 의존성 `npm audit --omit=dev`: registry 기준 알려진 advisory 0건 (코드·인증·전체 공급망 안전성 보증이 아님).

초기 실패와 처리:

- 기준 3.4 TS2741 재현 → quickLabel 전달로 해결.
- 신규 worker unit의 callback `never` 타입 clean CI 오류 → 적절한 event 타입으로 수정.
- WebKit runtime 라이브러리 누락 → 위 로컬 환경 준비; 앱 결함과 구분.
- 동시 로컬 Playwright 두 실행의 기본 output 디렉터리 충돌 → 실행별 별도 output 디렉터리 사용. assertion은 수정하지 않음.
- quick timer pause/reload exact `02:05` 기대에 실시간 1초 진행 → 테스트 clock을 pauseAt으로 고정. 초 단위 검증 유지; 해당 iPad WebKit 3개 및 최종 18개 통과.
- 전체 CI가 320×740의 기존 home 버튼/dock 겹침을 발견 → 카드 여백만 수정, 기존 exact geometry·axe를 6개 프로필에서 통과. 새 소스로 전체 CI 재검증.
- JSON 신규 테스트를 이전 dist에 실행한 결과 restore input disabled 실패 → 최종 빌드 후 재실행 통과. 운영이나 소스를 통과시키기 위해 assertion을 낮추지 않음.

## 실험실 성능과 화면 비교

재현 스크립트: `study-os/scripts/measure-product.mjs`. 기준 `c0715d4`는 3.4의 TypeScript 오류만 수정한 비교 빌드다. 별도 preview 4174(기준)/4175(현재), Debian13 headless Chromium, 390×844, 격리된 cold browser context 3회씩, 네트워크/CPU throttling 없음, SW block, 빈 재방문 학습자. 다른 자동 검증이 같은 머신에서 실행 중이었다.

원시 값: [lab-metrics.json](validation/lab-metrics.json).

| 지표 | 기준 | 현재 | 해석 |
| --- | --- | --- | --- |
| lab LCP, 3회 범위 | 948–1284 ms | 700–924 ms | 편차 큼; 향상/회귀 효과를 단정하지 않음 |
| DOMContentLoaded 범위 | 411–472 ms | 337–429 ms | 로컬 서버·현재 리소스 조건의 관측 |
| CLS | 약 0.00000808 | 약 0.00000811 | 해당 첫 화면 관측만 해당 |
| 로딩 resource encoded 합계 | 365,530 B | 366,834 B | SW precache/전체 오프라인 자료 다운로드 제외 |
| 주요 App JS chunk | 270.06 kB / gzip 83.11 kB | 274.25 kB / gzip 84.34 kB | 기능 추가로 증가; 감소 주장 없음 |
| PDF.js lazy chunk | 365.12 kB / gzip 107.61 kB | 동일 | PDF 실제 로딩 지연·메모리 측정 아님 |

앞선 측정에서 current LCP 928–1616ms도 관찰했다. 반복 측정과 머신 부하의 차이이므로 이번 더 작은 범위를 속도 향상 효과로 부르지 않는다.

FCP/LCP는 headless compositing을 위해 screenshot 후 observer를 읽었다. 현장 75백분위 CWV나 실제 iPhone 수치가 아니다. INP, 장시간 메모리/프레임, 펜 지연, 느린 네트워크, 실제 PDF 대용량 성능은 측정하지 않았다.

화면 비교: `docs/validation/{baseline,current}-{narrow-320,iphone,ipad-landscape,galaxy,desktop}.png`. iPhone/iPad 이미지를 직접 검토했고 기존 세 개 주요 버튼이 새 timer로 밀리지 않는지 E2E로도 확인했다. 홈의 차분한 정보 계층을 유지했고 대규모 시각 재설계는 하지 않았다. 이력 편집·문제 연결의 효과는 첫 화면 screenshot만으로 평가하지 않는다.

## 남은 위험·검수

1. 실제 Safari/Pencil/S Pen 팜 리젝션·지연·OS 절전/강제 종료·키보드/주소창은 [기기 QA](BKIT-3-5-DEVICE-QA.md)대로 직접 검수.
2. 두 버전 PWA의 실제 waiting→닫기→activation 시나리오는 수동 검수. worker 단위는 install 중 강제 activation이 없는 것만 확인한다.
3. localStorage 낙관적 충돌 검사는 완전한 동시 원자 잠금이 아니다. 다른 탭 저장/변경은 차단·원본 내보내기로 보호하지만 정확히 동시 쓰기 경합은 후속 설계 필요.
4. 시스템 시각 역행, 10,000구간 이상, storage quota, 장기 offline eviction 등 극단 경계는 추가 검증 필요. 102구간을 초과한 새 세션은 구형 3.4 parser로 읽히지 않을 수 있으므로 향후 소스 rollback 시 외부 ZIP/원본 checkpoint를 유지해야 한다.
5. P1 중 classic 전체 이력 편집, 독립적인 문제별 풀이 시간, 더 정교한 개념 연결·학습 리포트는 미완료. 신규 AI 연결/개인화·멀티디바이스 원본 자동 sync는 활성화하지 않았다.
6. 미래 배포 전 최종 `APP_BASE=/` 빌드와 독립 페이지 보존·기존 데이터 fixture·rollback을 별도로 확인해야 한다. 이 PR의 통과는 배포 승인이나 완벽한 데이터 안전 보증이 아니다.
