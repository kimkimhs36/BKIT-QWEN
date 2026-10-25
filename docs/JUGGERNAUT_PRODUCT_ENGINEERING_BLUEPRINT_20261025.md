# BKIT JUGGERNAUT — Product & Engineering Blueprint v4.0–8.0
기준: 2026-10-25 / 대상: `teambkit.com/juggernaut` / 상태: **설계안, 아직 구현·배포 아님**

## 0. 목적과 제약

**North Star**: 학생이 앱을 연 순간부터 **첫 독립적인 인출 또는 문제 답변**까지 걸린 시간과, 시간 경과 후 **힌트 없는 재검증 정답률**. 타이머 시작·페이지 체류·강의 재생은 성취가 아니다.

한 문장 사용자 약속: “무엇부터 공부할지 모르겠을 때 JUGGERNAUT를 열면, 지금 풀어야 할 단 하나의 문제가 나오고, 내 답이 다음 학습을 결정한다.”

- URL: `/juggernaut` 이하. 별도 계정·유료 도메인·독립 인증 불필요.
- 사용자 기본 동작: 바로 시작. 긴 온보딩·전 과목 진단·권한 허용을 강제하지 않음.
- BKIT 홈/학교생활/QUESTION RACE/GARAGE 및 기존 백업·공부기록 유지.
- AI가 정답을 만들거나 학습 상태를 추측할 때는 출처와 검증 수준을 표시.
- 전 과목 기능을 같은 날 출시하려 하지 말고 실제 학습 가능한 수학 1단원 end-to-end로 검증 후 확장.
- 기존 `Juggernaut` 코드 자산과 `exam-lab` 존재. 중복 재구축 전 기능·소유권·데이터·UI 재사용성 검사.
- 기준 저장소: `kimkimhs36/BKIT-QWEN`. 원본 브랜치 `fix/bkit-clean-cloud-client-20261025`를 이 문서 작성 출발점으로 사용했지만 **운영 배포 기준 브랜치라는 뜻은 아님**. 첫 코딩 전 Vercel 배포 SHA와 GitHub Pages·API 배포 구분 확인.
- 기록 삭제·DB reset·키 변경·인증 세션 재발급을 JUGGERNAUT 구현 목적만으로 실행하지 말 것.

## 1. 정보 구조와 경로

| URL | 학생에게 보이는 이름 | Primary CTA |
| --- | --- | --- |
| `/juggernaut` | 오늘의 출발점 | 이어서 풀기 / 지금 첫 문제 |
| `/juggernaut/start` | 1분 설정 | 진단 없이 시작 |
| `/juggernaut/diagnosis` | 기초 확인 | 이번 과목 진단 |
| `/juggernaut/train` | TRAINING ROOM | 답 제출 |
| `/juggernaut/review` | 재검증 | 오늘의 재시험 |
| `/juggernaut/roadmap` | 학습 경로 | 오늘 할 일 수정 |
| `/juggernaut/exams` | 실전 훈련 | 종이 모의고사 기록 |
| `/juggernaut/progress` | 실력 추이 | 약점으로 이동 |
| `/juggernaut/library` | 학습 자료 | 해당 단원 자료 열기 |
| `/juggernaut/settings` | 수능관 설정 | 기록·연결·내보내기 |

모바일 bottom nav: **오늘 / 학습 / 복습 / 분석**, 그 외 메뉴 drawer. iPad·데스크톱: 좌측 navigation rail. 전부 동일한 접근 가능한 URL이지만 단계·세션 중간에는 탭 이동 전 복귀 지점을 저장한다.

경로 직접 접속, 새로고침, 북마크, PWA deep-link, Service Worker 캐시, 미인증 사용자 복귀를 각각 테스트. 배포 환경이 SPA fallback을 지원하지 않으면 rewrite 또는 배포 정적 디렉터리 구조를 조정한다. 현재 서버 동작을 가정하지 않는다.

