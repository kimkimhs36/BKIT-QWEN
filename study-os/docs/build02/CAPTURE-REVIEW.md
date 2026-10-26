# 실제 렌더링 비교

PNG는 실제 Chromium 출력이다. 운영 화면은 teambkit.com을 로그인 없이 캡처했다. 과거 JUGGERNAUT은 PR #37의 보존된 오프닝을 렌더링했다. BUILD 01은 수정 전 #37 production build이다. BUILD 02는 실제 코드 출력이며 합성 목업이 아니다. 브라우저 캡처와 실기기 테스트를 구분한다.

| 화면 | 근거 | 구조와 상호작용 검토 |
|---|---|---|
| 운영 BKIT | [production-bkit.png](evidence/production-bkit.png) | 피치 광원, optical surface, 재질 반사·그림자, 짧은 공부 시작 동선. 같은 토큰·버튼·객체·효과·설정을 계승하고 홈 화면은 복제하지 않는다. |
| 과거 JUGGERNAUT | [heritage.png](evidence/heritage.png) | 검은 원형 터널, 챕터, 건너뛰기. BUILD 02는 여덟 광학 링·J seal·archive → possibility → first question으로 재해석. 긴 재생을 강제하지 않고 3장면 이동과 Reduced Motion을 제공한다. |
| BUILD 01 Command | [build01-command.png](evidence/build01-command.png) | 고정 sidebar, 범용 흰 카드, 별도 녹색 팔레트. 학습 엔진은 좋지만 실제 재질 효과 경로에서 빠졌다. |
| BUILD 02 Command | [desktop](evidence/build02-command-desktop.png), [iPhone](evidence/build02-command-iphone.png) | 5개 공간 navigation/모바일 bottom dock. 큰 서체·광학 터널·실제 다음 행동 하나·증거 장부·복습. 처음이면 Arrival 선택, 즉시 첫 문제 CTA 유지. 카드 반복 제거. |
| BUILD 02 Training | [iPad actual ink](evidence/build02-training-ipad.png) | 태블릿에서 문제와 필기 나란히, 모바일에서는 순서대로. MaterialEffects studying=true, 터널 없음, 읽기 표면은 opaque control 혼합. 기존 힌트·첫 답변·추측·해설·재도전 보존. 임시 필기 비저장 명시. |
| BUILD 02 Map | [map](evidence/build02-map-desktop.png) | 실제 3개 개념만 학습 가능. React Flow pan/zoom/fit, HTML 목록, 선택 상세. 교육과정 확장은 연결하지 않은 ‘미검증/준비 중’. 선은 연습 순서이며 공식 선수체계가 아님. edge label 겹침은 짧은 문구로 수정. |
| BUILD 02 Performance | [empty](evidence/build02-studio-desktop.png), [actual answer](evidence/build02-studio-populated.png) | 독립 답변/첫 답변, 유효 지연 성공/분모, 한국 시간 장부, 오류 빈도. 분모 없으면 ‘—’. 기존 내보내기·삭제·오류 편집·복구 보존. |

## 실제 재사용

MaterialObject의 glass 굴절·caustic·두께, jelly 탄성, diamond facets, gold satin을 재구현하지 않고 터널 중심에 렌더링한다. --mat-world/card/primary/edge/control/shadow/blur/radius/on-accent를 소비한다. 테마별 배경색을 별도로 선언하지 않는다. 새 정체성은 J seal·타이포그래피·동심 프레임·작전 장부·역사에서 한 문제로 이어지는 장면과 집중 전환에 있다.

영문 serial은 작은 보조 표기다. 핵심 한글 문제/입력/주 조작은 분리하고 44px 이상의 주 버튼을 유지한다. 주요 동선을 작은 장식 글자로 대체하지 않는다. 재질 자동 검사는 9개 서로 다른 primary gradient, material id, base light/dark, 설정 유지, 절전 effects:none, Escape 후 focus 복귀를 확인한다.

## 검토 후 수정한 결함

1. CSS import 순서가 단색 primary를 덮어쓰던 문제: BUILD 02 스타일을 마지막에 로드.
2. 자동 heading focus의 입력용 녹색 테두리: 비상호작용 heading outline만 제거, 실제 조작 focus-visible 유지.
3. 지도 출처 기본 회색 대비: 출처를 유지하고 canonical muted 색 적용, axe 재검증.
4. 모바일 정적 연출 문구: 감추지 않고 줄바꿈 배치.
5. 지도 chunk 실패가 앱 전체로 전파될 가능성: 오류 경계와 실제 개념 학습 fallback.

미학·학습효과를 자가 평가로 입증했다고 주장하지 않는다. 실기기 긴 텍스트·IME·회전·손바닥 접촉, 학생의 첫 답변까지 시간과 장기 피로도는 다음 파일럿에서 관찰해야 한다.

추가 발견: nature.css의 전역 main 진입 애니메이션이 독립 수능관에도 전파되어 검사 시점의 본문 opacity를 낮추었다. 실제 computed style과 axe 대비 실패로 확인했고, `.jg-build02 .jg-main`에 정적 opacity/transform/animation 경계를 적용했다. 단순히 검사 지연이나 예외 처리로 덮지 않았다. 최종 Preview 캡처는 이 격리 수정이 포함된 a373a02 출력이다.

최종 재질 비교: [Soft Jelly](evidence/build02-command-jelly.png), [Night Sprint](evidence/build02-command-night.png). 색상뿐 아니라 중심 물체, 표면 반사·두께·그림자·모서리·버튼 형태가 함께 변한다. 두 캡처의 1개 학습 증거는 캡처 스크립트가 실제 제출한 합성 답변이다. 장식 Night 객체의 시계 문양은 기존 MaterialObject의 aria-hidden 장식이며 학습 기록/실제 타이머가 아니다.
