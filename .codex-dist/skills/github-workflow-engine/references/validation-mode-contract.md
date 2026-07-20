# 검증 모드 계약

검증 모드는 사용자가 현재 요청에서 명시적으로 요청한 경우에만 실제 LLM 의존 호출의 재현성을
관찰하는 별도 진단 절차다. 일반 실행, 단순 `검증` 표현, 과거 요청의 언급 또는 Workflow Definition
필드만으로 활성화하지 않는다.

이 계약의 목적은 skill 또는 LLM에 전달하는 prompt를 개선하기 위한 근거를 수집하는 것이다. 결과의
일치와 재현성은 사용자가 판단한다. Workflow Engine, 실행 주체, Node 도구는 의미적 일치, patch 일치,
pass/mismatch, 다수결 또는 대표 결과를 자동 산출하거나 채택하지 않는다.

## 대상과 고정 조건

1. 선택된 실행 주체 또는 대상 하네스 계약으로 검증 대상 호출의 실행 가능 여부를 먼저 확인한다.
   확인할 수 없으면 검증 세션을 시작하지 않고 중단한다.
2. 현재 작업에서 선택한 실제 LLM 의존 호출 하나를 검증 대상으로 정한다. Workflow Definition의
   `executor_reference`는 직접 식별자일 뿐 registry를 통해 해석하지 않는다.
3. parser, adapter, evaluator와 같은 결정론적 제어 도구는 검증 대상이 아니며 필요한 경우 한 번만
   실행한다.
4. 대상 호출 전 GitHub/local raw snapshot을 읽기 전용으로 한 번 수집한다. 검증 중에는 같은 snapshot,
   route, model, reasoning, role, skill version, config, input, deadline을 사용한다.

## 실행과 무결성

1. 10개 의도된 slot마다 fresh independent LLM session 하나를 시작하려고 시도한다. 완전 fan-out이면
   session ID는 모두 고유한 정확히 10개이며 session reuse/continue와 prompt, context, result 공유를
   금지한다.
2. 호출 대상의 자체 실행 계약이 격리 workspace를 요구하면 동일 baseline에서 slot마다 별도 workspace를
   만들려고 시도한다. 완전 fan-out이면 workspace ID도 모두 고유한 정확히 10개다. 격리가 필요하지 않은
   호출에 patch, manifest, baseline 필드를 강제하지 않는다.
3. 모든 session은 primary와 외부 상태를 변경하지 않는다. GitHub, branch, commit, PR, comment와
   primary 파일 변경은 금지한다. 외부 또는 primary 부수 효과는 실험 무결성 실패다.
4. 각 session의 raw result, session ID, 고정 조건 관측값, workspace ID(해당할 때), timeout·blocked·
   환경 불일치 등 실패 사유를 그대로 보존한다. fan-out이 불완전하면 발급된 모든 ID와 사용 가능한 모든
   raw result, 관측된 session/workspace 수와 명시적 무결성 실패 사유를 보존하며 누락 ID·결과를 만들거나
   재시도하지 않는다.
5. 완전 무결성은 정확히 10개의 고유 session, 동일 고정 조건, 결과 보존, 필요한 격리, 외부·primary
   부수 효과 부재를 요구한다. 하나라도 충족하지 못하면 불완전 fan-out을 포함한 실험 무결성 실패로
   보고하고 결과를 채택하지 않는다.

## 사용자 반환과 종료

1. 완전 fan-out이면 10개의 raw result와 무결성 확인 결과를, 불완전 fan-out이면 사용 가능한 모든 raw
   result와 관측 수·무결성 실패 사유를 사용자에게 제시한다.
2. 사용자가 재현성, 결과 차이의 의미, skill/prompt 개선 여부를 직접 판단한다.
3. 검증 결과는 원 호출 결과, 사용자 결정 또는 Workflow Definition transition으로 채택하지 않는다.
   검증 결과로 workflow를 진행하거나 일반 실행을 자동 재개하지 않는다.
4. comparator, validation CLI, consensus request/receipt, `unanimous_outcome`, canonical patch digest와
   전략 선택은 이 계약에 존재하지 않는다.

실제 10개 session의 실행 식별자와 raw result만 live evidence다. fixture나 정적 계약 테스트는 실행
절차의 형식만 확인하며 실제 LLM 호출의 증거가 아니다.
