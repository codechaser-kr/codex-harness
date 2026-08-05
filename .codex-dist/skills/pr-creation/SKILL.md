---
name: pr-creation
description: 검증된 immutable PR input identity와 실행 직전 원격 상태를 대조해 GitHub Pull Request 생성 요청 초안을 제안합니다.
---

# PR Creation

이 스킬은 사용자가 확정한 immutable PR input identity를 그대로 소비하고, 실행 직전 원격 상태만 live preflight로 검증해 GitHub Pull Request 생성 요청 초안을 제안한다. 실제 GitHub PR 생성은 Workflow Engine의 후속 작업에서 처리한다.

## 먼저 읽을 문서

- `../github-agentic-loop/references/artifact-output-contract.md`에서 ``PR 생성(`pr-creation`) 출력 판정 규칙`` 섹션만 읽는다.
- `../github-agentic-loop/references/artifact-handoff-contract.md`
- `../github-agentic-loop/artifact-manifests/pr-creation.json`
- `../github-agentic-loop/references/pull-request-input-contract.md`
- `../github-agentic-loop/references/state-observation-contract.md`에서 `PR 생성 live preflight 관측 규칙` 섹션만 읽는다.

## 입력

- 검증된 `pull_request_input`과 `input_digest`
- `pull_request_input`과 exact equality를 확인할 title/body/base/head 생성 요청값
- 실행 시점의 expected local head OID
- exact base/head를 조회한 remote branch 존재 여부와 remote head OID
- exact head branch의 기존 open PR 번호 또는 `null`

## 책임

1. `pull_request_input`의 닫힌 구조·type/version·embedded digest를 검증한다.
2. 생성 요청의 `input_digest`, title, body, base branch, head branch가 immutable input과 exact equality인지 확인한다.
3. exact base/head remote branch 존재, remote head OID와 expected local head OID 일치, exact head의 기존 open PR 부재를 하나의 fresh live observation으로 확인한다.
4. identity나 live observation mismatch를 stable code/path와 함께 `blocking_questions`에 반영한다.
5. preflight가 `ready`일 때 immutable input의 title, body, base branch, head branch를 기존 출력 필드로 그대로 반환한다.
6. 실제 GitHub PR 생성은 Workflow Engine이 확정한 구조화 실행 요청을 선택된 실행 주체가 수행한다.

## 출력

- 공통 handoff 계약의 닫힌 envelope만 반환한다.
- `artifact_type: pr-creation`을 사용하고 `artifact`는 `pr-creation.json` manifest에 맞춰 구성한다.
- 반환값은 identity와 live preflight를 통과한 PR 생성 요청 초안이며 실제 GitHub PR 생성 요청이나 현재 PR 상태의 확정값이 아니다. 기존 `title`, `body`, `base_branch`, `head_branch`, `blocking_questions` public field와 runtime renderer output을 유지한다.

## 하지 않는 일

- PR 생성 여부, immutable input 값, 사용자 결정, 현재 Workflow 상태를 최종 확정하지 않는다.
- PR을 생성·갱신하거나 브랜치·파일·이슈·댓글 등 GitHub와 작업트리 상태를 변경하지 않는다.
- 전달된 immutable input을 보정하거나 제목·본문 또는 대상 브랜치를 재구성하지 않는다.
- 제목 형식, PR template, `Refs #번호` 같은 semantic draft 조건을 다시 판단하거나 renderer Markdown을 parse하지 않는다.

## 사용자 결정

- 검증 결과와 `blocking_questions`를 사용자 결정으로 해석하지 않는다. PR 생성 요청값의 확정과 실행 요청 구성은 `github-agentic-loop`가 처리한다.

## 중단 조건

- immutable input 또는 생성 요청 identity가 없거나 충돌하면 생성 요청을 확정하지 않는다.
- remote base/head 부재, stale head OID, same-head 기존 PR, malformed live observation이면 stable 오류와 재개에 필요한 새 관측을 `blocking_questions`에 반환한다.

## 후속 전이

- 제어와 기존 출력 구조를 `github-agentic-loop`에 반환한다.
- Workflow Engine이 산출물 판정과 사용자 결정을 거쳐 실제 PR 생성의 구조화 실행 요청 또는 중단을 확정한다.

## Structured artifact handoff

의미 내용은 immutable identity와 live preflight 결과만 사용하고, 기계 구조는 `pr-creation.json`만 따른다. envelope 밖의 설명이나 직접 조립한 Markdown을 반환하지 않는다.
