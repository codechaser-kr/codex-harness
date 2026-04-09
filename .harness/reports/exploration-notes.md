# Exploration Notes

이 문서는 코드베이스 탐색에서 직접 수집한 근거를 바탕으로,
이 저장소를 어떤 앱, 패키지, 런타임 경계로 읽어야 하는지 정리합니다.
해석 문서를 쓰기 전에, 실제 시작점 후보와 경계 후보를 먼저 공유하는 것을 목적으로 합니다.

## 요약

- 현재 작업 디렉토리: `/home/codechaser/git_repositories/codex-harness`
- 하네스 운영 모드: `기존 확장`
- 탐색은 대표 시작점 후보, 주요 경계 후보, 검증 자산, 실행/설정 경로, 저장소 용어 단서를 우선 수집합니다.

## 대표 진입점
- 아직 자동으로 포착한 대표 진입점이 없습니다.

## 주요 코드 경계
- 아직 자동으로 포착한 주요 코드 경계가 없습니다.

## 테스트 및 검증 자산
- `tests`
- `.codex-dist/skills/harness/references/skill-testing-guide.md`

## 설정 및 실행 경로
- 아직 자동으로 포착한 설정 또는 실행 경로가 없습니다.

## 저장소 고유 용어 단서
- `README.md`
- `.codex-dist/skills/harness/SKILL.md`
- `.github/ISSUE_TEMPLATE/change_template.md`
- `.github/ISSUE_TEMPLATE/fix_templatebug.md`
- `.github/ISSUE_TEMPLATE/feature_template.md`
- `.github/pull_request_template.md`

## 다음 탐색 질문

- 어떤 앱, 패키지, 런타임 경계가 실제 사용자 흐름의 중심인가
- 어떤 경계가 다른 패키지나 소비자에게 가장 크게 영향이 전파되는가
- 검증 자산이 실제 핵심 경계를 얼마나 직접 덮고 있는가
- 문서 용어와 코드 경계 중 어느 쪽이 이 저장소의 실제 도메인을 더 잘 설명하는가
