---
name: harness
description: 프로젝트에 맞는 실행 하네스 팀을 구성합니다. 현재 저장소를 분석하고, 역할 기반 로컬 스킬 팀과 오케스트레이션 구조를 생성하며, QA와 검증을 포함한 프로젝트별 실행 하네스가 필요할 때 적극적으로 사용합니다. "하네스 구성해줘", "실행 하네스 팀 만들어줘", "프로젝트용 역할 팀 구성해줘", "이 저장소에 맞는 하네스 팀 설계해줘" 같은 요청이 오면 이 스킬을 적극적으로 사용합니다.
---

# Harness — 프로젝트별 실행 하네스 팀 생성 스킬

이 스킬은 Codex용 **메타 하네스 생성기**이다.

핵심 목표는 현재 저장소에 맞는  
**프로젝트 로컬 실행 하네스 팀**을 만드는 것이다.

이 스킬은 문서 묶음을 만드는 도구가 아니라,  
프로젝트 안에서 실제로 역할을 나누고 협업 구조를 만들 수 있는  
**실행 하네스 팀의 기반**을 생성하는 데 초점을 둔다.

---

## 이 스킬을 사용하는 상황

다음과 같은 경우 이 스킬을 적극적으로 사용한다.

- 저장소에 프로젝트별 실행 하네스 팀이 필요할 때
- 역할 기반 로컬 스킬 구조를 만들고 싶을 때
- 분석 / 설계 / 생성 / QA / 검증 역할을 분리하고 싶을 때
- orchestrator 중심의 팀 흐름이 필요할 때
- run-harness 같은 팀 기동 진입점이 필요할 때
- 프로젝트에 맞는 QA / validator 포함 구조가 필요할 때
- 이후 프로젝트 특화 실행 하네스로 확장 가능한 기반이 필요할 때

---

## 핵심 원칙

1. 현재 저장소 내부에 **프로젝트 로컬 실행 하네스 팀**을 만든다.
2. 전역 `AGENTS.md`를 생성하거나 수정하지 않는다.
3. 하네스의 본체는 문서가 아니라 **역할 팀**이다.
4. 역할 팀은 로컬 스킬과 orchestrator 중심 흐름으로 구성한다.
5. QA와 validator는 실행 하네스 팀의 필수 일부로 다룬다.
6. `run-harness`는 로컬 역할 팀을 실제로 기동하는 진입점으로 다룬다.
7. 리포트와 보조 문서는 사람이 구조를 이해하고 수정할 수 있게 돕는 **보조 레이어**로만 다룬다.
8. 역할 수는 많을수록 좋은 것이 아니라, 실제 프로젝트에 맞는 운영 가능한 팀 크기가 중요하다.

## 작성 언어 원칙

- 프로젝트 내부 `.harness/*` 문서와 로그 본문은 특별한 요청이 없으면 한글로 작성한다.
- 보고서 파일명은 `domain-analysis.md` 같은 기존 영문 파일명을 유지하되, 본문과 항목명은 한글을 기본으로 한다.
- 프로젝트에 이미 명시된 문서 언어 규칙이 있다면 그 규칙을 우선하되, 별도 규칙이 없으면 한글 작성이 기본이다.

## 실행 계약

이 스킬이 트리거되었다고 해서 임의 방식으로 파일을 만들면 안 된다.

아래 `scripts/...` 경로는 현재 `harness` 스킬 디렉토리 기준 상대 경로다.
전역 설치 후 기본 위치는 `$HOME/.codex/skills/harness/scripts/*.sh`이며,
저장소 작업본에서는 `.codex-dist/skills/harness/scripts/*.sh`에 해당한다.

- 최초 하네스 구성 요청이면 반드시 `bash scripts/harness-init.sh`를 먼저 실행한다.
- 하네스 구성이 끝났다고 판단하기 전에 반드시 `bash scripts/harness-verify.sh`를 실행한다.
- `scripts/harness-plan.sh`는 이미 하네스 구조가 있는 프로젝트에서 `.harness/reports/*`만 재생성하거나 보강할 때만 사용한다.
- `scripts/harness-init.sh` 대신 `.codex/skills/*`, `.harness/*`를 수동으로 직접 생성하는 방식은 사용하지 않는다.
- `scripts/harness-verify.sh`가 실패하면 완료로 간주하지 말고, 누락된 구조를 먼저 보강한다.

## 기본 실행 순서

