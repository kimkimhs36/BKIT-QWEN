# BKIT 3.5 감사·검증 기록

## 조사 기준

2026-10-19 GitHub 재조회: main `9be351a`, 3.3 release `577d755`, 3.4 release `efdaa79`, 3.4 feature `a5a1b51`. PR #11은 OPEN, 최신 3.4 CI 실패. `/release.json`은 3.3 소스 릴리스를 표시하며 main에는 이후 EXAM LAB 독립 변경이 포함된다. main과 소스 브랜치를 혼동하지 않는다. 기존 3.2/3.3 PR #9/#10 및 운영 체크포인트도 확인했다.

검증 대상은 별도 개발 브랜치다. 운영 개인 localStorage/IndexedDB는 접근하지 않았다. 운영 `/`, `/mock-rescue/`, `/exam-lab/`은 공개 응답만 확인하고 변경하지 않는다.

## 결함 및 변경

| ID | 심각도 | 기존 문제 | 변경·사용자 변화 | 검증 |
| --- | --- | --- | --- | --- |
| B35-01 | P0 | NowFocus 필수 quickLabel 누락으로 clean typecheck TS2741 | 현재 모드 이름 전달. 3.4 자산 빌드 가능 | TypeScript/전체 빌드 |
| B35-02 | P0 | ZIP replace/merge 보호가 active만 검사, quickTimer는 교체될 수 있음 | 실행/일시정지 quick timer 종료 전 복원 차단. export는 계속 가능 | merge/replace 무변경 단위, 기존 ZIP E2E |
| B35-03 | P0 | 102번째 pause 이후 구간 max로 종료 저장 실패 가능 | quick/active/session 구간 10,000개까지 보존, quick resume 한도 가드. 한도 실패는 live state 유지 | 110구간·자정 분배 단위 |
| B35-04 | P0 | SW skipWaiting+구 캐시 삭제로 열려 있던 화면의 PDF/필기 lazy chunk가 사라질 위험 | 기본 waiting lifecycle, 모든 기존 탭 종료 후 activation. 강제 reload 대신 저장 확인 안내 | worker install 단위; 실제 두 버전 PWA 업데이트는 수동 검수 |
| B35-05 | P1 | quick study 중 자료 열기를 종료 안내로 막음 | 같은 ID·시작·구간·pause 상태로 자료 학습실 진입. quick 자료 학습 종료 즉시 시간/실제 확인 문제 수 저장 | 모델 단위+신규 E2E |
| B35-06 | P1 | 가장 최근 quick session만 정리 가능 | 최근 50개 이력의 quick session 각각 수정. duration/답안 불변 | older/newer 회귀, reload E2E |
| B35-07 | P1 | 정리 폼에 미완료 과제만 있어 완료 과제 연결이 해제될 수 있음; 사용자 과목 option 부재 | 완료 과제와 기존 사용자 과목 유지, 삭제 과제도 기존 연결 표시/보존 | 편집 단위 및 사용자 과목 E2E |
| B35-08 | P1 | 정리 폼의 미저장 초안이 다른 화면 이동으로 사라짐 | 기존 draft flush guard와 beforeunload 연동. 성공 전 이동 차단, 저장 실패 입력 유지 | 실패 주입·재시도·이동 E2E |
| B35-09 | P1 | 5,000 session 한도 도달 때 끝내기 무반응 | 한도 안내와 살아 있는 timer 보존 | capacity 단위 |
| B35-10 | P2 | 작은 shortcut/일부 조작 버튼, countdown 도달 상태 알림 부재 | 44px 터치 목표, focus-visible, 상태 메시지 | viewport·회전·axe scoped 검사 |

| B35-11 | P0 | legacy JSON 가져오기에서 실행 타이머 덮어쓰기·보관 기간의 자동 시간 누적 위험 | UI/commit 경계 차단, export 일시정지 snapshot, legacy import 저장 시간만 일시정지 | storage 단위·JSON E2E |
| B35-12 | P2 | header/title/PWA 이름이 3.2에 머물러 현재 버전 구분 어려움 | 개발 소스 package 3.5.0-dev와 표시 3.5, 백업 형식 호환 버전은 그대로 유지 | 빌드·화면 비교 |

이는 고유 결함/개선 12건의 분류이며, 동일 변경을 여러 번 센 숫자가 아니다. 10,000구간을 넘는 극단적인 장기 세션, 시스템 시각 역행, localStorage 다중 탭의 정확히 동시인 read-check-write 경합은 별도 위험이다. 낙관적 문자열 비교와 storage 이벤트는 완전한 원자적 다중 탭 잠금이 아니다.

## 화면·기능 인벤토리와 근거