## 2. 학생의 핵심 여정 (모두 저장 기준 명시)

### 2.1 처음 방문 (목표 90초 내 첫 답변: 초기 제품 목표치, 효과 검증 완료 아님)

1. 기존 BKIT 계정이면 자동 식별. 연결 장애 시 비저장 연습을 허용하되 동기화 상태를 숨기지 않음.
2. 응시 학년도 자동 추천, 변경 가능. 2028학년도 → 2027-11-18. 날짜와 수능 과목 체계는 versioned curriculum data.
3. '오늘 5분만 시작' / '기초 진단하기' / '내 기록에서 이어하기' 세 행동만 첫 화면에 노출.
4. 진단 없이 학습 선택 시 provisional UNKNOWN으로 시작, 1–3개 확인문제로 선수개념 식별.
5. 첫 문제 정답 선택/입력 후 이벤트 `first_independent_attempt`를 기록. 저장 허용한 모드에서만 서버로 전송.

### 2.2 피곤한 날 (IGNITION)

- '5분 시작' → 최근 약점 중 작은 문제 1개 제시 → 한 번 제출 → 완료/계속/일시정지 선택.
- 5분 타이머를 돌린 사실은 학습 완료가 아님. 문제를 못 풀어도 복귀한 사실은 비처벌형 피드백.
- 3일 연속 계획 미이행 시 다음 목표를 자동으로 누적 가산하지 않음. 사용자 승인받아 계획량 완화.

### 2.3 오답 복구

문항 답변 → 정오 판정 → 정답 숨긴 상태의 1차 개념 힌트 → 추가 힌트 → 해설 → 새로운 동형 검증문항 → 재검증 큐. 답을 맞혀도 추측 정답 `G`, 과도한 힌트, 풀이 설명 불가는 independent mastery 인정하지 않는다. AI가 풀이를 보지 못했으면 오류 지점은 '추정'으로 표기.

### 2.4 다음날 재방문

'어제의 오답 검증'이 필요하면 복습 대기열과 본학습 사이에서 시간을 합리적으로 배분. overdue가 많아도 전량을 오늘 강제하지 않는다. '재시작' 버튼은 이전 미완료 세션과 새 세션을 명확히 구분한다.

## 3. 학습 데이터와 2028 학년도 분리

2028 교과 구조는 PROJECT 2028 연구 문서에 근거하되, 콘텐츠 DB는 연도 버전별로 관리.

- 국어: 화법과 언어 · 독서와 작문 · 문학, 45문항/80분.
- 수학: 대수 · 미적분Ⅰ · 확률과 통계, 30문항/100분.
- 영어: 영어Ⅰ · 영어Ⅱ, 45문항/70분.
- 한국사: 20문항/30분.
- 통합사회: 25문항/40분, 통합과학: 25문항/40분. 둘 다 응시.
- 심화 미적분Ⅱ·기하는 2028 수능 출제 과목에서 제외. 교내 수업과 별도.
- 하반기 평가원 모의평가 일정 등은 확인된 학년도별 출처와 검증일로 관리. 불확실한 일정은 '미확정'.

커리큘럼 예: `curriculum_year=2028`, `subject_code=MATH`, `unit_code=CALCULUS1`, `concept_code=quadratic-discriminant`, `source_url`, `verified_at`. 중학교 선수개념은 수능 출제범위라고 오해하지 않도록 `kind=prerequisite`로 구분.

## 4. 학습 엔진 상태와 검증 방식

Concept progress state:
`UNKNOWN → PREREQUISITE_GAP / LEARNING → GUIDED → INDEPENDENT → REVIEW_DUE → STABLE`

실패는 역방향 재평가를 유발한다. 'A/B/C/D'는 과목 전체 수능 등급이 아닌 '준비도'로 저장. 단원별 관찰 증거를 별도로 기록.

