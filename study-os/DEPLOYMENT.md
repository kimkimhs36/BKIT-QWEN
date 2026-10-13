# BKIT STUDY OS v1.1 배포

사용자 추가 요청에 따라 기존 공개 사이트와 분리한 개인용 Sites 배포를 완료했습니다.

- 대상: 신규 `bkit-study-os` Site. 기존 사용자 계정의 owner-private 접근을 유지합니다.
- 배포 주소: https://bkit-study-os.jazzymoth5.chatgpt.site
- 상태: **succeeded** — 2026-10-13 17:19 UTC. Sites의 개인용 production 배포이며 사용자 본인 1명만 허용, 공유 그룹 0개입니다.
- 앱 모드: Demo AI Mode. 정적 버전은 외부 AI API 요청을 하지 않습니다.
- 서버 기능: 배포에 포함하지 않습니다. 실제 AI 키·결제·동기화·Web Push는 별도 설정/구현이 필요합니다.
- 원본: `kimkimhs36/BKIT-QWEN`의 `feat/bkit-study-os-v1` 브랜치. 기존 main·CNAME·DNS·teambkit.com 유지.
- 빌드: `APP_BASE=/ npm run build`. 기존 `/study-os/` 경로용 개발 빌드와 분리합니다.
- 검증: 위 루트 경로 빌드에서 브라우저 흐름 39개 통과. 원본 엔진·서버·저장·개선 테스트 47개 통과.

Vercel은 `teambkit` 팀 접근이 403으로 거절되었고 CLI에도 인증이 없었습니다. GitHub 별도 저장소 생성은 `Resource not accessible by integration (createRepository)`로 거절되어 기존 Pages 설정을 바꾸지 않고 Sites로 전환했습니다.

현재 실행 환경에는 Sites 스킬이 참조하는 배포 보조 스크립트가 설치되어 있지 않아 같은 계약의 소스 commit/push·정적 아카이브 절차를 별도 실행했습니다. 소스 자격 증명은 표준입력과 Git 자식 프로세스의 일시적 메모리에만 전달하며 저장소·파일·로그에 남기지 않습니다. Sites에는 검증한 정적 `dist`와 hosting manifest를 저장하고, GitHub에는 읽기 가능한 전체 소스·테스트·문서를 보존합니다.

다른 Origin의 로컬 기록은 자동으로 이동하지 않습니다. 기존 기기에서 JSON 백업을 내보낸 뒤 새 URL의 설정에서 가져오세요. 실제 학습 기록은 배포 파일에 포함하지 않습니다.

## 배포 식별 정보

- 앱 소스 commit: `1f1fb0a37494fbe36167b2e67a0e21f94afd9c1d` (BKIT-QWEN feature branch).
- Sites 정적 스냅샷 source commit: `3924132e31c5b86b9e74834e83db1084607a65de`.
- project: `appgprj_6ace66da00548191a0ec92118a6640a8`.
- version: `appgprj_6ace66da00548191a0ec92118a6640a8~appgver_b5402755e15c8191afdd1cb3b958382d`.
- deployment: `appgdep_6ace6821b4f48191a4641996d172632b`.
- 배포 manifest: Sites 전용 체크아웃 `/workspace/sites/bkit-study-os/.openai/hosting.json`. 원본 GitHub 소스와 Sites 정적 source repository를 혼동하지 마세요. 수정 시 같은 project ID를 재사용하고 앱 빌드 후 새 스냅샷을 push·save·deploy합니다.

## 실제 URL 검증

배포 URL에서 Chromium의 iPhone·iPad 크기로 실제 GET HTTP 200, 빈 첫 화면, 과제 등록, 집중 시작과 실제 문제량 저장, 제출 확인, 제출 기록, 새로고침 유지가 모두 통과했습니다. JavaScript 오류는 각각 0건입니다. 테스트는 해당 Site에만 허용된 일시적 service access를 사용했고, 자격 증명을 코드·저장소·추적 파일에 저장하지 않았습니다. 다른 Origin 요청은 차단했습니다. 합성 QA 데이터는 일시적인 테스트 브라우저에만 저장했고 세션을 닫았습니다.

모바일 Safari 실기기, ChatGPT 로그인 완료 후의 iOS 홈 화면 설치·백그라운드 전환은 아직 실기기 검증이 필요합니다. 일반 사용자는 배포 주소에서 본인 ChatGPT 계정으로 로그인해야 합니다. 앱 내부 기록은 여전히 기기 localStorage에 있으므로 로그인 자체가 동기화나 서버 백업을 뜻하지 않습니다.
