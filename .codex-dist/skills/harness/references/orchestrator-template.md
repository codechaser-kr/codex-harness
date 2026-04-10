# Orchestrator Template (Codex용 실행 하네스 팀 오케스트레이션 기준)

이 문서는 실행 하네스 팀에서 orchestrator가 어떤 역할을 맡아야 하는지 정의한다.

orchestrator는 단순한 흐름 설명자가 아니다.  
orchestrator는 실행 하네스 팀의 중심 역할로서,  
여러 역할이 실제로 하나의 팀처럼 움직이도록 연결 구조를 만들고 유지하는 역할이다.

즉 orchestrator는  
👉 **팀 운영의 중심 조율자**이다.

---

## 핵심 전제

- orchestrator의 판단은 반드시 탐색 결과와 앞선 역할 산출물을 입력으로 받아야 한다.
- orchestrator는 리포트를 읽는 역할이 아니라, 리포트를 포함한 팀 구조를 다시 조율하는 역할이다.
- orchestrator의 핵심 가치는 시작점 선정, handoff 연결, 재진입 판단, validator 피드백 루프 유지에 있다.

---

## 1. orchestrator의 핵심 역할

orchestrator는 다음을 담당한다.

- 어떤 역할이 먼저 시작해야 하는지 결정한다
- 각 역할의 입력과 출력을 연결한다
- 역할 간 중복이나 끊김을 줄인다
- QA / validator의 피드백이 다시 구조 보완으로 이어지게 만든다
- 실행 하네스 팀이 프로젝트에 맞게 운용되도록 흐름을 정리한다

즉 orchestrator는  
모든 일을 직접 대신하는 역할이 아니라  
👉 **팀 전체를 작동시키는 역할**이다.

---

## 2. orchestrator가 항상 확인해야 하는 것

orchestrator는 최소한 아래를 항상 확인해야 한다.

### 1) 시작점이 있는가
- domain-analysis가 충분한가
- 지금 구조 설계를 시작해도 되는가
- 입력 정보가 부족하다면 사용자에게 먼저 확인할 질문이 정리되었는가

### 2) 역할 구성이 적절한가
- 현재 프로젝트에 기본 6역할이 맞는가
- 줄이거나 늘릴 필요가 있는가

### 3) 흐름이 단순한가
- 너무 많은 분기가 생기지 않았는가
- 누가 무엇을 보고 다음 단계로 가는지 분명한가

### 4) 피드백 루프가 있는가
- validator의 지적이 architect / scaffolder / qa-designer로 다시 연결되는가
- QA 질문이 구조 수정으로 이어질 수 있는가

---

## 3. 기본 실행 흐름

범용 실행 하네스 팀의 기본 흐름은 다음과 같다.

1. domain-analyst
2. harness-architect
3. qa-designer
4. orchestrator
5. validator

이 순서는 절대 규칙이 아니라 기본 골격이다.  
프로젝트에 따라 일부는 생략되거나,  
일부는 반복되거나,  
일부는 먼저 초안 수준으로 개입할 수 있다.

`skill-scaffolder`는 이 기본 골격에 항상 들어가는 역할이 아니다.
로컬 스킬 설명 drift, 구조 문구 불일치, 스킬 계약 재정렬이 필요한 sync 상황에서만 보조적으로 끼운다.

그러나 기본적으로 orchestrator는  
이 흐름 전체를 한 번에 보는 역할이어야 한다.

---

## 4. 운영 모드별 조율 기준

orchestrator는 항상 같은 방식으로 움직이지 않는다.  
현재 저장소의 하네스 상태에 따라 조율 우선순위가 달라진다.

### 신규 구축

- domain-analyst → harness-architect → qa-designer → orchestrator → validator 순서의 기본 파이프라인을 먼저 안정화한다.
- 이 단계에서는 분기 수를 늘리기보다, 입력/출력 연결을 선명하게 두는 것이 우선이다.

### 기존 확장

- 어떤 문서나 역할이 먼저 재진입해야 하는지 정하는 것이 핵심이다.
- 모든 산출물을 다시 만드는 대신, 현재 요청과 drift 지점을 기준으로 최소 재진입 루프를 만든다.

### 운영 유지보수

- 새 초안 생성보다 drift 감지, 피드백 루프, 운영 로그 정합성을 먼저 본다.
- validator와 logging-policy, latest-session-summary, orchestration-plan의 연결이 끊기지 않게 유지한다.

---

## 5. 역할별 연결 기준

### domain-analyst → harness-architect
- 분석 결과는 구조 설계의 출발점이 된다
- 단순 요약이 아니라 역할 팀 설계에 영향을 줄 수 있어야 한다

### harness-architect → skill-scaffolder
- 구조 설계와 로컬 스킬 설명이 서로 어긋나는 sync 상황에서만 연결한다
- 기본 흐름의 필수 handoff가 아니라 drift 보정용 예외 연결이다

### domain-analyst / harness-architect → qa-designer
- QA는 반드시 실제 구조와 흐름을 근거로 질문을 만들어야 한다
- 분석이나 설계와 분리된 QA는 힘이 약하다

### 전체 구조 → orchestrator
- orchestrator는 앞선 결과를 읽고 팀 흐름으로 재구성한다
- 흐름이 산만하면 여기서 정리해야 한다

### 전체 구조 → validator
- validator는 결과를 다시 최소 품질 기준으로 점검한다
- validator의 피드백은 다시 팀 보강에 사용될 수 있어야 한다

---

## 6. 패턴 선택 기준