독립성 정의: 첫 제출 전 해설·힌트 없음, 정답이 독립적으로 검증됨, 추측 체크 해제, 필수 설명 요청에 응답. 수학 단답형은 정답 판정과 풀이 과정의 정확성을 구분. 객관식 찍기 적중은 `guessed=true`.

데이터가 부족하면 반드시 `confidence=low`. 85% 같은 기준은 튜닝 가능한 내부 임계값이지 공인된 수능 점수 예측 공식이 아님.

### 4.1 추천 작업 우선순위, 초기 휴리스틱

`priority = 4*overdue_retest + 3*blocking_prerequisite + 2*recent_repeated_error + 2*exam_relevance - 2*estimated_effort_over_budget`
(입력 변수 0–1 정규화, 임시 실험용; 데이터로 검증 전 학습 효과 보장 금지.)

추천된 작업마다 `reason_codes`와 1문장 학생 설명을 함께 반환. 학습 시간이 적으면 작업을 단축하되, '한 문제 답하기'는 남긴다.

### 4.2 복습 스케줄, 초기 휴리스틱

처음 간격: 하루를 기본값으로 제안하되 과목/문항난도별로 설정. 힌트 없는 성공: 이전 간격을 늘림(예: x2). 도움 후 성공: 유지 또는 짧게. 실패: 더 빠른 개념 복구와 재검증. 일정은 고정된 과학 법칙이 아니고 실제 지연 독립 정답률을 보고 조정. 오래 밀린 큐는 하루 허용 복습량으로 제한.

### 4.3 오류 코드

`C` concept, `M` memory, `R` reading, `I` inference, `K` skipped condition, `A` arithmetic, `T` time, `F` focus, `G` guessed correct. 학생이 직접 수정 가능. '주 원인 1개 + 보조 원인 0~2개', source=student/AI_assisted, confidence=low/medium/high.

## 5. 데이터 모델, 최소 구조 (실제 스키마 이름은 기존 백엔드 조사 후 확정)

1. `jg_user_goals` (user_id, exam_year, optional_target, minutes_budget, settings_version)
2. `jg_curriculum_versions` (year, verification_status, verified_at, source_url)
3. `jg_concepts` (concept_id, version_id, subject_id, unit_id, prereq_flag)
4. `jg_prerequisite_edges` (from_concept, to_concept, relationship)
5. `jg_question_bank` (question_id, version_id, source_type, usage_rights, answer_key_version, review_status, provenance)
6. `jg_attempts` (attempt_id, user_id, question_id, answer, first_try, hint_count, guessed, duration_ms, scoring_version, timestamp, client_idempotency_key)
7. `jg_evidence` (user_id, concept_id, attempt_id, evidence_kind, weight, confidence)
8. `jg_mastery_states` (user_id, concept_id, state, last_verified_at, algorithm_version, override_reason)
9. `jg_review_queue` (user_id, concept_id, due_date, interval, last_outcome, last_attempt_id)
10. `jg_sessions` (session_id, mode=practice/learning/exam, state=draft/active/paused/completed/discarded, started_at, last_saved_at)
11. `jg_roadmap_items` (item_id, reason_codes, due_date, estimate, user_override, status)
12. `jg_exam_records` (exam_id, user_id, exam_year, subject, score_if_known, user_input, per_question_times)
13. `jg_sync_events` (event_id, entity_type, device_id, mutation_type, version, conflict_status)
14. `jg_content_audit` (question_id, source_url, licensing_basis, editor, reviewed_at, status)

**Data rules**: user-specific records server-authorized per request; never trust client-set user_id/grade/mastery. No silent destructive migrations; old storage keys remain. Client UUID idempotency prevents double attempts when reconnecting. Session save acknowledgments distinguish '로컬 저장됨'/'클라우드 저장됨'/'동기화 필요'. Student-initiated deletion has server confirmation and explicit scope; exports are available. No cross-user data leakage or exposed AI API keys.

## 6. API contract proposal (inspect actual backend before implementing)

