# Team Examples (Codex용 실행 하네스 팀 예시)

이 문서는 범용 하네스 생성기가 실제 프로젝트에서 어떤 실행 하네스 팀을 만들 수 있는지 예시를 제공한다.

목적은 다음과 같다.

- 역할 팀 구조를 실제 프로젝트 맥락으로 연결한다
- 어떤 프로젝트에서 어떤 역할 구성이 자연스러운지 보여준다
- orchestrator 중심 구조가 실제로 어떻게 읽혀야 하는지 보여준다
- 역할 수를 언제 줄이고 늘릴지 감을 준다

즉 이 문서는  
👉 **역할 팀이 실제 프로젝트에서 어떻게 보이는지 보여주는 예시 모음**이다.

---

## 핵심 전제

- 예시는 기술 이름 자체보다 경계 수, 검증 비용, handoff 복잡도, 운영 모드 차이를 보여줘야 한다.
- 예시는 고정 답안이 아니라 어떤 조건에서 역할을 줄이거나 늘리는지 설명하는 기준이어야 한다.
- 같은 저장소 유형이라도 탐색 결과와 운영 요구가 다르면 다른 팀 구조가 나올 수 있다.

---

## 예시 1. 일반적인 프론트엔드 애플리케이션

### 특징

- 사용자 흐름이 중요하다
- 화면, 상태 변화, 설정 구조가 함께 엮여 있다
- 역할 팀이 비교적 명확하게 분리되기 좋다

### 권장 역할 팀

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

### 중심 역할

- orchestrator

### 이유

프론트엔드 앱은
- 저장소 분석
- 흐름 설계
- QA 관점
- 검증

이 모두 필요하므로, 기본 6역할 풀셋이 자연스럽다.

특히 orchestrator가:
- 분석 결과
- 구조 설계
- QA 기준
을 하나의 흐름으로 연결하는 중심 역할이 된다.

### 보조 산출물 예시

- domain-analysis.md
- harness-architecture.md
- qa-strategy.md
- orchestration-plan.md
- team-structure.md

---

## 예시 2. 단순 라이브러리 또는 유틸리티 패키지

### 특징

- 사용자 상호작용보다 API 표면이 중요하다
- 흐름이 비교적 단순하다
- 과한 역할 분리가 오히려 부담이 될 수 있다

### 권장 역할 팀

- domain-analyst
- harness-architect
- qa-designer
- validator

### 생략 또는 약화 가능 역할

- skill-scaffolder
- orchestrator

### 중심 역할

- harness-architect

### 이유

이 유형은 역할 팀보다는 구조 설계와 품질 기준이 더 중요하다.  
orchestrator를 유지해도 되지만, 흐름이 단순하면 중심 역할로까지 키울 필요는 없다.

즉 이 경우에는  
“실행 하네스 팀”이라 해도 **작은 팀 구조**가 더 자연스럽다.

---

## 예시 3. 모노레포

### 특징

- 여러 앱/패키지가 섞여 있다
- 전체 구조와 개별 영역을 함께 봐야 한다
- 흐름과 책임 경계가 쉽게 복잡해진다

### 권장 역할 팀

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

### 중심 역할

- orchestrator
- domain-analyst

### 이유

모노레포에서는 domain-analyst가
- 전체 구조
- 하위 워크스페이스
- 공통 모듈

을 구분해서 파악해야 한다.

그리고 orchestrator가 중심이 되지 않으면,
역할 팀 전체가 산만해지기 쉽다.

즉 이 유형은  
기본 6역할 중에서도 orchestrator의 중요성이 특히 크다.

---

## 예시 4. CLI 도구

### 특징

- 명령어 흐름이 핵심이다
- 입력 인자, 출력 포맷, 파일 생성 결과가 중요하다
- 구조보다 흐름이 선형적인 경우가 많다

### 권장 역할 팀

- domain-analyst
- harness-architect
- qa-designer
- validator

### 선택 역할

- orchestrator
- skill-scaffolder

