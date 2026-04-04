# Orchestrator Template (Codex용 실행 하네스 팀 오케스트레이션 기준)

이 문서는 실행 하네스 팀에서 orchestrator가 어떤 역할을 맡아야 하는지 정의한다.

orchestrator는 단순한 흐름 설명자가 아니다.  
orchestrator는 실행 하네스 팀의 중심 역할로서,  
여러 역할이 실제로 하나의 팀처럼 움직이도록 연결 구조를 만들고 유지하는 역할이다.

즉 orchestrator는  
👉 **팀 운영의 중심 조율자**이다.

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
3. skill-scaffolder
4. qa-designer
5. orchestrator
6. validator

이 순서는 절대 규칙이 아니라 기본 골격이다.  
프로젝트에 따라 일부는 생략되거나,  
일부는 반복되거나,  
일부는 먼저 초안 수준으로 개입할 수 있다.

그러나 기본적으로 orchestrator는  
이 흐름 전체를 한 번에 보는 역할이어야 한다.

---

## 4. 역할별 연결 기준

### domain-analyst → harness-architect
- 분석 결과는 구조 설계의 출발점이 된다
- 단순 요약이 아니라 역할 팀 설계에 영향을 줄 수 있어야 한다

### harness-architect → skill-scaffolder
- 구조 설계는 실제 파일 생성 기준이 된다
- 애매한 설계는 scaffolder 단계에서 품질 저하로 이어진다

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

## 5. orchestrator가 피해야 하는 실수

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

## 6. 좋은 orchestrator의 조건

좋은 orchestrator는 다음 조건을 가진다.

- 중심 역할임이 분명하다
- 각 역할의 입력/출력을 명확히 연결한다
- 리포트를 보조 문서로 다루고, 본체는 역할 팀으로 본다
- QA / validator의 피드백을 실제 수정 루프에 연결한다
- 프로젝트에 따라 역할 수를 조정할 수 있다
- 팀이 복잡해질수록 더 단순한 흐름을 만들려 한다

---

## 7. orchestrator가 남겨야 하는 산출물

orchestrator는 최소한 다음을 남겨야 한다.

- `.harness/reports/orchestration-plan.md`

이 문서에는 적어도 다음이 포함되어야 한다.

- 현재 프로젝트의 역할 팀 흐름
- 역할별 입력/출력 연결
- 중심 역할과 보조 역할 구분
- validator / QA 피드백 반영 지점
- 이후 프로젝트 특화 실행 하네스로 확장 가능한 포인트

---

## 8. validator / QA와의 관계

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

## 9. 사람 개입과 orchestrator

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

## 10. 핵심 요약

- orchestrator는 단순 설명자가 아니다
- orchestrator는 실행 하네스 팀의 중심 조율자다
- 흐름, 연결, 피드백 루프를 책임진다
- QA와 validator의 결과를 구조 보완으로 연결한다
- 본체는 역할 팀이고, 리포트는 보조다
- 좋은 orchestrator는 팀을 더 단순하고 더 강하게 만든다