- `GET /api/juggernaut/bootstrap` → goal, curriculum snapshot, resume item, next action, sync state.
- `POST /api/juggernaut/attempts` → idempotent attempt write; authorized scoring result, concept evidence, next step, review update.
- `POST /api/juggernaut/sessions`, `PATCH /api/juggernaut/sessions/:id` → draft/resume/finish/discard.
- `GET /api/juggernaut/reviews?due=...` and `POST /api/juggernaut/reviews/:id/outcome`.
- `GET /api/juggernaut/roadmap`, `PATCH /api/juggernaut/roadmap/:id` → user-adjustable suggested actions.
- `POST /api/juggernaut/diagnosis` → chunked progress; no all-subject requirement.
- `POST /api/juggernaut/exams` → source/review status + manually entered outcomes.
- `GET /api/juggernaut/export`, documented delete actions (authenticated).
- AI hint endpoint must have per-user budget/rate limits, validated typed outputs, provenance, response caching where safe. AI failure must not block core manual flows.

These are **proposed contracts, not verified existing endpoints**.

## 7. Design requirements, device-specific

**Visual system**: precision instrument dashboard on Command Center; uncluttered paper-like reading surface in Training Room. No gaming animation mid-problem. Completion animation optional, reduced-motion honored.

**iPhone**: 1 question per viewport, keyboard-safe bottom actions, no horizontal overflow, safe-area support, dismissible drawer on second tap, visible back navigation, tap targets >=44 CSS px where feasible.

**iPad/Galaxy Tab**: split pane question+scratchpad optionally; landscape, portrait, stylus, touch, virtual keyboard; pane stacking when limited width.

**Desktop**: sidebar, keyboard navigation, accessible focus outline, '?' help, in-progress state preserved across route transitions.

No captured image is mandatory for solving; OCR/camera optional and never blocks manual upload or plain text answers. Student writing is private; camera permission requested only after direct user action.

## 8. Five nonnegotiable safety/reliability tests

1. **No record loss**: migrations, logout, reload, offline, delayed HTTP responses, auth refreshing do not destroy unacknowledged local work.
2. **Never claim save before ACK**: local vs remote save shown correctly; failed sync retriable/idempotent.
3. **No fabricated mastery**: timestamp/session timer alone does not create answer or mastery event.
4. **No answer leak / unlicensed content**: protected answer key not emitted as open question metadata; third-party exam content reviewed for use rights.
5. **Existing BKIT remains working**: home, settings toggle, school task capture, study timer, record deletion, login, backup/restore, GARAGE, QUESTION RACE regression.

Browser QA: Chromium, WebKit automation; physical iPhone/iPad validation reported separately; auth signed-in/out, airplane mode, recover 401/Redis network faults, SSO return URL, PWA refresh. Include direct-load URL `/juggernaut/train`.

## 9. Implementation slices and merge gates

**S0 — Baseline audit (no product changes)**: identify source repo (not only compiled site), production frontend/API SHA, deployment provider and rewrite behavior, existing Juggernaut and exam-lab routing, current DB migrations, user-record backup/export path, smoke test baseline. Record findings in `docs/JUGGERNAUT-BASELINE.md`.

**S1 — Shell**: `/juggernaut`, shared BKIT auth, resume-safe navigation, first-action CTA, mobile/tablet/desktop adaptive UI. Launch behind feature flag. No new permanent user DB yet. Acceptance: 3 devices direct URL+back+refresh; default BKIT unchanged.

**S2 — Real learning vertical slice**: one verified math prerequisite concept plus min. 5 vetted items, attempt states, hint/no-hint recording, practice-without-save, server-authorized saved attempt, one review schedule, reload/resume. Acceptance: learner attempts item, leaves and returns, retests next day, and never receives false mastery.

**S3 — Curriculum diagnostics**: versioned 2028 study hierarchy; math and English preliminary diagnosis first; expand Korean/History/Integrated Social/Integrated Science only after content quality review. Acceptance: each subject has independently saved/ resumable diagnostic with confidence and source.

