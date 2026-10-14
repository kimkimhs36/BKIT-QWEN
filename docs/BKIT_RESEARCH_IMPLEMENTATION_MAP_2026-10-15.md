# BKIT 심층리서치 → 실제 구현 연결표 (2026-10-15)
**원문:** 사용자가 제공한 69쪽 `BKIT STUDY OS — THE ULTIMATE INTELLIGENT LEARNING SYSTEM.docx` (2026-10-14).  
**기준:** `kimkimhs36/BKIT-QWEN` / `feat/study-os-visual-v2`.

> 정정: 이전 버전 문서는 원본을 찾지 못했다고 기록했으나, 2026-10-15 원문이 직접 제공되었다. 지금부터 이 파일이 대체한다. 원문 전체는 공개 GitHub에 복제하지 않았다. 페이지는 첨부 DOCX에 대응하며, 모델 가격/연구 논문 원문은 이 작업에서 독립 검증하지 않았다.

## 제품의 핵심 원칙 (원문 pp.1–6,14,57–65)
**'계획을 더 많이 관리하는 앱'이 아니라 '실제 첫 문제에 빠르게 도달해 답하고 복습하는 앱'.**
- North Star: **Time to First Learning Action** (실제 첫 답변/회상까지, 타이머 실행 아님) + **Delayed Independent Accuracy**.
- 중앙값 45초 이하 / 75백분위 90초 이하, 8주 개선 지표는 **미검증 BKIT 목표값**일 뿐 과학적 보증값이 아니다 (pp.1,56).
- 기존 보호 규칙, 제출 상태 분리, 문제 수 기록, JSON backup, 오프라인 PWA는 보존. 전면 재구축하지 않는다 (pp.6,57).
- 연구가 소개하는 다크 `Calm Instrument`는 필수 팔레트가 아닌 디자인 컨셉. 현재 사용자가 원하는 **밝은 iOS 스타일은 유지**하면서 학습 중심 구조를 채택한다 (pp.44–46).

## 원문 요구 ↔ 현재 실제 코드

| ID | 보고서 페이지 | 요구 | 코드 / 실제 현황 |
|---|---|---|---|
| R01 NOW | 33–35,62–64 | 일정 한 줄 → 첫 학습 행동 → Quick Capture, 큰 Orbit 강등 | `src/NowFocus.tsx`, `src/App.tsx`: 5분 시작과 `today-more` 내부 Orbit은 이미 구현. **본 변경에서** 일정 한 줄 + 빠른 입력을 앞으로 배치, 큰 시계 최소화. 문제 열기/첫 답은 이후. |
| R02 IA | 32–33,58 | `NOW / LEARN / TASKS / MORE` 네 탭, global capture | 현재 `today/school/tasks/study/progress` 다섯 탭. 상단 과제추가 있음. **미구현**; 데이터·기존 링크 보존하며 차기 변경. |
| R03 Capture | 35–36,59 | 분량(문제/쪽/지문) 구조화, date-only/exact/unknown, 근거/확신도 | `QuickCapture.tsx`, `model.ts`는 datetime/null. '내일까지 20문제' 분량/마감확실성 완전 구조화 **미구현**. |
| R04 Learn | 36–40,59–60 | Problem→Attempt→Error→Retest, 답 선공개 금지, 학교자료 출처 | 세션 문제 수·오답은 존재, 문제별 독립 답/힌트/정답 이력과 source provenance **미구현**. |
| R05 Recall | 14–15,60 | 즉시+1/3/7/14일, 오류 유형·독립정답 검증 | `review.ts`: 오답 다음날, 성공 후 3일/7일, 세 번 성공하면 종료. **기본만 구현**; 보고서 10/14의 초기 진단보다 현재 코드가 발전함. |
| R06 Safety | 39–44,60 | 시험범위 confirmed/unknown, 재계획/수면/학원 보호 | `engine.ts`와 테스트에 제약 엔진 **구현**; 범위 출처·confidence는 **미구현**. |
| R07 Metrics | 55–57,62–64 | RecommendationShown/StudyStarted/FirstLearningAttempt, TTFSA | 세션 시각은 있지만 실제 학생 첫 답 이벤트 없음. **미구현**, 타이머 시작을 첫 문제 수행으로 집계하면 안 됨. 동의·온디바이스만 검토. |
| R08 AI | 24–32,60–61 | 저비용 parse → standard tutor → deep, 120문항 evaluation | `server/provider.ts`, `budget.ts`, `app.ts` 구조 존재. **실제 provider 비교·검증·배포 서버 인증 없음**. 모델명·가격은 실제 API 이용 전 재검증. |
| R09 iPhone | 44–50,61–62 | 물리 iPhone Safari, 무손실 IndexedDB migration, native SwiftUI | `ios-ready.css`, Playwright WebKit 자동 테스트는 있음. **물리 기기 테스트·native 앱·동기화 미완**. |
| R10 Safety QA | 53–54,63–64 | 작은 슬라이스/검증/롤백, 백업 유지 | `storage.test.ts` 기존 및 새 실사용 데이터 roundtrip 테스트. **원본 저장 키는 바꾸지 않음**. |

## 첫 번째 개발 슬라이스: R01 (원문 pp.62–64)
1. DAY ORBIT는 `today-more` 세부 화면에 유지, 홈 시간 숫자는 축소.
2. 다음 보호 일정은 **정확한 계산값만** 한 줄 표시. 미등록이면 미등록 표기.
3. 기존 `NowFocus` 5분 시작 버튼을 제1 동작으로 유지.
4. `QuickCapture`에 직행하는 별도 버튼을 홈 카드 다음에 배치.
5. `research-now.spec.ts` (Chromium + WebKit), `storage.test.ts` 기존 기록·레거시 저장 키 회귀 검사.
6. 현재에는 문제 답변 필드가 없으므로 `FirstLearningAttempt` 계측을 허위로 생성하지 않는다.

**수용:** UI 순서, 최소 탭 영역, 실제 capture 시트 열림, 브라우저/유닛 테스트 녹색. 교육 효과 개선 자체는 실사용 데이터로 별도 판정.

## 다음 순서 (원문 pp.52–53,63–64)
- **A** 기존 v1 JSON backup·active sessions·legacy namespace 전수 회귀
- **B** 4탭 NOW/LEARN/TASKS/MORE 및 실제 Problem/Attempt 이벤트로 TTFSA 검증
- **C** Capture v2 (수량/마감시간 근거·확신도)
- **D** Output-first Focus: 문제·첫 시도·오답을 시간보다 먼저
- **E** Recovery v2: 지금 살릴 것/옮길 것/보호할 것 1회 승인
- **F–G** 수학/화학 Tutor 단일 문제 → 답/힌트/재시도/기억
- **H–I** 학교 학습지 source grounding + review interval 보정
- **J** 주간 학습 증거/지연 정답/제출/복구
- **K–L** 3D·Sync·Push·Voice는 핵심 학습 루프를 검증한 후

## 엄격한 경계
- 연구의 교육적 효과(pp.7–14)는 BKIT 제품 효과 증명이 아니다.
- 모델 API 가격·공급자 목록(pp.24–32)은 기준일 스냅샷; 승인 없는 유료 호출 금지.
- 데이터의 `bkit.study-os.v1`와 `crashweek.v3`는 보존. IndexedDB 전환은 원본 검증→안전 복사→해시 검증→원본 유지 (pp.47–48).
- WebKit 자동 테스트와 물리 iPhone Safari 테스트는 구분 (p.46).
- 문서를 읽고 UX만 바꾸었다는 이유로 학습 효율 상승을 홍보하지 않음.