### 중심 역할

- domain-analyst
- qa-designer

### 이유

CLI는 사용자 흐름이 비교적 단순한 경우가 많기 때문에,  
항상 큰 역할 팀이 필요한 것은 아니다.

다만 서브커맨드가 많거나,  
여러 단계의 흐름이 연결되면 orchestrator를 포함하는 편이 좋다.

---

## 예시 5. 옵시디언 유사 앱

### 특징

- 에디터, 파일 트리, 링크 갱신, 워크스페이스 상태가 중요하다
- 사용자 흐름이 복합적이다
- 이후 프로젝트 특화 실행 하네스로 발전할 가능성이 매우 높다

### 권장 역할 팀

- domain-analyst
- harness-architect
- skill-scaffolder
- qa-designer
- orchestrator
- validator

### 중심 역할

- orchestrator
- qa-designer

### 이유

이 유형은 단순 구조 생성으로 끝나지 않고,
이후 expected-state, diff, scenario 실행으로 발전할 가능성이 높다.

따라서 초기에:
- domain-analysis
- team structure
- QA strategy
- orchestration

가 탄탄해야 한다.

특히 qa-designer가  
“어떤 연결이 중요한가”를 정리하지 못하면,
후속 실행 레이어도 흐려질 수 있다.

---

## 역할 수를 줄여야 하는 경우

다음과 같은 경우에는 6개 역할을 모두 유지하지 않아도 된다.

- 저장소 규모가 매우 작다
- 흐름이 단순하다
- QA 질문이 많지 않다
- orchestrator가 사실상 필요 없다
- 역할을 줄여도 품질 저하가 크지 않다

핵심 원칙:

- 역할 수는 많을수록 좋은 것이 아니다
- 역할 팀은 운영 가능한 크기를 유지해야 한다

---

## 역할 수를 늘릴 수 있는 경우

다음과 같은 경우에는 역할을 더 세분화할 수 있다.

- 저장소가 매우 크다
- 분석 축이 많다
- 프로젝트 특화 실행 하네스로 발전할 가능성이 높다
- 이후 expected-state / diff / scenario 레이어가 중요하다

예시 확장 역할:

- expected-state-designer
- diff-designer
- scenario-runner

단, 이들은 범용 하네스 1차 단계의 기본 역할은 아니다.

---

## 좋은 실행 하네스 팀의 조건

- 중심 역할이 분명하다
- 각 역할의 책임이 겹치지 않는다
- orchestrator가 필요한 프로젝트에서는 중심으로 서 있다
- QA가 단순 체크가 아니라 품질 관점을 제공한다
- validator가 실제 피드백 루프에 기여한다
- 보조 문서는 팀을 지원하는 수준에 머문다

---

## 예시를 읽는 방법

- 먼저 중심 역할이 누구인지 본다.
- 그 다음 어떤 이유로 역할을 줄이거나 유지하는지 본다.
- 마지막으로 어떤 산출물과 검증 흐름이 함께 따라오는지 연결한다.

예시는 역할 이름 목록보다, 왜 그런 배치가 나왔는지를 읽을 때 가치가 크다.

---

## 다른 레퍼런스와의 연결

- `agent-design-patterns.md`: 여기서 보이는 역할 수 조정과 실행 단위 선택의 상위 기준을 제공한다.
- `orchestrator-template.md`: 중심 역할이 orchestrator일 때 어떤 흐름 설계가 필요한지 연결한다.
- `qa-agent-guide.md`: 각 예시에서 어떤 품질 질문이 더 중요해지는지 연결한다.

---

## 핵심 요약

- 범용 하네스의 기본 역할은 6개다
- 모든 프로젝트에 6개를 강제하지 않는다
- 탐색 결과에 따라 중심 역할이 달라질 수 있다
- 실행 하네스 팀의 본체는 역할 팀이며, 문서는 보조다
- 좋은 예시는 “역할 팀이 실제로 어떻게 움직일지”를 보여줘야 한다