| 흐름 | 실제 구현 | 검사 근거·한계 |
| --- | --- | --- |
| 첫 진입/설정 | arrival·atelier intro와 방문 표시 | app/atelier 기존 E2E; 원탭 기준은 재방문 홈. 신규 사용자 모든 intro 제거 주장은 안 함 |
| 홈/오늘 할 일/과제 CRUD | NowFocus, HomeEntry, TaskCheckIn, 편집 modal | quick-timer 첫 화면 기존 3개 버튼, app/atelier/capture/learning-engine |
| 수행평가/시험/시간표 | task kind, exams, schedules | exams-and-layout/sleep-learning-integration |
| 집중·스톱워치·카운트다운 | 기존 active와 quickTimer 상호 배제 | quickTimer/focus-restore 단위 및 quick-timer/product-perfection E2E |
| 세션 종료·이력 수정 | classic 종료 form, quick 즉시 저장+선택 label | 학습량을 삭제해 테스트 통과시키지 않음. classic 이력 전체 편집은 미구현; 이번 quick 기록만 보강 |
| PDF·필기 | IndexedDB paperStore, originals, 획/undo/redo, 문제 연결 | digital-paper E2E: 10페이지/105획, 회전, 재진입, inked PDF, ZIP. 합성 pointer는 실제 펜 아님 |
| 사진·갤러리·OCR | 두 vault에 원본, capture 입력, local OCR | capture-v2/digital-paper/bkit-3. 실제 카메라 권한·촬영은 기기 수동 |
| 문제별 오답·복습 | ResourceAttempt/ProblemWorkspace, 자가 확인/확신도/오류 유형 | learning-engine/learning-loop/problemWorkspace 단위. 외부 정답 자동 생성 없음 |
| AI 비서 | local 규칙 모드+opt-in VITE_AI_API_ENABLED, client token 요청; server adapter 별도 | assistant/server 단위. 이 작업에서 live 인증·비용·학습 맥락 API를 검증하지 못해 활성화 안 함. 로컬 안내를 AI 튜터라고 부르지 않음 |
| 수면 | sleep localStorage+sleep photo vault | sleep/examsSleepIntegration 단위, bkit-3 E2E |
| 설정·겹침·메뉴 닫기 | 모달/추가 도구, Escape·focus restore | tablet-settings/ios-navigation/bkit-3 E2E |
| 백업·복원 | ZIP hash manifest, 읽기 검사, journal, 충돌 원본 보존 | completeBackup/paper 단위, storage-readiness/digital-paper E2E |
| 회전/오프라인/재진입 | CSS safe areas, SW shell, 저장 복구 | 회전 합성 E2E와 기존 app 회귀; 실제 Safari 주소창/키보드/PWA 업데이트는 수동 |

## 저장·보안 감사

- `bkit.study-os.v1`: schema parse, 손상 시 저장 잠금, 최초 upgrade 원본 별도 보관, revision+expected raw 비교. 초기화/삭제 마이그레이션 없음.
- 사진 원본: study/sleep IndexedDB vault; 메타와 hash. PDF·필기는 별도 paper DB, 페이지/문서 참조 및 revision 관리. 원본 누락은 완전한 백업 성공으로 처리하지 않음.
- ZIP: SHA-256 data/media/original 검증, 미등록 파일/중복 경로/참조 검사, 검사 이후 동시 변경 재확인, 복원 전 exact JSON journal, 부분 실패 rollback. 외부 파일의 진위/악의 없는 출처를 SHA만으로 인증하지 않음.
- 실행 중 export는 paused snapshot만 생성하고 live timer를 수정하지 않는다. backupMatchesCurrent는 byte 비교라 실행 중 snapshot이 현재 live timer와 다르면 최신 전체 일치라고 표시하지 않는다.
- 개인 클라우드는 사용자 연결 필요. active/quickTimer·사진·문제 자료는 기기별 상태를 유지. 자동 원본 동기화를 구현한 것으로 표시하지 않음.
- 브라우저 저장 용량은 estimate/persist 상태 조회와 실패 처리가 기존에 있음. localStorage 저장 오류를 숨기지 않는다. 설정의 정보는 추정이며 실제 영구 보존 보장 아님.
- API 키/사용자 기록을 로그·소스·연구 파일에 복사하지 않았다. 새 AI/외부 유료 요청 없음.

## 테스트 한계와 남은 과제

- ESLint 설정 없음. 기존 `format:check`는 80개 파일 스타일 위반. 전면 재포맷은 기능 변경 범위와 분리한다.
- 앱은 App.tsx가 큰 구조로 1초 tick마다 여러 파생 연산을 수행한다. PDF는 lazy load이나 SW가 앱 assets 전체를 precache하므로 최초 오프라인 준비 다운로드가 크다. 초기 bundle 대폭 축소나 장시간 메모리 개선을 주장하지 않는다.
- 첫 방문 입문 단계 축소, 전체 classic 기록 편집, 문제별 정확한 독립 풀이 시간, source-bound 진단 AI, 실제 기기 펜 품질, 클라우드 복구 정책의 통합 검증은 후속 작업.
- 실행 중 시스템 시각이 뒤로 크게 변경되면 segment 순서 검증으로 저장이 거부될 수 있다. 원본을 보존하고 시간을 정상화한 뒤 재시도해야 한다. monotonic clock과 재진입 wall-clock을 결합한 별도 설계가 필요하다.
- 테스트 환경·최종 통과 수·CI 및 측정은 최종 결과 문서에 기록한다. 검증하지 않은 흐름은 이 인벤토리만으로 통과라고 부르지 않는다.
