# Target Harness 실행 계약

이 문서는 `workflow-code-editor`가 파일 변경 실행 전에 Harness를 선택 가능한 일반 실행 경로로 판정하고 호출하는 경계를 정의한다. Workflow Engine의 공통 요청·결과 계약은 `structured-execution-contract.md`, 전체 경로 선택은 `file-change-execution-contract.md`가 소유한다.

## 준비도와 라우팅

| 판정 상태 | 판정 기준 |
| --- | --- |
| 대상 Harness 설치 확인 | 전역 Harness 스킬이 존재하고 읽을 수 있다. |
| 대상 Harness 일반 진입점 준비됨 | 대상 저장소에 Harness가 정의한 일반 실행 진입점과 그 진입점이 요구하는 프로젝트 로컬 자산이 존재하며 서로 일치한다. |
| 일반 코드 변경 요청 전달 가능 | 작업 설명, 대상 파일, baseline, 변경 제약, 검증 기준만으로 현재 변경을 요청할 수 있고 Workflow Engine 전용 설정·필드·역할·결과 계약을 요구하지 않는다. |
| Target Harness 사용 가능 | 위 세 판정을 모두 충족하고 Harness가 부수 효과 없는 준비도 확인 결과로 현재 요청을 처리할 수 있다고 판정한다. |

Harness 준비도 확인을 위해 누락된 로컬 역할, Team Spec, 설정 또는 실행기를 현재 작업 중 새로 생성하거나 갱신하지 않는다. 누락이 있으면 `Target Harness 사용 불가`로 기록하고 `file-change-execution-contract.md`의 일반 코드 변경 경로 판정으로 돌아간다.

## 일반 handoff

Workflow Engine 구조화 요청을 Harness에 그대로 전달하지 않는다. `workflow-code-editor`는 다음 일반 입력만 전달한다.

```text
work_summary
target_files
target_baseline
change_constraints
verification_criteria
repository_instructions
```

- `work_summary`는 확정된 변경 동작을 설명하되 Workflow Engine task ID나 전이 판단을 Harness 책임으로 만들지 않는다.
- `target_files`, `target_baseline`, `change_constraints`, `verification_criteria`는 원 요청보다 넓힐 수 없다.
- Harness는 일반 요청으로 역할과 실행 방식을 선택하며 호출자가 Workflow Engine인지 알 필요가 없다.
- Harness가 반환하는 일반 변경 결과에 Workflow Engine 전용 필드를 요구하지 않는다.

## 결과 수용과 정규화

`workflow-code-editor`는 Harness의 일반 결과에서 실제 수행 동작, 변경 파일, GitHub 상태 변경, 검증 결과와 남은 위험을 읽어 원 Workflow Engine 요청과 대조한다. 범위와 baseline이 일치하고 사후조건과 검증을 충족한 경우에만 공통 구조화 실행 결과로 정규화한다.

Harness가 하위 session을 직접 생성했다면 Harness가 그 ID를 소유하고 정리한다. `workflow-code-editor`는 반환된 정리 근거를 검증하되 child ID를 중복으로 닫지 않는다.

## 실패와 fallback 경계

- Harness 설치 또는 준비도 실패가 파일 변경 실행 전에 확인되면 Harness를 호출하지 않고 일반 코드 변경 경로를 선택할 수 있다.
- Harness 호출이나 파일 변경이 시작된 뒤 실패, timeout 또는 부분 변경 가능성이 생기면 일반 경로로 fallback하지 않는다.
- 시작 뒤 실패는 실제 수행 동작, 변경 여부, 검증 결과와 복구·재개 조건을 공통 구조화 실행 중단으로 반환한다.
- Harness 결과의 baseline이나 변경 범위를 확인할 수 없으면 결과를 사용하지 않고 중단한다.