orchestrator는 현재 저장소에 맞는 운영 패턴을 선택할 수 있어야 한다.

### 파이프라인

- 입력/출력 의존성이 선명하고 새 구조를 안정적으로 세워야 할 때

### 생성-검증

- 스킬/문서 생성 직후 validator 피드백을 빠르게 반영해야 할 때

### 팬아웃 / 팬인

- 하위 영역이 독립적으로 분석 가능하고, 최종적으로 다시 하나의 구조 문서로 모아야 할 때

### 오케스트레이션 중심 구조

- 역할 수가 늘고 handoff와 재진입 판단이 중요해졌을 때

핵심은 패턴 이름이 아니라,  
현재 요청에서 “어디서 시작하고 어디로 되돌릴지”를 가장 명확하게 만드는 선택인가이다.

- 위임 단위를 정할 때도 같은 수준의 판단을 해야 한다. 문서, 로그, handoff를 계속 유지해야 하는 핵심 역할은 `Agent Teams`로 두고, 입력과 출력이 좁은 일회성 보조 분석만 `Subagents`로 위임한다.
- fan-out 분석이 필요한 모노레포라도 최종 통합 책임은 항상 팀 역할로 다시 모으고, domain-analyst, harness-architect, qa-designer, validator 같은 중심 역할을 `Subagents`로만 대체하지 않는다.
- 요청을 받을 때는 사용자가 저장소 고유 용어와 파일 경로를 정확히 말하는지, 요청 범위가 단일 보강인지 구조 재설계인지 운영 점검인지 분명한지도 함께 본다.
- 사용자 맥락이 약하면 질문 루프를 먼저 두고, 맥락이 강하면 update 범위를 좁혀 바로 시작한다.

---

## 7. orchestrator가 피해야 하는 실수

### 1) 모든 역할을 동등하게 다루는 것
실제 프로젝트에서는 중심 역할이 있어야 한다.  
대부분의 경우 orchestrator 자신이 중심 흐름을 잡아야 한다.

### 2) 문서를 본체처럼 다루는 것
리포트는 보조다.  
본체는 역할 팀과 역할 스킬이다.

### 3) 과도한 병렬화
범용 단계에서는 복잡한 병렬화보다  
단순하고 추적 가능한 순차 흐름이 더 낫다.

### 4) validator 피드백을 끝 단계에서만 소비하는 것
validator는 단순 마지막 검사자가 아니라  
팀 구조를 더 낫게 만드는 피드백 공급자다.

---

## 8. 좋은 orchestrator의 조건

좋은 orchestrator는 다음 조건을 가진다.

- 중심 역할임이 분명하다
- 각 역할의 입력/출력을 명확히 연결한다
- 리포트를 보조 문서로 다루고, 본체는 역할 팀으로 본다
- QA / validator의 피드백을 실제 수정 루프에 연결한다
- 프로젝트에 따라 역할 수를 조정할 수 있다
- 팀이 복잡해질수록 더 단순한 흐름을 만들려 한다

---

## 9. orchestrator가 남겨야 하는 산출물

orchestrator는 최소한 다음을 남겨야 한다.

- `.harness/reports/orchestration-plan.md`

이 문서에는 적어도 다음이 포함되어야 한다.

- 현재 프로젝트의 역할 팀 흐름
- 역할별 입력/출력 연결
- 중심 역할과 보조 역할 구분
- validator / QA 피드백 반영 지점
- 이후 프로젝트 특화 실행 하네스로 확장 가능한 포인트

---

## 10. validator / QA와의 관계

### orchestrator와 QA
- QA는 흐름의 건강성을 질문한다
- orchestrator는 그 질문이 실제 흐름에 반영되게 한다

### orchestrator와 validator
- validator는 최소 요건과 약한 연결을 지적한다
- orchestrator는 그 지적이 구조 보완으로 이어지게 한다

즉 orchestrator는  
QA와 validator의 결과를 모두 흡수해  
팀 구조를 조정하는 중심 역할이다.

---

## 11. 사람 개입과 orchestrator

orchestrator는 사람 개입을 가장 잘 흡수해야 하는 역할 중 하나다.

왜냐하면 사람은 보통 다음에서 개입하기 때문이다.

- 어떤 흐름이 더 중요한가
- 어떤 역할이 과한가
- 지금 단계에서 무엇까지 엄격해야 하는가

orchestrator는 이런 판단을  
팀 구조와 흐름에 반영해야 한다.

즉 orchestrator는  
👉 **사람의 우선순위가 실행 하네스 팀 구조로 번역되는 접점**이다.

---

## 12. 핵심 요약

- orchestrator는 단순 설명자가 아니다
- orchestrator는 실행 하네스 팀의 중심 조율자다
- 흐름, 연결, 피드백 루프를 책임진다
- QA와 validator의 결과를 구조 보완으로 연결한다
- 본체는 역할 팀이고, 리포트는 보조다
- 좋은 orchestrator는 팀을 더 단순하고 더 강하게 만든다

---

## 13. 다른 레퍼런스와의 연결

- `agent-design-patterns.md`: 실행 단위, 패턴 선택 기준, 역할 분리 기준의 상위 설계 원칙을 제공한다.
- `qa-agent-guide.md`: QA 질문을 흐름 보완으로 다시 연결해야 하는 지점을 보강한다.
- `team-examples.md`: 어떤 저장소 예시에서 orchestrator가 어느 위치에서 중심 역할이 되는지 보여 준다.
- `skill-writing-guide.md`: orchestrator 스킬이 입력/출력과 협업 규칙을 어떻게 드러내야 하는지 연결한다.