**S4 — Adaptive coach**: error codes, prerequisite graph, independent vs guided success, review algorithm, manual overrides, confidence, recommendation reasons. Include adaptive-engine unit and property tests.

**S5 — Roadmap + analytics**: schedule capacity, school/test constraints, daily/weekly goals, delayed independent accuracy, evidence breakdown; discourage punitive catch-up and misleading percentage.

**S6 — Exam & BKIT integration**: physical-paper/mock exam entry, QUESTION RACE timing, GARAGE reward mapping to meaningful learning, feature flag across modules, safeguarding against duplicate credit.

**S7 — Production release**: review-only branch → deploy preview → end-to-end QA → opt-in private pilot → phased rollout → monitor 401, sync conflicts, crash and attempt loss → documented rollback. NEVER reset prod DB to resolve visual defect.

## 10. Ready-to-accept user stories

- **JG-001** 신규 학생이 90초 안에 진단 미완료 상태에서도 첫 문제에 답한다.
- **JG-002** 수학 문제에 오답 → 힌트 → 동형문제 독립 해결 → 재검증 예약으로 이어진다.
- **JG-003** 정답을 찍어서 맞힌 경우 학습 성취 점수는 자동으로 완전 숙달되지 않는다.
- **JG-004** 연습 모드에서는 학습 이력이 생기지 않으며, 중간에 종료해도 강제 저장 창이 없다.
- **JG-005** 로그인 상태가 네트워크로 잠시 끊겨도 진행한 답은 로컬에 보존되고 복귀 후 동기화된다.
- **JG-006** 복습이 밀려도 한꺼번에 폭탄처럼 늘어나지 않는다.
- **JG-007** 학생이 학습 기록을 열람·수정·삭제·내보낼 수 있다.
- **JG-008** 기존 BKIT 모든 주요 화면에 회귀가 없다.
- **JG-009** 2028 학년도와 다음 연도 커리큘럼 내용이 뒤섞이지 않는다.
- **JG-010** AI API 미연결 상태에서도 저장된 검증 문제와 학습 기록으로 학습 가능하다.

## 11. 현재 발견한 repo evidence & unresolved blockers

2026-10-25 조회:
- GitHub default `main`, 다수 feature/fix 브랜치와 열린 PR.
- `fix/bkit-clean-cloud-client-20261025` 기준 Vite/React 빌드된 root `index.html`과 정적 `assets/Juggernaut-9qtkuVs0.js` 존재.
- `exam-lab/index.html`에는 짧은 진단·문제 풀이·시험 실험 UI.
- `docs/BKIT_RESEARCH_IMPLEMENTATION_MAP_2026-10-15.md`에는 first-learning-attempt와 기존 데이터 보호 원칙 기록.
- **미확정**: 소스 원본의 현재 저장 위치, 실제 배포 커밋과 API 버전, 새 도메인 path rewrite 지원, Redis/클라우드 저장의 최신 스키마, 수능관에 대한 기존 기능 범위. 이 사항을 확인하기 전에는 고위험 DB 변경·마이그레이션·배포를 금지.

## 12. 근거와 한계

주요 교수학습 원칙, 2028 출제 체계, 기초 진단, 복습 원칙, 과목별 선수개념은 사용자의 39페이지 **PROJECT 2028 — 완전한 기초에서 시작하는 389일 수능 준비 종합 연구**에서 도출. 해당 보고서의 구체 URL 및 공식 근거는 원문 참조. 비공개 사용자 연구 원문을 퍼블릭 저장소에 복제하지 않음.

추천 점수, 90초 목표, API, UI, DB, 기초 검증 문항 수, 릴리스 단계는 **이 프로젝트의 설계 제안**이며 보고서에서 실험적으로 입증된 제품 성과나 현재 구현 현황이 아님.
