# BKIT 제품 연구와 구현 결정 — 2026-10-19

## 범위와 근거 수준

최신 3.4 feature `a5a1b51`의 소스·테스트를 조사했다. 운영 개인 자료는 접근하지 않았다. 공개 논문 초록, 교육기관 지침, 공식 제품/웹 문서를 직접 HTTP 조회했다. 아래 결과는 실험으로 확인된 학습 원리와 BKIT 설계 가설을 구분한다. BKIT 사용자 성적 향상이나 모든 학습자에 대한 효과를 입증하지 않는다. 경쟁 제품의 유료 계정·실기기를 조작한 비교가 아니므로 정확한 탭 수, 펜 지연, 복원 성공을 추정하지 않는다.

## 학습과학 → 제품 결정

| 문제·원리 / 근거 | BKIT 적용 (설계 추론) | 기대 효과 / 검증 | 우선순위 |
| --- | --- | --- | --- |
| **인출 연습**: Roediger & Karpicke (2006), [초록](https://pubmed.ncbi.nlm.nih.gov/16507066/). 재학습과 시험의 지연 파지 차이; 단기 유창성과 장기 파지는 다를 수 있음. | 답 제출 전 해설 숨김, 재시험은 기존 답을 가림. 해설 열기는 정답 판정이 아님. | 회상 시도 확보 / 저장 답과 자가 확인을 분리한 E2E. 성적 효과는 장기 검증 필요. | P1 |
| **분산 학습**: Cepeda et al. (2006), [메타분석 초록](https://pubmed.ncbi.nlm.nih.gov/16719566/). 적합한 간격은 유지 기간 등에 의존. | 기존 1·3·7일 등 규칙을 유지하고 같은 날 반복 정답으로 장기 간격을 늘리지 않음. 고정 간격은 제품 기본값. | 벼락 반복 완화 / 날짜·오답·낮은 확신 테스트. 개인별 최적화로 부르지 않음. | P1 |
| **교차 학습**: Brunmair & Richter (2019), [메타분석 초록](https://pubmed.ncbi.nlm.nih.gov/31556629/). 자료 유사성과 과제 유형의 조절 효과. | 복습 대기열은 과목을 섞어 접근할 수 있게 유지. 모든 문제를 무조건 랜덤으로 섞지는 않음. | 유형 구분 연습 / 실제 교과별 장기 비교 필요. | P2 |
| **정교화 질문·자기 설명**: Dunlosky et al. (2013), [PubMed](https://pubmed.ncbi.nlm.nih.gov/26173288/), [APS 해설](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html). 연습 시험·분산 학습은 높은 유용성, 정교화·자기 설명·교차 학습은 중간 수준 평가. | 기존 개념/오답 원인에 “왜 이 방법인가” 설명을 선택 입력. 공부 시작 전 필수 설문 추가 금지. | 사고 과정 외현화 / 선택 입력률·과제 완료와 부담을 함께 관찰. | P1/P2 |
| **형성평가·피드백 시점**: [EEF 피드백 지침](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback), Dunlosky 검토. 피드백은 학습 목표와 다음 행동에 연결돼야 함; 즉시/지연 중 하나가 항상 최선이라는 주장은 하지 않음. | 시도 → 자료 해설 비교 → 자기 채점 → 오답 원인 → 재시험. 잘못된 답을 반복하기 전 교정할 수 있게 하되 자동 정답·숙달 판정 금지. | 학습자가 수정할 행동을 알게 됨 / 정답 표시만으로 완료되지 않는 회귀 검증. | P1 |
| **메타인지·자기조절학습**: [EEF 지침, 2025 제2판](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition). 계획·모니터링·평가를 교과 맥락에서 지도. | 확신도와 실제 결과를 구분. 관찰된 답변 수와 추정 상태를 구분하는 기존 개념 근거 유지. | 과신 인식 / 낮은 확신 정답과 독립 정답 분리 테스트; 교사의 지도 대체 아님. | P1 |
| **인지 부하**: Dunlosky 검토와 EEF의 명시적 지도·단계적 지원을 근거로, 필수 UI 입력 최소화는 제품 추론. | NOW의 기존 주요 동작을 유지하고 원탭 시작, 종료 즉시 저장, 기록 정리는 나중에. | 시작 전 주의 분산 감소 / 첫 화면 버튼 가시성과 필수 입력 0개 검증. | P0/P1 |
| **실행 마찰·계획/행동 간극**: EEF 자기조절 지침은 계획만이 아니라 모니터링·평가를 포함. “버튼 한 개가 성적을 높인다”는 연구 결론은 아님. | 먼저 시간을 시작한 후 과제/자료를 연결. 자료 열기 때문에 타이머를 종료해야 하는 장벽 제거. | 실제 행동으로 전환 / 한 번 시작한 세션의 ID·시간을 보존한 자료 진입 검증. | P1 |

접근 제한: SAGE 원문 403, 일부 DOI 및 ETS/Columbia PDF 403/404. PubMed 초록·APS 공개 해설을 사용했으며 읽지 못한 전문을 읽었다고 주장하지 않는다. 피드백 전용 원문은 이번 조사에서 확보하지 못했으므로 구체적인 타이밍 효과 크기를 인용하지 않는다.

## 제품 비교 (공식 문서 기반)

| 제품 / 출처 | 시작·복습·오답·시간 원리 | 모바일/펜·진도·집중·백업 / BKIT 결정 |
| --- | --- | --- |
| [Anki studying](https://docs.ankiweb.net/studying.html), [backup](https://docs.ankiweb.net/backups.html) | 덱 선택 후 질문→답 공개→Again/Hard/Good/Easy. 별도 카드 작성 과정이 필요. | 복습 수/시간과 학습 일정, 백업과 미디어 범위를 구분. BKIT도 ZIP의 원본 포함 여부를 검증해야 함. PDF 펜 도구와 동일 제품으로 비교하지 않음. |
| [RemNote SM-2](https://help.remnote.com/en/articles/6026144-spaced-repetition) | 노트와 회상 카드를 연결, 결과로 다음 간격 계산. 열람 페이지는 SM-2 설명이며 최신 기본 알고리즘 전체를 대표하지 않음. | 노트에서 문제로 연결되는 원리 채택. 로그인 후 실제 탭 수·백업·펜 동작은 미검증. |
| [Quizlet Learn](https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn) | 세트에서 Learn, 학습 반응에 따라 연습. 계정/구독 조건 존재. | 준비된 자료에서 연습으로 이동하는 명확성 참고. 유료 기능이나 개인화 효과 복제·보장 금지. 펜·복원은 이번 문서로 확인 불가. |
| [Forest](https://www.forestapp.cc/) | 집중 시간을 시작하고 집중 환경을 유지하는 시각 피드백. 문제별 오답 엔진과는 목적이 다름. | 차분한 단일 동작 원리 참고. 실패 처벌이나 나무 시각 디자인 복제 안 함. 기록/백업·정확한 조작 수 미검증. |
| [Focus To-Do](https://www.focustodo.cn/) | Pomodoro+과제, 일/주/월 시간 및 과제 보고. | 타이머와 과제를 연결하지만 BKIT은 과제 선택을 시작의 전제 조건으로 두지 않음. 동기화 홍보와 실제 로컬 원본 백업 보장을 구분. |
| [Goodnotes features](https://www.goodnotes.com/features) | 문서 열기·필기 중심, 시각 자료와 손글씨 맥락 유지. | PDF 옆 문제별 회상 흐름과 undo/redo·회전 후 위치 보존을 점검. 웹/네이티브 펜 동작은 다름. 복원 도움말은 로그인 화면이 반환돼 검증 근거로 쓰지 않음. |

정확한 시작 탭 수는 설치·로그인·자료 준비·플랫폼에 따라 달라 이번 비교에서는 미측정이다. BKIT 자체는 returning NOW 화면 기준 스톱워치 한 탭을 E2E로 확인한다. 제품별 미확인 기능을 부재로 간주하지 않는다.

## 웹 품질 기준 → 검증 항목

| 공식 자료 | 확인된 원리 / 적용 | 기대 효과·검증 / 우선순위 |
| --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 2.5.8 대상 크기 24 CSS px 또는 예외, 2.4.7 포커스 표시, 2.4.11 포커스 가림 방지, 4.1.3 상태 메시지. 주요 타이머 버튼은 실용적으로 44px 이상 목표. | 키보드·터치·스크린리더로 타이머와 기록 편집. 전체 WCAG 인증 주장은 금지. P1/P2 |
| [WebKit Storage](https://webkit.org/blog/14403/updates-to-storage-policy/), [MDN quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | quota는 상한, 사용 가능 보장 아님. QuotaExceededError 처리. persistent도 외부 백업 대체 아님. | 실패 시 성공 문구 금지, 기존 원본 유지, 공간·백업 상태 정직 표시. P0 |
| [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) | 트랜잭션 단위 저장·오류 처리, 버전 업그레이드와 다른 열린 탭 고려. | PDF/필기/사진 원본 참조 일관성과 복원 rollback 검증. P0 |
| [Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle) | waiting/activation은 열린 탭과 연계; skipWaiting은 버전 혼합 위험. | 실행 중 타이머/미저장 필기를 강제 reload하지 않음. 오프라인·업데이트 수동 절차 분리. P0 |
| [Web Vitals](https://web.dev/articles/vitals) | LCP/INP/CLS는 현장 분포와 측정 맥락 필요. | 빌드 chunk 크기와 실험실 결과를 현장 CWV로 오인하지 않음. P2 |
| [Playwright emulation](https://playwright.dev/docs/emulation) | viewport/touch/scale/browser 엔진 모의. | 6개 프로필 회귀, Galaxy 1280×800 CSS@2x = 2560×1600 물리. 팜 리젝션·펜 지연은 실기기 검수. P0/P1 |
| [React useEffect](https://react.dev/reference/react/useEffect) | 효과의 타이머·리스너 정리 및 의존성. | 기존 interval 정리 확인. 시계는 wall clock으로 계산해 백그라운드 tick 수에 의존하지 않음. P0 |

## 소스 조사에서 도출한 이번 구현 우선순위

1. P0: 3.4 `quickLabel` 누락의 실제 TS2741 해결.
2. P0: 반복 pause가 스키마 구간 한도를 소진하면 종료 저장까지 막힐 수 있음. 손실 없는 구간 보존과 한도 테스트.
3. P1: quick timer 실행 후 기존 과제/PDF 자료로 진입을 막는 흐름 해소; 같은 ID·기존 시간·일시정지 상태 유지.
4. P1: 최근 한 세션에만 열려 있던 정리 폼을 이력의 이전 quick session에도 제공. 과목/과제 연결을 자동 제거하지 않음.
5. P1/P2: 실제 데이터 백업·복원·다중 탭·실패 경계와 6개 프로필 회귀. 대규모 시각 재작성이나 새 AI API 활성화는 하지 않음.

## 후속 효과 검증

제품 지표는 수집 코드를 무단 활성화하지 않는다. 별도 동의 후 익명 집계로 첫 공부 시작까지 걸린 시간, 입력 전에 시작한 비율, 저장 실패율, 다음 날 재시험 도달률을 관찰할 수 있다. 실제 학습 효과는 문제 난도·학습 기간·초기 실력 등을 통제한 검증이 필요하다. 긴 타이머는 집중이나 이해의 증거가 아니다.
