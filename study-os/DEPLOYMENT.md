# BKIT STUDY OS v1.1 배포

사용자 추가 요청에 따라 기존 공개 사이트와 분리한 개인용 Sites 배포를 진행합니다.

- 대상: 신규 `bkit-study-os` Site. 기존 사용자 계정의 owner-private 접근을 유지합니다.
- 예정 주소: https://bkit-study-os.jazzymoth5.chatgpt.site
- 현재 단계: 소스·빌드·테스트 검증 완료, 배포 패키지 준비.
- 앱 모드: Demo AI Mode. 정적 버전은 외부 AI API 요청을 하지 않습니다.
- 서버 기능: 배포에 포함하지 않습니다. 실제 AI 키·결제·동기화·Web Push는 별도 설정/구현이 필요합니다.
- 원본: `kimkimhs36/BKIT-QWEN`의 `feat/bkit-study-os-v1` 브랜치. 기존 main·CNAME·DNS·teambkit.com 유지.
- 빌드: `APP_BASE=/ npm run build`. 기존 `/study-os/` 경로용 개발 빌드와 분리합니다.
- 검증: 위 루트 경로 빌드에서 브라우저 흐름 36개 통과. 원본 엔진·서버·저장·개선 테스트 47개 통과.

Vercel은 `teambkit` 팀 접근이 403으로 거절되었고 CLI에도 인증이 없었습니다. GitHub 별도 저장소 생성은 `Resource not accessible by integration (createRepository)`로 거절되어 기존 Pages 설정을 바꾸지 않고 Sites로 전환했습니다.

현재 실행 환경에는 Sites 스킬이 참조하는 배포 보조 스크립트가 설치되어 있지 않아 같은 계약의 소스 commit/push·정적 아카이브 절차를 별도 실행했습니다. 소스 자격 증명은 표준입력과 Git 자식 프로세스의 일시적 메모리에만 전달하며 저장소·파일·로그에 남기지 않습니다. Sites에는 검증한 정적 `dist`와 hosting manifest를 저장하고, GitHub에는 읽기 가능한 전체 소스·테스트·문서를 보존합니다.

다른 Origin의 로컬 기록은 자동으로 이동하지 않습니다. 기존 기기에서 JSON 백업을 내보낸 뒤 새 URL의 설정에서 가져오세요. 실제 학습 기록은 배포 파일에 포함하지 않습니다.
