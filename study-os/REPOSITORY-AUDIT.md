# 기존 프로젝트 조사 — 2026-10-13 UTC

- 원격 저장소: https://github.com/kimkimhs36/BKIT-QWEN
- 기본 브랜치: main
- 작업 시작 기준 commit: `109543e06e12137fe42c02f820e0f149449482da`
- main의 실제 파일: index.html, styles.css, app.js, README.md, CNAME.
- HTML 제목: CRASH//WEEK — Student Dynamics Laboratory.
- app.js: 일정 부하 분석, 편집/삭제, 충돌 시뮬레이션, 재배치, snapshots, 로컬 `crashweek.v3` 저장.
- 기존 HTML이 favicon.svg·manifest.webmanifest를 참조하지만 해당 파일은 main 트리에 없음.
- 기존 README.md는 프로젝트 설명 문서 대신 TEAMBKIT 자동차 페이지 HTML을 포함함. 원본 보존 정책으로 수정하지 않음.
- GitHub Pages 공개 메타데이터: legacy build, source branch main / path `/`, CNAME teambkit.com, HTTPS enforced, build status built.
- teambkit.com HTTP GET: 200. 공개 콘텐츠는 TEAMBKIT 자동차 소개 페이지이며 main의 CRASH//WEEK와 다름. 확인한 헤더의 last-modified는 2026-09-18. 배포 불일치의 원인은 이 조사만으로 확정하지 않음.
- 새 작업 브랜치: feat/bkit-study-os-v1. 앱 구현 범위는 study-os/로 제한.
- main 병합, 기존 Pages 교체, CNAME 변경, DNS 변경, 기존 localStorage 데이터 삭제 없음.