- 새 프로젝트 하네스 구성: `bash scripts/harness-init.sh` → 필요 시 역할 보강 → `bash scripts/harness-verify.sh`
- 기존 프로젝트의 리포트만 재정렬: `bash scripts/harness-plan.sh` → `bash scripts/harness-verify.sh`
- 기존 프로젝트의 구조 누락 보강: `bash scripts/harness-init.sh` → 필요 시 `bash scripts/harness-plan.sh` → `bash scripts/harness-verify.sh`

---

## 생성 대상

이 스킬은 현재 저장소 안에 다음을 생성하거나 보완한다.

### 프로젝트 로컬 역할 스킬
- `.codex/skills/domain-analyst/SKILL.md`
- `.codex/skills/harness-architect/SKILL.md`
- `.codex/skills/skill-scaffolder/SKILL.md`
- `.codex/skills/qa-designer/SKILL.md`
- `.codex/skills/orchestrator/SKILL.md`
- `.codex/skills/validator/SKILL.md`
- `.codex/skills/run-harness/SKILL.md`

### 보조 산출물
- `.harness/reports/domain-analysis.md`
- `.harness/reports/harness-architecture.md`
- `.harness/reports/qa-strategy.md`
- `.harness/reports/orchestration-plan.md`
- `.harness/reports/team-structure.md`
- `.harness/reports/team-playbook.md`

핵심은 역할 팀이며,  
리포트는 역할 팀이 공유하고 사람이 수정할 수 있도록 돕는 보조 자료이다.

---

## 전체 워크플로우

### Phase 1: 저장소 분석
1. 현재 저장소의 목적과 기술 스택을 파악한다.
2. 핵심 디렉토리, 주요 흐름, 하네스 관점의 핵심 관심사를 식별한다.
3. 기존 로컬 하네스 구조가 있는지 확인해 충돌을 피한다.

이 단계의 결과는 실행 하네스 팀의 출발점이 된다.  
분석 기준은 `references/agent-design-patterns.md`를 참고한다.

### Phase 2: 실행 하네스 팀 설계
1. 이 프로젝트에 필요한 역할 팀 구성을 결정한다.
2. 기본 역할 구성을 유지할지, 축소/확장할지 판단한다.
3. 어떤 역할이 중심이고, 어떤 역할이 보조인지 정리한다.
4. orchestrator를 중심으로 흐름을 설계한다.
5. run-harness를 팀 기동 진입점으로 포함한다.

이 단계의 핵심은  
문서를 늘리는 것이 아니라 **운영 가능한 역할 팀**을 설계하는 것이다.  
흐름과 위임 기준은 `references/orchestrator-template.md`를 참고한다.

### Phase 3: 로컬 역할 스킬 생성
1. 각 역할에 대한 로컬 SKILL.md를 생성한다.
2. 각 역할은 명확한 입력/출력/책임 범위를 가져야 한다.
3. description은 실제 요청에서 트리거될 수 있도록 구체적으로 작성한다.
4. 역할 팀이 실제로 사용 가능한 수준의 스킬 구조를 만든다.
5. run-harness가 팀의 실제 진입점으로 기능하도록 한다.

스킬 작성 기준은 `references/skill-writing-guide.md`를 참고한다.

### Phase 4: QA 및 검증 구조 포함
1. QA 역할을 포함해 품질 관점을 정의한다.
2. validator를 포함해 최소 검증 구조를 만든다.
3. orchestrator가 각 역할의 입력/출력을 연결할 수 있게 한다.
4. QA와 validator의 피드백이 다시 구조 보완으로 이어질 수 있게 한다.

QA 기준은 `references/qa-agent-guide.md`를 참고한다.

### Phase 5: 실행 하네스 팀 검증
1. 필수 역할 스킬이 모두 존재하는지 확인한다.
2. 각 역할이 충분히 구분되는지 확인한다.
3. description이 실제로 트리거될 수 있는 수준인지 확인한다.
4. orchestrator가 중심 역할처럼 읽히는지 확인한다.
5. run-harness가 실제 기동 엔트리포인트처럼 읽히는지 확인한다.
6. QA / validator가 형식적인 보조 역할이 아니라 실제 팀 일부처럼 보이는지 확인한다.
7. 역할 팀 구조가 이후 프로젝트 특화 하네스로 확장 가능한지 본다.

테스트/검증 관점은 `references/skill-testing-guide.md`를 참고한다.

---

## 기본 역할 팀

