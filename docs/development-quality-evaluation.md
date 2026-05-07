# 개발 중 품질 평가

이 문서는 메타 하네스 생성기를 개발하거나 개선하는 사람을 위한 기준입니다. 일반 사용자는 README의 배치와 사용 흐름을 기준으로 하네스를 구성합니다.

## 목적

생성기를 바꾼 뒤에는 실제 타겟 프로젝트에 하네스를 다시 구성해 보고, 그 프로젝트에 남은 로그와 생성 문서를 이 저장소에서 읽어 생성기 품질을 판단합니다.

평가의 목적은 이 메타 하네스 생성기가 더 나은 역할 팀과 운영 기준을 만들도록 개선하는 데 있습니다.

## 주요 입력

타겟 프로젝트에서 다음 산출물을 읽습니다.

- `AGENTS.md`
- `.codex/agents/*`
- `.codex/skills/*`
- `.harness/docs/*`
- `.harness/logs/session-log.md`
- `.harness/logs/latest-session-summary.md`

## 평가 기준 문서

전역 스킬의 references 안에 있는 다음 문서를 함께 봅니다.

- `references/target-evaluation-playbook.md`
- `references/quality-evaluation-guide.md`
- `references/generator-readiness-checklist.md`

이 문서들은 생성기 저장소에서 품질을 판단하고 다음 수정 방향을 정할 때 쓰는 개발자용 기준입니다.

## 권장 절차

1. 생성기 변경 내용을 기준으로 타겟 프로젝트에 하네스를 다시 구성합니다.
2. 타겟 프로젝트의 생성 문서와 로그를 수집합니다.
3. 역할 팀, 실행 패턴, 운영 기준이 실제 작업에 쓸 수 있는 형태인지 확인합니다.
4. 부족한 점을 생성기 기준 문서, 전역 스킬, README 설명 중 어디에서 고칠지 나눕니다.
5. 이 저장소의 변경으로 반영한 뒤 다른 타겟 프로젝트에서 같은 문제가 반복되는지 다시 확인합니다.

## 레퍼런스 동기화 점검

`references/` 파일을 추가하거나 삭제했다면 다음 항목을 함께 확인합니다.

- `.codex-dist/skills/harness/references/`의 실제 파일 목록
- `.codex-dist/skills/harness/references/reference-map.md`의 문서 목록과 교차 참조
- README의 references 목록
- `.codex-dist/skills/harness/SKILL.md`에서 직접 언급하는 references 경로

검토 기준은 파일 존재 여부와 함께, 어떤 문서를 어떤 판단에 쓰는지 설명이 맞는지까지 포함합니다. 이 점검은 개발 중 품질 평가 절차 안에서 수행합니다.