### domain-analyst
저장소 분석과 실행 하네스의 출발점 정의를 맡는다.

### harness-architect
프로젝트 로컬 실행 하네스의 구조와 역할 경계를 설계한다.

### skill-scaffolder
설계된 구조를 실제 로컬 스킬과 파일로 옮긴다.

### qa-designer
품질 기준과 반복 검토 질문을 정의한다.

### orchestrator
역할 팀의 중심으로서 흐름과 연결 구조를 정리한다.

### validator
생성된 실행 하네스가 최소 요건을 만족하는지 점검한다.

### run-harness
현재 상태를 보고 어떤 역할부터 기동할지 결정하는 실행 하네스 팀의 진입점이다.

---

## orchestrator와 run-harness의 위치

이 실행 하네스 팀에서:

- orchestrator는 **팀 구조와 흐름의 중심**
- run-harness는 **팀을 실제로 시작하는 진입점**

으로 본다.

즉:
- orchestrator = 중심 조율자
- run-harness = 기동 엔트리포인트

이다.

---

## QA와 validator의 위치

QA와 validator는 비슷해 보여도 다르다.

### qa-designer
- 어떤 품질 질문을 반복 검토해야 하는지 정리한다
- 어떤 연결이 중요한지, 어떤 실패가 위험한지 정의한다

### validator
- 최소 구조 요건을 점검한다
- 누락, 약한 설명, 흐름 끊김을 식별한다
- 구체적 피드백을 남긴다

즉:
- QA는 품질 관점의 공급자
- validator는 최소 품질 점검자

이며, 둘 다 실행 하네스 팀의 일부로 기능해야 한다.

---

## 리포트의 위치

리포트는 중요하지만 본체는 아니다.

이 스킬에서 본체는:
- 역할 팀
- 로컬 스킬
- run-harness 진입점
- 오케스트레이션 구조
- QA/검증 구조

리포트는:
- 사람이 팀 구조를 이해하게 하고
- 역할 간 합의를 남기고
- 이후 수정과 확장을 쉽게 하도록 돕는 보조 산출물이다

즉 리포트는 중심이 아니라  
👉 **실행 하네스 팀을 지원하는 문서 레이어**이다.

---

## 사람 개입의 위치

이 스킬은 요구사항과 평가 기준을 완전 자동으로 확정하려 하지 않는다.

대신:
- AI는 역할 팀 초안, 구조 초안, QA 초안, 흐름 초안을 만든다
- 사람은 무엇이 중요한지, 어떤 실패가 치명적인지, 어떤 기준을 유지할지 선택하고 수정한다

이 사람 개입은 주로:
- domain-analysis
- harness-architecture
- qa-strategy
- orchestration-plan
- team-structure
- team-playbook

같은 보조 문서 레이어에서 흡수된다.

즉 사람 개입은 본체를 대신하는 것이 아니라,  
👉 **실행 하네스 팀이 더 정확해지도록 보조 문서에 반영되는 구조**이다.

---

## 주의사항

- 이 스킬은 현재 단계에서 **프로젝트별 실행 하네스 팀 생성기**를 만드는 데 집중한다.
- expected-state, diff, scenario runner는 이후 프로젝트 특화 실행 하네스로 확장할 수 있다.
- 역할 팀의 본체와 보조 문서를 혼동하지 말라.
- 역할을 과도하게 늘리지 말고, 실제로 의미 있는 팀 구조를 우선한다.
- 리포트가 역할 팀보다 더 커지는 구조를 경계하라.

---

## 산출물 체크리스트

작업 후 최소한 다음을 확인한다.

- [ ] 로컬 역할 스킬 구조가 생성되었다.
- [ ] orchestrator가 포함되어 있다.
- [ ] run-harness가 포함되어 있다.
- [ ] QA와 validator가 포함되어 있다.
- [ ] 실행 하네스 팀이 프로젝트에 맞게 구성되어 있다.
- [ ] 역할 팀이 본체처럼 읽히고, 리포트는 보조 문서로 존재한다.
- [ ] 이후 프로젝트 특화 실행 하네스로 확장 가능한 구조다.

---

## 참고 문서

- `references/agent-design-patterns.md`
- `references/orchestrator-template.md`
- `references/skill-writing-guide.md`
- `references/skill-testing-guide.md`
- `references/qa-agent-guide.md`
- `references/team-examples.md`

이 문서들은 실행 하네스 팀을 더 잘 설계하고 보강하기 위한 지식 베이스이다.
